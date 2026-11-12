begin;
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 150),
  starts_at timestamptz not null,
  meeting_place text not null check (char_length(trim(meeting_place)) between 1 and 300),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  proposer_shares_phone boolean not null default false,
  partner_shares_phone boolean not null default false,
  created_at timestamptz not null default now(),
  check (proposer_id <> partner_id),
  check (helper_id in (proposer_id,partner_id))
);
create index appointments_proposer_time on public.appointments(proposer_id,starts_at);
create index appointments_partner_time on public.appointments(partner_id,starts_at);
alter table public.appointments enable row level security;
revoke all on public.appointments from anon,authenticated;

create function public.propose_appointment(friend uuid, help_direction text, appointment_title text, start_time timestamptz, place text, share_phone boolean default false)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); target uuid;
begin
  if actor is null or friend is null or actor=friend or not exists (
    select 1 from public.user_friends where (user_id=actor and friend_id=friend) or (friend_id=actor and user_id=friend)
  ) then raise exception 'Current friend required'; end if;
  if help_direction is null or help_direction not in ('give','receive') then raise exception 'Invalid direction';end if;
  if start_time is null or start_time<=now() or start_time>now()+interval '1 year' then raise exception 'Invalid appointment time';end if;
  if not exists(select 1 from public.customer_profiles where user_id=actor and trim(full_name)<>'' and preferences_completed) then raise exception 'Complete profile first';end if;
  insert into public.appointments(proposer_id,partner_id,helper_id,title,starts_at,meeting_place,proposer_shares_phone)
  values(actor,friend,case when help_direction='give' then actor else friend end,trim(appointment_title),start_time,trim(place),coalesce(share_phone,false)) returning id into target;
  return target;
end $$;

create function public.answer_appointment(target uuid, accept boolean, share_phone boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if accept is null then raise exception 'Answer required';end if;
  update public.appointments a set status=case when accept then 'confirmed' else 'cancelled' end,
    partner_shares_phone=case when accept then coalesce(share_phone,false) else false end
  where id=target and partner_id=auth.uid() and status='pending' and starts_at>now()
  and exists(select 1 from public.user_friends f where
    (f.user_id=a.proposer_id and f.friend_id=a.partner_id) or (f.friend_id=a.proposer_id and f.user_id=a.partner_id));
  if not found then raise exception 'Appointment unavailable';end if;
end $$;

create function public.cancel_appointment(target uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.appointments set status='cancelled',proposer_shares_phone=false,partner_shares_phone=false
  where id=target and auth.uid() in (proposer_id,partner_id) and status in ('pending','confirmed');
  if not found then raise exception 'Appointment unavailable';end if;
end $$;

create function public.appointment_phone_consent(target uuid, share_phone boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.appointments set
    proposer_shares_phone=case when proposer_id=auth.uid() then coalesce(share_phone,false) else proposer_shares_phone end,
    partner_shares_phone=case when partner_id=auth.uid() then coalesce(share_phone,false) else partner_shares_phone end
  where id=target and auth.uid() in (proposer_id,partner_id) and status in ('pending','confirmed');
  if not found then raise exception 'Appointment unavailable';end if;
end $$;

create function public.my_appointments()
returns table (id uuid,title text,starts_at timestamptz,meeting_place text,status text,proposer_id uuid,partner_id uuid,helper_id uuid,other_id uuid,other_name text,other_phone text,shares_phone boolean,current_friend boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  select a.id,a.title,a.starts_at,a.meeting_place,a.status,a.proposer_id,a.partner_id,a.helper_id,
    p.user_id,p.full_name,
    case when a.status='confirmed' and exists(select 1 from public.user_friends f where
      (f.user_id=a.proposer_id and f.friend_id=a.partner_id) or (f.friend_id=a.proposer_id and f.user_id=a.partner_id))
      and case when a.proposer_id=auth.uid() then a.partner_shares_phone else a.proposer_shares_phone end
      then p.phone else null end,
    case when a.proposer_id=auth.uid() then a.proposer_shares_phone else a.partner_shares_phone end,
    exists(select 1 from public.user_friends f where
      (f.user_id=a.proposer_id and f.friend_id=a.partner_id) or (f.friend_id=a.proposer_id and f.user_id=a.partner_id))
  from public.appointments a join public.customer_profiles p on p.user_id=case when a.proposer_id=auth.uid() then a.partner_id else a.proposer_id end
  where auth.uid() in (a.proposer_id,a.partner_id)
  order by a.starts_at desc limit 100;
$$;
revoke all on function public.propose_appointment(uuid,text,text,timestamptz,text,boolean),public.answer_appointment(uuid,boolean,boolean),public.cancel_appointment(uuid),public.appointment_phone_consent(uuid,boolean),public.my_appointments() from public,anon;
grant execute on function public.propose_appointment(uuid,text,text,timestamptz,text,boolean),public.answer_appointment(uuid,boolean,boolean),public.cancel_appointment(uuid),public.appointment_phone_consent(uuid,boolean),public.my_appointments() to authenticated;
commit;
