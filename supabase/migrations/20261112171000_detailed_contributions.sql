begin;
alter table public.customer_profiles drop constraint customer_profiles_can_help_check;
alter table public.customer_profiles add constraint customer_profiles_can_help_check check (
  can_help <@ array['Snømåking','Besøk og selskap','Hjelp til å handle','Hagearbeid','Vanne planter','Mobil og data','Hente pakker','Turfølge','Praktiske småting','Følge eller selskap','Hage og planter','Noe annet']
);
-- Retain ambiguous legacy choices instead of inventing willingness for specific tasks.
-- Existing users can replace these with the new explicit selections in their profile.
commit;
