"""add waitlist table

Revision ID: 0006
Revises: 0005
Create Date: 2024-01-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "4e6d5b87f4d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "waitlist",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("plan", sa.String(20), nullable=False, server_default="pro"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("waitlist")