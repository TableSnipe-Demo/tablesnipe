from fastapi import APIRouter, HTTPException, Cookie, Header
from typing import Optional
from app.database import get_db
from app.routers.auth import verify_token

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    rows = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    conn.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@router.post("/{alert_id}/clear")
async def clear_alert(alert_id: int, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    conn.execute("UPDATE alerts SET status = 'dismissed' WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}
