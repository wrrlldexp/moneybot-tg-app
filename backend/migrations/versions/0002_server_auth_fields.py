"""Add email/password/refresh_token to trading_servers.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trading_servers", sa.Column("server_email", sa.String(255), nullable=True))
    op.add_column("trading_servers", sa.Column("server_password", sa.String(255), nullable=True))
    op.add_column("trading_servers", sa.Column("refresh_token", sa.Text(), nullable=True))
    op.alter_column("trading_servers", "api_token", type_=sa.Text(), existing_type=sa.String(500))


def downgrade() -> None:
    op.drop_column("trading_servers", "refresh_token")
    op.drop_column("trading_servers", "server_password")
    op.drop_column("trading_servers", "server_email")
    op.alter_column("trading_servers", "api_token", type_=sa.String(500), existing_type=sa.Text())
