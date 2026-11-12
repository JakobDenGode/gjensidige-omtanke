begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000071'),('00000000-0000-4000-8000-000000000072'),('00000000-0000-4000-8000-000000000073');
insert into public.customer_profiles(user_id,city,full_name,phone,preferences_completed) values
 ('00000000-0000-4000-8000-000000000071','Oslo','Owner','11111111',true),
 ('00000000-0000-4000-8000-000000000072','Oslo','Friend','22222222',true),
 ('00000000-0000-4000-8000-000000000073','Oslo','Outsider','33333333',true);
insert into public.user_friends(user_id,friend_id,user_name,friend_name) values ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000072','Owner','Friend');
create temporary table test_appointment(id uuid); grant all on test_appointment to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
insert into test_appointment select public.propose_appointment('00000000-0000-4000-8000-000000000072','give','Walk',now()+interval '2 days','Library',true);
do $$ begin
 if not exists(select 1 from public.my_appointments() where status='pending' and other_phone is null) then raise exception 'Pending phone leak'; end if;
 begin perform public.answer_appointment((select id from test_appointment),true,true); raise exception 'Proposer accepted own proposal'; exception when raise_exception then if sqlerrm='Proposer accepted own proposal' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000073',true);
do $$ begin
 if exists(select 1 from public.my_appointments()) then raise exception 'Outsider sees appointment';end if;
 begin perform public.cancel_appointment((select id from test_appointment));raise exception 'Outsider cancels appointment';exception when raise_exception then if sqlerrm='Outsider cancels appointment' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
select public.answer_appointment((select id from test_appointment),true,false);
do $$ begin
 if not exists(select 1 from public.my_appointments() where status='confirmed' and other_phone='11111111') then raise exception 'Consenting phone missing';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
do $$ begin
 if exists(select 1 from public.my_appointments() where other_phone is not null) then raise exception 'Non-consenting phone leaked';end if;
end $$;
select public.appointment_phone_consent((select id from test_appointment),false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
do $$ begin
 if exists(select 1 from public.my_appointments() where other_phone is not null) then raise exception 'Revoked phone still visible';end if;
end $$;
select public.cancel_appointment((select id from test_appointment));
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
do $$ begin
 if not exists(select 1 from public.my_appointments() where status='cancelled') then raise exception 'Cancellation not shared';end if;
end $$;
reset role;
rollback;
