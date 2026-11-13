"""crear solicitudes de amistad

Revision ID: e3dd3bf47dd6
Revises: e4e63e9d99cd
Create Date: 2026-11-13 01:33:51.639907

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3dd3bf47dd6'
down_revision: Union[str, Sequence[str], None] = 'e4e63e9d99cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "solicitudes_amistad",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "remitente_id", sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "destinatario_id", sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("estado", sa.String(10), server_default="pendiente", nullable=False),
        sa.Column(
            "fecha_creacion", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column("fecha_respuesta", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "remitente_id <> destinatario_id",
            name="ck_solicitudes_amistad_usuarios_distintos",
        ),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'aceptada', 'rechazada')",
            name="ck_solicitudes_amistad_estado",
        ),
    )
    op.create_index(
        "ix_solicitudes_amistad_remitente_id",
        "solicitudes_amistad",
        ["remitente_id"],
    )
    op.create_index(
        "ix_solicitudes_amistad_destinatario_id",
        "solicitudes_amistad",
        ["destinatario_id"],
    )
    op.create_index(
        "uq_solicitudes_amistad_pareja",
        "solicitudes_amistad",
        [
            sa.text("LEAST(remitente_id, destinatario_id)"),
            sa.text("GREATEST(remitente_id, destinatario_id)"),
        ],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("solicitudes_amistad")
