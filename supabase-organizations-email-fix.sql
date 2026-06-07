-- Fix duplicate key errors from organizations_email_unique_idx.
-- Use this when one email should be allowed to register more than one organization type
-- such as school, company, church, Sacco, etc.

-- 1) Check existing duplicates before changing indexes.
select
  lower(trim(email)) as normalized_email,
  count(*) as records
from public.organizations
where email is not null and trim(email) <> ''
group by lower(trim(email))
having count(*) > 1
order by records desc, normalized_email;

-- 2) Replace the single-email unique index with a safer unique key.
-- It allows the same email for different organization types, but blocks the
-- same email registering the same organization type twice.
do $$
declare
  type_column text;
begin
  if to_regclass('public.organizations') is null then
    raise exception 'public.organizations table does not exist';
  end if;

  select column_name
    into type_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'organizations'
    and column_name in ('organization_type', 'org_type', 'type')
  order by case column_name
    when 'organization_type' then 1
    when 'org_type' then 2
    when 'type' then 3
    else 4
  end
  limit 1;

  if type_column is null then
    raise exception 'No organization type column found. Add organization_type first, or keep email unique and show a clean duplicate-email message in the app.';
  end if;

  drop index if exists public.organizations_email_unique_idx;

  execute format(
    'create unique index if not exists organizations_email_type_unique_idx on public.organizations (lower(trim(email)), lower(trim(%I))) where email is not null and trim(email) <> ''''',
    type_column
  );
end $$;

