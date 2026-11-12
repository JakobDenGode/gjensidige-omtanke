begin;
insert into auth.users (id) values
 ('00000000-0000-4000-8000-000000000031'),
 ('00000000-0000-4000-8000-000000000032'),
 ('00000000-0000-4000-8000-000000000033');
insert into public.customer_profiles (user_id,city,full_name,street_address,phone,can_help,preferences_completed) values
 ('00000000-0000-4000-8000-000000000031','Oslo','User Test','Private address','12345678','{}',true),
 ('00000000-0000-4000-8000-000000000032','Oslo','Friend Test','Other private address','87654321',array['Snømåking'],true),
 ('00000000-0000-4000-8000-000000000033','Oslo','Outsider Test','','','{}',true);
insert into public.user_friends (user_id,friend_id,user_name,friend_name) values
 ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032','User Test','Friend Test');
create temporary table test_requests (id uuid, shared boolean);
grant all on test_requests to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
insert into test_requests select public.create_network_request(
 '{"kind":"request","category":"Snømåking","task":"Måke inngang","timing":"Denne uken","description":"Test"}',
 array['00000000-0000-4000-8000-000000000032'::uuid]), true;
insert into test_requests select public.create_network_request(
 '{"kind":"request","category":"Snømåking","task":"Private task","timing":"Denne uken"}'), false;
do $$ begin
  if (select count(*) from public.network_members()) <> 1 then raise exception 'Network member missing'; end if;
  begin
    perform public.create_network_request('{"kind":"request","category":"Snømåking","task":"Invalid","timing":"Denne uken"}',array['00000000-0000-4000-8000-000000000033'::uuid]);
    raise exception 'Outsider accepted as recipient';
  exception when raise_exception then
    if sqlerrm = 'Outsider accepted as recipient' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000032',true);
do $$ begin
  if exists (select 1 from public.customer_profiles where user_id = '00000000-0000-4000-8000-000000000031') then raise exception 'Private profile leaked'; end if;
  if (select count(*) from public.network_request_inbox()) <> 1 then raise exception 'Shared request missing'; end if;
  if exists (select 1 from public.help_requests where task = 'Private task') then raise exception 'Private task leaked'; end if;
  if (select count(*) from public.help_requests where id in (select id from test_requests)) <> 1 then raise exception 'Selected friend read policy broken'; end if;
end $$;
select public.respond_to_network_request((select id from test_requests where shared),'accepted');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
do $$ begin
  if not exists (select 1 from public.network_request_responses() where response = 'accepted' and friend_name = 'Friend Test') then raise exception 'Response not visible to owner'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000033',true);
do $$ begin
  if exists (select 1 from public.network_request_inbox()) then raise exception 'Outsider inbox leak'; end if;
  if exists (select 1 from public.help_requests where id in (select id from test_requests)) then raise exception 'Outsider direct request leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
update public.help_requests set status = 'cancelled' where id = (select id from test_requests where shared);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000032',true);
do $$ begin
  begin
    perform public.respond_to_network_request((select id from test_requests where shared),'declined');
    raise exception 'Cancelled request response accepted';
  exception when raise_exception then
    if sqlerrm = 'Cancelled request response accepted' then raise; end if;
  end;
end $$;
delete from public.user_friends;
do $$ begin
  if exists (select 1 from public.network_request_inbox()) then raise exception 'Removed friend still has inbox access'; end if;
  if exists (select 1 from public.help_requests where id in (select id from test_requests)) then raise exception 'Removed friend still has direct access'; end if;
end $$;
reset role;
rollback;
