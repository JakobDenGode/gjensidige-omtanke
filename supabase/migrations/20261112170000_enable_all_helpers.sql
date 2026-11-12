begin;
alter table public.customer_profiles alter column helper_visible set default true;
update public.customer_profiles set helper_visible = true;
-- Keep older deployed forms from switching directory visibility off.
create function public.always_enable_helper_visibility() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.helper_visible := true;
  return new;
end $$;
create trigger always_enable_helper_visibility before insert or update on public.customer_profiles
  for each row execute function public.always_enable_helper_visibility();
commit;
