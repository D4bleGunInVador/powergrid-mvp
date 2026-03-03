from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_AUDIT: List[dict] = []
_counter = 1

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def add_audit(
    *,
    action: str,
    username: str,
    role: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> dict:
    """
    In-memory audit record for MVP.
    """
    global _counter
    rec = {
        "id": f"A-{_counter:06d}",
        "timestamp": _now_iso(),
        "username": username,
        "role": role,
        "action": action,           # LOGIN / LOGOUT / ACK_EVENT / SEND_COMMAND ...
        "entity_type": entity_type, # User / Event / Command / Node ...
        "entity_id": entity_id,
        "details": details or {},
    }
    _counter += 1
    _AUDIT.insert(0, rec)  # newest first
    return rec

def list_audit(
    *,
    action: Optional[str] = None,
    username: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 200,
) -> List[dict]:
    items = _AUDIT
    if action:
        items = [r for r in items if r["action"].lower() == action.lower()]
    if username:
        items = [r for r in items if r["username"].lower() == username.lower()]
    if entity_type:
        items = [r for r in items if (r["entity_type"] or "").lower() == entity_type.lower()]
    return items[: max(1, min(limit, 1000))]