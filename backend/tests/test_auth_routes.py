from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import deps
from app.api.routes import auth as auth_routes
from app import main as main_module
from app.main import create_app
from app.schemas.auth import (
    AuthAuditLogItem,
    AuthSessionMeta,
    AuthSessionResponse,
    AuthenticatedUser,
    UserSessionItem,
)
from app.services.auth_service import AuthenticatedSession


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setattr(main_module, "init_db", lambda: None)
    application = create_app()
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def fake_user():
    return SimpleNamespace(
        id="user_admin",
        email="admin@drainage.local",
        display_name="System Admin",
        role="admin",
        status="active",
        last_login_at=None,
    )


@pytest.fixture
def fake_session():
    return SimpleNamespace(
        id="sess_current",
        user_id="user_admin",
        status="active",
        ip_address="127.0.0.1",
        user_agent="pytest",
        created_at="2026-03-12T10:00:00Z",
        last_seen_at="2026-03-12T10:05:00Z",
        expires_at="2026-03-12T22:00:00Z",
        revoked_at=None,
    )


def test_login_sets_session_cookie_and_returns_payload(app, client, monkeypatch):
    app.dependency_overrides[deps.get_db] = lambda: object()

    def fake_login_with_password(_db, payload, *, user_agent, ip_address):
        assert payload.email == "admin@drainage.local"
        assert user_agent == "testclient"
        assert ip_address == "testclient"
        return AuthenticatedSession(
            response=AuthSessionResponse(
                user=AuthenticatedUser(
                    id="user_admin",
                    email="admin@drainage.local",
                    display_name="System Admin",
                    role="admin",
                    status="active",
                    last_login_at=None,
                ),
                session=AuthSessionMeta(session_id="sess_current", expires_at="2026-03-12T22:00:00Z"),
            ),
            session_token="plain-session-token",
        )

    monkeypatch.setattr(auth_routes, "login_with_password", fake_login_with_password)
    monkeypatch.setattr(auth_routes, "record_auth_audit_event", lambda *args, **kwargs: None)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@drainage.local", "password": "ChangeMe123!"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin@drainage.local"
    assert "drainage_session=plain-session-token" in response.headers["set-cookie"]


def test_get_current_user_requires_login(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "请先登录"


def test_require_editor_user_rejects_viewer(fake_session):
    viewer = SimpleNamespace(role="viewer")

    with pytest.raises(HTTPException) as exc_info:
        deps.require_editor_user((viewer, fake_session))

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "当前用户缺少编辑权限"


def test_require_editor_user_allows_editor(fake_session):
    editor = SimpleNamespace(role="editor")

    user, session = deps.require_editor_user((editor, fake_session))

    assert user.role == "editor"
    assert session.id == "sess_current"


def test_revoke_current_session_returns_message(app, client, fake_user, fake_session, monkeypatch):
    app.dependency_overrides[deps.get_current_user] = lambda: (fake_user, fake_session)
    app.dependency_overrides[deps.get_db] = lambda: object()

    monkeypatch.setattr(
        auth_routes,
        "revoke_current_user_session",
        lambda _db, user_id, session_id: UserSessionItem(
            session_id=session_id,
            status="revoked",
            ip_address="127.0.0.1",
            user_agent="pytest",
            created_at="2026-03-12T10:00:00Z",
            last_seen_at="2026-03-12T10:05:00Z",
            expires_at="2026-03-12T22:00:00Z",
            revoked_at="2026-03-12T11:00:00Z",
            is_current=False,
        ),
    )
    monkeypatch.setattr(auth_routes, "record_auth_audit_event", lambda *args, **kwargs: None)

    response = client.delete("/api/v1/auth/me/sessions/sess_old")

    assert response.status_code == 200
    assert response.json()["message"] == "已撤销会话 sess_old"


def test_audit_logs_route_returns_items_for_admin(app, client, fake_user, fake_session, monkeypatch):
    app.dependency_overrides[deps.require_admin_user] = lambda: (fake_user, fake_session)
    app.dependency_overrides[deps.get_db] = lambda: object()

    monkeypatch.setattr(
        auth_routes,
        "list_auth_audit_items",
        lambda _db, limit=50: [
            AuthAuditLogItem(
                id="aal_1",
                action="create_user",
                actor_user_id="user_admin",
                actor_user_email="admin@drainage.local",
                actor_user_display_name="System Admin",
                target_user_id="user_viewer",
                target_user_email="viewer@drainage.local",
                target_user_display_name="Viewer User",
                target_session_id=None,
                ip_address="127.0.0.1",
                user_agent="pytest",
                details={"role": "viewer"},
                created_at="2026-03-12T10:00:00Z",
            )
        ],
    )

    response = client.get("/api/v1/auth/audit-logs?limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["action"] == "create_user"
    assert payload["items"][0]["actor_user_email"] == "admin@drainage.local"
    assert payload["items"][0]["target_user_display_name"] == "Viewer User"
