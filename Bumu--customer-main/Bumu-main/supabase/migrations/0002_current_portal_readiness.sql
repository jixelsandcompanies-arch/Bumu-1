-- BUMU current portal readiness
-- Adds current app surfaces: rider/next-of-kin OTP consent, rider document metadata,
-- repair evidence preview/capture method, screening queue, task completion time, and storage buckets.

create extension if not exists pgcrypto;

alter table public.agent_tasks
add column if not exists completed_at timestamptz;

alter table public.repair_debt_requests
add column if not exists evidence_preview_url text,
add column if not exists evidence_capture_method text
  check (evidence_capture_method is null or evidence_capture_method in ('upload', 'snap', 'camera'));

create table if not exists public.next_of_kin_consents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  kin_name text not null,
  kin_phone text not null,
  relationship text not null,
  otp_reference text,
  otp_verified boolean not null default false,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'yes', 'no')),
  consented_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists next_of_kin_consents_contract_idx
on public.next_of_kin_consents (contract_id);

create table if not exists public.customer_phone_verifications (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  rider_phone text not null,
  otp_reference text,
  otp_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_phone_verifications_contract_idx
on public.customer_phone_verifications (contract_id);

create table if not exists public.back_office_screening_queue (
  id uuid primary key default gen_random_uuid(),
  queue_reference text not null unique,
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  submitted_by_agent_id uuid not null references public.agents(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'in_review', 'approved', 'rejected', 'info_required')),
  notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists back_office_screening_queue_contract_idx
on public.back_office_screening_queue (contract_id);

create table if not exists public.rider_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  document_type text not null check (
    document_type in ('passport_photo', 'id_front', 'id_back', 'id_scan', 'repair_evidence', 'visit_evidence', 'other')
  ),
  file_name text,
  storage_path text,
  preview_url text,
  capture_method text not null default 'upload' check (capture_method in ('upload', 'snap', 'camera')),
  ocr_text text,
  created_at timestamptz not null default now()
);

create index if not exists rider_documents_contract_idx
on public.rider_documents (contract_id);

alter table public.repair_debt_requests
add column if not exists evidence_document_id uuid references public.rider_documents(id) on delete set null;

alter table public.next_of_kin_consents enable row level security;
alter table public.customer_phone_verifications enable row level security;
alter table public.back_office_screening_queue enable row level security;
alter table public.rider_documents enable row level security;

drop policy if exists "next of kin consents readable" on public.next_of_kin_consents;
create policy "next of kin consents readable"
on public.next_of_kin_consents for select
using (public.can_access_contract(contract_id));

drop policy if exists "agents insert own next of kin consents" on public.next_of_kin_consents;
create policy "agents insert own next of kin consents"
on public.next_of_kin_consents for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

drop policy if exists "customer phone verifications readable" on public.customer_phone_verifications;
create policy "customer phone verifications readable"
on public.customer_phone_verifications for select
using (contract_id is null or public.can_access_contract(contract_id));

drop policy if exists "agents insert own customer phone verifications" on public.customer_phone_verifications;
create policy "agents insert own customer phone verifications"
on public.customer_phone_verifications for insert
with check (agent_id = public.current_agent_id() and (contract_id is null or public.can_access_contract(contract_id)));

drop policy if exists "screening queue readable" on public.back_office_screening_queue;
create policy "screening queue readable"
on public.back_office_screening_queue for select
using (public.can_access_contract(contract_id));

drop policy if exists "agents insert own screening queue items" on public.back_office_screening_queue;
create policy "agents insert own screening queue items"
on public.back_office_screening_queue for insert
with check (public.can_access_contract(contract_id) and submitted_by_agent_id = public.current_agent_id());

drop policy if exists "rider documents readable" on public.rider_documents;
create policy "rider documents readable"
on public.rider_documents for select
using (public.can_access_contract(contract_id));

drop policy if exists "agents insert own rider documents" on public.rider_documents;
create policy "agents insert own rider documents"
on public.rider_documents for insert
with check (public.can_access_contract(contract_id) and agent_id = public.current_agent_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('rider-documents', 'rider-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('repair-evidence', 'repair-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users read bumu portal files" on storage.objects;
create policy "authenticated users read bumu portal files"
on storage.objects for select
using (
  auth.role() = 'authenticated'
  and bucket_id in ('rider-documents', 'repair-evidence')
);

drop policy if exists "authenticated users upload bumu portal files" on storage.objects;
create policy "authenticated users upload bumu portal files"
on storage.objects for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('rider-documents', 'repair-evidence')
);

drop policy if exists "authenticated users update bumu portal files" on storage.objects;
create policy "authenticated users update bumu portal files"
on storage.objects for update
using (
  auth.role() = 'authenticated'
  and bucket_id in ('rider-documents', 'repair-evidence')
)
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('rider-documents', 'repair-evidence')
);
