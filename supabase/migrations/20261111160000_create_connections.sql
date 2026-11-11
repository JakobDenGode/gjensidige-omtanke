create table public.user_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null check (char_length(user_name) between 1 and 80),
  friend_name text not null check (char_length(friend_name) between 1 and 80),
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique (user_id, friend_id)
);
create index user_friends_friend_idx on public.user_friends (friend_id);
alter table public.user_friends enable row level security;
revoke all on public.user_friends from anon, authenticated;
grant select, delete on public.user_friends to authenticated;
create policy "Participants can read connections" on public.user_friends
  for select to authenticated using ((select auth.uid()) in (user_id, friend_id));
create policy "Participants can remove connections" on public.user_friends
  for delete to authenticated using ((select auth.uid()) in (user_id, friend_id));

create table public.friend_invitations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null check (char_length(user_name) between 1 and 80),
  code_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.friend_invitations enable row level security;
revoke all on public.friend_invitations from anon, authenticated;

create function public.create_friend_invitation(display_name text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  code text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if display_name is null or char_length(trim(display_name)) not between 1 and 80 then
    raise exception 'Name must contain 1 to 80 characters';
  end if;
  insert into public.friend_invitations (user_id, user_name, code_hash)
  values (actor, trim(display_name), encode(sha256(convert_to(code, 'UTF8')), 'hex'))
  on conflict (user_id) do update set user_name = excluded.user_name,
    code_hash = excluded.code_hash, expires_at = now() + interval '7 days';
  return code;
end $$;

create function public.revoke_friend_invitation()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from public.friend_invitations where user_id = auth.uid();
end $$;

create function public.accept_friend_invitation(invitation_code text, display_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  invitation public.friend_invitations%rowtype;
  connection_id uuid;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if display_name is null or char_length(trim(display_name)) not between 1 and 80 then
    raise exception 'Name must contain 1 to 80 characters';
  end if;
  if invitation_code is null or char_length(trim(invitation_code)) <> 64 then
    raise exception 'Invalid invitation';
  end if;
  select * into invitation from public.friend_invitations
    where code_hash = encode(sha256(convert_to(trim(invitation_code), 'UTF8')), 'hex')
    and expires_at > now() for update;
  if not found or invitation.user_id = actor then raise exception 'Invalid invitation'; end if;
  insert into public.user_friends (user_id, friend_id, user_name, friend_name)
    values (invitation.user_id, actor, invitation.user_name, trim(display_name))
    on conflict (user_id, friend_id) do nothing;
  select id into connection_id from public.user_friends
    where user_id = invitation.user_id and friend_id = actor;
  delete from public.friend_invitations where user_id = invitation.user_id;
  return connection_id;
end $$;

revoke all on function public.create_friend_invitation(text) from public, anon;
revoke all on function public.revoke_friend_invitation() from public, anon;
revoke all on function public.accept_friend_invitation(text, text) from public, anon;
grant execute on function public.create_friend_invitation(text) to authenticated;
grant execute on function public.revoke_friend_invitation() to authenticated;
grant execute on function public.accept_friend_invitation(text, text) to authenticated;
