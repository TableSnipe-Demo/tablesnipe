import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_auth, verify_secret
from app.database import init_db
from app.models import LoginRequest
from app.scheduler import start_polling, stop_polling, poll_availability
from app.routers import monitors, settings, notifications, twilio_webhook

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()
    logger.info("Starting background polling...")
    start_polling()
    yield
    # Shutdown
    logger.info("Stopping background polling...")
    stop_polling()


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
app.include_router(settings.router)
app.include_router(notifications.router)
app.include_router(twilio_webhook.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    if verify_secret(request.secret):
        return {"status": "ok", "token": request.secret}
    return {"status": "error", "detail": "Invalid secret"}


@app.post("/api/check-now")
async def check_now(_: str = Depends(require_auth)):
    """Trigger an immediate availability check."""
    results = await poll_availability()
    return {
        "status": "ok",
        "slots_found": len(results),
        "results": results,
    }
