"""esquema inicial existente

Revision ID: 64b751ed4716
Revises: 
Create Date: 2026-10-20 00:15:24.547704

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64b751ed4716'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # Tabla antigua de películas
    op.create_table(
        "peliculas",
        sa.Column("id_pelicula", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("anio", sa.Integer(), nullable=False),
        sa.Column("genero", sa.String(100), nullable=False),
        sa.Column("puntuacion", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "puntuacion >= 1 AND puntuacion <= 10",
            name="peliculas_puntuacion_check"
        )
    )

    # Tabla de nuestra colección actual
    op.create_table(
        "coleccion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_tmdb", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("anio", sa.Integer(), nullable=True),
        sa.Column("poster", sa.String(500), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("favorita", sa.Boolean(), nullable=False),
        sa.Column(
            "puntuacion_personal",
            sa.Numeric(3, 1),
            nullable=True
        ),
        sa.UniqueConstraint(
            "id_tmdb",
            name="coleccion_id_tmdb_key"
        )
    )


def downgrade() -> None:

    op.drop_table("coleccion")
    op.drop_table("peliculas")
