import os
import hashlib
import secrets
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader

TABLESNIPE_SECRET = os.environ.get("TABLESNIPE_SECRET", "")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_secret(provided: str) -> bool:
    """Constant-time comparison of the provided secret against the stored one."""
    if not TABLESNIPE_SECRET:
        return False
    return secrets.compare_digest(provided, TABLESNIPE_SECRET)


async def require_auth(api_key: str | None = Security(api_key_header)) -> str:
    """Dependency that requires a valid API key."""
    if api_key is None:
        raise HTTPException(status_code=401, detail="Missing API key")
    if not verify_secret(api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key
