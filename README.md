<img src="brand/lockup.png" alt="Margyn" width="420" />

**See your real profit margin on every job, while it's still open.**

Margyn is a mobile-first job-costing app for solo tradespeople. Log materials and
hours as you work; the app shows your live profit margin against a target, so you
find out you're underpricing a job *during* it, not months later.

This is an MVP scaffold: the core loop (create job → log materials → log time →
see live margin → close job) is fully wired end to end. Everything else
(quoting, invoicing, multi-user teams, receipt OCR, scheduling) is intentionally
left out for now.

## Structure

- `frontend/` — Expo / React Native / TypeScript app (Expo Router)
- `backend/` — FastAPI + SQLite (SQLAlchemy), single-user for now

## Running locally

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npx expo start
```

By default the app talks to `http://localhost:8000/api`. To point at a
different backend (e.g. testing on a physical device), set:
```bash
EXPO_PUBLIC_API_BASE=http://<your-machine-ip>:8000/api npx expo start
```

## Data model

```
jobs          (id, client_name, quoted_price_cents, status, created_at, closed_at)
materials     (id, job_id, name, cost_cents, qty, created_at)
time_entries  (id, job_id, hours, note, created_at)
settings      (id, hourly_rate_cents, target_margin_pct)   -- single row, single user
```

Margin is computed on read, never stored:
`margin = quoted_price − materials_cost − (hours × hourly_rate)`

## Suggested next steps

1. Auth (even simple email/password) once you're ready for more than one user
2. Swap SQLite for Postgres/Supabase when this needs to run multi-device
3. Receipt photo capture → storage (already stubbed as a dependency, not wired)
4. Quoting/estimating flow feeding the `quoted_price_cents` on job creation
5. Push notification when a job's live margin drops below target
