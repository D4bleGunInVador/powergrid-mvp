from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from audit_store import add_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer()


def _hash_password(p: str) -> str:
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


USERS = {
    "dispatcher@powergrid.local": {"role": "DISPATCHER", "pwd": _hash_password("Dispatcher123!")},
    "admin@powergrid.local": {"role": "ADMIN", "pwd": _hash_password("Admin123!")},
}


@dataclass
class Session:
    username: str
    role: str
    expires_at: datetime


SESSIONS: Dict[str, Session] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str
    role: str
    expires_at: str


class MeResponse(BaseModel):
    username: str
    role: str


def _unauthorized(msg: str = "Unauthorized") -> HTTPException:
    return HTTPException(status_code=401, detail=msg)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Session:
    token = credentials.credentials
    s = SESSIONS.get(token)
    if not s:
        raise _unauthorized("Invalid token")

    now = datetime.now(timezone.utc)
    if s.expires_at <= now:
        SESSIONS.pop(token, None)
        raise _unauthorized("Token expired")

    return s


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    user = USERS.get(payload.username)
    if not user:
        raise _unauthorized("Invalid credentials")

    if user["pwd"] != _hash_password(payload.password):
        raise _unauthorized("Invalid credentials")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)

    SESSIONS[token] = Session(
        username=payload.username,
        role=user["role"],
        expires_at=expires_at,
    )

    add_audit(
        action="LOGIN",
        username=payload.username,
        role=user["role"],
        entity_type="User",
        entity_id=payload.username,
    )

    return LoginResponse(
        token=token,
        username=payload.username,
        role=user["role"],
        expires_at=expires_at.isoformat(),
    )


@router.post("/logout")
def logout(
    user: Session = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials
    SESSIONS.pop(token, None)

    add_audit(
        action="LOGOUT",
        username=user.username,
        role=user.role,
        entity_type="User",
        entity_id=user.username,
    )

    return {"status": "ok"}


@router.get("/me", response_model=MeResponse)
def me(user: Session = Depends(get_current_user)):
    return MeResponse(username=user.username, role=user.role)