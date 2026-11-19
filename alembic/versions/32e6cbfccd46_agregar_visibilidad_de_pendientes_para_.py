"""Agregar visibilidad de pendientes para amigos

Revision ID: 32e6cbfccd46
Revises: 03133d16ac3b
Create Date: 2026-11-19 02:38:09.459756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32e6cbfccd46'
down_revision: Union[str, Sequence[str], None] = '03133d16ac3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "pendientes_visibles_amigos",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "pendientes_visibles_amigos")
