# Architecture Decisions

## Stack choices and why

### Backend: FastAPI + Python 3.11
Python chosen over Go for v1 because:
- Existing familiarity from DockOps project
- Docker SDK, SQLAlchemy, Stripe libraries are mature in Python
- Speed is irrelevant at 0–200 users
- Plan: rewrite agent in Go for v2 (single binary, zero deps)

### Database: TimescaleDB (Postgres + extension)
- Metrics are time-series data — TimescaleDB hypertables give automatic
  partitioning by time, fast range queries, and built-in downsampling
- Stays as plain Postgres for relational data (users, workspaces, billing)
- Single DB = simpler ops at launch

### Frontend: Next.js 14 App Router
- App Router for server components where possible (faster initial load)
- shadcn/ui to avoid building component library from scratch
- SWR for client-side data fetching with auto-revalidation (live dashboard)

### Agent distribution: pip install
- Simplest install path for developers
- v2: single Go binary via `curl | sh`

### Billing: Stripe
- Only real option for a global SaaS
- Stripe hosted checkout = no PCI compliance scope
- Customer portal handles plan changes and invoices for free

### Email: Resend
- Modern API, great deliverability, generous free tier (3000 emails/mo)
- Simple Python SDK

### Infra: DigitalOcean + Vercel
- $6/mo droplet handles backend + DB until ~500 users
- Vercel free tier for Next.js is genuinely free and fast
- Migrate to larger droplet or managed DB when revenue justifies it