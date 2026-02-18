from fastapi import APIRouter

from app.schemas import PollStatusResponse
from app.services.scheduler import poll_monitors, get_poll_status

router = APIRouter(prefix="/api/poll", tags=["poll"])


@router.post("/trigger")
async def trigger_poll():
    """Manually trigger a poll for testing."""
    await poll_monitors()
    status = get_poll_status()
    return {
        "message": "Poll completed",
        "monitors_checked": status["monitors_checked"],
        "slots_found": status["slots_found"],
    }


@router.get("/status", response_model=PollStatusResponse)
def poll_status():
    """Get the current poll status."""
    status = get_poll_status()
    return PollStatusResponse(
        last_poll=status["last_poll"],
        is_running=False,
        monitors_checked=status["monitors_checked"],
        slots_found=status["slots_found"],
    )
