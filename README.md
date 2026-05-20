# DockerWatch

> Lightweight container monitoring & cost intelligence for developers

DockerWatch tells you exactly what your Docker containers are doing and what they're **costing you** — in real time. No Kubernetes required. No $300/mo Datadog bill.

| Dashboard | Alerts |
|---|---|
| ![Dashboard](docs/screenshots/container.png) | ![Alerts](docs/screenshots/alerts.png) |


---

## Why DockerWatch?

You're running Docker Compose or a few containers on a VPS. You have no idea which containers are eating CPU, which are idle, or what your setup costs per month.

| | DockerWatch | Datadog | Prometheus + Grafana |
|---|---|---|---|
| Setup time | 2 minutes | Hours | 4+ hours |
| Cost intelligence | ✅ Built-in | ❌ | ❌ |
| Idle container detection | ✅ | ❌ | Manual |
| Self-hostable | ✅ | ❌ | ✅ |
| Price | Free / $19mo | $300+/mo | Free (your time) |

---

## Features

- **Real-time metrics** — CPU, memory, network, disk per container every 30s
- **Cost estimation** — maps your usage to AWS EC2 pricing, surfaces wasted spend
- **Idle detection** — flags containers costing money while doing nothing
- **Smart alerts** — Slack, email, or webhook when thresholds breach
- **One-line agent** — `pip install dockerwatch-agent` and you're collecting metrics
- **Docker Compose aware** — understands your services, not just raw containers
- **Open source** — audit the code, self-host, contribute

---

## Quick start (hosted)

The fastest way — use the hosted version at **[dockerwatch.io](https://dockerwatch.io)**

```bash
pip install dockerwatch-agent
dockerwatch-agent start --api-key=YOUR_KEY
```

Free tier: 1 server, 5 containers, 24h history. No credit card.

---

## Self-hosting

Run the entire stack yourself with Docker Compose.

### Prerequisites
- Docker + Docker Compose
- Python 3.11+ (for the agent)

### 1. Clone

```bash
git clone https://github.com/myselfkunal/dockerwatch.git
cd dockerwatch
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

Minimum required in `.env`:
```env
DATABASE_URL=postgresql+asyncpg://dockerwatch:password@localhost:5432/dockerwatch
SECRET_KEY=generate-with-python3-c-"import secrets;print(secrets.token_hex(32))"
```

### 3. Start the backend

```bash
cd backend
docker compose up -d
alembic upgrade head
uvicorn src.app.main:app --reload
```

### 4. Start the frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev
```

### 5. Install the agent

```bash
pip install dockerwatch-agent
dockerwatch-agent start --api-key=YOUR_KEY --api-url=http://localhost:8000
```

Open `http://localhost:3000` — your containers appear within 30 seconds.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Customer server                    │
│  ┌──────────────┐    ┌──────────────────────┐    │
│  │ Docker daemon│───▶│ Agent (Python)      │    │
│  └──────────────┘    │ docker stats / 30s   │    │
│                      └──────────┬───────────┘    │
└─────────────────────────────────┼────────────────┘
                                  │ HTTPS /ingest
               ┌──────────────────▼───────────────┐
               │       DockerWatch Backend        │
               │  FastAPI · TimescaleDB           │
               │  Cost engine · Alert worker      │
               └──────────────────┬───────────────┘
                                  │ REST API
               ┌──────────────────▼───────────────┐
               │      Next.js Dashboard           │
               │  Charts · Costs · Alerts         │
               └──────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Agent | Python 3.11, Docker SDK, httpx |
| Backend | FastAPI, SQLAlchemy 2.0 async, TimescaleDB |
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Alerts | APScheduler, Slack webhooks, Resend |
| Infra | Docker Compose, nginx |

---

## Project structure

```
dockerwatch/
├── agent/       # Python agent — runs on customer servers
├── backend/     # FastAPI — ingest, metrics, alerts, billing
├── frontend/    # Next.js dashboard
└── docs/        # Screenshots, architecture notes
```

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Areas that need work:
- [ ] Go rewrite of the agent (single binary)
- [ ] Kubernetes / pod-level metrics
- [ ] GCP + Azure pricing tables
- [ ] Prometheus metrics export endpoint
- [ ] ARM support

---

## Roadmap

- [x] Docker Compose monitoring
- [x] Cost estimation engine
- [x] Slack + email alerts
- [x] Subscription billing
- [ ] Kubernetes support
- [ ] Go agent
- [ ] Mobile app

---

## Screenshots

| Overview | Cost Analysis |
|---|---|
| ![Overview](docs/screenshots/overview.png) | ![Cost](docs/screenshots/cost.png) |

---

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Kunal Shaw](https://github.com/myselfkunal) — CSE student at KIIT Bhubaneswar.

If DockerWatch saves you money, consider giving it a ⭐