"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ------------------------------------------------------------------
    # workspaces
    # ------------------------------------------------------------------
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False, server_default="free"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ------------------------------------------------------------------
    # subscriptions
    # ------------------------------------------------------------------
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ------------------------------------------------------------------
    # servers
    # ------------------------------------------------------------------
    op.create_table(
        "servers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("api_key_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ------------------------------------------------------------------
    # containers
    # ------------------------------------------------------------------
    op.create_table(
        "containers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("docker_id", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("last_status", sa.String(20), nullable=False, server_default="unknown"),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("server_id", "docker_id", name="uq_container_server_docker"),
    )

    # ------------------------------------------------------------------
    # metrics  — plain table first, then convert to hypertable
    # ------------------------------------------------------------------
    op.create_table(
        "metrics",
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("container_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("containers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cpu_percent", sa.Double(), nullable=False),
        sa.Column("mem_usage_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mem_limit_bytes", sa.BigInteger(), nullable=False),
        sa.Column("net_rx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("net_tx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("blk_read_bytes", sa.BigInteger(), nullable=False),
        sa.Column("blk_write_bytes", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("time", "container_id"),
    )

    # Convert to TimescaleDB hypertable — partition by time, 1-day chunks
    op.execute(
        "SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');"
    )

    # Index on container_id for fast per-container queries
    op.create_index("ix_metrics_container_id", "metrics", ["container_id"])

    # ------------------------------------------------------------------
    # alert_rules
    # ------------------------------------------------------------------
    op.create_table(
        "alert_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("containers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("metric", sa.String(30), nullable=False),
        sa.Column("operator", sa.String(5), nullable=False),
        sa.Column("threshold", sa.Double(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("channel_config", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("alert_rules")
    op.drop_table("metrics")
    op.drop_table("containers")
    op.drop_table("servers")
    op.drop_table("subscriptions")
    op.drop_table("workspaces")
    op.drop_table("users")