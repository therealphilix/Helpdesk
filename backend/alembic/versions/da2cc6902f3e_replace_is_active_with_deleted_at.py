"""replace is_active with deleted_at

Revision ID: da2cc6902f3e
Revises: f31d15f08ef2
Create Date: 2026-07-20 13:50:47.355077
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'da2cc6902f3e'
down_revision: Union[str, None] = 'f31d15f08ef2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.create_index(
        "ix_users_email_active",
        "users",
        ["email"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.execute(sa.text("UPDATE users SET deleted_at = NOW() WHERE is_active = false"))
    op.drop_column("users", "is_active")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.execute(sa.text("UPDATE users SET is_active = false WHERE deleted_at IS NOT NULL"))
    op.drop_index("ix_users_email_active", table_name="users")
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.drop_column("users", "deleted_at")
