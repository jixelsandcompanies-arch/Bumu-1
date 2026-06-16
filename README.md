# Bumu Paygo Finance

Finance operations portal for the Bumu Paygo distributed CRM system.

The frontend is a Vite app. In production it reads and writes PAYGO customers, payments, commissions, and reconciliation data through Vercel API routes backed by a shared Supabase database. Admin, agent, customer, and finance portals should use the same Supabase project so every portal works from one centralized CRM dataset.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

<!-- Redeploy trigger: small edit to force Vercel to build latest commit with fixes -->

To test database-backed mode locally, copy `.env.production.template` to `.env.local` and set:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_AUTH_REQUIRED=true
VITE_API_BASE_URL=
PUBLIC_APP_URL=https://bumu-beta.vercel.app
ADMIN_MAX_ACCOUNTS=10
CRON_SECRET=generate-a-long-random-secret
OTP_PEPPER=generate-a-long-random-secret
PAYMENT_CALLBACK_SECRET=generate-a-long-random-secret
PAYOUT_CALLBACK_SECRET=generate-a-long-random-secret
PAYMENT_PROVIDER=daraja
COMMISSION_PAYOUT_PROVIDER=daraja
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=
AFRICASTALKING_SENDER_ID=
AFRICASTALKING_SANDBOX=false
AFRICASTALKING_INBOUND_SECRET=
DARAJA_ENV=sandbox
DARAJA_CONSUMER_KEY=
DARAJA_CONSUMER_SECRET=
DARAJA_BUSINESS_SHORT_CODE=174379
DARAJA_PASSKEY=
DARAJA_TRANSACTION_TYPE=CustomerPayBillOnline
DARAJA_CALLBACK_URL=https://your-vercel-domain.vercel.app/api/mpesa/callback?secret=YOUR_PAYMENT_CALLBACK_SECRET
DARAJA_C2B_SHORT_CODE=174379
DARAJA_C2B_VALIDATION_URL=https://your-vercel-domain.vercel.app/api/mpesa/validation?secret=YOUR_PAYMENT_CALLBACK_SECRET
DARAJA_C2B_CONFIRMATION_URL=https://your-vercel-domain.vercel.app/api/mpesa/confirmation?secret=YOUR_PAYMENT_CALLBACK_SECRET
DARAJA_C2B_RESPONSE_TYPE=Completed
DARAJA_C2B_COMMAND_ID=CustomerPayBillOnline
DARAJA_B2C_SHORT_CODE=
DARAJA_B2C_INITIATOR_NAME=
DARAJA_B2C_SECURITY_CREDENTIAL=
DARAJA_B2C_RESULT_URL=https://your-vercel-domain.vercel.app/api/commissions/payout-callback?secret=YOUR_PAYOUT_CALLBACK_SECRET
DARAJA_B2C_TIMEOUT_URL=https://your-vercel-domain.vercel.app/api/commissions/payout-callback?secret=YOUR_PAYOUT_CALLBACK_SECRET
DARAJA_B2C_COMMAND_ID=BusinessPayment
```

Set `AFRICASTALKING_USERNAME` and `AFRICASTALKING_API_KEY` from your Africa's Talking app. Set `AFRICASTALKING_SENDER_ID` after your sender ID is approved. SMS OTPs, approvals, next-of-kin acceptance links, reminders, payment notices, and commission notices use Africa's Talking. Set `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_BUSINESS_SHORT_CODE`, and `DARAJA_PASSKEY` from your Safaricom Daraja app for M-PESA STK Push collection.

## Supabase Setup

1. Create a Supabase project for the shared Bumu Paygo CRM database.
2. Open the Supabase SQL Editor.
3. Run `supabase.sql` once.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` only in server environments such as Vercel. Do not expose it as a `VITE_*` variable.
5. Set `ADMIN_REGISTRATION_CODE` to a private setup code before creating admin accounts. Create the first admin through the admin registration screen/API, then rotate the setup code or remove it when registration should be closed.
6. Set `ADMIN_MAX_ACCOUNTS=10` in Vercel. Admin registration locks after this number of active admin profiles exists; existing active admins can still sign in. Admin login is also locked for 15 minutes after 8 failed attempts for the same email.

