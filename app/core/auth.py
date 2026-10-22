from datetime import datetime, timezone

from fastapi import Cookie, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import engine
from app.db.models import Usuario, SesionUsuario
from app.core.security import hash_token_sesion


def obtener_usuario_actual(
    muvis_session: str | None = Cookie(default=None)
) -> Usuario:

    if muvis_session is None:
        raise HTTPException(
            status_code=401,
            detail="No hay una sesión iniciada"
        )

    token_hash = hash_token_sesion(muvis_session)

    with Session(engine) as sesion:
        
        # Acá buscaremos la sesión en PostgreSQL.
        sesion_actual = sesion.scalar(
            select(SesionUsuario).where(
                SesionUsuario.token_hash == token_hash
            )
        )

        if sesion_actual is None:
            raise HTTPException(
                status_code=401,
                detail="Sesión inválida"
            )

        if sesion_actual.fecha_expiracion <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=401,
                detail="La sesión ha expirado"
            )

        # Recuperamos al usuario propietario de la sesión.
        usuario = sesion.get(Usuario, sesion_actual.usuario_id)

        if usuario is None:
            raise HTTPException(
                status_code=401,
                detail="Sesión inválida"
            )

        return usuario

