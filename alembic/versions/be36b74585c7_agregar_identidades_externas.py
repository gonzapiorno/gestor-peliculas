"""agregar identidades externas

Revision ID: be36b74585c7
Revises: fa6518789c6e
Create Date: 2026-11-08 22:03:03.702639

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be36b74585c7'
down_revision: Union[str, Sequence[str], None] = 'fa6518789c6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "usuarios",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )

    op.create_table(
        "identidades_externas",
        sa.Column(
            "usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("proveedor", sa.String(length=32), primary_key=True),
        sa.Column("sujeto", sa.String(length=255), nullable=False),
        sa.UniqueConstraint(
            "proveedor",
            "sujeto",
            name="uq_identidades_externas_proveedor_sujeto",
        ),
    )


def downgrade() -> None:
    op.alter_column(
        "usuarios",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_table("identidades_externas")