The schema creates shared CRM tables:

```text
customers
payments
commissions
agent_payout_requests
reconciliation
agent_notifications
finance_notifications
```

If you previously experimented with public policies, run `supabase_hardening.sql` to lock the tables back down for server-side API access.

For an existing Supabase project, rerun `supabase.sql` after pulling updates. It uses `create index if not exists` and `create or replace function`, so it safely adds the performance indexes and dashboard summary function without deleting existing data.

## Vercel Deployment

Deploy the repo to Vercel with the included `vercel.json`.

Required Vercel environment variables:

```env
VITE_LOCAL_AUTH_ENABLED=false
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_AUTH_REQUIRED=true
VITE_API_BASE_URL=
ADMIN_MAX_ACCOUNTS=10
CRON_SECRET=generate-a-long-random-secret
OTP_PEPPER=generate-a-long-random-secret
PAYMENT_CALLBACK_SECRET=generate-a-long-random-secret
PAYOUT_CALLBACK_SECRET=generate-a-long-random-secret
```

If Vercel shows `No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan`, the project is still deploying under a Hobby project/team. Moving your app to a Pro team removes that limit for the deployment target. In Vercel:

1. Open the project.
2. Check the team or scope shown at the top of the project settings.
3. If it is still on a personal Hobby scope, move the project to your Pro team or create a Pro team and redeploy there.
4. Redeploy after the project is attached to the Pro team.

This repository currently uses many API route files under `/api`, so Hobby deployments will hit that limit unless the routes are consolidated.

