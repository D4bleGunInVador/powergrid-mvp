from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from nodes import router as nodes_router
from events import router as events_router
from commands import router as commands_router
from audit import router as audit_router

app = FastAPI()

# CORS (на MVP, щоб Electron/React працювали)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключення роутів авторизації
app.include_router(auth_router)

app.include_router(nodes_router)

app.include_router(events_router)

app.include_router(commands_router)

app.include_router(audit_router)

@app.get("/api/health")
def health():
    return {"status": "ok"}