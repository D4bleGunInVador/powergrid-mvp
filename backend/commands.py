# backend/commands.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user, Session
from nodes import NODES  # беремо список вузлів з мок-даних
from audit_store import add_audit

router = APIRouter(prefix="/api", tags=["commands"])

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---- Schemas ----
class CommandRequest(BaseModel):
    node_id: str = Field(..., description="Target node ID, e.g. N-01")
    command_type: str = Field(..., description="SwitchOn / SwitchOff")
    parameters: Optional[Dict[str, Any]] = None

class CommandItem(BaseModel):
    id: str
    node_id: str
    command_type: str
    parameters: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: str
    result_status: str  # Accepted / Success / Failed
    result_message: str

# ---- In-memory storage ----
COMMANDS: List[dict] = []
_counter = 1

def _next_id() -> str:
    global _counter
    cid = f"C-{_counter:05d}"
    _counter += 1
    return cid

def _role_can_send(role: str) -> bool:
    return role in ("DISPATCHER", "ADMIN")

@router.post("/commands", response_model=CommandItem)
def create_command(
    payload: CommandRequest,
    user: Session = Depends(get_current_user),
):
    if not _role_can_send(user.role):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if payload.node_id not in NODES:
        raise HTTPException(status_code=404, detail="Node not found")

    if payload.command_type not in ("SwitchOn", "SwitchOff"):
        raise HTTPException(status_code=400, detail="Unsupported command_type")

    cmd = {
        "id": _next_id(),
        "node_id": payload.node_id,
        "command_type": payload.command_type,
        "parameters": payload.parameters,
        "created_by": user.username,
        "created_at": _now_iso(),
        # MVP: відразу повертаємо Accepted (або Success, якщо хочеш)
        "result_status": "Accepted",
        "result_message": "Command accepted for processing (MVP simulation)",
    }
    add_audit(
        action="SEND_COMMAND",
        username=user.username,
        role=user.role,
        entity_type="Command",
        entity_id=cmd["id"],
        details={"node_id": payload.node_id, "command_type": payload.command_type},
    )
    COMMANDS.insert(0, cmd)  # newest first
    return CommandItem(**cmd)

@router.get("/commands", response_model=List[CommandItem])
def list_commands(
    node_id: Optional[str] = Query(default=None),
    _user: Session = Depends(get_current_user),
):
    items = COMMANDS
    if node_id:
        items = [c for c in items if c["node_id"] == node_id]
    return [CommandItem(**c) for c in items]