Create finance users in Supabase Auth, then mark them as finance users:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"finance"}'::jsonb
where email = 'name@bumupaygo.co.ke';
```

If a separate backend is later deployed, set `BACKEND_API_URL` and the Vercel routes will proxy to that backend instead of using Supabase directly.

For Daraja STK Push callbacks, configure this callback URL:

```text
https://your-vercel-domain.vercel.app/api/mpesa/callback?secret=YOUR_PAYMENT_CALLBACK_SECRET
```

Set `PAYMENT_CALLBACK_SECRET` in Vercel and put the same value in the callback URL query string as shown above. If no callback secret is configured, callback routes reject requests.

For C2B Paybill payments made outside STK Push, register these Daraja URLs for your shortcode:

```text
Validation URL: https://your-vercel-domain.vercel.app/api/mpesa/validation?secret=YOUR_PAYMENT_CALLBACK_SECRET
Confirmation URL: https://your-vercel-domain.vercel.app/api/mpesa/confirmation?secret=YOUR_PAYMENT_CALLBACK_SECRET
```

Normal Paybill C2B callbacks can be recorded even when the app did not create a payment request first, as long as the customer pays using an account reference that matches a customer ID, national ID, or registered customer phone. For B2C commission payouts, set the Daraja initiator name, encrypted security credential, B2C shortcode, result URL, and timeout URL after Safaricom enables B2C on your shortcode.

After setting the Daraja C2B env vars, register the URLs from the backend:

```text
POST https://your-vercel-domain.vercel.app/api/mpesa/register-urls?secret=YOUR_PAYMENT_CALLBACK_SECRET
```

For sandbox C2B testing, simulate a Paybill payment:

```text
POST https://your-vercel-domain.vercel.app/api/mpesa/simulate-c2b?secret=YOUR_PAYMENT_CALLBACK_SECRET
Body: { "amount": 100, "phone": "254708374149", "accountReference": "CUSTOMER_ID_OR_NATIONAL_ID" }
```

## Automated Follow-Ups

Vercel cron calls `/api/system/follow-ups` at 08:00 and 17:00 Nairobi time. The job updates customer overdue status, creates customer notifications, creates agent follow-up notifications, creates finance risk alerts, and sends Africa's Talking SMS reminders. Set `CRON_SECRET` in Vercel so Vercel cron signs the request and outsiders cannot trigger reminder SMS.

## Payments

Bumu Paygo uses Africa's Talking for SMS and Safaricom Daraja for money movement. Daraja handles customer STK Push payment prompts, C2B Paybill confirmations, and optional finance B2C commission payouts.

For M-Pesa testing, use the Daraja flow that matches the payment direction:

1. Customer to business collection uses STK Push or Paybill C2B.
2. Business to agent payout uses B2C and the commission payout callback.
3. If you type payment amounts in the app, use numbers like `20` or `KES 20`; the app now strips common currency symbols before saving.

For next-of-kin SMS acceptance, set your Africa's Talking incoming SMS callback URL to:

```text
https://your-vercel-domain.vercel.app/api/africastalking/inbound
```

Use `POST`. When the next-of-kin replies `1`, `YES`, or `ACCEPT`, the webhook confirms acceptance, moves the application through automatic screening, and sends the customer activation OTP if the application is approved. The SMS link flow also remains available.

Recommended backend flow:

```text
1. Customer pays through customer portal, SIM toolkit, or *334#.
2. Payment provider sends confirmation/callback to your backend.
3. Backend validates provider signature, receipt, account reference, amount, and customer.
4. Backend upserts the payment into Supabase `payments`.
5. Backend updates customer balance, overdue state, reconciliation, and commissions.
6. Backend writes finance alerts into `finance_notifications` when payment is received, missing, late, mismatched, or needs follow-up.
7. Finance portal refreshes `/api/payments`, `/api/reconciliation`, and `/api/notifications`.
```

New provider records should use generic fields such as `provider_reference`, `provider_transaction_id`, `provider_account_reference`, `provider_payer_phone`, and `provider_paid_at`. Payment product configuration, callbacks, and transaction validation must remain in the backend.

## Agent Commission Payments

The finance portal does not transfer money from the browser. When finance clicks a commission payment action:

```text
POST /api/commissions/:id/pay
POST /api/commissions/agent-payment-approvals
```

Vercel either proxies the request to `BACKEND_API_URL`, or, if no backend is connected yet, records a queued payout request in Supabase. The Supabase-only fallback sets the commission to `processing` with `payout_status = queued`; it does not mark the commission as paid and it does not call any payment provider.

Your production backend should implement:

```text
POST /commissions/:id/pay
```

Backend responsibilities:

```text
1. Validate the finance user is authorized.
2. Validate the commission exists.
3. Validate the agent details and amount.
4. Reject commissions that are already paid or already processing.
5. Send the money through the payment provider from the backend only.
6. Update Supabase with status, paid_at, payout reference, and provider response.
7. Return the updated commission to the finance portal.
```

The backend can use `agent_payout_requests` as its payout work queue, or it can complete the payout immediately and update `commissions` directly.

## Load Balancing

The portal is safe to run behind Vercel's managed load balancing because API routes are stateless. Auth state is carried by the user's Supabase token, and shared application data lives in Supabase or your external backend.

Health check endpoint:

```text
/api/health
```

Expected healthy response includes:

```json
{
  "ok": true,
  "stateless": true,
  "databaseConfigured": true
}
```

If `BACKEND_API_URL` points to your own backend, set `BACKEND_TIMEOUT_MS` to keep slow backend instances from hanging finance requests. The default is `10000`.

## Installable App

The portal includes `manifest.webmanifest`, app icons, and `sw.js`, so supported browsers can install it as a standalone app. API requests are never cached by the service worker; payments, notifications, and reconciliation stay server-driven.

## Auth Pages

```text
Login: http://localhost:5173/#/login
Register: http://localhost:5173/#/register
Forgot password: http://localhost:5173/#/forgot-password
```

Users register with their own email and password. Accounts are created in Supabase Auth through `/api/auth/register`; they are not stored in browser localStorage.

Password reset OTP sending and password changes are handled by the Vercel API routes with Supabase Auth. If `BACKEND_API_URL` is set, those routes proxy to your secure backend instead.

## Data Flow

Finance screens call same-origin `/api/*` routes. Those routes use `SUPABASE_SERVICE_ROLE_KEY` server-side to fetch the required finance data from the centralized Supabase database. Payment-provider integrations, transaction execution, callbacks, and agent payout execution belong in the secure backend, not in this portal.
