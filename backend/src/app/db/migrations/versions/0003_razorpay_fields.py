"""rename stripe fields to razorpay in subscriptions

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("subscriptions", "stripe_customer_id",
                    new_column_name="razorpay_customer_id")
    op.alter_column("subscriptions", "stripe_subscription_id",
                    new_column_name="razorpay_subscription_id")


def downgrade() -> None:
    op.alter_column("subscriptions", "razorpay_customer_id",
                    new_column_name="stripe_customer_id")
    op.alter_column("subscriptions", "razorpay_subscription_id",
                    new_column_name="stripe_subscription_id")