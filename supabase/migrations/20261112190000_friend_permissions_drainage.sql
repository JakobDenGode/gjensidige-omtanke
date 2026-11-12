begin;
create table public.friend_invitation_details (
  owner_id uuid primary key references public.friend_invitations(user_id) on delete cascade,
  contact_name text not null check(char_length(trim(contact_name)) between 1 and 80),
  contact_phone text not null check(char_length(contact_phone) between 5 and 30),
  contact_email text not null default '' check(char_length(contact_email)<=254),
  share_appointments boolean not null default false,
  share_weather boolean not null default false,
  share_requests boolean not null default false
);
alter table public.friend_invitation_details enable row level security;
revoke all on public.friend_invitation_details from anon,authenticated;

create table public.friend_permissions (
  connection_id uuid primary key references public.user_friends(id) on delete cascade,
  share_appointments boolean not null default false,
  share_weather boolean not null default false,
  share_requests boolean not null default false
);
alter table public.friend_permissions enable row level security;
revoke all on public.friend_permissions from anon,authenticated;

create function public.create_friend_invitation_with_permissions(contact_name text,contact_phone text,contact_email text,share_appointments boolean,share_weather boolean,share_requests boolean)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare code text;
begin
  code:=public.create_friend_invitation(contact_name);
  insert into public.friend_invitation_details values(auth.uid(),trim(contact_name),trim(contact_phone),lower(trim(coalesce(contact_email,''))),coalesce(share_appointments,false),coalesce(share_weather,false),coalesce(share_requests,false))
  on conflict(owner_id) do update set contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,contact_email=excluded.contact_email,
    share_appointments=excluded.share_appointments,share_weather=excluded.share_weather,share_requests=excluded.share_requests;
  return code;
end $$;

alter function public.accept_friend_invitation(text,text) rename to accept_friend_invitation_internal;
revoke all on function public.accept_friend_invitation_internal(text,text) from public,anon,authenticated;
create function public.accept_friend_invitation(invitation_code text,display_name text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare settings public.friend_invitation_details%rowtype; target uuid;
begin
  select d.* into settings from public.friend_invitation_details d join public.friend_invitations i on i.user_id=d.owner_id
    where i.code_hash=encode(sha256(convert_to(trim(invitation_code),'UTF8')),'hex') and i.expires_at>now() for update of i;
  if found and settings.contact_email<>'' and settings.contact_email<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Invitation belongs to another email';end if;
  target:=public.accept_friend_invitation_internal(invitation_code,display_name);
  if settings.owner_id is not null then
    insert into public.friend_permissions values(target,settings.share_appointments,settings.share_weather,settings.share_requests)
    on conflict(connection_id) do update set share_appointments=excluded.share_appointments,share_weather=excluded.share_weather,share_requests=excluded.share_requests;
  end if;
  return target;
end $$;

create function public.shared_friend_details(target uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare permissions public.friend_permissions%rowtype; profile public.customer_profiles%rowtype; result jsonb;
begin
  if not exists(select 1 from public.user_friends where (user_id=target and friend_id=auth.uid()) or (friend_id=target and user_id=auth.uid())) then raise exception 'Current friend required';end if;
  select p.* into permissions from public.friend_permissions p join public.user_friends f on f.id=p.connection_id where f.user_id=target and f.friend_id=auth.uid();
  select * into profile from public.customer_profiles where user_id=target;
  result:=jsonb_build_object('share_appointments',coalesce(permissions.share_appointments,false),'share_weather',coalesce(permissions.share_weather,false),'share_requests',coalesce(permissions.share_requests,false));
  if permissions.share_appointments then
    result:=result||jsonb_build_object('appointments',(select coalesce(jsonb_agg(jsonb_build_object('title',a.title,'starts_at',a.starts_at,'status',a.status,'meeting_place',a.meeting_place)),'[]') from public.appointments a where target in(a.proposer_id,a.partner_id)));
  end if;
  if permissions.share_weather then
    result:=result||jsonb_build_object('weather_city',profile.city);
  end if;
  if permissions.share_requests then
    result:=result||jsonb_build_object('requests',(select coalesce(jsonb_agg(jsonb_build_object('task',r.task,'timing',r.timing,'status',r.status)),'[]') from public.help_requests r where r.user_id=target));
  end if;
  return result;
end $$;

create function public.create_request_for_friend(owner uuid,task_text text,desired_time text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;
begin
  if not exists(select 1 from public.user_friends f join public.friend_permissions p on p.connection_id=f.id where f.user_id=owner and f.friend_id=auth.uid() and p.share_requests)
    then raise exception 'Delegated permission required';end if;
  insert into public.help_requests(user_id,kind,category,task,timing,description) values(owner,'request','Noe annet',trim(task_text),desired_time,'Opprettet av en venn med tillatelse') returning id into target;
  return target;
end $$;

create function public.revoke_friend_permissions(connection uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.user_friends where id=connection and user_id=auth.uid()) then raise exception 'Owner required';end if;
 delete from public.friend_permissions where connection_id=connection;
end $$;

alter table public.help_requests add column drainage_contact_requested boolean not null default false;
alter function public.create_directory_request(jsonb,uuid) rename to create_directory_request_internal;
revoke all on function public.create_directory_request_internal(jsonb,uuid) from public,anon,authenticated;
create function public.create_directory_request(draft jsonb,helper uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;
begin
 target:=public.create_directory_request_internal(draft,helper);
 update public.help_requests set drainage_contact_requested=coalesce((draft->>'drainage_contact_requested')::boolean,false) where id=target;
 return target;
end $$;
revoke all on function public.create_friend_invitation_with_permissions(text,text,text,boolean,boolean,boolean),public.accept_friend_invitation(text,text),public.shared_friend_details(uuid),public.create_request_for_friend(uuid,text,text),public.revoke_friend_permissions(uuid),public.create_directory_request(jsonb,uuid) from public,anon;
grant execute on function public.create_friend_invitation_with_permissions(text,text,text,boolean,boolean,boolean),public.accept_friend_invitation(text,text),public.shared_friend_details(uuid),public.create_request_for_friend(uuid,text,text),public.revoke_friend_permissions(uuid),public.create_directory_request(jsonb,uuid) to authenticated;
commit;
