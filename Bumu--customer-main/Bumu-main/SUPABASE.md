# BUMU Supabase Setup

This project is Supabase-ready at the database and frontend config level.

## 1. Create The Database

Open Supabase Dashboard -> SQL Editor, then run the migrations in order:

```sql
supabase/migrations/0001_agent_portal_schema.sql
supabase/migrations/0002_current_portal_readiness.sql
```

Or with Supabase CLI:

```powershell
supabase db push
```

## 2. Configure The App

Create `.env.local` from `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

Then fill in:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart Vite after changing `.env.local`.

## Important Tables

- `agents`: unique agent IDs and profile data.
- `rider_identities`: one real rider/person across all old and new contracts.
- `rider_contracts`: one bike/debt contract. This stores `assigned_agent_id`, `registered_by_agent_id`, `contract_id`, and old contract links.
- `payments`: payment records tied to a contract.
- `repair_debt_requests`: agent-captured repair debt requests, pending finance/admin approval.
- `rider_documents`: document/evidence metadata for scanned/uploaded rider files.
- `next_of_kin_consents`: OTP confirmation and Yes/No next-of-kin approval.
- `duplicate_registration_attempts`: blocked duplicate attempts.
- `id_scan_logs`, `chassis_checks`, `agent_visits`, `payment_promises`, `evidence_logs`, `risk_notes`: agent proof and anti-cheat timeline records.
- `agent_tasks`: follow-up tasks created from rider records.

## Storage Buckets

Migration `0002_current_portal_readiness.sql` prepares private buckets:

- `rider-documents`
- `repair-evidence`

Authenticated users can upload/read files. The app stores metadata in `rider_documents` and `repair_debt_requests`.

## Core Rule

The database enforces:

```text
One rider identity cannot have two active unpaid contracts.
```

This is handled by the partial unique index:

```sql
one_active_unpaid_contract_per_rider
```

So even if an agent tries to force a duplicate active contract, Supabase rejects it.

## Portal Boundaries

Agent portal:
- Creates and views its own assigned contracts.
- Captures visits, evidence, promises, ID scans, repair requests, and risk notes.
- Can see linked contract summaries needed to stop cheating.

Admin portal:
- Can see all agents, all riders, all contracts, duplicate attempts, and audit logs.

Finance portal:
- Can see contracts, balances, payments, commissions, and repair debt requests.
- Should approve/reject repair debt requests and update real balances after approval.

Customer portal:
- Can show the rider identity plus all linked contracts using `rider_identity_id`.

## Auth Role Metadata

For staff accounts, set Supabase Auth `app_metadata.portal_role` to:

- `admin`
- `finance`

Agents default to `agent`.

## Frontend Helpers

The Supabase client is in:

```text
src/lib/supabaseClient.js
```

Repository helpers are in:

```text
src/lib/portalRepository.js
```

The current UI still works locally without Supabase keys. Once keys are added, these helpers are ready for wiring saves/loads to Supabase.
