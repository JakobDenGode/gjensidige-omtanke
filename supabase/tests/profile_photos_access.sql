begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000061'),
 ('00000000-0000-4000-8000-000000000062'),
 ('00000000-0000-4000-8000-000000000063');
insert into public.user_friends(user_id,friend_id,user_name,friend_name) values
 ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000062','Owner','Friend');
insert into storage.objects(bucket_id,name) values ('profile-photos','00000000-0000-4000-8000-000000000061/avatar.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
do $$ begin
 if not exists(select 1 from storage.objects where bucket_id='profile-photos') then raise exception 'Friend cannot view photo';end if;
 update storage.objects set name='invalid' where bucket_id='profile-photos';
 if found then raise exception 'Friend can replace photo';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000063',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='profile-photos') then raise exception 'Outsider sees photo';end if;
 begin
  insert into storage.objects(bucket_id,name) values('profile-photos','00000000-0000-4000-8000-000000000061/other.jpg');
  raise exception 'Outsider can upload to another account';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
delete from public.user_friends;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='profile-photos') then raise exception 'Removed friend still sees photo';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
do $$ begin
 update storage.objects set updated_at=now() where bucket_id='profile-photos';
 if not found then raise exception 'Owner cannot replace photo';end if;
 -- Actual deletion must use the Storage API, which enforces the delete policy.
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Owners remove profile photos' and cmd='DELETE') then
   raise exception 'Owner delete policy missing';
 end if;
end $$;
reset role;
rollback;
