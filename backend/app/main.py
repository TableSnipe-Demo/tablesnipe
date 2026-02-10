from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from app.database import init_db
from app.routers import auth, settings, monitors, alerts, twilio_webhook, restaurants
from app.services.scheduler import run_check

load_dotenv()

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.add_job(run_check, "interval", minutes=15, id="check_reservations")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(auth.router)
app.include_router(settings.router)
app.include_router(monitors.router)
app.include_router(alerts.router)
app.include_router(twilio_webhook.router)
app.include_router(restaurants.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/check-now")
async def check_now():
    from app.services.scheduler import check_all_monitors
    await check_all_monitors()
    return {"status": "ok", "message": "Check completed"}
