-- Fix: duplicate key value violates unique constraint "organizations_email_unique_idx"
--
-- Run this in Supabase SQL Editor.
-- It removes the email-only unique rule from public.organizations so the same
-- email can register more than one organization/school/type.

do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'public.organizations table does not exist';
  end if;

  -- If the unique rule was created as a table constraint, remove it.
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'organizations'
      and constraint_name = 'organizations_email_unique_idx'
  ) then
    alter table public.organizations
      drop constraint organizations_email_unique_idx;
  end if;

  -- If the unique rule was created as an index, remove it.
  drop index if exists public.organizations_email_unique_idx;

  -- Keep email lookup fast, but not unique.
  create index if not exists organizations_email_lookup_idx
    on public.organizations (lower(trim(email)))
    where email is not null and trim(email) <> '';
end $$;

-- Confirm the email-only unique rule is gone.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'organizations'
  and indexname ilike '%email%';

