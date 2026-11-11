from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


NombreUsuario = Annotated[
    str,
    Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$"),
]


class UsuarioRegistro(BaseModel):
    nombre_usuario: NombreUsuario
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class AltaGoogleSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre_usuario: NombreUsuario

class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_usuario: str
    email: EmailStr
    email_verificado: bool
    fecha_creacion: datetime

AvatarPerfil = Literal["film", "star", "heart", "bookmark"]


class PerfilRespuesta(UsuarioRespuesta):
    nombre_visible: str | None = None
    bio: str | None = None
    avatar: AvatarPerfil | None = None
    foto_perfil_version: str | None = None


class EditarPerfilSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre_visible: str | None = Field(default=None, max_length=50)
    bio: str | None = Field(default=None, max_length=200)
    avatar: AvatarPerfil | None = None

    @field_validator("nombre_visible", "bio", mode="before")
    @classmethod
    def limpiar_texto(cls, valor):
        if isinstance(valor, str):
            if "\x00" in valor:
                raise ValueError("El texto contiene un carácter inválido")
            return valor.strip() or None
        return valor

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class ReenviarVerificacionSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class SolicitudRecuperacionPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr



class RestablecerPasswordSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    password: str = Field(min_length=12, max_length=128)

