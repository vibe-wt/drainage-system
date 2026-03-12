from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException, status
from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.db.session import SessionLocal
from app.models.auth_audit_log import AuthAuditLog
from app.models.user import User
from app.models.user_session import UserSession
from app.repositories.auth_repository import get_user_by_email
from app.schemas.auth import CreateUserRequest, LoginRequest, ResetUserPasswordRequest, UpdateUserStatusRequest
from app.services.auth_service import (
    create_user_account,
    get_authenticated_session,
    list_auth_audit_items,
    login_with_password,
    record_auth_audit_event,
    reset_managed_user_password,
    revoke_current_user_session,
    update_managed_user_status,
)


TEST_EMAIL_DOMAIN = "@auth-test.local"


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def cleanup_auth_rows():
    yield
    session = SessionLocal()
    try:
        user_ids = list(
            session.scalars(select(User.id).where(User.email.like(f"%{TEST_EMAIL_DOMAIN}"))),
        )
        if user_ids:
            session.execute(delete(AuthAuditLog).where(AuthAuditLog.actor_user_id.in_(user_ids)))
            session.execute(delete(AuthAuditLog).where(AuthAuditLog.target_user_id.in_(user_ids)))
            session.execute(delete(UserSession).where(UserSession.user_id.in_(user_ids)))
            session.execute(delete(User).where(User.id.in_(user_ids)))
            session.commit()
    finally:
        session.close()


def unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}{TEST_EMAIL_DOMAIN}"


def test_create_user_account_persists_user_and_normalizes_email(db):
    payload = CreateUserRequest(
        email=unique_email("create").upper(),
        display_name="  Auth Test User  ",
        password="StrongPass123!",
        role="viewer",
        status="active",
    )

    created = create_user_account(db, payload)
    stored_user = get_user_by_email(db, payload.email)

    assert created.email == payload.email.lower()
    assert created.display_name == "Auth Test User"
    assert stored_user is not None
    assert stored_user.password_hash != payload.password
    assert stored_user.role == "viewer"


def test_login_with_password_creates_session_and_resolves_authenticated_session(db):
    email = unique_email("login")
    create_user_account(
        db,
        CreateUserRequest(
            email=email,
            display_name="Login User",
            password="StrongPass123!",
            role="editor",
            status="active",
        ),
    )

    authenticated = login_with_password(
        db,
        LoginRequest(email=email, password="StrongPass123!"),
        user_agent="pytest-agent",
        ip_address="127.0.0.1",
    )
    user, session = get_authenticated_session(db, authenticated.session_token)

    assert authenticated.response.user.email == email
    assert authenticated.response.session.session_id == session.id
    assert user.last_login_at is not None
    assert session.user_agent == "pytest-agent"
    assert session.ip_address == "127.0.0.1"


def test_revoke_current_user_session_blocks_future_authentication(db):
    email = unique_email("revoke")
    created = create_user_account(
        db,
        CreateUserRequest(
            email=email,
            display_name="Revoke User",
            password="StrongPass123!",
            role="viewer",
            status="active",
        ),
    )
    authenticated = login_with_password(
        db,
        LoginRequest(email=email, password="StrongPass123!"),
        user_agent="pytest-agent",
        ip_address="127.0.0.1",
    )

    revoked = revoke_current_user_session(db, created.id, authenticated.response.session.session_id)

    assert revoked.status == "revoked"
    with pytest.raises(HTTPException) as exc_info:
        get_authenticated_session(db, authenticated.session_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_user_status_and_reset_password_work_against_db(db):
    email = unique_email("manage")
    created = create_user_account(
        db,
        CreateUserRequest(
            email=email,
            display_name="Managed User",
            password="StrongPass123!",
            role="viewer",
            status="active",
        ),
    )

    updated = update_managed_user_status(db, created.id, UpdateUserStatusRequest(status="disabled"))
    assert updated.status == "disabled"

    reset = reset_managed_user_password(db, created.id, ResetUserPasswordRequest(new_password="NewStrongPass123!"))
    assert reset.email == email

    with pytest.raises(HTTPException) as exc_info:
        login_with_password(
            db,
            LoginRequest(email=email, password="NewStrongPass123!"),
            user_agent="pytest-agent",
            ip_address="127.0.0.1",
        )
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_auth_audit_log_is_persisted_and_listed(db):
    email = unique_email("audit")
    created = create_user_account(
        db,
        CreateUserRequest(
            email=email,
            display_name="Audit User",
            password="StrongPass123!",
            role="admin",
            status="active",
        ),
    )

    log = record_auth_audit_event(
        db,
        action="create_user",
        actor_user_id=created.id,
        target_user_id=created.id,
        target_session_id=None,
        ip_address="127.0.0.1",
        user_agent="pytest-agent",
        details={"source": "pytest", "at": datetime.now(UTC).isoformat()},
    )
    items = list_auth_audit_items(db, limit=10)

    assert log.action == "create_user"
    assert any(item.id == log.id and item.actor_user_id == created.id for item in items)
