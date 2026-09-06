"""add news_items and news_item_symbols tables

Revision ID: 31f04c1b3507
Revises: 3e1d908c68ee
Create Date: 2026-09-06 14:20:00.000000

News feed (ADR 0015). news_items is deduped on url; news_item_symbols is
the many-to-many tag to NSE symbols (empty for a broad-feed item that
matched no company).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31f04c1b3507'
down_revision: Union[str, None] = '3e1d908c68ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'news_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('summary', sa.String(length=2000), nullable=True),
        sa.Column('source', sa.String(length=128), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sentiment', sa.String(length=16), nullable=False),
        sa.Column('sentiment_score', sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('url', name='uq_news_item_url'),
    )
    op.create_index('ix_news_items_published_at', 'news_items', ['published_at'])

    op.create_table(
        'news_item_symbols',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('news_item_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['news_item_id'], ['news_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('news_item_id', 'symbol', name='uq_news_item_symbol'),
    )
    op.create_index('ix_news_item_symbols_symbol', 'news_item_symbols', ['symbol'])


def downgrade() -> None:
    op.drop_index('ix_news_item_symbols_symbol', table_name='news_item_symbols')
    op.drop_table('news_item_symbols')
    op.drop_index('ix_news_items_published_at', table_name='news_items')
    op.drop_table('news_items')
