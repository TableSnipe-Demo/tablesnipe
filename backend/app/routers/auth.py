import hashlib
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.models import PasswordVerify

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _load_password_hash() -> str:
    env_pw = os.environ.get("DASHBOARD_PASSWORD", "")
    if env_pw:
        return hashlib.sha256(env_pw.encode()).hexdigest()
    hash_file = Path(__file__).parent.parent / ".password_hash"
    if hash_file.exists():
        return hash_file.read_text().strip()
    return ""


PASSWORD_HASH = _load_password_hash()


@router.post("/verify")
async def verify_password(body: PasswordVerify):
    if not PASSWORD_HASH:
        return {"authenticated": True}
    submitted_hash = hashlib.sha256(body.password.encode()).hexdigest()
    if submitted_hash == PASSWORD_HASH:
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid password")
