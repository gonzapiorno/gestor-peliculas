"""agregar peliculas destacadas del perfil

Revision ID: e4e63e9d99cd
Revises: 24928b793e37
Create Date: 2026-11-12 01:47:43.857697

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4e63e9d99cd'
down_revision: Union[str, Sequence[str], None] = '24928b793e37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coleccion",
        sa.Column("posicion_destacada", sa.Integer(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_coleccion_usuario_posicion_destacada",
        "coleccion",
        ["usuario_id", "posicion_destacada"],
    )
    op.create_check_constraint(
        "ck_coleccion_posicion_destacada",
        "coleccion",
        "posicion_destacada BETWEEN 1 AND 4",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_coleccion_posicion_destacada", "coleccion", type_="check"
    )
    op.drop_constraint(
        "uq_coleccion_usuario_posicion_destacada", "coleccion", type_="unique"
    )
    op.drop_column("coleccion", "posicion_destacada")
