-- Bumu Paygo Finance Supabase schema
-- Paste this into Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id text primary key default ('CUS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  customer_phone text,
  bike_model text,
  serial_number text,
  agent_name text not null,
  agent_id text not null,
  total_payable numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  due_date date,
  last_payment_date date,
  status text not null default 'active' check (status in ('active', 'defaulted', 'paid', 'not_registered')),
  overdue_days integer not null default 0,
  registration_status text generated always as (status) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key default ('PAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  customer_phone text,
  agent_name text not null,
  agent_id text,
  bike_model text,
  serial_number text,
  total_payable numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  due_date date,
  registration_status text not null default 'registered',
  deposit_credit numeric(14,2) not null default 0,
  paygo_payment numeric(14,2) not null default 0,
  date timestamptz not null default now(),
  receipt text unique,
  method text not null default 'manual',
  status text not null default 'paid' check (status in ('paid', 'unpaid', 'completed')),
  source_portal text not null default 'Supabase',
  synced_to_backend boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id text primary key default ('COM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  agent_name text not null,
  agent_code text not null,
  customer_name text,
  type text not null default 'payment_percentage',
  amount numeric(14,2) not null default 0,
  status text not null default 'earned' check (status in ('earned', 'paid', 'cancelled')),
  earned_at date not null default current_date,
  paid_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation (
  id text primary key default ('REC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  receipt text,
  customer_name text not null default 'Unknown account ref',
  national_id text,
  mpesa_amount numeric(14,2) not null default 0,
  system_amount numeric(14,2),
  date date not null default current_date,
  status text not null default 'unmatched' check (status in ('matched', 'unmatched', 'amount_mismatch')),
  created_at timestamptz not null default now()
);

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
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index if not exists idx_customers_agent on public.customers (lower(agent_name), lower(agent_id));
create index if not exists idx_payments_date on public.payments (date desc);
create index if not exists idx_payments_agent on public.payments (lower(agent_name), lower(agent_id));
create index if not exists idx_commissions_status on public.commissions (status);
create index if not exists idx_reconciliation_date on public.reconciliation (date desc);

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

-- The app reads and writes these tables only through the secured Vercel API.
-- Vercel uses SUPABASE_SERVICE_ROLE_KEY server-side, so no public table policy is required.

insert into public.customers (
  id, customer_name, customer_phone, bike_model, serial_number, agent_name, agent_id,
  total_payable, paid_amount, balance, due_date, last_payment_date, status, overdue_days
) values
  ('CUS-001', 'Daniel Otieno', '+254711223344', 'Boxer 150', 'BX150-88213', 'Mary Wanjiku', 'BUMU-AG-001', 185000, 74200, 110800, '2026-06-02', '2026-05-29', 'active', 0),
  ('CUS-002', 'Brian Mwangi', '+254722334455', 'TVS Star', 'TVS-55789', 'Peter Kariuki', 'BUMU-AG-002', 176000, 39200, 136800, '2026-05-25', '2026-05-21', 'defaulted', 5),
  ('CUS-003', 'Amina Said', '+254733445566', 'Boxer 150', 'BX150-88190', 'Grace Atieno', 'BUMU-AG-003', 185000, 185000, 0, '2026-05-12', '2026-05-28', 'paid', 0),
  ('CUS-004', 'John Kiptoo', '+254744556677', 'Honda Ace', 'HAC-32444', 'Mary Wanjiku', 'BUMU-AG-001', 198000, 61000, 137000, '2026-05-24', '2026-05-17', 'defaulted', 6)
on conflict (id) do nothing;

insert into public.payments (
  id, customer_name, customer_phone, agent_name, agent_id, bike_model, serial_number,
  total_payable, paid_amount, balance, due_date, registration_status, deposit_credit,
  paygo_payment, date, receipt, method, status, source_portal
) values
  ('PAY-001', 'Daniel Otieno', '+254711223344', 'Mary Wanjiku', 'BUMU-AG-001', 'Boxer 150', 'BX150-88213', 185000, 74200, 110800, '2026-06-02', 'active', 2300, 2000, '2026-05-29T08:15:00+03:00', 'BUMU-CM-001', 'mpesa', 'paid', 'Supabase'),
  ('PAY-002', 'Brian Mwangi', '+254722334455', 'Peter Kariuki', 'BUMU-AG-002', 'TVS Star', 'TVS-55789', 176000, 39200, 136800, '2026-05-25', 'defaulted', 1800, 1500, '2026-05-29T10:42:00+03:00', 'BUMU-CM-002', 'mpesa', 'paid', 'Supabase'),
  ('PAY-003', 'Amina Said', '+254733445566', 'Grace Atieno', 'BUMU-AG-003', 'Boxer 150', 'BX150-88190', 185000, 185000, 0, '2026-05-12', 'paid', 3000, 2500, '2026-05-28T14:20:00+03:00', 'BUMU-CM-003', 'manual', 'paid', 'Supabase'),
  ('PAY-004', 'John Kiptoo', '+254744556677', 'Mary Wanjiku', 'BUMU-AG-001', 'Honda Ace', 'HAC-32444', 198000, 61000, 137000, '2026-05-24', 'defaulted', 1500, 1500, '2026-05-28T16:50:00+03:00', 'BUMU-CM-004', 'mpesa', 'unpaid', 'Supabase'),
  ('PAY-005', 'Moses Njoroge', '+254755667788', 'Peter Kariuki', 'BUMU-AG-002', null, null, 0, 0, 0, null, 'not_registered', 2500, 2000, '2026-05-27T09:05:00+03:00', 'BUMU-CM-005', 'mpesa', 'paid', 'Supabase')
on conflict (id) do nothing;

insert into public.commissions (id, agent_name, agent_code, customer_name, type, amount, status, earned_at, paid_at) values
  ('COM-001', 'Mary Wanjiku', 'BUMU-AG-001', 'Daniel Otieno', 'payment_percentage', 115, 'earned', '2026-05-29', null),
  ('COM-002', 'Peter Kariuki', 'BUMU-AG-002', 'Moses Njoroge', 'payment_percentage', 125, 'paid', '2026-05-27', '2026-05-29'),
  ('COM-003', 'Grace Atieno', 'BUMU-AG-003', 'Amina Said', 'registration_bonus', 800, 'earned', '2026-05-28', null)
on conflict (id) do nothing;

insert into public.reconciliation (id, receipt, customer_name, national_id, mpesa_amount, system_amount, date, status) values
  ('REC-001', 'BUMU-CM-001', 'Daniel Otieno', '24578136', 2300, 2300, '2026-05-29', 'matched'),
  ('REC-002', 'BUMU-CM-005', 'Unknown account ref', 'No data yet', 1700, null, '2026-05-29', 'unmatched'),
  ('REC-003', 'BUMU-CM-003', 'Amina Said', '28764409', 3000, 2800, '2026-05-28', 'amount_mismatch')
on conflict (id) do nothing;
