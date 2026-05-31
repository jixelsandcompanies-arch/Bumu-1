# Bumu Paygo Finance

Finance operations portal for Bumu Paygo motorcycle PAYGO accounts.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

For the full app with local API routes, use:

```bash
npm run dev:full
```

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase.sql`.
4. Create a finance user in Supabase Auth.
5. Mark that user with the finance role using the SQL in the Finance Login section.
6. Copy `.env.example` to `.env`.
7. Set:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Restart the dev server after changing `.env`.

If you already ran an older SQL file, run `supabase_hardening.sql` once. It removes public `anon` table access so data only flows through the secured backend API.

## Vercel Deployment

Use these Vercel settings:

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Add these Environment Variables in Vercel Project Settings:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Optional frontend API variable. Leave blank unless the API is hosted somewhere else:

```env
VITE_API_BASE_URL=
```

The included `vercel.json` handles API routing, SPA refresh routing, and PWA cache headers.

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code. It belongs only in `.env` locally and Vercel Environment Variables in production.

## Finance Login

Create finance users in **Supabase → Authentication → Users**, then mark them with a finance role. In Supabase SQL Editor, replace the email and run:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"finance"}'::jsonb
where email = 'finance@example.com';
```

Only users with `role = finance` can sign in or call the backend API.

## Integration Check

After deployment, check:

```text
https://your-vercel-domain.vercel.app/api/health
```

Expected without login:

```json
{"error":"Sign in is required."}
```

That means the API is protected. Then sign in through the app with the Supabase Auth finance user.
