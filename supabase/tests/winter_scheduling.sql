begin;
insert into auth.users (id) values ('00000000-0000-4000-8000-000000000041'),('00000000-0000-4000-8000-000000000042');
insert into public.customer_profiles (user_id,city,full_name,preferences_completed) values
 ('00000000-0000-4000-8000-000000000041','Oslo','Requester',true),
 ('00000000-0000-4000-8000-000000000042','Oslo','Helper',true);
insert into public.user_friends (user_id,friend_id,user_name,friend_name) values
 ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','Requester','Helper');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
do $$
declare
  today date := (now() at time zone 'Europe/Oslo')::date;
  draft jsonb;
  target uuid;
begin
  draft := jsonb_build_object('kind','request','category','Snømåking','task','Måke inngang og gangvei','timing','Jeg er fleksibel',
    'tasks',jsonb_build_array('Måke inngang og gangvei','Strø glatte partier'),
    'preferred_dates',jsonb_build_array(today + 1,today + 2),'time_of_day','Fleksibel');
  target := public.create_network_request(draft,array['00000000-0000-4000-8000-000000000042'::uuid]);
  if not exists (select 1 from public.help_requests where id = target and cardinality(tasks) = 2 and cardinality(preferred_dates) = 2)
    then raise exception 'Tasks/dates not persisted'; end if;
  begin
    perform public.create_network_request(draft || jsonb_build_object('preferred_dates',jsonb_build_array(today - 1)),array['00000000-0000-4000-8000-000000000042'::uuid]);
    raise exception 'Past date accepted';
  exception when raise_exception then if sqlerrm = 'Past date accepted' then raise; end if;
  end;
  begin
    perform public.create_network_request(draft,'{}');
    raise exception 'Missing helper accepted';
  exception when raise_exception then if sqlerrm = 'Missing helper accepted' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000042',true);
do $$ begin
  if not exists (select 1 from public.network_request_inbox() where cardinality(tasks) = 2 and cardinality(preferred_dates) = 2)
    then raise exception 'Recipient cannot see schedule'; end if;
end $$;
reset role;
rollback;
