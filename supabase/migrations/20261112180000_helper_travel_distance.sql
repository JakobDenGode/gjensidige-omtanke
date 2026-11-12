begin;
alter table public.customer_profiles add column travel_km integer not null default 3 check(travel_km in (1,3,9));
grant update(travel_km) on public.customer_profiles to authenticated;
-- Approximate postal areas, never street addresses. Used by the authenticated search proxy.
create function public.helper_search_locations()
returns table(member_id uuid,postal_code text,travel_km integer)
language sql stable security definer set search_path=public,pg_temp as $$
 select user_id,postal_code,travel_km from public.customer_profiles
 where auth.uid() is not null and user_id<>auth.uid() and helper_visible and preferences_completed and trim(full_name)<>'';
$$;
revoke all on function public.helper_search_locations() from public,anon;
grant execute on function public.helper_search_locations() to authenticated;
commit;
