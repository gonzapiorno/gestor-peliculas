import hashlib
import secrets
import logging
import os

from urllib.parse import urlsplit
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import TokenRecuperacionPassword, Usuario, SesionUsuario
from app.db.session import engine
from app.core.email_sender import enviar_enlace_recuperacion
from app.core.security import hash_password



VIGENCIA_TOKEN = timedelta(minutes=30)
ESPERA_ENTRE_SOLICITUDES = timedelta(seconds=60)


def generar_token_recuperacion() -> str:
    return secrets.token_urlsafe(32)


def hash_token_recuperacion(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def emitir_token_recuperacion(email: str) -> tuple[str, str] | None:
    email = email.strip().lower()

    with Session(engine) as sesion:
        usuario = sesion.scalar(
            select(Usuario)
            .where(Usuario.email == email)
            .with_for_update()
        )
        if usuario is None or not usuario.email_verificado:
            return None

        ahora = datetime.now(timezone.utc)
        registro = sesion.get(TokenRecuperacionPassword, usuario.id)

        if registro is not None:
            if ahora - registro.fecha_creacion < ESPERA_ENTRE_SOLICITUDES:
                return None
        else:
            registro = TokenRecuperacionPassword(usuario_id=usuario.id)
            sesion.add(registro)

        token = generar_token_recuperacion()
        registro.token_hash = hash_token_recuperacion(token)
        registro.fecha_creacion = ahora
        registro.fecha_expiracion = ahora + VIGENCIA_TOKEN
        destinatario = usuario.email

        sesion.commit()

    return destinatario, token


def obtener_origen_recuperacion() -> str:
    origen = os.getenv("PASSWORD_RESET_FRONTEND_ORIGIN", "").strip().rstrip("/")
    url = urlsplit(origen)

    if (
        not url.hostname
        or url.username is not None
        or url.password is not None
        or url.path
        or url.query
        or url.fragment
    ):
        raise ValueError("Configurá un origen válido para recuperación")

    if url.scheme == "https":
        return origen

    if (
        url.scheme == "http"
        and os.getenv("APP_ENV") == "development"
        and url.hostname in {"127.0.0.1", "localhost"}
    ):
        return origen

    raise ValueError("El origen de recuperación requiere HTTPS")


def procesar_solicitud_recuperacion(email: str) -> None:
    logger = logging.getLogger(__name__)

    try:
        origen = obtener_origen_recuperacion()
    except ValueError:
        logger.error("El origen de recuperación está mal configurado.")
        return

    emision = emitir_token_recuperacion(email)
    if emision is None:
        return

    destinatario, token = emision
    enlace = f"{origen}/restablecer-password#token={token}"

    try:
        enviar_enlace_recuperacion(destinatario, enlace)
    except (OSError, RuntimeError, KeyError, ValueError):
        logger.warning("No se pudo enviar el correo de recuperación.")


def restablecer_password_con_token(token: str, nueva_password: str) -> bool:
    token_hash = hash_token_recuperacion(token)

    with Session(engine) as sesion:
        usuario_id = sesion.scalar(
            select(TokenRecuperacionPassword.usuario_id)
            .where(TokenRecuperacionPassword.token_hash == token_hash)
        )
        if usuario_id is None:
            return False

        usuario = sesion.get(Usuario, usuario_id, with_for_update=True)
        if usuario is None or not usuario.email_verificado:
            return False

        registro = sesion.get(TokenRecuperacionPassword, usuario_id)
        if (
            registro is None
            or not secrets.compare_digest(registro.token_hash, token_hash)
            or registro.fecha_expiracion <= datetime.now(timezone.utc)
        ):
            return False

        usuario.password_hash = hash_password(nueva_password)
        sesion.delete(registro)
        sesion.execute(
            delete(SesionUsuario).where(SesionUsuario.usuario_id == usuario_id)
        )
        sesion.commit()

    return True


