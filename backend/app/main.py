import asyncio
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import init_db, async_session
from app.models import Settings
from app.scheduler import run_poll
from app.routers import settings, monitors, notifications, webhook, restaurants

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tablesnipe")

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(application: FastAPI):
    await init_db()

    async with async_session() as db:
        result = await db.execute(select(Settings).where(Settings.id == 1))
        s = result.scalar_one_or_none()
        interval = s.polling_interval_minutes if s else 15

    scheduler.add_job(run_poll, "interval", minutes=interval, id="poll_monitors")
    scheduler.start()
    logger.info(f"Scheduler started with {interval} min interval")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


app = FastAPI(title="TableSnipe", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(settings.router)
app.include_router(monitors.router)
app.include_router(notifications.router)
app.include_router(webhook.router)
app.include_router(restaurants.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/poll/trigger")
async def trigger_poll():
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, run_poll)
    return {"status": "poll triggered"}
