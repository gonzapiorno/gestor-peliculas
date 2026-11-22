import json
import logging
import os
from base64 import urlsafe_b64encode
from functools import lru_cache
from urllib.parse import urlsplit

import requests
from cryptography.exceptions import UnsupportedAlgorithm
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from py_vapid import Vapid, VapidException
from pywebpush import WebPushException, webpush
from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import (
    DispositivoNotificaciones,
    PreferenciasNotificaciones,
    Publicacion,
    SesionUsuario,
    SolicitudAmistad,
    Usuario,
)
from app.db.session import engine


logger = logging.getLogger(__name__)
HOSTS_MOZILLA = {"updates.push.services.mozilla.com", "push.services.mozilla.com"}


def validar_endpoint_web_push(valor: str) -> str:
    try:
        url = urlsplit(valor)
        host = url.hostname or ""
    except ValueError:
        raise ValueError("Dirección de notificaciones inválida.") from None

    proveedor_admitido = (
        host.endswith(".push.apple.com")
        or (host == "fcm.googleapis.com" and url.path.startswith("/fcm/send/"))
        or (host in HOSTS_MOZILLA and url.path.startswith(("/wpush/", "/push/")))
    )
    if (
        not valor.isascii()
        or any(not 33 <= ord(caracter) <= 126 for caracter in valor)
        or url.scheme != "https"
        or not proveedor_admitido
        or url.netloc != host
        or not url.path
        or "#" in valor
        or "\\" in valor
    ):
        raise ValueError("Dirección de notificaciones inválida.")
    return valor


@lru_cache(maxsize=1)
def _validar_configuracion(publica: str, privada: str, contacto: str):
    try:
        clave = Vapid.from_string(privada)
        clave_publica = clave.public_key
        if not isinstance(clave_publica, ec.EllipticCurvePublicKey) or not isinstance(clave_publica.curve, ec.SECP256R1):
            raise ValueError("La clave debe usar P-256.")
        punto_publico = clave_publica.public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
        publica_derivada = urlsafe_b64encode(punto_publico).decode("ascii").rstrip("=")
        if publica != publica_derivada:
            raise ValueError("Las claves no coinciden.")
        clave.sign({"sub": contacto, "aud": "https://web.push.apple.com"})
    except (ValueError, TypeError, UnsupportedAlgorithm, VapidException):
        logger.warning("La configuración de Web Push es inválida.")
        return None
    return publica, clave, contacto


def _configuracion():
    publica = os.getenv("WEB_PUSH_VAPID_PUBLIC_KEY", "").strip()
    privada = os.getenv("WEB_PUSH_VAPID_PRIVATE_KEY", "").strip()
    contacto = os.getenv("WEB_PUSH_VAPID_SUBJECT", "").strip()
    if publica and privada and contacto:
        return _validar_configuracion(publica, privada, contacto)
    return None


def clave_publica_web_push() -> str | None:
    configuracion = _configuracion()
    return configuracion[0] if configuracion else None


