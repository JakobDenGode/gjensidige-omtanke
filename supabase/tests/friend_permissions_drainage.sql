begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000102'),('00000000-0000-4000-8000-000000000103');
insert into public.customer_profiles(user_id,city,full_name,preferences_completed) values
 ('00000000-0000-4000-8000-000000000101','Oslo','Owner',true),
 ('00000000-0000-4000-8000-000000000102','Oslo','Friend',true),
 ('00000000-0000-4000-8000-000000000103','Oslo','Outsider',true);
create temporary table fixture(code text,connection uuid);grant all on fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
insert into fixture(code) select public.create_friend_invitation_with_permissions('Friend','12345678','',true,true,true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
update fixture set connection=public.accept_friend_invitation(code,'Friend');
do $$begin
 if not (public.shared_friend_details('00000000-0000-4000-8000-000000000101')->>'share_requests')::boolean then raise exception 'Permission not applied';end if;
end $$;
select public.create_request_for_friend('00000000-0000-4000-8000-000000000101','Shared task','Denne uken');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
do $$begin
 begin perform public.shared_friend_details('00000000-0000-4000-8000-000000000101');raise exception 'Outsider sees profile';exception when raise_exception then if sqlerrm='Outsider sees profile' then raise;end if;end;
 begin perform public.create_request_for_friend('00000000-0000-4000-8000-000000000101','Invalid','Denne uken');raise exception 'Outsider creates request';exception when raise_exception then if sqlerrm='Outsider creates request' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select public.revoke_friend_permissions((select connection from fixture));
select public.create_directory_request(jsonb_build_object('kind','request','category','Snømåking','tasks',jsonb_build_array('Strø glatte partier'),'preferred_dates',jsonb_build_array((now() at time zone 'Europe/Oslo')::date+1),'drainage_contact_requested',true),'00000000-0000-4000-8000-000000000102');
do $$begin
 if not exists(select 1 from public.help_requests where drainage_contact_requested) then raise exception 'Drainage choice not saved';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
do $$begin
 if (public.shared_friend_details('00000000-0000-4000-8000-000000000101')->>'share_requests')::boolean then raise exception 'Revoked permission persists';end if;
 begin perform public.create_request_for_friend('00000000-0000-4000-8000-000000000101','Invalid','Denne uken');raise exception 'Revoked user creates request';exception when raise_exception then if sqlerrm='Revoked user creates request' then raise;end if;end;
end $$;
reset role;
rollback;
