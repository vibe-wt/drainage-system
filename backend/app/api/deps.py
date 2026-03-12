from collections.abc import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.user_session import UserSession
from app.db.session import SessionLocal
from app.services.auth_service import get_authenticated_session


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_session_token(
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> str | None:
    return session_token


def get_current_user(
    db: Session = Depends(get_db),
    session_token: str | None = Depends(get_current_session_token),
) -> tuple[User, UserSession]:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    return get_authenticated_session(db, session_token)


def require_admin_user(
    current_user_session: tuple[User, UserSession] = Depends(get_current_user),
) -> tuple[User, UserSession]:
    user, session = current_user_session
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前用户缺少管理员权限")
    return user, session