class _TransporteWebPush(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs["allow_redirects"] = False
        return super().request(method, url, **kwargs)


def _dispositivos_activos(destinatarios, preferencia, *, valor_predeterminado: bool):
    return (
        select(DispositivoNotificaciones)
        .join(SesionUsuario, SesionUsuario.id == DispositivoNotificaciones.sesion_id)
        .join(Usuario, Usuario.id == SesionUsuario.usuario_id)
        .outerjoin(PreferenciasNotificaciones, PreferenciasNotificaciones.usuario_id == Usuario.id)
        .where(
            Usuario.id.in_(destinatarios),
            Usuario.email_verificado.is_(True),
            SesionUsuario.fecha_expiracion > func.now(),
            func.coalesce(preferencia, valor_predeterminado).is_(True),
        )
    )


def _enviar(dispositivos, aviso: dict, ttl: int, configuracion):
    if not dispositivos:
        return

    _, clave, contacto = configuracion
    contenido = json.dumps(aviso, ensure_ascii=False)
    vencidos = []
    with _TransporteWebPush() as transporte:
        for dispositivo in dispositivos:
            try:
                webpush(
                    subscription_info={
                        "endpoint": validar_endpoint_web_push(dispositivo.endpoint),
                        "keys": {"p256dh": dispositivo.p256dh, "auth": dispositivo.auth},
                    },
                    data=contenido,
                    vapid_private_key=clave,
                    vapid_claims={"sub": contacto},
                    requests_session=transporte,
                    timeout=3,
                    ttl=ttl,
                )
            except WebPushException as error:
                if error.status_code in (404, 410):
                    vencidos.append(dispositivo)
                else:
                    logger.warning("Web Push rechazó un aviso (HTTP %s).", error.status_code)
            except (requests.RequestException, ValueError, VapidException) as error:
                logger.warning("No se pudo entregar un aviso Web Push (%s).", type(error).__name__)

    if vencidos:
        with Session(engine) as sesion:
            for dispositivo in vencidos:
                sesion.execute(delete(DispositivoNotificaciones).where(
                    DispositivoNotificaciones.endpoint_sha256 == dispositivo.endpoint_sha256,
                    DispositivoNotificaciones.sesion_id == dispositivo.sesion_id,
                ))
            sesion.commit()


def avisar_solicitud_amistad(solicitud_id: int):
    configuracion = _configuracion()
    if configuracion is None:
        return

    try:
        with Session(engine) as sesion:
            solicitud = sesion.execute(
                select(SolicitudAmistad.destinatario_id, Usuario.nombre_usuario)
                .join(Usuario, Usuario.id == SolicitudAmistad.remitente_id)
                .where(
                    SolicitudAmistad.id == solicitud_id,
                    SolicitudAmistad.estado == "pendiente",
                    Usuario.email_verificado.is_(True),
                )
            ).one_or_none()
            if solicitud is None:
                return
            dispositivos = sesion.scalars(_dispositivos_activos(
                [solicitud.destinatario_id],
                PreferenciasNotificaciones.solicitudes_amistad,
                valor_predeterminado=True,
            )).all()

        aviso = {
            "tipo": "amistad",
            "titulo": "Solicitud de amistad",
            "cuerpo": f"@{solicitud.nombre_usuario} te envió una solicitud de amistad.",
        }
        _enviar(dispositivos, aviso, 24 * 60 * 60, configuracion)
    except SQLAlchemyError as error:
        logger.warning("No se pudo procesar el aviso de amistad (%s).", type(error).__name__)


def avisar_publicacion(publicacion_id: int):
    configuracion = _configuracion()
    if configuracion is None:
        return

    try:
        with Session(engine) as sesion:
            fila = sesion.execute(
                select(Publicacion, Usuario.nombre_usuario)
                .join(Usuario, Usuario.id == Publicacion.usuario_id)
                .where(Publicacion.id == publicacion_id, Usuario.email_verificado.is_(True))
            ).one_or_none()
            if fila is None:
                return
            publicacion, nombre_usuario = fila
            autor_id = publicacion.usuario_id
            remitente = SolicitudAmistad.remitente_id
            destinatario = SolicitudAmistad.destinatario_id
            amigos = select(case((remitente == autor_id, destinatario), else_=remitente)).where(
                SolicitudAmistad.estado == "aceptada",
                or_(remitente == autor_id, destinatario == autor_id),
            )
            dispositivos = sesion.scalars(_dispositivos_activos(
                amigos, PreferenciasNotificaciones.actividad_amigos, valor_predeterminado=False,
            )).all()

        viendo = publicacion.estado == "viendo"
        accion = "está viendo" if viendo else "vio"
        cuerpo = f"@{nombre_usuario} {accion} {publicacion.titulo}"
        if publicacion.puntuacion_personal is not None:
            nota = format(publicacion.puntuacion_personal.normalize(), "f").replace(".", ",")
            cuerpo += f" y le puso {nota}/10"
        titulo = "Actividad de amigos" if viendo else "Película vista"
        aviso = {"tipo": "publicacion", "titulo": titulo, "cuerpo": f"{cuerpo}.", "publicacion_id": publicacion_id}
        _enviar(dispositivos, aviso, (1 if viendo else 24) * 60 * 60, configuracion)
    except SQLAlchemyError as error:
        logger.warning("No se pudo procesar el aviso de publicación (%s).", type(error).__name__)
