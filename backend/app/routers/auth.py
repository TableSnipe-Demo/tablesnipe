from fastapi import APIRouter, HTTPException, Response, Cookie
from pydantic import BaseModel
from typing import Optional
import hashlib
import secrets
from app.database import get_setting, set_setting

router = APIRouter(prefix="/api/auth", tags=["auth"])

active_tokens: dict[str, bool] = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    stored = get_setting("app_password")
    if not stored:
        stored = "tablesnipe"

    if stored.startswith("sha256:"):
        if f"sha256:{hash_password(req.password)}" != stored:
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        if req.password != stored:
            raise HTTPException(status_code=401, detail="Invalid password")
        set_setting("app_password", f"sha256:{hash_password(req.password)}")

    token = secrets.token_hex(32)
    active_tokens[token] = True
    response.set_cookie(key="session_token", value=token, httponly=True, samesite="none", secure=True)
    return {"status": "ok", "token": token}


@router.get("/check")
async def check_auth(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "")
    if not token or token not in active_tokens:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"status": "ok"}


@router.post("/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token and session_token in active_tokens:
        del active_tokens[session_token]
    response.delete_cookie("session_token")
    return {"status": "ok"}


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "")
    if not token or token not in active_tokens:
        raise HTTPException(status_code=401, detail="Not authenticated")

    stored = get_setting("app_password")
    if stored.startswith("sha256:"):
        if f"sha256:{hash_password(req.current_password)}" != stored:
            raise HTTPException(status_code=401, detail="Current password is incorrect")
    else:
        if req.current_password != stored:
            raise HTTPException(status_code=401, detail="Current password is incorrect")

    set_setting("app_password", f"sha256:{hash_password(req.new_password)}")
    return {"status": "ok"}


def verify_token(session_token: Optional[str] = None, authorization: Optional[str] = None) -> bool:
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "")
    return token is not None and token in active_tokens
