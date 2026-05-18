"""add alert_events table

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alert_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("containers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("metric", sa.String(30), nullable=False),
        sa.Column("value", sa.Double(), nullable=False),        # actual metric value
        sa.Column("threshold", sa.Double(), nullable=False),    # rule threshold at time of firing
        sa.Column("fired_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notified", sa.Boolean(), server_default="false", nullable=False),
    )
    op.create_index("ix_alert_events_rule_id", "alert_events", ["rule_id"])
    op.create_index("ix_alert_events_fired_at", "alert_events", ["fired_at"])


def downgrade() -> None:
    op.drop_table("alert_events")