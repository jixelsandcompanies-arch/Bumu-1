-- Bumu Paygo shared CRM Supabase schema
-- Run once in the Supabase SQL Editor before deploying the portals.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.customers (
  id text primary key default ('CUS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  customer_phone text,
  national_id text,
  email text,
  bike_model text,
  serial_number text,
  chassis_number text,
  imei text,
  agent_name text,
  agent_id text,
  total_payable numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  due_date date,
  last_payment_date date,
  status text not null default 'active' check (status in ('active', 'defaulted', 'paid', 'not_registered')),
  overdue_days integer not null default 0,
  registration_status text generated always as (status) stored,
  source_portal text not null default 'finance',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key default ('PAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  product_type text not null default 'bike',
  product_model text,
  agent_name text,
  agent_id text,
  bike_model text,
  serial_number text,
  chassis_number text,
  imei text,
  total_payable numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  due_date date,
  registration_status text not null default 'registered',
  deposit_credit numeric(14,2) not null default 0,
  paygo_payment numeric(14,2) not null default 0,
  date timestamptz not null default now(),
  receipt text unique,
  provider_reference text,
  provider_transaction_id text,
  provider_account_reference text,
  provider_payer_phone text,
  provider_paid_at timestamptz,
  method text not null default 'manual',
  status text not null default 'paid' check (status in ('paid', 'unpaid', 'completed')),
  source_portal text not null default 'finance',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id text primary key default ('COM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  payment_id text references public.payments(id) on delete set null,
  agent_name text not null,
  agent_code text not null,
  agent_phone text,
  customer_name text,
  product_type text not null default 'product',
  product_model text,
  serial_number text,
  chassis_number text,
  imei text,
  type text not null default 'payment_percentage',
  amount numeric(14,2) not null default 0,
  status text not null default 'earned' check (status in ('earned', 'processing', 'paid', 'failed', 'cancelled')),
  earned_at timestamptz not null default now(),
  paid_at timestamptz,
  payout_status text not null default 'not_requested' check (payout_status in ('not_requested', 'queued', 'processing', 'paid', 'failed', 'cancelled')),
  payout_requested_at timestamptz,
  payout_completed_at timestamptz,
  payout_reference text,
  provider_response jsonb not null default '{}'::jsonb,
  payout_error text,
  finance_approved_at timestamptz,
  finance_approval_reference text,
  source_portal text not null default 'finance',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_payout_requests (
  id text primary key default ('APR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  commission_id text not null references public.commissions(id) on delete cascade,
  agent_name text not null,
  agent_code text not null,
  agent_phone text,
  amount numeric(14,2) not null default 0,
  status text not null default 'queued' check (status in ('queued', 'processing', 'paid', 'failed', 'cancelled')),
  finance_approval_reference text,
  backend_reference text,
  provider_reference text,
  provider_response jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reconciliation (
  id text primary key default ('REC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  payment_id text references public.payments(id) on delete set null,
  receipt text,
  customer_name text not null default 'Unknown account ref',
  national_id text,
  provider_amount numeric(14,2) not null default 0,
  system_amount numeric(14,2),
  date date not null default current_date,
  status text not null default 'unmatched' check (status in ('matched', 'unmatched', 'missing', 'amount_mismatch')),
  source_portal text not null default 'finance',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_notifications (
  id text primary key default ('AGN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  agent_name text,
  agent_code text,
  agent_phone text,
  customer_name text,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'read')),
  source_portal text not null default 'finance',
  created_at timestamptz not null default now()
);

create table if not exists public.finance_notifications (
  id text primary key default ('FNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  type text not null default 'payment_unpaid',
  title text not null,
  message text not null,
  issue text,
  follow_up text,
  customer_id text references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  agent_name text,
  agent_code text,
  payment_id text references public.payments(id) on delete set null,
  payment_date timestamptz,
  amount numeric(14,2),
  balance numeric(14,2),
  overdue_days integer,
  source_portal text not null default 'backend',
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical', 'success')),
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers add column if not exists product_type text not null default 'bike';
alter table public.customers add column if not exists product_model text;
alter table public.customers add column if not exists chassis_number text;
alter table public.customers add column if not exists imei text;
alter table public.payments add column if not exists product_type text not null default 'bike';
alter table public.payments add column if not exists product_model text;
alter table public.payments add column if not exists chassis_number text;
alter table public.payments add column if not exists imei text;
alter table public.payments add column if not exists provider_reference text;
alter table public.payments add column if not exists provider_transaction_id text;
alter table public.payments add column if not exists provider_account_reference text;
alter table public.payments add column if not exists provider_payer_phone text;
alter table public.payments add column if not exists provider_paid_at timestamptz;
alter table public.commissions add column if not exists product_type text not null default 'product';
alter table public.commissions add column if not exists product_model text;
alter table public.commissions add column if not exists serial_number text;
alter table public.commissions add column if not exists chassis_number text;
alter table public.commissions add column if not exists imei text;
alter table public.commissions add column if not exists payout_status text not null default 'not_requested';
alter table public.commissions add column if not exists payout_requested_at timestamptz;
alter table public.commissions add column if not exists payout_completed_at timestamptz;
alter table public.commissions add column if not exists payout_reference text;
alter table public.commissions add column if not exists provider_response jsonb not null default '{}'::jsonb;
alter table public.commissions add column if not exists finance_approved_at timestamptz;
alter table public.commissions add column if not exists finance_approval_reference text;
alter table public.reconciliation add column if not exists provider_amount numeric(14,2) not null default 0;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at before update on public.commissions
for each row execute function public.set_updated_at();

drop trigger if exists agent_payout_requests_set_updated_at on public.agent_payout_requests;
create trigger agent_payout_requests_set_updated_at before update on public.agent_payout_requests
for each row execute function public.set_updated_at();

drop trigger if exists finance_notifications_set_updated_at on public.finance_notifications;
create trigger finance_notifications_set_updated_at before update on public.finance_notifications
for each row execute function public.set_updated_at();

drop trigger if exists reconciliation_set_updated_at on public.reconciliation;
create trigger reconciliation_set_updated_at before update on public.reconciliation
for each row execute function public.set_updated_at();

create index if not exists idx_customers_agent on public.customers (lower(agent_name), lower(agent_id));
create index if not exists idx_customers_phone on public.customers (customer_phone);
create index if not exists idx_customers_status_due on public.customers (status, due_date);
create index if not exists idx_customers_search_name on public.customers using gin (lower(customer_name) gin_trgm_ops);
create index if not exists idx_customers_search_phone on public.customers using gin (customer_phone gin_trgm_ops);
create index if not exists idx_payments_customer on public.payments (customer_id);
create index if not exists idx_payments_date on public.payments (date desc);
create index if not exists idx_payments_agent on public.payments (lower(agent_name), lower(agent_id));
create index if not exists idx_payments_status_date on public.payments (status, date desc);
create index if not exists idx_payments_source_date on public.payments (source_portal, date desc);
create index if not exists idx_payments_product_date on public.payments (product_type, date desc);
create index if not exists idx_payments_receipt on public.payments (receipt);
create index if not exists idx_payments_provider_reference on public.payments (provider_reference);
create index if not exists idx_payments_provider_account on public.payments (provider_account_reference);
create index if not exists idx_payments_provider_paid_at on public.payments (provider_paid_at desc);
create index if not exists idx_payments_chassis_number on public.payments (chassis_number);
create index if not exists idx_payments_imei on public.payments (imei);
create index if not exists idx_payments_search_customer on public.payments using gin (lower(customer_name) gin_trgm_ops);
create index if not exists idx_commissions_agent on public.commissions (lower(agent_code), lower(agent_name));
create index if not exists idx_commissions_status on public.commissions (status);
create index if not exists idx_commissions_status_earned on public.commissions (status, earned_at desc);
create index if not exists idx_commissions_payment on public.commissions (payment_id);
create index if not exists idx_commissions_product on public.commissions (product_type, earned_at desc);
create index if not exists idx_commissions_chassis_number on public.commissions (chassis_number);
create index if not exists idx_commissions_imei on public.commissions (imei);
create index if not exists idx_commissions_payout_status on public.commissions (payout_status, payout_requested_at desc);
create unique index if not exists idx_agent_payout_requests_commission_unique on public.agent_payout_requests (commission_id);
create index if not exists idx_agent_payout_requests_status_requested on public.agent_payout_requests (status, requested_at desc);
create index if not exists idx_agent_payout_requests_agent on public.agent_payout_requests (lower(agent_code), lower(agent_name));
create index if not exists idx_reconciliation_date on public.reconciliation (date desc);
create index if not exists idx_reconciliation_status_date on public.reconciliation (status, date desc);
create index if not exists idx_reconciliation_receipt on public.reconciliation (receipt);
create index if not exists idx_agent_notifications_agent on public.agent_notifications (lower(agent_code), lower(agent_name));
create index if not exists idx_agent_notifications_status_created on public.agent_notifications (status, created_at desc);
create index if not exists idx_finance_notifications_status_created on public.finance_notifications (status, created_at desc);
create index if not exists idx_finance_notifications_type_created on public.finance_notifications (type, created_at desc);
create index if not exists idx_finance_notifications_customer on public.finance_notifications (customer_id, created_at desc);

create or replace function public.finance_dashboard_summary(days_back integer default 30)
returns jsonb
language sql
stable
as $$
  with payment_summary as (
    select
      coalesce(sum(deposit_credit + paygo_payment), 0) as total_collected,
      count(*) filter (where date::date = current_date) as today_collections,
      count(*) filter (where status = 'unpaid') as unpaid_payments
    from public.payments
  ),
  customer_summary as (
    select
      coalesce(sum(total_payable), 0) as expected_amount,
      coalesce(sum(balance) filter (where balance > 0), 0) as pending_payments,
      coalesce(sum(balance) filter (where overdue_days > 0 or status = 'defaulted'), 0) as overdue_amount,
      count(*) filter (where status <> 'paid') as active_accounts
    from public.customers
  ),
  commission_summary as (
    select
      coalesce(sum(amount) filter (where status <> 'paid'), 0) as unpaid_commissions,
      count(*) filter (where status = 'earned') as pending_commissions
    from public.commissions
  ),
  reconciliation_summary as (
    select count(*) filter (where status <> 'matched') as reconciliation_flags
    from public.reconciliation
  ),
  trend_summary as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('date', day::text, 'amount', amount, 'records', records)
        order by day
      ),
      '[]'::jsonb
    ) as trend
    from (
      select
        date::date as day,
        coalesce(sum(deposit_credit + paygo_payment), 0) as amount,
        count(*) as records
      from public.payments
      where date >= current_date - make_interval(days => greatest(days_back, 1))
      group by date::date
    ) daily
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_collected', payment_summary.total_collected,
      'expected_amount', customer_summary.expected_amount,
      'expected_collection', customer_summary.expected_amount,
      'pending_payments', customer_summary.pending_payments,
      'overdue_amount', customer_summary.overdue_amount,
      'reconciliation_flags', reconciliation_summary.reconciliation_flags,
      'unpaid_commissions', commission_summary.unpaid_commissions,
      'active_accounts', customer_summary.active_accounts,
      'today_collections', payment_summary.today_collections,
      'unpaid_payments', payment_summary.unpaid_payments,
      'pending_commissions', commission_summary.pending_commissions
    ),
    'trend', trend_summary.trend
  )
  from payment_summary, customer_summary, commission_summary, reconciliation_summary, trend_summary;
$$;

alter table public.customers enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.agent_payout_requests enable row level security;
alter table public.reconciliation enable row level security;
alter table public.agent_notifications enable row level security;
alter table public.finance_notifications enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.commissions from anon, authenticated;
revoke all on table public.agent_payout_requests from anon, authenticated;
revoke all on table public.reconciliation from anon, authenticated;
revoke all on table public.agent_notifications from anon, authenticated;
revoke all on table public.finance_notifications from anon, authenticated;

-- Portals should access these tables through secured server-side APIs using SUPABASE_SERVICE_ROLE_KEY.
-- Add user-facing RLS policies later only if a portal reads Supabase directly from the browser.

insert into public.customers (
  id, customer_name, customer_phone, national_id, bike_model, serial_number, agent_name, agent_id,
  total_payable, paid_amount, balance, due_date, last_payment_date, status, overdue_days, source_portal
) values
  ('CUS-001', 'Daniel Otieno', '+254711223344', '24578136', 'Boxer 150', 'BX150-88213', 'Mary Wanjiku', 'BUMU-AG-001', 185000, 74200, 110800, '2026-06-02', '2026-05-29', 'active', 0, 'admin'),
  ('CUS-002', 'Brian Mwangi', '+254722334455', '26890134', 'TVS Star', 'TVS-55789', 'Peter Kariuki', 'BUMU-AG-002', 176000, 39200, 136800, '2026-05-25', '2026-05-21', 'defaulted', 5, 'agent'),
  ('CUS-003', 'Amina Said', '+254733445566', '28764409', 'Boxer 150', 'BX150-88190', 'Grace Atieno', 'BUMU-AG-003', 185000, 185000, 0, '2026-05-12', '2026-05-28', 'paid', 0, 'customer')
on conflict (id) do nothing;

insert into public.payments (
  id, customer_id, customer_name, customer_phone, product_type, product_model, agent_name, agent_id, bike_model, serial_number, chassis_number, imei,
  total_payable, paid_amount, balance, due_date, registration_status, deposit_credit,
  paygo_payment, date, receipt, method, status, source_portal
) values
  ('PAY-001', 'CUS-001', 'Daniel Otieno', '+254711223344', 'bike', 'Boxer 150', 'Mary Wanjiku', 'BUMU-AG-001', 'Boxer 150', 'BX150-88213', 'BX150-88213', null, 185000, 74200, 110800, '2026-06-02', 'active', 2300, 2000, '2026-05-29T08:15:00+03:00', 'BUMU-CM-001', 'provider_import', 'paid', 'finance'),
  ('PAY-002', 'CUS-002', 'Brian Mwangi', '+254722334455', 'bike', 'TVS Star', 'Peter Kariuki', 'BUMU-AG-002', 'TVS Star', 'TVS-55789', 'TVS-55789', null, 176000, 39200, 136800, '2026-05-25', 'defaulted', 1800, 1500, '2026-05-29T10:42:00+03:00', 'BUMU-CM-002', 'backend_import', 'paid', 'backend'),
  ('PAY-003', 'CUS-003', 'Amina Said', '+254733445566', 'bike', 'Boxer 150', 'Grace Atieno', 'BUMU-AG-003', 'Boxer 150', 'BX150-88190', 'BX150-88190', null, 185000, 185000, 0, '2026-05-12', 'paid', 3000, 2500, '2026-05-28T14:20:00+03:00', 'BUMU-CM-003', 'manual', 'paid', 'finance'),
  ('PAY-004', null, 'Nancy Wairimu', '+254712345004', 'phone', 'Tecno Spark PAYGO', 'Mary Wanjiku', 'BUMU-AG-001', 'Tecno Spark PAYGO', 'IMEI-3567001004', null, 'IMEI-3567001004', 24000, 8500, 15500, '2026-06-08', 'active', 6500, 2000, '2026-05-31T10:05:00+03:00', 'PHONE-RC-1004', 'manual', 'paid', 'finance')
on conflict (id) do nothing;

insert into public.commissions (id, payment_id, agent_name, agent_code, agent_phone, customer_name, product_type, product_model, serial_number, chassis_number, imei, type, amount, status, earned_at, paid_at, source_portal) values
  ('COM-001', 'PAY-001', 'Mary Wanjiku', 'BUMU-AG-001', '+254712111001', 'Daniel Otieno', 'bike', 'Boxer 150', 'BX150-88213', 'BX150-88213', null, 'payment_percentage', 115, 'earned', '2026-05-29T08:15:00+03:00', null, 'finance'),
  ('COM-002', 'PAY-002', 'Peter Kariuki', 'BUMU-AG-002', '+254712111002', 'Brian Mwangi', 'bike', 'TVS Star', 'TVS-55789', 'TVS-55789', null, 'payment_percentage', 125, 'paid', '2026-05-29T10:42:00+03:00', '2026-05-29T15:00:00+03:00', 'finance'),
  ('COM-003', 'PAY-004', 'Mary Wanjiku', 'BUMU-AG-001', '+254712111001', 'Nancy Wairimu', 'phone', 'Tecno Spark PAYGO', 'IMEI-3567001004', null, 'IMEI-3567001004', 'sale_activation_commission', 195, 'earned', '2026-05-31T10:05:00+03:00', null, 'finance')
on conflict (id) do nothing;

update public.commissions
set payout_status = 'paid',
    payout_completed_at = paid_at
where status = 'paid'
  and paid_at is not null
  and payout_status = 'not_requested';

insert into public.reconciliation (id, payment_id, receipt, customer_name, national_id, provider_amount, system_amount, date, status, source_portal) values
  ('REC-001', 'PAY-001', 'BUMU-CM-001', 'Daniel Otieno', '24578136', 2300, 2300, '2026-05-29', 'matched', 'finance'),
  ('REC-002', null, 'BUMU-CM-005', 'Unknown account ref', 'No data yet', 1700, null, '2026-05-29', 'unmatched', 'backend')
on conflict (id) do nothing;
