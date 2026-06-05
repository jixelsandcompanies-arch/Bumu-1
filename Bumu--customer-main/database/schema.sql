create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text unique,
  national_id text,
  support_phone text,
  support_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_bikes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  model text not null,
  serial_number text not null unique,
  assigned_date date,
  total_price numeric(12, 2) not null default 0,
  daily_installment numeric(12, 2) not null default 0,
  next_due_date date,
  final_payment_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  bike_id uuid references public.customer_bikes(id) on delete set null,
  amount numeric(12, 2) not null,
  phone_used text,
  mpesa_receipt text,
  status text not null default 'pending',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  unread boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  bike_id uuid references public.customer_bikes(id) on delete set null,
  amount numeric(12, 2) not null,
  phone text not null,
  status text not null default 'pending',
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text not null,
  otp_code text,
  status text not null default 'otp_required',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.customer_portal_summary as
select
  c.id as customer_id,
  c.full_name,
  c.phone,
  c.email,
  c.national_id,
  c.support_phone,
  c.support_email,
  b.id as bike_id,
  b.model,
  b.serial_number,
  b.assigned_date,
  b.total_price,
  b.daily_installment,
  b.next_due_date,
  b.final_payment_date,
  b.status as bike_status,
  coalesce(sum(case when p.status = 'completed' then p.amount else 0 end), 0) as total_paid,
  greatest(b.total_price - coalesce(sum(case when p.status = 'completed' then p.amount else 0 end), 0), 0) as balance
from public.customers c
left join public.customer_bikes b on b.customer_id = c.id
left join public.payments p on p.customer_id = c.id and (p.bike_id = b.id or p.bike_id is null)
group by c.id, b.id;

alter table public.customers enable row level security;
alter table public.customer_bikes enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_requests enable row level security;
alter table public.password_reset_requests enable row level security;

create policy "customers can read own profile"
  on public.customers for select
  using (auth.uid() = id);

create policy "customers can update own profile"
  on public.customers for update
  using (auth.uid() = id);

create policy "customers can read own bikes"
  on public.customer_bikes for select
  using (auth.uid() = customer_id);

create policy "customers can read own payments"
  on public.payments for select
  using (auth.uid() = customer_id);

create policy "customers can read own notifications"
  on public.notifications for select
  using (auth.uid() = customer_id);

create policy "customers can update own notifications"
  on public.notifications for update
  using (auth.uid() = customer_id);

create policy "customers can create payment requests"
  on public.payment_requests for insert
  with check (auth.uid() = customer_id);

create policy "customers can read own payment requests"
  on public.payment_requests for select
  using (auth.uid() = customer_id);

create policy "anyone can request password reset otp"
  on public.password_reset_requests for insert
  with check (true);
