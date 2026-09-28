<img src="brand/lockup.png" alt="Margyn" width="420" />

**See your real profit margin on every job, while it's still open.**

Margyn is a mobile-first job-costing app for solo tradespeople. Log materials and
hours as you work; the app shows your live profit margin against a target, so you
find out you're underpricing a job *during* it, not months later.

The core loop (create job → log materials → log time → see live margin → close
job) is fully wired end to end, backed by Supabase (Postgres + Auth). Everything
else (quoting, invoicing, multi-user teams, receipt OCR, scheduling) is
intentionally left out for now.

## Structure

- `frontend/` — Expo / React Native / TypeScript app (Expo Router), talks to
  Supabase directly via `@supabase/supabase-js`
- `supabase/schema.sql` — tables + row-level security policies; run once in
  your project's SQL Editor

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste in `supabase/schema.sql`, run it. This creates
   `jobs`, `materials`, `time_entries`, `settings`, turns on row-level
   security scoped to `auth.uid()`, and adds a trigger that gives every new
   user a default `settings` row on sign-up.
3. Open **Settings → API**, copy the **Project URL** and the **`anon` /
   `publishable`** key (not `service_role` — that one stays in the
   dashboard).
4. In `frontend/`, copy `.env.example` to `.env` and fill in those two
   values.

Email/password auth works out of the box. Supabase requires email
confirmation by default — for faster local testing, turn that off under
**Authentication → Providers → Email → Confirm email**.

## Running locally

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone (same Wi-Fi as your machine), or
press `w` for the web preview.

## Data model

```
jobs          (id, user_id, client_name, quoted_price_cents, status, created_at, closed_at)
materials     (id, user_id, job_id, name, cost_cents, qty, created_at)
time_entries  (id, user_id, job_id, hours, note, created_at)
settings      (user_id, hourly_rate_cents, target_margin_pct)   -- one row per user
```

Every table is row-level-security scoped to `auth.uid()`, so each user only
ever sees their own rows. Materials/time entries can only be inserted while
their parent job is still `open` — enforced in the RLS policy, not just the
UI.

Margin is computed client-side on read, never stored:
`margin = quoted_price − materials_cost − (hours × hourly_rate)`

## Suggested next steps

1. Receipt photo capture → Supabase Storage (already stubbed as a
   dependency, not wired)
2. Quoting/estimating flow feeding the `quoted_price_cents` on job creation
3. Push notification when a job's live margin drops below target
4. Multi-user teams (shared jobs across a small crew, not just solo)
