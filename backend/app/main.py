import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import init_db
from app.config import settings
from app.routers import monitors, restaurants, settings as settings_router, webhooks, poll
from app.services.scheduler import poll_monitors

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def _run_poll():
    loop = asyncio.get_event_loop()
    loop.create_task(poll_monitors())


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    logger.info("Database initialized")

    scheduler.add_job(
        _run_poll,
        "interval",
        minutes=settings.POLL_INTERVAL_MINUTES,
        id="poll_monitors",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduler started, polling every {settings.POLL_INTERVAL_MINUTES} minutes")

    yield

    # Shutdown
    scheduler.shutdown()
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

# Include routers
app.include_router(monitors.router)
app.include_router(restaurants.router)
app.include_router(settings_router.router)
app.include_router(webhooks.router)
app.include_router(poll.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
