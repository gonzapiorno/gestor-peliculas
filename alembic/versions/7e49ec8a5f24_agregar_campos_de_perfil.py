"""agregar campos de perfil

Revision ID: 7e49ec8a5f24
Revises: f3efc5bcfbf8
Create Date: 2026-11-11 00:25:20.209797

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e49ec8a5f24'
down_revision: Union[str, Sequence[str], None] = 'f3efc5bcfbf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("nombre_visible", sa.String(50), nullable=True))
    op.add_column("usuarios", sa.Column("bio", sa.String(200), nullable=True))
    op.add_column("usuarios", sa.Column("avatar", sa.String(16), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "avatar")
    op.drop_column("usuarios", "bio")
    op.drop_column("usuarios", "nombre_visible")
