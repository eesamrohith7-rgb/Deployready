# WebAudit Pro

Production website auditing platform layered into this repo alongside the original DeployReady Next.js app. Performs Performance / SEO / Security / Accessibility / Responsive / Crawler / Functional / API / Error audits, persists results to Postgres, streams progress over SSE, and (optionally) summarizes each module with Claude.

## Architecture

```
                ┌──────────────┐     enqueue     ┌─────────────┐
  Next.js app ─►│  /api/scans  │ ──────────────► │  BullMQ     │
  (port 3000)   │   /reports   │                 │  scan-queue │
                │   /monitors  │ ◄─── SSE/pub ───┤  (Redis)    │
                └──────┬───────┘                 └─────┬───────┘
                       │ pg                            │
                       ▼                               ▼
                 ┌──────────┐                  ┌─────────────────┐
                 │ Postgres │                  │ Worker process  │
                 │  (16)    │ ◄── results ──── │  - Playwright   │
                 └──────────┘                  │  - Lighthouse   │
                                               │  - Axe-core     │
                                               │  - LLM insights │
                                               └─────────────────┘
```

## Modules

| Module          | Engine                        | Output                                       |
| --------------- | ----------------------------- | -------------------------------------------- |
| performance     | Lighthouse + Playwright       | score, LCP/CLS/INP/TTFB, opportunities       |
| seo             | Playwright DOM + robots/sitemap | score, meta, OG, headings, JSON-LD           |
| security        | Node TLS + fetch headers      | score, risk, exposed paths, header grading   |
| accessibility   | Axe-core (Playwright)         | score, violations w/ WCAG impact             |
| responsive      | Playwright @ 5 viewports      | screenshots, overflow detection              |
| crawler         | Playwright BFS (25 pages)     | sitemap, broken pages                        |
| functional      | Playwright DOM survey         | form/submit heuristics                       |
| api_monitor     | Playwright network events     | XHR/fetch durations, failed calls            |
| error_monitor   | Playwright console/pageerror  | JS errors, console errors, failed resources  |

Each module emits an LLM-summarized `ai_insights` array (`severity / fix / impact / priority`). With no `ANTHROPIC_API_KEY` set, deterministic heuristic insights are produced instead.

## Quick start (Docker, recommended)

```bash
cp .env.example .env          # then edit JWT_SECRET & optional ANTHROPIC_API_KEY
docker compose up --build
# 3000  Next.js web
# 5432  Postgres
# 6379  Redis
```

The `migrate` service runs first and applies `db/migrations/*.sql`. The `worker` service uses the official Playwright image so Chromium is preinstalled.

Open:
- `http://localhost:3000/webaudit` — landing & "Run Full Audit"
- `http://localhost:3000/dashboard` — scan history
- `http://localhost:3000/scan/<id>` — live progress (SSE)
- `http://localhost:3000/report/<id>` — interactive report (Recharts radar/bar + screenshots + AI insights)
- `http://localhost:3000/monitor` — schedule recurring audits
- `http://localhost:3000/auth` — sign up / log in

## Local dev (no Docker)

```bash
# Postgres + Redis on host
brew services start postgresql@16 redis     # or your method of choice
createdb webaudit

# Install + browsers
npm install
npx playwright install chromium --with-deps

# Apply schema
DATABASE_URL=postgres://localhost/webaudit npm run db:migrate

# Two terminals:
npm run dev              # Next.js
npm run worker:dev       # BullMQ worker
```

To run scheduled monitors, wire `npm run monitor:cron` into your host cron (every minute is fine).

## API

| Method | Route                                | Description                          |
| ------ | ------------------------------------ | ------------------------------------ |
| POST   | `/api/auth/signup`                   | `{ email, password, name? }`         |
| POST   | `/api/auth/login`                    | `{ email, password }`                |
| POST   | `/api/auth/logout`                   | clears cookie                        |
| GET    | `/api/auth/me`                       | current session                      |
| POST   | `/api/scans/start`                   | `{ url, modules? }` → `{ scanId }`   |
| GET    | `/api/scans/:id/status`              | scan + per-module status             |
| GET    | `/api/scans/:id/results`             | full results (JSON)                  |
| GET    | `/api/scans/:id/events`              | text/event-stream live progress      |
| GET    | `/api/scans`                         | user's scan history                  |
| GET    | `/api/reports/:id?format=json\|csv`  | downloadable report                  |
| GET    | `/api/reports/:id/pdf`               | server-rendered PDF via Playwright   |
| GET/POST | `/api/projects`                    | list / create project                |
| GET/POST | `/api/monitors`                    | list / create monitor                |

All write endpoints validate input with Zod. `/api/scans/start` is rate-limited to 10/min/user (or IP).

## Security notes

- Browser jobs run with `--no-sandbox --disable-dev-shm-usage` in the worker container only. Do not enable this on the web container.
- Set a real `JWT_SECRET` (≥32 chars) in production.
- The worker is the only process that reaches the open internet for scan targets — keep it behind your egress firewall.
- Limit `WORKER_CONCURRENCY` based on RAM; each Playwright context ≈ 150–300 MB.

## CI

`.github/workflows/ci.yml` runs `tsc --noEmit`, `next lint`, `next build`, and Docker image builds for both `Dockerfile.web` and `Dockerfile.worker` on main.

## Pending / known gaps

- Login flows for arbitrary targets are out of scope (functional module is heuristic-only).
- AI insights cost: each module triggers one Claude call when `ANTHROPIC_API_KEY` is set; cap with `WORKER_CONCURRENCY` and your Anthropic plan.
- The original DeployReady terminal UI continues to live at `/`, `/files`, `/manual-checks`, `/report` (the no-id variant). WebAudit Pro routes are namespaced under `/webaudit`, `/dashboard`, `/scan/[id]`, `/report/[id]`, `/monitor`, `/auth`.
