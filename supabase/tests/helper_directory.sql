begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000081'),('00000000-0000-4000-8000-000000000082'),('00000000-0000-4000-8000-000000000083');
insert into public.customer_profiles(user_id,city,full_name,preferences_completed,helper_visible,phone) values
 ('00000000-0000-4000-8000-000000000081','Oslo','Requester',true,false,'11111111'),
 ('00000000-0000-4000-8000-000000000082','Oslo','Visible helper',true,true,'22222222'),
 ('00000000-0000-4000-8000-000000000083','Oslo','Private user',true,false,'33333333');
create temporary table fixture(id uuid);grant all on fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
do $$begin
 if (select count(*) from public.available_helpers() where member_id in ('00000000-0000-4000-8000-000000000082','00000000-0000-4000-8000-000000000083'))<>2 then raise exception 'Completed accounts missing from directory';end if;
 if exists(select 1 from public.available_helpers() where member_id='00000000-0000-4000-8000-000000000082' and phone is not null) then raise exception 'Phone leak';end if;
end $$;
insert into fixture select public.create_directory_request(jsonb_build_object('kind','request','category','Snømåking','tasks',jsonb_build_array('Strø glatte partier'),'preferred_dates',jsonb_build_array((now() at time zone 'Europe/Oslo')::date+1),'time_of_day','Fleksibel'),'00000000-0000-4000-8000-000000000082');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
do $$begin if exists(select 1 from public.help_requests where id=(select id from fixture)) then raise exception 'Outsider task leak';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$begin if not exists(select 1 from public.network_request_inbox() where request_id=(select id from fixture)) then raise exception 'Directory task missing';end if;end $$;
select public.respond_to_network_request((select id from fixture),'accepted');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.complete_help_request((select id from fixture),'00000000-0000-4000-8000-000000000082');
select public.review_helper((select id from fixture),5,'Helpful');
reset role;
rollback;
