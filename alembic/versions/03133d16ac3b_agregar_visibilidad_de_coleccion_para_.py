"""agregar visibilidad de coleccion para amigos

Revision ID: 03133d16ac3b
Revises: e3dd3bf47dd6
Create Date: 2026-11-16 00:02:32.010293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03133d16ac3b'
down_revision: Union[str, Sequence[str], None] = 'e3dd3bf47dd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "coleccion_visible_amigos",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "coleccion_visible_amigos")
