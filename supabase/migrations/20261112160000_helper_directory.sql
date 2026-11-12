begin;
alter table public.customer_profiles add column helper_visible boolean not null default false,
  add column helper_phone_visible boolean not null default false;
grant update(helper_visible,helper_phone_visible) on public.customer_profiles to authenticated;
alter table public.request_recipients add column directory_request boolean not null default false;
create function public.available_helpers()
returns table(member_id uuid,full_name text,city text,can_help text[],phone text,rating numeric,review_count bigint,review_comment text,reviewer_name text)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.user_id,p.full_name,p.city,p.can_help,case when p.helper_phone_visible then p.phone else null end,
 (select round(avg(r.rating),1) from public.helper_reviews r where r.helper_id=p.user_id),
 (select count(*) from public.helper_reviews r where r.helper_id=p.user_id),latest.comment,latest.full_name
 from public.customer_profiles p left join lateral (
 select r.comment,reviewer.full_name from public.helper_reviews r join public.customer_profiles reviewer on reviewer.user_id=r.reviewer_id
 where r.helper_id=p.user_id order by r.created_at desc limit 1
 ) latest on true
 where auth.uid() is not null and p.user_id<>auth.uid() and p.helper_visible and trim(p.full_name)<>'' and p.preferences_completed;
$$;
create function public.create_directory_request(draft jsonb,helper uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();target uuid;selected_tasks text[];selected_dates date[];day date;
 today date:=(now() at time zone 'Europe/Oslo')::date;
begin
 if actor is null or helper is null or actor=helper then raise exception 'Choose another helper';end if;
 if not exists(select 1 from public.customer_profiles where user_id=actor and trim(full_name)<>'' and preferences_completed)
 or not exists(select 1 from public.customer_profiles where user_id=helper and helper_visible and preferences_completed and trim(full_name)<>'') then raise exception 'Profile or helper unavailable';end if;
 select coalesce(array_agg(distinct value),'{}') into selected_tasks from jsonb_array_elements_text(coalesce(draft->'tasks','[]'));
 select coalesce(array_agg(distinct value::date order by value::date),'{}') into selected_dates from jsonb_array_elements_text(coalesce(draft->'preferred_dates','[]'));
 if draft->>'kind' is distinct from 'request' or draft->>'category' is distinct from 'Snømåking'
 or cardinality(selected_tasks) not between 1 and 5 or cardinality(selected_dates) not between 1 and 31
 or not(selected_tasks <@ array['Måke inngang og gangvei','Måke innkjørselen','Flytte snø bort fra husveggen','Fjerne snø rundt sluk og avløp','Strø glatte partier']) then raise exception 'Invalid winter request';end if;
 foreach day in array selected_dates loop if day<today or day>today+365 then raise exception 'Invalid date';end if;end loop;
 insert into public.help_requests(user_id,kind,category,task,timing,description,tasks,preferred_dates,time_of_day)
 values(actor,'request','Snømåking',selected_tasks[1],'Jeg er fleksibel',coalesce(draft->>'description',''),selected_tasks,selected_dates,coalesce(draft->>'time_of_day','Fleksibel')) returning id into target;
 insert into public.request_recipients(request_id,recipient_id,directory_request) values(target,helper,true);return target;
end $$;
create or replace function public.can_read_network_request(target uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.request_recipients rr join public.help_requests r on r.id=rr.request_id
 where r.id=target and rr.recipient_id=auth.uid() and (rr.directory_request or exists(select 1 from public.user_friends f where
 (f.user_id=r.user_id and f.friend_id=rr.recipient_id) or (f.friend_id=r.user_id and f.user_id=rr.recipient_id))));
$$;
create or replace function public.network_request_responses()
returns table(request_id uuid,task text,status text,friend_name text,response text)
language sql stable security definer set search_path=public,pg_temp as $$
 select r.id,r.task,r.status,p.full_name,rr.response from public.help_requests r
 join public.request_recipients rr on rr.request_id=r.id join public.customer_profiles p on p.user_id=rr.recipient_id
 where r.user_id=auth.uid() and (rr.directory_request or exists(select 1 from public.user_friends f where
 (f.user_id=r.user_id and f.friend_id=rr.recipient_id) or (f.friend_id=r.user_id and f.user_id=rr.recipient_id)));
$$;
create or replace function public.complete_help_request(target uuid,helper uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.help_requests where id=target and user_id=auth.uid() and status='open' for update;
 if not found or not exists(select 1 from public.request_recipients rr where rr.request_id=target and rr.recipient_id=helper and rr.response='accepted'
 and (rr.directory_request or exists(select 1 from public.user_friends f where
 (f.user_id=auth.uid() and f.friend_id=helper) or (f.friend_id=auth.uid() and f.user_id=helper)))) then raise exception 'Accepted helper required';end if;
 update public.help_requests set status='completed',completed_helper=helper,completed_at=now() where id=target;
end $$;
create or replace function public.can_view_profile_photo(path text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where path=u.id::text||'/avatar.jpg' and (
 u.id=auth.uid() or exists(select 1 from public.customer_profiles p where p.user_id=u.id and p.helper_visible)
 or exists(select 1 from public.user_friends f where (f.user_id=auth.uid() and f.friend_id=u.id) or (f.friend_id=auth.uid() and f.user_id=u.id))
 or exists(select 1 from public.household_members me join public.household_members other on me.household_id=other.household_id where me.user_id=auth.uid() and other.user_id=u.id)));
$$;
revoke all on function public.available_helpers(),public.create_directory_request(jsonb,uuid) from public,anon;
grant execute on function public.available_helpers(),public.create_directory_request(jsonb,uuid) to authenticated;
commit;
