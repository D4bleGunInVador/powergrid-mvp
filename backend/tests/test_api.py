# backend/tests/test_api.py
from __future__ import annotations

import copy
import os
import sys

import pytest
from fastapi.testclient import TestClient

# щоб імпорти працювали незалежно від того, звідки запускається pytest
THIS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import main  # noqa: E402
import auth  # noqa: E402
import nodes  # noqa: E402
import events  # noqa: E402
import commands  # noqa: E402
import audit_store  # noqa: E402


# зафіксувати "стартові" мок-дані
_INITIAL_NODES = copy.deepcopy(nodes.NODES)
_INITIAL_EVENTS = copy.deepcopy(events.EVENTS)


@pytest.fixture(autouse=True)
def reset_state():
    """Скидання in-memory стану між тестами, щоб вони були незалежні."""
    auth.SESSIONS.clear()

    nodes.NODES.clear()
    nodes.NODES.update(copy.deepcopy(_INITIAL_NODES))

    events.EVENTS.clear()
    events.EVENTS.update(copy.deepcopy(_INITIAL_EVENTS))

    commands.COMMANDS.clear()
    commands._counter = 1

    audit_store._AUDIT.clear()
    audit_store._counter = 1


@pytest.fixture()
def client():
    return TestClient(main.app)


def _login(client: TestClient, username: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_login_ok_and_me(client: TestClient):
    token = _login(client, "admin@powergrid.local", "Admin123!")
    r = client.get("/api/auth/me", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "admin@powergrid.local"
    assert body["role"] == "ADMIN"


def test_login_fail(client: TestClient):
    r = client.post("/api/auth/login", json={"username": "admin@powergrid.local", "password": "WRONG"})
    assert r.status_code == 401


def test_nodes_list_requires_auth(client: TestClient):
    r = client.get("/api/nodes")
    assert r.status_code == 401


def test_nodes_crud_admin(client: TestClient):
    token = _login(client, "admin@powergrid.local", "Admin123!")
    h = _auth_headers(token)

    # create
    r = client.post("/api/nodes", headers=h, json={"id": "N-04", "name": "Substation-04", "region": "South", "status": "Online"})
    assert r.status_code in (200, 201), r.text

    # list
    r = client.get("/api/nodes", headers=h)
    assert r.status_code == 200
    ids = [n["id"] for n in r.json()]
    assert "N-04" in ids

    # update
    r = client.put("/api/nodes/N-04", headers=h, json={"status": "Warning"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "Warning"

    # delete
    r = client.delete("/api/nodes/N-04", headers=h)
    assert r.status_code == 200, r.text


def test_nodes_create_dispatcher_forbidden(client: TestClient):
    token = _login(client, "dispatcher@powergrid.local", "Dispatcher123!")
    h = _auth_headers(token)
    r = client.post("/api/nodes", headers=h, json={"id": "N-99", "name": "X", "region": "Y", "status": "Online"})
    assert r.status_code == 403


def test_events_list_and_ack(client: TestClient):
    token = _login(client, "dispatcher@powergrid.local", "Dispatcher123!")
    h = _auth_headers(token)

    r = client.get("/api/events", headers=h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    r = client.post("/api/events/E-CRIT-01/ack", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "Acknowledged"


def test_commands_send_and_list(client: TestClient):
    token = _login(client, "dispatcher@powergrid.local", "Dispatcher123!")
    h = _auth_headers(token)

    r = client.post("/api/commands", headers=h, json={"node_id": "N-01", "command_type": "SwitchOff", "parameters": None})
    assert r.status_code == 200, r.text
    assert r.json()["result_status"] in ("Accepted", "Success")

    r = client.get("/api/commands", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_audit_admin_only_and_contains_actions(client: TestClient):
    # 1) login admin
    token1 = _login(client, "admin@powergrid.local", "Admin123!")
    h1 = _auth_headers(token1)

    # critical actions
    r = client.post("/api/events/E-CRIT-01/ack", headers=h1)
    assert r.status_code == 200

    r = client.post("/api/commands", headers=h1, json={"node_id": "N-01", "command_type": "SwitchOff", "parameters": None})
    assert r.status_code == 200

    # logout (token1 becomes invalid)
    r = client.post("/api/auth/logout", headers=h1)
    assert r.status_code == 200

    # 2) login again to read audit
    token2 = _login(client, "admin@powergrid.local", "Admin123!")
    h2 = _auth_headers(token2)

    r = client.get("/api/audit?limit=200", headers=h2)
    assert r.status_code == 200, r.text
    actions = [x["action"] for x in r.json()]

    # Перевіряємо, що ключові дії зафіксовані
    assert "LOGIN" in actions
    assert "ACK_EVENT" in actions
    assert "SEND_COMMAND" in actions
    assert "LOGOUT" in actions