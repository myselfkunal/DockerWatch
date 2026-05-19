"""create alert events table

Revision ID: e3ba46c1e026
Revises: 4e6d5b87f4d6
Create Date: 2026-05-19 13:11:01.529701
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e3ba46c1e026'
down_revision: Union[str, Sequence[str], None] = '4e6d5b87f4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'alert_events',

        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False
        ),

        sa.Column(
            'rule_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('alert_rules.id', ondelete='CASCADE'),
            nullable=False
        ),

        sa.Column(
            'container_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('containers.id', ondelete='CASCADE'),
            nullable=True
        ),

        sa.Column(
            'metric',
            sa.String(length=30),
            nullable=False
        ),

        sa.Column(
            'value',
            sa.Double(),
            nullable=False
        ),

        sa.Column(
            'threshold',
            sa.Double(),
            nullable=False
        ),

        sa.Column(
            'fired_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),

        sa.Column(
            'resolved_at',
            sa.DateTime(timezone=True),
            nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_table('alert_events')