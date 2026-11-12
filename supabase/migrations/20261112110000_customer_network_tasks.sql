begin;
alter table public.customer_profiles
  add column full_name text not null default '' check (char_length(full_name) <= 80),
  add column street_address text not null default '' check (char_length(street_address) <= 200),
  add column postal_code text not null default '' check (postal_code = '' or postal_code ~ '^[0-9]{4}$'),
  add column phone text not null default '' check (char_length(phone) <= 30),
  add column can_help text[] not null default '{}' check (can_help <@ array['Snømåking','Praktiske småting','Mobil og data','Følge eller selskap','Hage og planter','Noe annet']),
  add column needs_help text[] not null default '{}' check (needs_help <@ array['Snømåking','Praktiske småting','Mobil og data','Følge eller selskap','Hage og planter','Noe annet']),
  add column preferences_completed boolean not null default false;
grant update (full_name, street_address, postal_code, phone, can_help, needs_help, preferences_completed)
  on public.customer_profiles to authenticated;

create function public.network_members()
returns table (member_id uuid, full_name text, city text, can_help text[], needs_help text[])
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct p.user_id, p.full_name, p.city, p.can_help, p.needs_help
  from public.customer_profiles p
  join public.user_friends f on
    (f.user_id = auth.uid() and f.friend_id = p.user_id) or
    (f.friend_id = auth.uid() and f.user_id = p.user_id)
  where auth.uid() is not null;
$$;

-- Preserve the existing RPC signatures while using the saved profile as the name source.
create or replace function public.create_friend_invitation(display_name text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  code text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  select full_name into actor_name from public.customer_profiles where user_id = actor;
  if actor is null or actor_name is null or trim(actor_name) = '' then raise exception 'Complete your profile first'; end if;
  insert into public.friend_invitations (user_id, user_name, code_hash)
  values (actor, actor_name, encode(sha256(convert_to(code, 'UTF8')), 'hex'))
  on conflict (user_id) do update set user_name = excluded.user_name,
    code_hash = excluded.code_hash, expires_at = now() + interval '7 days';
  return code;
end $$;

create or replace function public.accept_friend_invitation(invitation_code text, display_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  owner_name text;
  invitation public.friend_invitations%rowtype;
  connection_id uuid;
begin
  select full_name into actor_name from public.customer_profiles where user_id = actor;
  if actor is null or actor_name is null or trim(actor_name) = '' then raise exception 'Complete your profile first'; end if;
  if invitation_code is null or char_length(trim(invitation_code)) <> 64 then raise exception 'Invalid invitation'; end if;
  select * into invitation from public.friend_invitations
    where code_hash = encode(sha256(convert_to(trim(invitation_code), 'UTF8')), 'hex')
    and expires_at > now() for update;
  if not found or invitation.user_id = actor then raise exception 'Invalid invitation'; end if;
  select full_name into owner_name from public.customer_profiles where user_id = invitation.user_id;
  insert into public.user_friends (user_id, friend_id, user_name, friend_name)
    values (invitation.user_id, actor, owner_name, actor_name)
    on conflict (user_id, friend_id) do nothing;
  select id into connection_id from public.user_friends where user_id = invitation.user_id and friend_id = actor;
  delete from public.friend_invitations where user_id = invitation.user_id;
  return connection_id;
end $$;

create table public.request_recipients (
  request_id uuid not null references public.help_requests(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined')),
  primary key (request_id, recipient_id)
);
alter table public.request_recipients enable row level security;
revoke all on public.request_recipients from anon, authenticated;

create function public.can_read_network_request(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.request_recipients rr
    join public.help_requests r on r.id = rr.request_id
    join public.user_friends f on
      (f.user_id = r.user_id and f.friend_id = rr.recipient_id) or
      (f.friend_id = r.user_id and f.user_id = rr.recipient_id)
    where r.id = target and rr.recipient_id = auth.uid()
  );
$$;
create policy "Selected current friends can read shared requests" on public.help_requests
  for select to authenticated using (public.can_read_network_request(id));

create function public.create_network_request(draft jsonb, recipients uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor uuid := auth.uid(); target uuid; recipient uuid;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.customer_profiles where user_id = actor and trim(full_name) <> '' and preferences_completed)
    then raise exception 'Complete your profile first'; end if;
  if recipients is null or cardinality(recipients) > 100 then raise exception 'Invalid recipients'; end if;
  if cardinality(recipients) > 0 and draft->>'kind' <> 'request' then raise exception 'Only help requests can be shared'; end if;
  foreach recipient in array recipients loop
    if recipient is null or recipient = actor or not exists (
      select 1 from public.user_friends where (user_id = actor and friend_id = recipient) or (friend_id = actor and user_id = recipient)
    ) then raise exception 'Recipient must be a current friend'; end if;
  end loop;
  insert into public.help_requests (user_id, kind, category, task, timing, description)
    values (actor, draft->>'kind', draft->>'category', draft->>'task', draft->>'timing', coalesce(draft->>'description',''))
    returning id into target;
  insert into public.request_recipients (request_id, recipient_id)
    select target, member from (select distinct unnest(recipients) as member) members;
  return target;
end $$;

create function public.network_request_inbox()
returns table (request_id uuid, owner_name text, city text, task text, category text, timing text, description text, status text, response text)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, p.full_name, p.city, r.task, r.category, r.timing, r.description, r.status, rr.response
  from public.request_recipients rr join public.help_requests r on r.id = rr.request_id
  join public.customer_profiles p on p.user_id = r.user_id
  where rr.recipient_id = auth.uid() and public.can_read_network_request(r.id)
  order by r.created_at desc limit 100;
$$;

create function public.respond_to_network_request(target uuid, answer text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if answer not in ('accepted','declined') or answer is null then raise exception 'Invalid response'; end if;
  perform 1 from public.help_requests where id = target and status = 'open' for update;
  if not found or not public.can_read_network_request(target) then raise exception 'Request unavailable'; end if;
  update public.request_recipients set response = answer where request_id = target and recipient_id = auth.uid();
  if not found then raise exception 'Not a recipient'; end if;
end $$;

create function public.network_request_responses()
returns table (request_id uuid, task text, status text, friend_name text, response text)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, r.task, r.status, p.full_name, rr.response from public.help_requests r
  join public.request_recipients rr on rr.request_id = r.id
  join public.customer_profiles p on p.user_id = rr.recipient_id
  where r.user_id = auth.uid() and exists (
    select 1 from public.user_friends where (user_id = r.user_id and friend_id = rr.recipient_id) or (friend_id = r.user_id and user_id = rr.recipient_id)
  );
$$;

revoke all on function public.network_members() from public, anon;
revoke all on function public.can_read_network_request(uuid) from public, anon;
revoke all on function public.create_network_request(jsonb, uuid[]) from public, anon;
revoke all on function public.network_request_inbox() from public, anon;
revoke all on function public.respond_to_network_request(uuid, text) from public, anon;
revoke all on function public.network_request_responses() from public, anon;
grant execute on function public.network_members() to authenticated;
grant execute on function public.can_read_network_request(uuid) to authenticated;
grant execute on function public.create_network_request(jsonb, uuid[]) to authenticated;
grant execute on function public.network_request_inbox() to authenticated;
grant execute on function public.respond_to_network_request(uuid, text) to authenticated;
grant execute on function public.network_request_responses() to authenticated;
commit;
