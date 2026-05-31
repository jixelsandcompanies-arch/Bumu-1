-- Bumu Paygo Finance Supabase hardening
-- Run this if you already ran an older supabase.sql that created public anon policies.
-- The current app uses secured Vercel API routes with SUPABASE_SERVICE_ROLE_KEY server-side.

alter table public.customers enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.reconciliation enable row level security;

drop policy if exists "finance read customers" on public.customers;
drop policy if exists "finance read payments" on public.payments;
drop policy if exists "finance insert payments" on public.payments;
drop policy if exists "finance read commissions" on public.commissions;
drop policy if exists "finance read reconciliation" on public.reconciliation;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.commissions from anon, authenticated;
revoke all on table public.reconciliation from anon, authenticated;

-- Replace the email with the finance user's Supabase Auth email.
-- This allows the secured backend to admit only finance users.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"finance"}'::jsonb
where email = 'finance@example.com';
