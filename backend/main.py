from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from nodes import router as nodes_router
from events import router as events_router
from commands import router as commands_router
from audit import router as audit_router
from flows import router as flows_router


app = FastAPI()

# CORS (на MVP, щоб Electron/React працювали)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://192.168.1.103:5173"],
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

app.include_router(flows_router)

@app.get("/api/health")
def health():
    return {"status": "ok"}