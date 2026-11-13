from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.usuarios import AvatarPerfil


class UsuarioEncontrado(BaseModel):
    id: int
    nombre_usuario: str
    nombre_visible: str | None
    avatar: AvatarPerfil | None
    foto_perfil_version: str | None = None


class EnviarSolicitudAmistad(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destinatario_id: int = Field(strict=True, gt=0, le=2_147_483_647)


class SolicitudAmistadCreada(BaseModel):
    id: int
    estado: Literal["pendiente"]


class ResponderSolicitudAmistad(BaseModel):
    model_config = ConfigDict(extra="forbid")

    estado: Literal["aceptada", "rechazada"]


class SolicitudAmistadPendiente(BaseModel):
    id: int
    usuario: UsuarioEncontrado
    fecha_creacion: datetime


class BandejaAmistades(BaseModel):
    recibidas: list[SolicitudAmistadPendiente]
    enviadas: list[SolicitudAmistadPendiente]
    amigos: list[UsuarioEncontrado]