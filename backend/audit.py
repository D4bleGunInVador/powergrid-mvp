from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user, Session
from audit_store import list_audit

router = APIRouter(prefix="/api", tags=["audit"])

class AuditItem(BaseModel):
    id: str
    timestamp: str
    username: str
    role: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Dict[str, Any] = {}

@router.get("/audit", response_model=List[AuditItem])
def get_audit(
    action: Optional[str] = Query(default=None),
    username: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    user: Session = Depends(get_current_user),
):
    # Для MVP можна обмежити перегляд аудит-логу адміном
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    rows = list_audit(action=action, username=username, entity_type=entity_type, limit=limit)
    return [AuditItem(**r) for r in rows]