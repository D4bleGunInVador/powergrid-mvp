# backend/flows.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from auth import get_current_user, Session

router = APIRouter(prefix="/api", tags=["flows"])

class Flow(BaseModel):
    from_id: str
    to_id: str
    mw: float
    status: str  # Normal / Overload / Down

FLOWS = [
    {"from_id": "N-01", "to_id": "N-02", "mw": 120.5, "status": "Normal"},
    {"from_id": "N-02", "to_id": "N-03", "mw": 220.0, "status": "Overload"},
]

@router.get("/flows", response_model=List[Flow])
def get_flows(_user: Session = Depends(get_current_user)):
    return FLOWS