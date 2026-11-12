begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000051'),('00000000-0000-4000-8000-000000000052'),('00000000-0000-4000-8000-000000000053');
insert into public.customer_profiles(user_id,city,full_name,preferences_completed) values
 ('00000000-0000-4000-8000-000000000051','Oslo','Owner',true),('00000000-0000-4000-8000-000000000052','Oslo','Helper',true),('00000000-0000-4000-8000-000000000053','Oslo','Outsider',true);
insert into public.user_friends(user_id,friend_id,user_name,friend_name) values('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000052','Owner','Helper');
create temporary table fixture(target uuid,code text); grant all on fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000051',true);
select public.create_household('Test household');
insert into fixture select public.create_network_request('{"kind":"request","category":"Snømåking","task":"Test","timing":"Denne uken"}',array['00000000-0000-4000-8000-000000000052'::uuid]),public.invite_household_member();
do $$ begin
 begin perform public.review_helper((select target from fixture),5,'Too early'); raise exception 'Early review accepted'; exception when raise_exception then if sqlerrm='Early review accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000052',true);
select public.accept_household_invitation((select code from fixture));
select public.respond_to_network_request((select target from fixture),'accepted');
do $$ begin if (select count(*) from public.my_household())<>2 then raise exception 'Household missing'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000053',true);
do $$ begin
 if exists(select 1 from public.my_household()) then raise exception 'Household leak'; end if;
 begin perform public.complete_help_request((select target from fixture),'00000000-0000-4000-8000-000000000052');raise exception 'Outsider completed task';exception when raise_exception then if sqlerrm='Outsider completed task' then raise;end if;end;
 begin perform public.helper_reputation('00000000-0000-4000-8000-000000000052');raise exception 'Outsider accessed ratings';exception when raise_exception then if sqlerrm='Outsider accessed ratings' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000051',true);
select public.complete_help_request((select target from fixture),'00000000-0000-4000-8000-000000000052');
select public.review_helper((select target from fixture),5,'Helpful');
do $$ begin
 if not exists(select 1 from public.helper_reputation('00000000-0000-4000-8000-000000000052') where rating=5 and review_count=1) then raise exception 'Rating missing';end if;
 begin update public.help_requests set status='completed' where id=(select target from fixture);raise exception 'Direct completion bypass';exception when raise_exception then if sqlerrm='Direct completion bypass' then raise;end if;end;
 begin perform public.review_helper((select target from fixture),4,'Duplicate');raise exception 'Duplicate review';exception when unique_violation then null;end;
end $$;
select public.remove_household_member('00000000-0000-4000-8000-000000000052');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000052',true);
do $$ begin if exists(select 1 from public.my_household()) then raise exception 'Removed household member access';end if;end $$;
reset role;
rollback;
