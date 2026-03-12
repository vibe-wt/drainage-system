from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_session_token, get_current_user, get_db
from app.core.config import settings
from app.schemas.auth import AuthSessionResponse, LoginRequest
from app.schemas.common import MessageResponse
from app.services.auth_service import build_auth_session_response, login_with_password, logout_session

router = APIRouter()


def _set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=settings.session_secure_cookies,
        max_age=settings.session_ttl_hours * 60 * 60,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        samesite="lax",
        secure=settings.session_secure_cookies,
        path="/",
    )


@router.post("/login", response_model=AuthSessionResponse)
def login_endpoint(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionResponse:
    authenticated = login_with_password(
        db,
        payload,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client is not None else None,
    )
    _set_session_cookie(response, authenticated.session_token)
    return authenticated.response


@router.get("/session", response_model=AuthSessionResponse)
def get_session_endpoint(
    current_user_session: tuple = Depends(get_current_user),
) -> AuthSessionResponse:
    user, session = current_user_session
    return build_auth_session_response(user, session)


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def logout_endpoint(
    response: Response,
    db: Session = Depends(get_db),
    session_token: str | None = Depends(get_current_session_token),
) -> MessageResponse:
    if session_token:
        logout_session(db, session_token)
    _clear_session_cookie(response)
    return MessageResponse(message="已退出登录")
