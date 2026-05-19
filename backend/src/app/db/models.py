import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    workspaces: Mapped[list["Workspace"]] = relationship(
        back_populates="owner"
    )


# ---------------------------------------------------------------------------
# workspaces
# ---------------------------------------------------------------------------

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # free | pro | team
    plan: Mapped[str] = mapped_column(
        String(20),
        default="free",
        nullable=False,
    )

    # Razorpay billing fields
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # created | authenticated | active | paused | cancelled
    subscription_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    owner: Mapped["User"] = relationship(
        back_populates="workspaces"
    )

    servers: Mapped[list["Server"]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
    )

    alert_rules: Mapped[list["AlertRule"]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# servers
# ---------------------------------------------------------------------------

class Server(Base):
    __tablename__ = "servers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # hashed only
    api_key_hash: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    workspace: Mapped["Workspace"] = relationship(
        back_populates="servers"
    )

    containers: Mapped[list["Container"]] = relationship(
        back_populates="server",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# containers
# ---------------------------------------------------------------------------

class Container(Base):
    __tablename__ = "containers"

    __table_args__ = (
        UniqueConstraint(
            "server_id",
            "docker_id",
            name="uq_container_server_docker",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    server_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("servers.id", ondelete="CASCADE"),
        nullable=False,
    )

    docker_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    image: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # running | stopped | restarting | exited
    last_status: Mapped[str] = mapped_column(
        String(20),
        default="unknown",
        nullable=False,
    )

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # relationships
    server: Mapped["Server"] = relationship(
        back_populates="containers"
    )

    alert_rules: Mapped[list["AlertRule"]] = relationship(
        back_populates="container"
    )


# ---------------------------------------------------------------------------
# metrics
# ---------------------------------------------------------------------------

class Metric(Base):
    __tablename__ = "metrics"

    __table_args__ = (
        {"timescaledb_hypertable": False},
    )

    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        primary_key=True,
        nullable=False,
    )

    container_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("containers.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )

    cpu_percent: Mapped[float] = mapped_column(
        Double,
        nullable=False,
    )

    mem_usage_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    mem_limit_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    net_rx_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    net_tx_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    blk_read_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    blk_write_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )


# ---------------------------------------------------------------------------
# alert_rules
# ---------------------------------------------------------------------------

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )

    # nullable => applies to all containers
    container_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("containers.id", ondelete="CASCADE"),
        nullable=True,
    )

    metric: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    operator: Mapped[str] = mapped_column(
        String(5),
        nullable=False,
    )

    threshold: Mapped[float] = mapped_column(
        Double,
        nullable=False,
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    # email | slack | webhook
    channel: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    channel_config: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    workspace: Mapped["Workspace"] = relationship(
        back_populates="alert_rules"
    )

    container: Mapped[Optional["Container"]] = relationship(
        back_populates="alert_rules"
    )