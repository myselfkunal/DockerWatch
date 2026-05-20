# Changelog

All notable changes to DockerWatch are documented here.

## [0.1.0] — 2024

### Initial release

**Agent**
- Docker stats collector — CPU, memory, network, disk per container
- 30-second polling loop with retry and backoff
- `pip install dockerwatch-agent` with CLI entrypoint
- Systemd service support

**Backend**
- FastAPI with async SQLAlchemy 2.0
- TimescaleDB hypertable for time-series metrics
- JWT authentication
- Workspace + multi-server support
- API key per server (hashed, shown once)
- Metrics query API with TimescaleDB time_bucket downsampling
- Cost estimation engine — maps usage to AWS EC2 pricing
- Idle container detection and savings recommendations
- Alert rules engine — threshold + duration based
- Alert delivery — Slack, email (Resend), webhook
- Razorpay subscription billing

**Frontend**
- Next.js 14 App Router dashboard
- Real-time container overview with live status
- Time-series charts — CPU, memory, network (Recharts)
- Cost breakdown page with per-container estimates
- Alert rules CRUD + event history
- Billing page with plan upgrade flow
- Settings — server management + API key generation
- Industrial dark terminal aesthetic