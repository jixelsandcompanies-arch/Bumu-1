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
4. Copy `.env.example` to `.env`.
5. Set:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Restart the dev server after changing `.env`.

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
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Optional frontend API variable. Leave blank unless the API is hosted somewhere else:

```env
VITE_API_BASE_URL=
```

The included `vercel.json` handles API routing, SPA refresh routing, and PWA cache headers.

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code. It belongs only in `.env` locally and Vercel Environment Variables in production.
