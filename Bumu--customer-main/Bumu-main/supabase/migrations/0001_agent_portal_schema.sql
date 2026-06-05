-- BUMU Agent Portal Supabase schema
-- Run this in Supabase SQL Editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_portal_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'portal_role', 'agent');
$$;

create or replace function public.is_admin_or_finance()
returns boolean
language sql
stable
as $$
  select public.current_portal_role() in ('admin', 'finance');
$$;

create or replace function public.current_agent_id()
returns uuid
language sql
stable
as $$
  select id from public.agents where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.can_access_contract(target_contract_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin_or_finance()
    or exists (
      select 1
      from public.rider_contracts rc
      where rc.id = target_contract_id
        and (
          rc.assigned_agent_id = public.current_agent_id()
          or rc.registered_by_agent_id = public.current_agent_id()
        )
    );
$$;

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  agent_code text not null unique,
  full_name text not null,
  national_id text,
  phone text not null,
  email text not null unique,
  region text,
  status text not null default 'active' check (status in ('active', 'suspended', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rider_identities (
  id uuid primary key default gen_random_uuid(),
  rider_person_id text not null unique,
  national_id text not null unique,
  phone text not null,
  full_name text not null,
  date_of_birth date,
  gender text,
  occupation text,
  location text,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index rider_identities_phone_unique
on public.rider_identities (regexp_replace(phone, '[\s-]', '', 'g'));

create table public.rider_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_id text not null unique,
  rider_identity_id uuid not null references public.rider_identities(id) on delete restrict,
  card_id text not null unique,
  rider_assignment_id text not null unique,
  contract_sequence integer not null default 1,
  contract_status text not null default 'pending' check (contract_status in ('pending', 'active', 'overdue', 'cleared', 'blocked', 'cancelled')),
  bike_model text,
  chassis_number text unique,
  total_price numeric(14,2) not null default 0,
  deposit_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  due_date date,
  assigned_agent_id uuid not null references public.agents(id) on delete restrict,
  registered_by_agent_id uuid not null references public.agents(id) on delete restrict,
  linked_previous_contract_id uuid references public.rider_contracts(id) on delete set null,
  linked_previous_agent_id uuid references public.agents(id) on delete set null,
  returning_rider boolean not null default false,
  assignment_note text,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Core anti-cheat rule:
-- one rider identity cannot have two active unpaid contracts at the same time.
create unique index one_active_unpaid_contract_per_rider
on public.rider_contracts (rider_identity_id)
where contract_status in ('pending', 'active', 'overdue') and current_balance > 0;

create index rider_contracts_assigned_agent_idx on public.rider_contracts (assigned_agent_id);
create index rider_contracts_registered_by_idx on public.rider_contracts (registered_by_agent_id);
create index rider_contracts_previous_contract_idx on public.rider_contracts (linked_previous_contract_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  recorded_by_agent_id uuid references public.agents(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  payment_type text not null default 'installment',
  note text,
  balance_after numeric(14,2) not null default 0,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.verification_checklists (
  contract_id uuid primary key references public.rider_contracts(id) on delete cascade,
  id_seen boolean not null default false,
  bike_seen boolean not null default false,
  chassis_confirmed boolean not null default false,
  phone_confirmed boolean not null default false,
  kin_reachable boolean not null default false,
  payment_promise_recorded boolean not null default false,
  updated_by_agent_id uuid references public.agents(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.agent_visits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  note text,
  location_text text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  visited_at timestamptz not null default now()
);

create table public.payment_promises (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  promised_amount numeric(14,2) not null check (promised_amount > 0),
  promised_for date not null,
  note text,
  status text not null default 'open' check (status in ('open', 'kept', 'broken', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.evidence_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  evidence_type text not null default 'photo',
  file_name text,
  storage_path text,
  note text,
  captured_at timestamptz not null default now()
);

create table public.id_scan_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  scanned_national_id text,
  expected_national_id text,
  result text not null check (result in ('match', 'review', 'failed')),
  file_name text,
  storage_path text,
  ocr_text text,
  scanned_at timestamptz not null default now()
);

create table public.chassis_checks (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  typed_chassis text not null,
  expected_chassis text,
  result text not null check (result in ('match', 'mismatch', 'review')),
  checked_at timestamptz not null default now()
);

create table public.excuse_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  excuse text not null,
  repeat_count integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.repair_debt_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  damage_description text not null,
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  evidence_file_name text,
  evidence_storage_path text,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.risk_notes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  note_type text not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table public.duplicate_registration_attempts (
  id uuid primary key default gen_random_uuid(),
  attempted_by_agent_id uuid references public.agents(id) on delete set null,
  matched_contract_id uuid references public.rider_contracts(id) on delete set null,
  attempted_national_id text,
  attempted_phone text,
  attempted_card_id text,
  attempted_chassis text,
  matched_by text[] not null default '{}',
  blocked_reason text not null,
  created_at timestamptz not null default now()
);

create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  title text not null,
  note text,
  due_label text,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.rider_contracts(id) on delete set null,
  agent_id uuid not null references public.agents(id) on delete restrict,
  commission_type text not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  commission_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_agent_id uuid references public.agents(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

create trigger set_agents_updated_at before update on public.agents
for each row execute function public.set_updated_at();

create trigger set_rider_identities_updated_at before update on public.rider_identities
for each row execute function public.set_updated_at();

create trigger set_rider_contracts_updated_at before update on public.rider_contracts
for each row execute function public.set_updated_at();

create trigger set_agent_tasks_updated_at before update on public.agent_tasks
for each row execute function public.set_updated_at();

alter table public.agents enable row level security;
alter table public.rider_identities enable row level security;
alter table public.rider_contracts enable row level security;
alter table public.payments enable row level security;
alter table public.verification_checklists enable row level security;
alter table public.agent_visits enable row level security;
alter table public.payment_promises enable row level security;
alter table public.evidence_logs enable row level security;
alter table public.id_scan_logs enable row level security;
alter table public.chassis_checks enable row level security;
alter table public.excuse_logs enable row level security;
alter table public.repair_debt_requests enable row level security;
alter table public.risk_notes enable row level security;
alter table public.duplicate_registration_attempts enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.commissions enable row level security;
alter table public.audit_logs enable row level security;

create policy "agents see own row or staff see all"
on public.agents for select
using (auth_user_id = auth.uid() or public.is_admin_or_finance());

create policy "agents update own profile"
on public.agents for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "staff can see all rider identities"
on public.rider_identities for select
using (public.is_admin_or_finance());

create policy "agents can see identities for assigned contracts"
on public.rider_identities for select
using (
  exists (
    select 1
    from public.rider_contracts rc
    join public.agents a on a.id = rc.assigned_agent_id
    where rc.rider_identity_id = rider_identities.id
      and a.auth_user_id = auth.uid()
  )
);

create policy "agents can see their contracts or staff sees all"
on public.rider_contracts for select
using (
  public.is_admin_or_finance()
  or exists (
    select 1 from public.agents a
    where a.auth_user_id = auth.uid()
      and (a.id = rider_contracts.assigned_agent_id or a.id = rider_contracts.registered_by_agent_id)
  )
);

create policy "agents create contracts assigned to themselves"
on public.rider_contracts for insert
with check (
  exists (
    select 1 from public.agents a
    where a.auth_user_id = auth.uid()
      and a.id = rider_contracts.registered_by_agent_id
      and a.id = rider_contracts.assigned_agent_id
  )
);

create policy "staff can manage contracts"
on public.rider_contracts for all
using (public.is_admin_or_finance())
with check (public.is_admin_or_finance());

create policy "agent-owned child records readable by owning agents or staff"
on public.payments for select
using (
  public.can_access_contract(contract_id)
);

create policy "agents insert payments on accessible contracts"
on public.payments for insert
with check (
  public.can_access_contract(contract_id)
  and (recorded_by_agent_id is null or recorded_by_agent_id = public.current_agent_id())
);

create policy "agent-owned checklists readable"
on public.verification_checklists for select
using (public.can_access_contract(contract_id));

create policy "agents upsert checklists on accessible contracts"
on public.verification_checklists for all
using (public.can_access_contract(contract_id))
with check (
  public.can_access_contract(contract_id)
  and (updated_by_agent_id is null or updated_by_agent_id = public.current_agent_id())
);

create policy "agent visits readable"
on public.agent_visits for select
using (public.can_access_contract(contract_id));

create policy "agents insert own visits"
on public.agent_visits for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "payment promises readable"
on public.payment_promises for select
using (public.can_access_contract(contract_id));

create policy "agents insert own promises"
on public.payment_promises for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "evidence logs readable"
on public.evidence_logs for select
using (public.can_access_contract(contract_id));

create policy "agents insert own evidence"
on public.evidence_logs for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "id scans readable"
on public.id_scan_logs for select
using (public.can_access_contract(contract_id));

create policy "agents insert own id scans"
on public.id_scan_logs for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "chassis checks readable"
on public.chassis_checks for select
using (public.can_access_contract(contract_id));

create policy "agents insert own chassis checks"
on public.chassis_checks for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "excuse logs readable"
on public.excuse_logs for select
using (public.can_access_contract(contract_id));

create policy "agents insert own excuses"
on public.excuse_logs for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "repair debt requests readable"
on public.repair_debt_requests for select
using (public.can_access_contract(contract_id));

create policy "agents insert own repair debt requests"
on public.repair_debt_requests for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

create policy "staff update repair debt requests"
on public.repair_debt_requests for update
using (public.is_admin_or_finance())
with check (public.is_admin_or_finance());

create policy "risk notes readable"
on public.risk_notes for select
using (public.can_access_contract(contract_id));

create policy "agents insert own risk notes"
on public.risk_notes for insert
with check (
  public.can_access_contract(contract_id)
  and (agent_id is null or agent_id = public.current_agent_id())
);

create policy "duplicate attempts visible to staff or attempting agent"
on public.duplicate_registration_attempts for select
using (public.is_admin_or_finance() or attempted_by_agent_id = public.current_agent_id());

create policy "agents insert duplicate attempts"
on public.duplicate_registration_attempts for insert
with check (attempted_by_agent_id = public.current_agent_id());

create policy "agent tasks readable"
on public.agent_tasks for select
using (public.is_admin_or_finance() or agent_id = public.current_agent_id());

create policy "agents manage own tasks"
on public.agent_tasks for all
using (agent_id = public.current_agent_id())
with check (agent_id = public.current_agent_id());

create policy "commissions readable by owner or staff"
on public.commissions for select
using (public.is_admin_or_finance() or agent_id = public.current_agent_id());

create policy "audit logs readable by staff or actor"
on public.audit_logs for select
using (public.is_admin_or_finance() or actor_agent_id = public.current_agent_id() or actor_user_id = auth.uid());

create policy "agents insert own audit logs"
on public.audit_logs for insert
with check (
  actor_user_id = auth.uid()
  or actor_agent_id = public.current_agent_id()
);
