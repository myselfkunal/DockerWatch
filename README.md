# DockerWatch

Know exactly what your containers are costing you.

DockerWatch is a lightweight SaaS that monitors your Docker containers in real time — CPU, memory, network, disk — and surfaces how much your infrastructure is actually costing you, with actionable savings recommendations.

---

## The problem

You're running Docker Compose or a small K8s cluster on AWS/GCP/DigitalOcean. You have no idea which containers are eating resources, which are idle, or what your setup costs per month. Datadog starts at $300/mo. There's nothing in between.

DockerWatch fills that gap at $19/mo.

---

## Structure

```
dockerwatch/
├── agent/          # Python agent — runs on customer servers, collects metrics
├── backend/        # FastAPI backend — ingest, query API, alerts, billing
├── frontend/       # Next.js 14 dashboard — charts, cost breakdown, alerts UI
└── docs/           # Architecture notes, API docs, decisions
```

---

## Tech stack

| Layer      | Technology                                 |
|------------|--------------------------------------------|
| Agent      | Python 3.11, Docker SDK, httpx             |
| Backend    | FastAPI, SQLAlchemy 2.0, TimescaleDB       |
| Frontend   | Next.js 14, Tailwind, shadcn/ui, Recharts  |
| Billing    | Stripe                                     |
| Email      | Resend                                     |
| Infra      | DigitalOcean (backend) + Vercel (frontend) |

---

## Quickstart (development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/dockerwatch.git
cd dockerwatch
```

### 2. Start the database
```bash
cd backend
docker compose up -d db
```

### 3. Start the backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn src.app.main:app --reload
```

### 4. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Run the agent locally
```bash
cd agent
pip install -e .
dockerwatch-agent start --api-key=YOUR_KEY
```

---

## Environment variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

---

## Roadmap

- [x] Project structure
- [ ] Database schema + migrations
- [ ] Auth system
- [ ] Agent — Docker stats collector
- [ ] Ingest API
- [ ] Cost estimation engine
- [ ] Dashboard frontend
- [ ] Alerts engine
- [ ] Stripe billing
- [ ] Production deploy
- [ ] Launch

---

## License

MIT