import hashlib
import hmac
import os
import secrets
import smtplib
import logging

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select

from app.db.models import Usuario, CodigoVerificacionEmail
from app.db.session import engine
from app.core.email_sender import enviar_codigo_verificacion

from dotenv import load_dotenv

load_dotenv()

class VerificacionNoDisponibleError(ValueError):
    pass


class EsperaVerificacionError(ValueError):
    pass


class EnvioVerificacionError(RuntimeError):
    pass


def generar_codigo_verificacion() -> str:
    numero = secrets.randbelow(1_000_000)
    return f"{numero:06d}"


def obtener_hash_codigo(usuario_id: int, codigo: str) -> str:
    secreto = os.getenv("EMAIL_VERIFICATION_SECRET")

    if not secreto:
        raise RuntimeError(
            "Falta configurar EMAIL_VERIFICATION_SECRET"
        )

    mensaje = f"muvis:verificar-email:{usuario_id}:{codigo}"

    return hmac.new(
        secreto.encode("utf-8"),
        mensaje.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def comprobar_codigo_verificacion(
    usuario_id: int,
    codigo: str,
    codigo_hash_guardado: str
) -> bool:

    if (
        len(codigo) != 6
        or not codigo.isascii()
        or not codigo.isdigit()
    ):
        return False

    hash_recibido = obtener_hash_codigo(usuario_id, codigo)

    return hmac.compare_digest(
        hash_recibido,
        codigo_hash_guardado
    )


def emitir_codigo_verificacion(usuario_id: int) -> str:

    with Session(engine) as sesion:
        usuario = sesion.scalar(
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .with_for_update()
        )

        if usuario is None:
            raise VerificacionNoDisponibleError(
                "No se puede emitir la verificación"
            )

        if usuario.email_verificado:
            raise VerificacionNoDisponibleError(
                "No se puede emitir la verificación"
            )

        ahora = datetime.now(timezone.utc)
        codigo = generar_codigo_verificacion()
    
        nuevo_codigo = insert(CodigoVerificacionEmail).values(
            usuario_id=usuario_id,
            codigo_hash=obtener_hash_codigo(usuario_id, codigo),
            fecha_expiracion=ahora + timedelta(minutes=10),
            intentos_fallidos=0,
            fecha_creacion=ahora
        )
    
        consulta = nuevo_codigo.on_conflict_do_update(
            index_elements=[CodigoVerificacionEmail.usuario_id],
            set_={
                "codigo_hash": nuevo_codigo.excluded.codigo_hash,
                "fecha_expiracion": nuevo_codigo.excluded.fecha_expiracion,
                "intentos_fallidos": 0,
                "fecha_creacion": nuevo_codigo.excluded.fecha_creacion
            },
            where=(
                CodigoVerificacionEmail.fecha_creacion
                <= ahora - timedelta(seconds=60)
            )
        ).returning(CodigoVerificacionEmail.usuario_id)

        resultado = sesion.scalar(consulta)

        if resultado is None:
            raise EsperaVerificacionError(
                "Debés esperar 60 segundos antes de solicitar otro código"
            )

        sesion.commit()

    return codigo


def verificar_codigo_email(
    usuario_id: int,
    codigo: str
) -> bool:

    # Validar que tenga exactamente 6 dígitos
    if (
        len(codigo) != 6
        or not codigo.isascii()
        or not codigo.isdigit()
    ):
        return False


    with Session(engine) as sesion:

        usuario = sesion.scalar(
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .with_for_update()
        )

        if usuario is None or usuario.email_verificado:
            return False

        # Bloqueamos el registro durante la comprobación
        registro = sesion.scalar(
            select(CodigoVerificacionEmail)
            .where(
                CodigoVerificacionEmail.usuario_id == usuario_id
            )
            .with_for_update()
        )

        ahora = datetime.now(timezone.utc)

        if registro is None:
            return False

        # Comprobar vencimiento
        if registro.fecha_expiracion <= ahora:
            return False

        # Máximo 5 intentos incorrectos por código
        if registro.intentos_fallidos >= 5:
            return False

        # Comparar el código con su hash
        if not comprobar_codigo_verificacion(
            usuario_id,
            codigo,
            registro.codigo_hash
        ):
            registro.intentos_fallidos += 1
            sesion.commit()
            return False

        # Activar su correo
        usuario.email_verificado = True
        usuario.fecha_verificacion = ahora

        # El código ya no puede volver a utilizarse
        sesion.delete(registro)

        sesion.commit()

        return True


def enviar_verificacion_usuario(usuario_id: int) -> None:

    # Genera el código y guarda su hash en PostgreSQL
    codigo = emitir_codigo_verificacion(usuario_id)

    # Busca el correo del usuario
    with Session(engine) as sesion:
        usuario = sesion.get(Usuario, usuario_id)

        if usuario is None:
            raise VerificacionNoDisponibleError(
                "No se puede emitir la verificación"
            )

        email = usuario.email

    # Envía el código al correo registrado
    try:
        enviar_codigo_verificacion(
            destinatario=email,
            codigo=codigo
        )
    except (smtplib.SMTPException, OSError):
        raise EnvioVerificacionError(
            "No pudimos enviar el correo. Intentá nuevamente más tarde."
        ) from None


def procesar_reenvio_verificacion(email: str) -> None:
    email = email.strip().lower()

    with Session(engine) as sesion:
        usuario_id = sesion.scalar(
            select(Usuario.id).where(Usuario.email == email)
        )

    if usuario_id is None:
        return

    try:
        enviar_verificacion_usuario(usuario_id)
    except (VerificacionNoDisponibleError, EsperaVerificacionError):
        return
    except EnvioVerificacionError:
        logging.getLogger(__name__).warning(
            "No se pudo enviar un correo de verificación."
        )


