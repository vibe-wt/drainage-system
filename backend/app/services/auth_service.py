from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_session_token, hash_password, hash_session_token, verify_password
from app.models.auth_audit_log import AuthAuditLog
from app.models.user import User
from app.models.user_session import UserSession
from app.repositories.auth_audit_repository import create_auth_audit_log, list_auth_audit_logs
from app.repositories.auth_repository import (
    count_users,
    create_user,
    create_user_session,
    get_user_by_email,
    get_user_by_id,
    get_user_session_by_id,
    get_user_session_by_token_hash,
    list_user_sessions,
    list_users_by_ids,
    list_users,
    revoke_user_session,
    touch_user_session,
    update_user_profile,
    update_user_last_login,
)
from app.schemas.auth import (
    AuthSessionMeta,
    AuthSessionResponse,
    AuthAuditLogItem,
    AuthenticatedUser,
    CreateUserRequest,
    LoginRequest,
    ResetUserPasswordRequest,
    UpdateCurrentUserRequest,
    UpdateUserStatusRequest,
    UserListItem,
    UserSessionItem,
)


@dataclass
class AuthenticatedSession:
    response: AuthSessionResponse
    session_token: str


def ensure_seed_admin(db: Session) -> None:
    if count_users(db) > 0:
        return
    create_user(
        db,
        email=settings.seed_admin_email,
        display_name=settings.seed_admin_name,
        password_hash=hash_password(settings.seed_admin_password),
        role="admin",
    )


def login_with_password(
    db: Session,
    payload: LoginRequest,
    *,
    user_agent: str | None,
    ip_address: str | None,
) -> AuthenticatedSession:
    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前用户不可用")

    now = datetime.now(UTC)
    session_token = generate_session_token()
    session = create_user_session(
        db,
        user_id=user.id,
        session_token_hash=hash_session_token(session_token),
        expires_at=now + timedelta(hours=settings.session_ttl_hours),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    user = update_user_last_login(db, user, now)
    return AuthenticatedSession(
        response=build_auth_session_response(user, session),
        session_token=session_token,
    )


def get_authenticated_session(db: Session, session_token: str) -> tuple[User, UserSession]:
    session = get_user_session_by_token_hash(db, hash_session_token(session_token))
    if session is None or session.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效")
    if session.expires_at <= datetime.now(UTC):
        revoke_user_session(db, session, datetime.now(UTC))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期")

    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户状态不可用")

    touch_user_session(db, session, datetime.now(UTC))
    return user, session


def logout_session(db: Session, session_token: str) -> None:
    session = get_user_session_by_token_hash(db, hash_session_token(session_token))
    if session is None or session.status != "active":
        return
    revoke_user_session(db, session, datetime.now(UTC))


def build_auth_session_response(user: User, session: UserSession) -> AuthSessionResponse:
    return AuthSessionResponse(
        user=AuthenticatedUser(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            status=user.status,
            last_login_at=user.last_login_at,
        ),
        session=AuthSessionMeta(
            session_id=session.id,
            expires_at=session.expires_at,
        ),
    )


def list_user_summaries(db: Session) -> list[UserListItem]:
    return [
        UserListItem(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            status=user.status,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
        )
        for user in list_users(db)
    ]


def create_user_account(db: Session, payload: CreateUserRequest) -> UserListItem:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已存在")

    normalized_role = payload.role.strip().lower()
    normalized_status = payload.status.strip().lower()
    if normalized_role not in {"admin", "editor", "viewer"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="角色必须是 admin、editor 或 viewer")
    if normalized_status not in {"active", "disabled"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="状态必须是 active 或 disabled")

    user = create_user(
        db,
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        role=normalized_role,
        status=normalized_status,
    )
    return UserListItem(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        status=user.status,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


def update_current_user_account(db: Session, user: User, payload: UpdateCurrentUserRequest) -> AuthenticatedUser:
    next_display_name = payload.display_name.strip() if payload.display_name is not None else None
    next_password_hash = hash_password(payload.new_password) if payload.new_password is not None else None
    user = update_user_profile(
        db,
        user,
        display_name=next_display_name,
        password_hash=next_password_hash,
    )
    return AuthenticatedUser(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        status=user.status,
        last_login_at=user.last_login_at,
    )


def update_managed_user_status(db: Session, user_id: str, payload: UpdateUserStatusRequest) -> UserListItem:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    normalized_status = payload.status.strip().lower()
    if normalized_status not in {"active", "disabled"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="状态必须是 active 或 disabled")

    user = update_user_profile(db, user, status=normalized_status)
    return UserListItem(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        status=user.status,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


def reset_managed_user_password(db: Session, user_id: str, payload: ResetUserPasswordRequest) -> UserListItem:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    user = update_user_profile(db, user, password_hash=hash_password(payload.new_password))
    return UserListItem(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        status=user.status,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


def list_current_user_sessions(db: Session, user_id: str, current_session_id: str) -> list[UserSessionItem]:
    return [
        UserSessionItem(
            session_id=session.id,
            status=session.status,
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            created_at=session.created_at,
            last_seen_at=session.last_seen_at,
            expires_at=session.expires_at,
            revoked_at=session.revoked_at,
            is_current=session.id == current_session_id,
        )
        for session in list_user_sessions(db, user_id)
    ]


def revoke_current_user_session(db: Session, user_id: str, session_id: str) -> UserSessionItem:
    session = get_user_session_by_id(db, session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")
    if session.status == "active":
        session = revoke_user_session(db, session, datetime.now(UTC))

    return UserSessionItem(
        session_id=session.id,
        status=session.status,
        ip_address=session.ip_address,
        user_agent=session.user_agent,
        created_at=session.created_at,
        last_seen_at=session.last_seen_at,
        expires_at=session.expires_at,
        revoked_at=session.revoked_at,
        is_current=False,
    )


def record_auth_audit_event(
    db: Session,
    *,
    action: str,
    actor_user_id: str | None,
    target_user_id: str | None = None,
    target_session_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict | None = None,
) -> AuthAuditLog:
    return create_auth_audit_log(
        db,
        action=action,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        target_session_id=target_session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {},
    )


def list_auth_audit_items(db: Session, limit: int = 50) -> list[AuthAuditLogItem]:
    items = list_auth_audit_logs(db, limit)
    user_ids = {
        user_id
        for item in items
        for user_id in (item.actor_user_id, item.target_user_id)
        if user_id is not None
    }
    users_by_id = {user.id: user for user in list_users_by_ids(db, list(user_ids))}

    return [
        AuthAuditLogItem(
            id=item.id,
            action=item.action,
            actor_user_id=item.actor_user_id,
            actor_user_email=users_by_id[item.actor_user_id].email if item.actor_user_id in users_by_id else None,
            actor_user_display_name=users_by_id[item.actor_user_id].display_name
            if item.actor_user_id in users_by_id
            else None,
            target_user_id=item.target_user_id,
            target_user_email=users_by_id[item.target_user_id].email if item.target_user_id in users_by_id else None,
            target_user_display_name=users_by_id[item.target_user_id].display_name
            if item.target_user_id in users_by_id
            else None,
            target_session_id=item.target_session_id,
            ip_address=item.ip_address,
            user_agent=item.user_agent,
            details=item.details,
            created_at=item.created_at,
        )
        for item in items
    ]
