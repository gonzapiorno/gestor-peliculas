import os
from hashlib import sha256
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.auth import exigir_email_verificado, obtener_usuario_actual
from app.core.csrf import exigir_csrf
from app.core.security import hash_token_sesion
from app.db.models import DispositivoNotificaciones, PreferenciasNotificaciones, SesionUsuario, Usuario
from app.db.session import engine


router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones"],
    dependencies=[Depends(exigir_email_verificado)],
)
escritura_protegida = [Depends(exigir_csrf)]
hosts_mozilla = {"updates.push.services.mozilla.com", "push.services.mozilla.com"}


class CambiarPreferencias(BaseModel):
    model_config = ConfigDict(extra="forbid")

    solicitudes_amistad: bool = Field(default=True, strict=True)
    actividad_amigos: bool = Field(default=False, strict=True)


class EndpointDispositivo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    endpoint: str = Field(min_length=1, max_length=2048)

    @field_validator("endpoint")
    @classmethod
    def validar_endpoint(cls, valor: str) -> str:
        try:
            url = urlsplit(valor)
            host = url.hostname or ""
        except ValueError:
            raise ValueError("Dirección de notificaciones inválida.") from None
        valido = (
            host.endswith(".push.apple.com")
            or (host == "fcm.googleapis.com" and url.path.startswith("/fcm/send/"))
            or (host in hosts_mozilla and url.path.startswith(("/wpush/", "/push/")))
        )
        if (
            not valor.isascii()
            or any(not 33 <= ord(caracter) <= 126 for caracter in valor)
            or url.scheme != "https"
            or not valido
            or url.netloc != host
            or not url.path
            or "#" in valor
            or "\\" in valor
        ):
            raise ValueError("Dirección de notificaciones inválida.")
        return valor


class ClavesDispositivo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    p256dh: str = Field(pattern=r"^[A-Za-z0-9_-]{87}$")
    auth: str = Field(pattern=r"^[A-Za-z0-9_-]{22}$")


class AltaDispositivo(EndpointDispositivo):
    keys: ClavesDispositivo


class AjustesNotificaciones(CambiarPreferencias):
    clave_publica: str | None
    dispositivos: list[str]


def clave_publica():
    return os.getenv("WEB_PUSH_VAPID_PUBLIC_KEY", "").strip() or None


def obtener_sesion_id(sesion: Session, request: Request, usuario_id: int, *, escritura=False):
    token = request.cookies.get("muvis_session")
    if not token:
        raise HTTPException(401, "Sesión inválida.")

    consulta = select(SesionUsuario.id).where(
        SesionUsuario.token_hash == hash_token_sesion(token),
        SesionUsuario.usuario_id == usuario_id,
        SesionUsuario.fecha_expiracion > func.now(),
    )
    if escritura:
        consulta = consulta.with_for_update()
    sesion_id = sesion.scalar(consulta)
    if sesion_id is None:
        raise HTTPException(401, "Sesión inválida.")
    return sesion_id


def ajustes(sesion: Session, usuario_id: int, sesion_id: int, response: Response):
    preferencias = sesion.get(PreferenciasNotificaciones, usuario_id)
    dispositivos = sesion.scalars(
        select(DispositivoNotificaciones.endpoint_sha256)
        .where(DispositivoNotificaciones.sesion_id == sesion_id)
        .order_by(DispositivoNotificaciones.endpoint_sha256)
    ).all()
    response.headers["Cache-Control"] = "private, no-store"
    return AjustesNotificaciones(
        solicitudes_amistad=preferencias.solicitudes_amistad if preferencias else True,
        actividad_amigos=preferencias.actividad_amigos if preferencias else False,
        clave_publica=clave_publica(),
        dispositivos=dispositivos,
    )


@router.get("", response_model=AjustesNotificaciones)
def obtener_ajustes(request: Request, response: Response, usuario: Usuario = Depends(obtener_usuario_actual)):
    with Session(engine) as sesion:
        sesion_id = obtener_sesion_id(sesion, request, usuario.id)
        return ajustes(sesion, usuario.id, sesion_id, response)


@router.patch("", response_model=AjustesNotificaciones, dependencies=escritura_protegida)
def guardar_ajustes(datos: CambiarPreferencias, request: Request, response: Response,
                    usuario: Usuario = Depends(obtener_usuario_actual)):
    cambios = datos.model_dump(exclude_unset=True)
    with Session(engine) as sesion:
        sesion_id = obtener_sesion_id(sesion, request, usuario.id, escritura=True)
        if cambios:
            sesion.execute(
                insert(PreferenciasNotificaciones).values(usuario_id=usuario.id, **cambios)
                .on_conflict_do_update(index_elements=["usuario_id"], set_=cambios)
            )
        resultado = ajustes(sesion, usuario.id, sesion_id, response)
        sesion.commit()
        return resultado


@router.post("/dispositivos", response_model=AjustesNotificaciones, dependencies=escritura_protegida)
def guardar_dispositivo(datos: AltaDispositivo, request: Request, response: Response,
                        usuario: Usuario = Depends(obtener_usuario_actual)):
    if not clave_publica():
        raise HTTPException(503, "El envío de notificaciones todavía no está disponible.")
    huella = sha256(datos.endpoint.encode("ascii")).hexdigest()
    with Session(engine) as sesion:
        sesion_id = obtener_sesion_id(sesion, request, usuario.id, escritura=True)
        tabla = DispositivoNotificaciones
        alta = insert(tabla).values(
            endpoint_sha256=huella, sesion_id=sesion_id, endpoint=datos.endpoint,
            p256dh=datos.keys.p256dh, auth=datos.keys.auth,
        )
        guardado = sesion.scalar(alta.on_conflict_do_update(
            index_elements=[tabla.endpoint_sha256],
            set_={"sesion_id": sesion_id},
            where=(tabla.endpoint == datos.endpoint) & (tabla.p256dh == datos.keys.p256dh) & (tabla.auth == datos.keys.auth),
        ).returning(tabla.endpoint_sha256))
        if guardado is None:
            raise HTTPException(409, "La suscripción del dispositivo cambió.")
        resultado = ajustes(sesion, usuario.id, sesion_id, response)
        sesion.commit()
        return resultado


@router.delete("/dispositivos", response_model=AjustesNotificaciones, dependencies=escritura_protegida)
def quitar_dispositivo(datos: EndpointDispositivo, request: Request, response: Response,
                       usuario: Usuario = Depends(obtener_usuario_actual)):
    huella = sha256(datos.endpoint.encode("ascii")).hexdigest()
    with Session(engine) as sesion:
        sesion_id = obtener_sesion_id(sesion, request, usuario.id, escritura=True)
        sesion.execute(delete(DispositivoNotificaciones).where(
            DispositivoNotificaciones.endpoint_sha256 == huella,
            DispositivoNotificaciones.sesion_id == sesion_id,
        ))
        resultado = ajustes(sesion, usuario.id, sesion_id, response)
        sesion.commit()
        return resultado
