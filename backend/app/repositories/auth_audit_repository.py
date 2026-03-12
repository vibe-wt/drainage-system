from __future__ import annotations

from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.auth_audit_log import AuthAuditLog


def create_auth_audit_log(
    db: Session,
    *,
    action: str,
    actor_user_id: str | None,
    target_user_id: str | None,
    target_session_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
    details: dict,
) -> AuthAuditLog:
    entity = AuthAuditLog(
        id=f"aal_{uuid4().hex[:16]}",
        action=action,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        target_session_id=target_session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def list_auth_audit_logs(db: Session, limit: int = 50) -> list[AuthAuditLog]:
    stmt = select(AuthAuditLog).order_by(desc(AuthAuditLog.created_at)).limit(limit)
    return list(db.scalars(stmt))
