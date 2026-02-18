from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import init_db
from app.routes import router
from app.scheduler import poll_all_monitors


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    scheduler.add_job(poll_all_monitors, "interval", minutes=15, id="poll_monitors")
    scheduler.start()
    print("TableSnipe backend started. Polling every 15 minutes.")
    yield
    # Shutdown
    scheduler.shutdown()


app = FastAPI(title="TableSnipe", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
