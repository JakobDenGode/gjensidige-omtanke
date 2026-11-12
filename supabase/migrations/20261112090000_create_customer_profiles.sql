create table public.customer_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  city text not null check (city in ('Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø'))
);
alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from anon, authenticated;
grant select, insert on public.customer_profiles to authenticated;
grant update (city) on public.customer_profiles to authenticated;
create policy "Owners read their profile" on public.customer_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create their profile" on public.customer_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their city" on public.customer_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
