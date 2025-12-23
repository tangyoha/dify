"""add product_name to mcp provider metadata

Revision ID: 7b4f9a3c2d10
Revises: 3d2a1f6e9c01
Create Date: 2025-12-23 00:02:00.000000

"""

from alembic import op
import sqlalchemy as sa


def _is_pg(conn):
    return conn.dialect.name == "postgresql"


revision = "7b4f9a3c2d10"
down_revision = "3d2a1f6e9c01"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    if _is_pg(conn):
        op.add_column(
            "tool_mcp_provider_metadata",
            sa.Column("product_name", sa.String(length=64), nullable=False, server_default=sa.text("''")),
        )
    else:
        op.add_column(
            "tool_mcp_provider_metadata",
            sa.Column("product_name", sa.String(length=64), nullable=False, server_default=sa.text("''")),
        )


def downgrade():
    op.drop_column("tool_mcp_provider_metadata", "product_name")


