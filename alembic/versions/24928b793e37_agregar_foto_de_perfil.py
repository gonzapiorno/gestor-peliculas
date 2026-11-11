"""agregar foto de perfil

Revision ID: 24928b793e37
Revises: 7e49ec8a5f24
Create Date: 2026-11-11 01:10:03.131108

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24928b793e37'
down_revision: Union[str, Sequence[str], None] = '7e49ec8a5f24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("foto_perfil", sa.LargeBinary(), nullable=True))
    op.add_column("usuarios", sa.Column("foto_perfil_version", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "foto_perfil_version")
    op.drop_column("usuarios", "foto_perfil")
