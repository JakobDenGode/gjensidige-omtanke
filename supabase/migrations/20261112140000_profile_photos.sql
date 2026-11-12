begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,1048576,array['image/jpeg']);

create function public.can_view_profile_photo(path text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u where path=u.id::text || '/avatar.jpg' and (
      u.id=auth.uid() or exists(select 1 from public.user_friends f where
        (f.user_id=auth.uid() and f.friend_id=u.id) or (f.friend_id=auth.uid() and f.user_id=u.id))
      or exists(select 1 from public.household_members me join public.household_members other
        on me.household_id=other.household_id where me.user_id=auth.uid() and other.user_id=u.id)
    )
  );
$$;
revoke all on function public.can_view_profile_photo(text) from public,anon;
grant execute on function public.can_view_profile_photo(text) to authenticated;
create policy "Authorized people read profile photos" on storage.objects for select to authenticated
  using (bucket_id='profile-photos' and public.can_view_profile_photo(name));
create policy "Owners upload profile photos" on storage.objects for insert to authenticated
  with check (bucket_id='profile-photos' and name=auth.uid()::text || '/avatar.jpg');
create policy "Owners replace profile photos" on storage.objects for update to authenticated
  using (bucket_id='profile-photos' and name=auth.uid()::text || '/avatar.jpg')
  with check (bucket_id='profile-photos' and name=auth.uid()::text || '/avatar.jpg');
create policy "Owners remove profile photos" on storage.objects for delete to authenticated
  using (bucket_id='profile-photos' and name=auth.uid()::text || '/avatar.jpg');
commit;
