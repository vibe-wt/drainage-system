from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_session import UserSession


def create_user(
    db: Session,
    *,
    email: str,
    display_name: str,
    password_hash: str,
    role: str = "admin",
    status: str = "active",
) -> User:
    entity = User(
        id=f"user_{uuid4().hex[:12]}",
        email=email.strip().lower(),
        display_name=display_name.strip(),
        password_hash=password_hash,
        role=role,
        status=status,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email.strip().lower())
    return db.scalar(stmt)


def get_user_by_id(db: Session, user_id: str) -> User | None:
    stmt = select(User).where(User.id == user_id)
    return db.scalar(stmt)


def list_users(db: Session) -> list[User]:
    stmt = select(User).order_by(User.created_at.asc(), User.email.asc())
    return list(db.scalars(stmt))


def count_users(db: Session) -> int:
    stmt = select(func.count()).select_from(User)
    return db.scalar(stmt) or 0


def update_user_last_login(db: Session, user: User, logged_in_at: datetime) -> User:
    user.last_login_at = logged_in_at
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_user_session(
    db: Session,
    *,
    user_id: str,
    session_token_hash: str,
    expires_at: datetime,
    user_agent: str | None,
    ip_address: str | None,
) -> UserSession:
    entity = UserSession(
        id=f"sess_{uuid4().hex[:16]}",
        user_id=user_id,
        session_token_hash=session_token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def get_user_session_by_token_hash(db: Session, session_token_hash: str) -> UserSession | None:
    stmt = select(UserSession).where(UserSession.session_token_hash == session_token_hash)
    return db.scalar(stmt)


def touch_user_session(db: Session, session: UserSession, seen_at: datetime) -> UserSession:
    session.last_seen_at = seen_at
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def revoke_user_session(db: Session, session: UserSession, revoked_at: datetime) -> UserSession:
    session.status = "revoked"
    session.revoked_at = revoked_at
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
