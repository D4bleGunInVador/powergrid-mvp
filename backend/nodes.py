from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Dict
import math

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user, Session  # використовуємо вже зроблену авторизацію

router = APIRouter(prefix="/api", tags=["nodes"])


# ---- Models ----
class NodeSummary(BaseModel):
    id: str
    name: str
    region: str
    status: str  # Online / Warning / Offline
    updated_at: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    kind: Optional[str] = None

class Telemetry(BaseModel):
    voltage: float
    current: float
    power: float
    temperature: float
    timestamp: str

class NodeDetail(BaseModel):
    id: str
    name: str
    region: str
    status: str
    updated_at: str
    telemetry: Telemetry
    lat: Optional[float] = None
    lng: Optional[float] = None
    kind: Optional[str] = None

class NodeCreate(BaseModel):
    id: str = Field(..., description="Напр. N-04")
    name: str
    region: str
    status: str = Field(default="Online")  # Online/Warning/Offline

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None    
    
# ---- In-memory data (MVP) ----
NODES: Dict[str, Dict] = {
    "N-01": {"id": "N-01", "name": "Substation-01", "region": "Lviv", "status": "Online", "lat": 49.8397, "lng": 24.0297, "kind": "Substation"},
    "N-02": {"id": "N-02", "name": "Substation-02", "region": "Kyiv", "status": "Warning", "lat": 50.4501, "lng": 30.5234, "kind": "Substation"},
    "N-03": {"id": "N-03", "name": "Substation-03", "region": "Kharkiv", "status": "Offline", "lat": 49.9935, "lng": 36.2304, "kind": "Substation"},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _telemetry_for(node_id: str) -> Telemetry:
    """
    Мінімальна симуляція телеметрії (щоб було що автооновлювати в UI).
    Значення трохи змінюються з часом, але стабільні для кожного node_id.
    """
    t = datetime.now(timezone.utc).timestamp()
    seed = sum(ord(c) for c in node_id)  # простий стабільний "seed"

    # Напруга ~ 110..340 (умовно), струм ~ 50..450, температура ~ 20..95
    voltage = 220 + 30 * math.sin((t / 10.0) + seed)
    current = 180 + 80 * math.cos((t / 12.0) + seed)
    power = max(0.0, (voltage * current) / 1000.0)  # умовно кВт
    temperature = 45 + 10 * math.sin((t / 15.0) + seed)

    return Telemetry(
        voltage=round(voltage, 2),
        current=round(current, 2),
        power=round(power, 2),
        temperature=round(temperature, 2),
        timestamp=_now_iso(),
    )

def _require_admin(user: Session):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    
@router.get("/nodes", response_model=List[NodeSummary])
def get_nodes(
    region: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    _user: Session = Depends(get_current_user),
):
    items = list(NODES.values())

    if region:
        items = [n for n in items if n["region"].lower() == region.lower()]
    if status:
        items = [n for n in items if n["status"].lower() == status.lower()]

    now = _now_iso()
    return [
        NodeSummary(
            id=n["id"],
            name=n["name"],
            region=n["region"],
            status=n["status"],
            updated_at=now,
            lat=n.get("lat"),
            lng=n.get("lng"),
            kind=n.get("kind"),
        )
        for n in items
    ]


@router.get("/nodes/{node_id}", response_model=NodeDetail)
def get_node_detail(
    node_id: str,
    _user: Session = Depends(get_current_user),
):
    n = NODES.get(node_id)
    if not n:
        raise HTTPException(status_code=404, detail="Node not found")

    now = _now_iso()
    return NodeDetail(
        id=n["id"],
        name=n["name"],
        region=n["region"],
        status=n["status"],
        updated_at=now,
        telemetry=_telemetry_for(node_id),
        lat=n.get("lat"),
        lng=n.get("lng"),
        kind=n.get("kind"),
    )
    
@router.post("/nodes", response_model=NodeSummary)
def create_node(payload: NodeCreate, user: Session = Depends(get_current_user)):
    _require_admin(user)

    if payload.id in NODES:
        raise HTTPException(status_code=409, detail="Node already exists")

    # Створюємо без lat/lng/kind, щоб не ламати поточну логіку створення
    NODES[payload.id] = {
        "id": payload.id,
        "name": payload.name,
        "region": payload.region,
        "status": payload.status,
    }

    now = _now_iso()
    return NodeSummary(
        id=payload.id,
        name=payload.name,
        region=payload.region,
        status=payload.status,
        updated_at=now,
        # За замовчуванням залишаться None
    )


@router.put("/nodes/{node_id}", response_model=NodeSummary)
def update_node(node_id: str, payload: NodeUpdate, user: Session = Depends(get_current_user)):
    _require_admin(user)

    n = NODES.get(node_id)
    if not n:
        raise HTTPException(status_code=404, detail="Node not found")

    if payload.name is not None:
        n["name"] = payload.name
    if payload.region is not None:
        n["region"] = payload.region
    if payload.status is not None:
        n["status"] = payload.status

    now = _now_iso()
    return NodeSummary(
        id=n["id"],
        name=n["name"],
        region=n["region"],
        status=n["status"],
        updated_at=now,
        lat=n.get("lat"),
        lng=n.get("lng"),
        kind=n.get("kind"),
    )


@router.delete("/nodes/{node_id}")
def delete_node(node_id: str, user: Session = Depends(get_current_user)):
    _require_admin(user)

    if node_id not in NODES:
        raise HTTPException(status_code=404, detail="Node not found")

    NODES.pop(node_id, None)
    return {"status": "ok"}