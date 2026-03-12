"""initial schema

Revision ID: 20260312_0001
Revises:
Create Date: 2026-03-12 16:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision = "20260312_0001"
down_revision = None
branch_labels = None
depends_on = None


def _has_table(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _ensure_index(table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if _has_index(table_name, index_name):
        return
    op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    if not _has_table("analysis_runs"):
        op.create_table(
            "analysis_runs",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_type", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("summary", sa.JSON(), nullable=False),
            sa.Column("items", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _ensure_index("analysis_runs", op.f("ix_analysis_runs_analysis_type"), ["analysis_type"])

    if not _has_table("auth_audit_logs"):
        op.create_table(
            "auth_audit_logs",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("actor_user_id", sa.String(length=64), nullable=True),
            sa.Column("target_user_id", sa.String(length=64), nullable=True),
            sa.Column("target_session_id", sa.String(length=64), nullable=True),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column("details", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _ensure_index("auth_audit_logs", op.f("ix_auth_audit_logs_action"), ["action"])
    _ensure_index("auth_audit_logs", op.f("ix_auth_audit_logs_actor_user_id"), ["actor_user_id"])
    _ensure_index("auth_audit_logs", op.f("ix_auth_audit_logs_target_session_id"), ["target_session_id"])
    _ensure_index("auth_audit_logs", op.f("ix_auth_audit_logs_target_user_id"), ["target_user_id"])

    if not _has_table("manholes"):
        op.create_table(
            "manholes",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("risk_level", sa.String(length=16), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("manhole_type", sa.String(length=64), nullable=False),
            sa.Column("catchment_name", sa.String(length=128), nullable=False),
            sa.Column("depth_m", sa.Float(), nullable=False),
            sa.Column("geom", Geometry(geometry_type="POINT", srid=4326), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )

    if not _has_table("pipes"):
        op.create_table(
            "pipes",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("risk_level", sa.String(length=16), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("pipe_type", sa.String(length=64), nullable=False),
            sa.Column("diameter_mm", sa.Integer(), nullable=False),
            sa.Column("start_manhole_id", sa.String(length=64), nullable=False),
            sa.Column("end_manhole_id", sa.String(length=64), nullable=False),
            sa.Column("geom", Geometry(geometry_type="LINESTRING", srid=4326), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )

    if not _has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("display_name", sa.String(length=128), nullable=False),
            sa.Column("password_hash", sa.String(length=512), nullable=False),
            sa.Column("role", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _ensure_index("users", op.f("ix_users_email"), ["email"], unique=True)

    if not _has_table("user_sessions"):
        op.create_table(
            "user_sessions",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.String(length=64), nullable=False),
            sa.Column("session_token_hash", sa.String(length=128), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    _ensure_index("user_sessions", op.f("ix_user_sessions_session_token_hash"), ["session_token_hash"], unique=True)
    _ensure_index("user_sessions", op.f("ix_user_sessions_user_id"), ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_session_token_hash"), table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_table("pipes")
    op.drop_table("manholes")
    op.drop_index(op.f("ix_auth_audit_logs_target_user_id"), table_name="auth_audit_logs")
    op.drop_index(op.f("ix_auth_audit_logs_target_session_id"), table_name="auth_audit_logs")
    op.drop_index(op.f("ix_auth_audit_logs_actor_user_id"), table_name="auth_audit_logs")
    op.drop_index(op.f("ix_auth_audit_logs_action"), table_name="auth_audit_logs")
    op.drop_table("auth_audit_logs")
    op.drop_index(op.f("ix_analysis_runs_analysis_type"), table_name="analysis_runs")
    op.drop_table("analysis_runs")
