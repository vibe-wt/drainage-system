from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    status: str
    last_login_at: datetime | None = None


class AuthSessionMeta(BaseModel):
    session_id: str
    expires_at: datetime


class AuthSessionResponse(BaseModel):
    user: AuthenticatedUser
    session: AuthSessionMeta


class UserListItem(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    status: str
    last_login_at: datetime | None = None
    created_at: datetime


class UserListResponse(BaseModel):
    items: list[UserListItem]


class CreateUserRequest(BaseModel):
    email: str
    display_name: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="viewer", min_length=2, max_length=64)
    status: str = Field(default="active", min_length=2, max_length=32)


class UpdateCurrentUserRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


class UpdateUserStatusRequest(BaseModel):
    status: str = Field(min_length=2, max_length=32)


class ResetUserPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class UserSessionItem(BaseModel):
    session_id: str
    status: str
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    is_current: bool


class UserSessionListResponse(BaseModel):
    items: list[UserSessionItem]
