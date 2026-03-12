from collections.abc import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
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
):
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    return get_authenticated_session(db, session_token)
