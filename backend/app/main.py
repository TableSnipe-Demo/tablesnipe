import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.scheduler import start_scheduler, stop_scheduler
from app.routers import monitors, bookings, settings, restaurants, webhook, auth

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="TableSnipe", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(monitors.router)
app.include_router(bookings.router)
app.include_router(settings.router)
app.include_router(restaurants.router)
app.include_router(webhook.router)
app.include_router(auth.router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
