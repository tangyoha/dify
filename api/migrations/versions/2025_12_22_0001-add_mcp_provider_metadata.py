"""add mcp provider metadata (desc, category)

Revision ID: 3d2a1f6e9c01
Revises: c20211f18133
Create Date: 2025-12-22 00:01:00.000000

"""

from alembic import op
import sqlalchemy as sa
import models as models


def _is_pg(conn):
    return conn.dialect.name == "postgresql"


revision = "3d2a1f6e9c01"
down_revision = "c20211f18133"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    if _is_pg(conn):
        op.create_table(
            "tool_mcp_provider_metadata",
            sa.Column("id", models.types.StringUUID(), server_default=sa.text("uuid_generate_v4()"), nullable=False),
            sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
            sa.Column("provider_id", models.types.StringUUID(), nullable=False),
            sa.Column("server_identifier", sa.String(length=64), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
            sa.Column("category_id", sa.String(length=64), nullable=False, server_default=sa.text("''")),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP(0)"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP(0)"), nullable=False),
            sa.PrimaryKeyConstraint("id", name="tool_mcp_provider_metadata_pkey"),
            sa.UniqueConstraint("tenant_id", "provider_id", name="unique_mcp_provider_metadata_tenant_provider"),
            sa.UniqueConstraint(
                "tenant_id", "server_identifier", name="unique_mcp_provider_metadata_tenant_server_identifier"
            ),
        )
    else:
        op.create_table(
            "tool_mcp_provider_metadata",
            sa.Column("id", models.types.StringUUID(), nullable=False),
            sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
            sa.Column("provider_id", models.types.StringUUID(), nullable=False),
            sa.Column("server_identifier", sa.String(length=64), nullable=False),
            sa.Column("description", models.types.LongText(), nullable=False, server_default=sa.text("''")),
            sa.Column("category_id", sa.String(length=64), nullable=False, server_default=sa.text("''")),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
            sa.PrimaryKeyConstraint("id", name="tool_mcp_provider_metadata_pkey"),
            sa.UniqueConstraint("tenant_id", "provider_id", name="unique_mcp_provider_metadata_tenant_provider"),
            sa.UniqueConstraint(
                "tenant_id", "server_identifier", name="unique_mcp_provider_metadata_tenant_server_identifier"
            ),
        )


def downgrade():
    op.drop_table("tool_mcp_provider_metadata")


