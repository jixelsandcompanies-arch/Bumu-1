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

create table if not exists public.agents (
  id text primary key default ('AGT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  agent_code text not null unique,
  full_name text not null,
  national_id text,
  phone text not null,
  email text not null unique,
  region text,
  status text not null default 'active' check (status in ('active', 'pending', 'suspended', 'inactive')),
  source_portal text not null default 'agent',
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
  follow_up_sent_at timestamptz,
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

create table if not exists public.agent_tasks (
  id text primary key default ('ATK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  agent_id text not null references public.agents(id) on delete cascade,
  customer_id text references public.customers(id) on delete cascade,
  title text not null,
  note text,
  due_label text,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  completed_at timestamptz,
  source_portal text not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create table if not exists public.payment_requests (
  id text primary key default ('PQR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id text not null references public.customers(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider_reference text,
  backend_reference text,
  failure_reason text,
  source_portal text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_notifications (
  id text primary key default ('CNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id text not null references public.customers(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  source_portal text not null default 'backend',
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_requests (
  id text primary key default ('PRR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  email text not null,
  phone text not null,
  otp_code text,
  status text not null default 'otp_required' check (status in ('otp_required', 'otp_sent', 'verified', 'completed', 'failed', 'cancelled')),
  source_portal text not null default 'customer',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists product_type text not null default 'bike';
alter table public.customers add column if not exists product_model text;
alter table public.customers add column if not exists chassis_number text;
alter table public.customers add column if not exists imei text;
alter table public.customers add column if not exists daily_installment numeric(14,2) not null default 0;
alter table public.customers add column if not exists final_payment_date date;
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
alter table public.commissions add column if not exists follow_up_sent_at timestamptz;
alter table public.reconciliation add column if not exists provider_amount numeric(14,2) not null default 0;
alter table public.payment_requests add column if not exists backend_reference text;
alter table public.payment_requests add column if not exists source_portal text not null default 'customer';
alter table public.password_reset_requests add column if not exists source_portal text not null default 'customer';
alter table public.agents add column if not exists source_portal text not null default 'agent';
alter table public.agent_tasks add column if not exists completed_at timestamptz;
alter table public.agent_tasks add column if not exists source_portal text not null default 'agent';

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

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at before update on public.agents
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

drop trigger if exists agent_tasks_set_updated_at on public.agent_tasks;
create trigger agent_tasks_set_updated_at before update on public.agent_tasks
for each row execute function public.set_updated_at();

drop trigger if exists finance_notifications_set_updated_at on public.finance_notifications;
create trigger finance_notifications_set_updated_at before update on public.finance_notifications
for each row execute function public.set_updated_at();

drop trigger if exists payment_requests_set_updated_at on public.payment_requests;
create trigger payment_requests_set_updated_at before update on public.payment_requests
for each row execute function public.set_updated_at();

drop trigger if exists password_reset_requests_set_updated_at on public.password_reset_requests;
create trigger password_reset_requests_set_updated_at before update on public.password_reset_requests
for each row execute function public.set_updated_at();

drop trigger if exists reconciliation_set_updated_at on public.reconciliation;
create trigger reconciliation_set_updated_at before update on public.reconciliation
for each row execute function public.set_updated_at();

create unique index if not exists idx_customers_auth_user_unique on public.customers (auth_user_id) where auth_user_id is not null;
create index if not exists idx_customers_email on public.customers (lower(email));
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
create unique index if not exists idx_agents_auth_user_unique on public.agents (auth_user_id) where auth_user_id is not null;
create unique index if not exists idx_agents_code_unique on public.agents (agent_code);
create unique index if not exists idx_agents_email_unique on public.agents (lower(email));
create index if not exists idx_agents_status_region on public.agents (status, region);
create index if not exists idx_agent_tasks_agent_status on public.agent_tasks (agent_id, status, created_at desc);
create index if not exists idx_agent_tasks_customer on public.agent_tasks (customer_id, created_at desc);
create index if not exists idx_finance_notifications_status_created on public.finance_notifications (status, created_at desc);
create index if not exists idx_finance_notifications_type_created on public.finance_notifications (type, created_at desc);
create index if not exists idx_finance_notifications_customer on public.finance_notifications (customer_id, created_at desc);
create index if not exists idx_payment_requests_customer_created on public.payment_requests (customer_id, created_at desc);
create index if not exists idx_payment_requests_status_created on public.payment_requests (status, created_at desc);
create index if not exists idx_customer_notifications_customer_created on public.customer_notifications (customer_id, created_at desc);
create index if not exists idx_customer_notifications_status_created on public.customer_notifications (status, created_at desc);
create index if not exists idx_password_reset_requests_email_created on public.password_reset_requests (lower(email), created_at desc);

create or replace view public.customer_portal_summary as
select
  c.id as customer_id,
  c.auth_user_id,
  c.customer_name,
  c.customer_phone,
  c.email,
  c.national_id,
  c.product_type,
  coalesce(c.product_model, c.bike_model) as product_model,
  c.serial_number,
  c.chassis_number,
  c.imei,
  c.agent_name,
  c.agent_id,
  c.total_payable,
  c.daily_installment,
  c.due_date,
  c.final_payment_date,
  c.last_payment_date,
  c.status,
  c.overdue_days,
  coalesce(sum(
    case when p.status in ('paid', 'completed')
      then case
        when coalesce(p.deposit_credit, 0) + coalesce(p.paygo_payment, 0) > 0
          then coalesce(p.deposit_credit, 0) + coalesce(p.paygo_payment, 0)
        else coalesce(p.paid_amount, 0)
      end
      else 0
    end
  ), 0) as total_paid,
  greatest(c.total_payable - coalesce(sum(
    case when p.status in ('paid', 'completed')
      then case
        when coalesce(p.deposit_credit, 0) + coalesce(p.paygo_payment, 0) > 0
          then coalesce(p.deposit_credit, 0) + coalesce(p.paygo_payment, 0)
        else coalesce(p.paid_amount, 0)
      end
      else 0
    end
  ), 0), 0) as computed_balance
from public.customers c
left join public.payments p on p.customer_id = c.id
group by c.id;

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
alter table public.agents enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.agent_payout_requests enable row level security;
alter table public.reconciliation enable row level security;
alter table public.agent_notifications enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.finance_notifications enable row level security;
alter table public.payment_requests enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.password_reset_requests enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.agents from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.commissions from anon, authenticated;
revoke all on table public.agent_payout_requests from anon, authenticated;
revoke all on table public.reconciliation from anon, authenticated;
revoke all on table public.agent_notifications from anon, authenticated;
revoke all on table public.agent_tasks from anon, authenticated;
revoke all on table public.finance_notifications from anon, authenticated;
revoke all on table public.payment_requests from anon, authenticated;
revoke all on table public.customer_notifications from anon, authenticated;
revoke all on table public.password_reset_requests from anon, authenticated;
revoke all on table public.customer_portal_summary from anon, authenticated;

-- Portals should access these tables through secured server-side APIs using SUPABASE_SERVICE_ROLE_KEY.
-- Add user-facing RLS policies later only if a portal reads Supabase directly from the browser.
