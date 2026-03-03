# backend/events.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user, Session
from audit_store import add_audit

router = APIRouter(prefix="/api", tags=["events"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventItem(BaseModel):
    id: str
    node_id: str
    type: str            # Info / Warning / Critical
    description: str
    status: str          # New / Acknowledged
    created_at: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None


# In-memory events (MVP)
EVENTS: Dict[str, dict] = {
    "E-INFO-01": {
        "id": "E-INFO-01",
        "node_id": "N-01",
        "type": "Info",
        "description": "Планові роботи",
        "status": "New",
        "created_at": _now_iso(),
    },
    "E-WARN-01": {
        "id": "E-WARN-01",
        "node_id": "N-02",
        "type": "Warning",
        "description": "Перевантаження вузла",
        "status": "New",
        "created_at": _now_iso(),
    },
    "E-CRIT-01": {
        "id": "E-CRIT-01",
        "node_id": "N-03",
        "type": "Critical",
        "description": "Критична аварія (потребує підтвердження)",
        "status": "New",
        "created_at": _now_iso(),
    },
}


@router.get("/events", response_model=List[EventItem])
def list_events(
    type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    _user: Session = Depends(get_current_user),
):
    items = list(EVENTS.values())

    if type:
        items = [e for e in items if e["type"].lower() == type.lower()]
    if status:
        items = [e for e in items if e["status"].lower() == status.lower()]

    items.sort(key=lambda e: e["created_at"], reverse=True)  # newest first
    return [EventItem(**e) for e in items]


@router.post("/events/{event_id}/ack", response_model=EventItem)
def acknowledge_event(
    event_id: str,
    user: Session = Depends(get_current_user),
):
    e = EVENTS.get(event_id)
    if not e:
        raise HTTPException(status_code=404, detail="Event not found")

    if e["status"] != "Acknowledged":
        e["status"] = "Acknowledged"
        e["acknowledged_by"] = user.username
        e["acknowledged_at"] = _now_iso()
        
        add_audit(
            action="ACK_EVENT",
            username=user.username,
            role=user.role,
            entity_type="Event",
            entity_id=event_id,
            details={"node_id": e["node_id"], "type": e["type"]},
        )
    return EventItem(**e)