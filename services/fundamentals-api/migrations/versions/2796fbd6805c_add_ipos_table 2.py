"""add ipos table

Revision ID: 2796fbd6805c
Revises: 31f04c1b3507
Create Date: 2026-09-06 15:30:00.000000

IPO tracker + GMP (ADR 0017). Deduped on slug; GMP columns hold an
unofficial grey-market estimate.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2796fbd6805c'
down_revision: Union[str, None] = '31f04c1b3507'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ipos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=160), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('source_url', sa.String(length=512), nullable=True),
        sa.Column('category', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('ipo_size_cr', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('lot_size', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('subscription_times', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('anchor', sa.Boolean(), nullable=True),
        sa.Column('gmp', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('gmp_pct', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('gmp_low', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('gmp_high', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('gmp_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('open_date', sa.Date(), nullable=True),
        sa.Column('close_date', sa.Date(), nullable=True),
        sa.Column('allotment_date', sa.Date(), nullable=True),
        sa.Column('listing_date', sa.Date(), nullable=True),
        sa.Column('source_tier', sa.String(length=32), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_ipo_slug'),
    )
    op.create_index('ix_ipos_status', 'ipos', ['status'])


def downgrade() -> None:
    op.drop_index('ix_ipos_status', table_name='ipos')
    op.drop_table('ipos')
