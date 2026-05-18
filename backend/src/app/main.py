import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, workspaces, ingest, metrics, cost_routes, alerts
from app.db.session import AsyncSessionLocal
from app.services.alert_worker import AlertWorker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    worker = AlertWorker(AsyncSessionLocal)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        worker.run,
        trigger="interval",
        seconds=60,
        id="alert_worker",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Alert worker started")

    yield

    scheduler.shutdown(wait=False)
    await worker.close()
    logger.info("Alert worker stopped")


app = FastAPI(
    title="DockerWatch API",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(ingest.router)
app.include_router(metrics.router)
app.include_router(cost_routes.router)
app.include_router(alerts.router)


@app.get("/health")
async def health():
    return {"status": "ok"}