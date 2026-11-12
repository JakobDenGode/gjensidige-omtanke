begin;
alter table public.customer_profiles
  add column home_type text not null default '' check (home_type in ('','Enebolig','Rekkehus','Leilighet','Annet')),
  add column has_basement boolean not null default false,
  add column snow_on_property boolean not null default false,
  add column insurer text not null default '' check (char_length(insurer) <= 100);
grant update (home_type,has_basement,snow_on_property,insurer) on public.customer_profiles to authenticated;

alter table public.help_requests drop constraint help_requests_status_check;
alter table public.help_requests add constraint help_requests_status_check check (status in ('open','cancelled','completed'));
alter table public.help_requests add column completed_helper uuid references auth.users(id), add column completed_at timestamptz;
-- Status changes now go through authorized RPCs, preventing fabricated completions.
revoke update on public.help_requests from authenticated;
revoke update (status) on public.help_requests from authenticated;
create function public.cancel_help_request(target uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.help_requests set status='cancelled' where id=target and user_id=auth.uid() and status='open';
  if not found then raise exception 'Request unavailable'; end if;
end $$;
create function public.complete_help_request(target uuid, helper uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.help_requests where id=target and user_id=auth.uid() and status='open' for update;
  if not found or not exists (select 1 from public.request_recipients rr join public.user_friends f on
    (f.user_id=auth.uid() and f.friend_id=helper) or (f.friend_id=auth.uid() and f.user_id=helper)
    where rr.request_id=target and rr.recipient_id=helper and rr.response='accepted') then raise exception 'Accepted current helper required'; end if;
  update public.help_requests set status='completed',completed_helper=helper,completed_at=now() where id=target;
end $$;

create table public.helper_reviews (
  request_id uuid primary key references public.help_requests(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment)<=500),
  created_at timestamptz not null default now()
);
alter table public.helper_reviews enable row level security;
revoke all on public.helper_reviews from anon,authenticated;
create function public.review_helper(target uuid, stars integer, review_text text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare helper uuid;
begin
  select completed_helper into helper from public.help_requests where id=target and user_id=auth.uid() and status='completed';
  if helper is null then raise exception 'Completed task required'; end if;
  insert into public.helper_reviews(request_id,reviewer_id,helper_id,rating,comment) values(target,auth.uid(),helper,stars,trim(coalesce(review_text,'')));
end $$;
create function public.helper_reputation(target uuid)
returns table (rating numeric, review_count bigint, comment text, reviewer_name text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or (target<>auth.uid() and not exists(select 1 from public.user_friends where
    (user_id=auth.uid() and friend_id=target) or (friend_id=auth.uid() and user_id=target))) then raise exception 'Network access required'; end if;
  return query select (select round(avg(r.rating),1) from public.helper_reviews r where r.helper_id=target),
    (select count(*) from public.helper_reviews r where r.helper_id=target),r.comment,p.full_name
    from public.helper_reviews r join public.customer_profiles p on p.user_id=r.reviewer_id
    where r.helper_id=target order by r.created_at desc limit 5;
end $$;
create function public.my_task_outcomes()
returns table (request_id uuid, task text, status text, helper_id uuid, helper_name text, response text, reviewed boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  select r.id,r.task,r.status,rr.recipient_id,p.full_name,rr.response,
    exists(select 1 from public.helper_reviews hr where hr.request_id=r.id)
  from public.help_requests r join public.request_recipients rr on rr.request_id=r.id
  join public.customer_profiles p on p.user_id=rr.recipient_id
  where r.user_id=auth.uid() and (r.completed_helper=rr.recipient_id or (r.status='open' and rr.response='accepted'));
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 1 and 80)
);
create table public.household_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade
);
create table public.household_invites (
  household_id uuid primary key references public.households(id) on delete cascade,
  code_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days'
);
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
revoke all on public.households,public.household_members,public.household_invites from anon,authenticated;
create function public.create_household(household_name text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;
begin
  if auth.uid() is null or exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Already in household or signed out'; end if;
  insert into public.households(owner_id,name) values(auth.uid(),trim(household_name)) returning id into target;
  insert into public.household_members values(auth.uid(),target); return target;
end $$;
create function public.invite_household_member() returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid; code text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
begin
  select h.id into target from public.households h join public.household_members m on m.household_id=h.id where h.owner_id=auth.uid() and m.user_id=auth.uid();
  if target is null then raise exception 'Owner required'; end if;
  insert into public.household_invites(household_id,code_hash) values(target,encode(sha256(convert_to(code,'UTF8')),'hex'))
  on conflict(household_id) do update set code_hash=excluded.code_hash,expires_at=now()+interval '7 days'; return code;
end $$;
create function public.accept_household_invitation(code text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;
begin
  if auth.uid() is null or exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Already in household or signed out'; end if;
  select household_id into target from public.household_invites where code_hash=encode(sha256(convert_to(trim(code),'UTF8')),'hex') and expires_at>now() for update;
  if target is null then raise exception 'Invalid invitation'; end if;
  insert into public.household_members values(auth.uid(),target); delete from public.household_invites where household_id=target;
end $$;
create function public.my_household()
returns table (household_name text,owner_id uuid,member_id uuid,full_name text,can_help text[],needs_help text[])
language sql stable security definer set search_path=public,pg_temp as $$
  select h.name,h.owner_id,p.user_id,p.full_name,p.can_help,p.needs_help
  from public.household_members me join public.households h on h.id=me.household_id
  join public.household_members m on m.household_id=h.id join public.customer_profiles p on p.user_id=m.user_id where me.user_id=auth.uid();
$$;
create function public.remove_household_member(target uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare household uuid; owner uuid;
begin
  select h.id,h.owner_id into household,owner from public.household_members m join public.households h on h.id=m.household_id where m.user_id=auth.uid() for update of h;
  if household is null or (target<>auth.uid() and owner<>auth.uid()) then raise exception 'Not permitted'; end if;
  if target=owner then delete from public.households where id=household;
  else delete from public.household_members where household_id=household and user_id=target; end if;
end $$;
create function public.revoke_household_invitation() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.household_invites i using public.households h where i.household_id=h.id and h.owner_id=auth.uid();
end $$;
revoke all on function public.cancel_help_request(uuid),public.complete_help_request(uuid,uuid),public.review_helper(uuid,integer,text),public.helper_reputation(uuid),public.my_task_outcomes(),public.create_household(text),public.invite_household_member(),public.accept_household_invitation(text),public.my_household(),public.remove_household_member(uuid),public.revoke_household_invitation() from public,anon;
grant execute on function public.cancel_help_request(uuid),public.complete_help_request(uuid,uuid),public.review_helper(uuid,integer,text),public.helper_reputation(uuid),public.my_task_outcomes(),public.create_household(text),public.invite_household_member(),public.accept_household_invitation(text),public.my_household(),public.remove_household_member(uuid),public.revoke_household_invitation() to authenticated;
commit;
