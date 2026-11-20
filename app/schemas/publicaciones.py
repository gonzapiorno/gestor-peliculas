from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.schemas.amistades import UsuarioEncontrado


TextoPublicacion = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=280),
]

TextoComentario = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=280,
    ),
]

NotaPublicacion = Annotated[
    Decimal,
    Field(
        ge=Decimal("1"),
        le=Decimal("10"),
        multiple_of=Decimal("0.5"),
    ),
]


class CrearPublicacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_tmdb: int = Field(strict=True, gt=0, le=2_147_483_647)
    estado: Literal["viendo", "vista"]
    contenido: TextoPublicacion = ""
    puntuacion_personal: NotaPublicacion | None = None

    @model_validator(mode="after")
    def validar_nota(self):
        if self.estado == "viendo" and self.puntuacion_personal is not None:
            raise ValueError(
                "La nota se puede agregar cuando ya viste la película."
            )
        return self


class CrearComentario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contenido: TextoComentario


class PeliculaPublicacion(BaseModel):
    id_tmdb: int
    titulo: str
    anio: int | None
    poster: str | None
    duracion: int | None


class PublicacionRespuesta(BaseModel):
    id: int
    autor: UsuarioEncontrado
    pelicula: PeliculaPublicacion
    estado: Literal["viendo", "vista"]
    contenido: str
    puntuacion_personal: float | None
    fecha_creacion: datetime
    cantidad_me_gusta: int
    cantidad_comentarios: int
    me_gusta: bool


class MuroRespuesta(BaseModel):
    publicaciones: list[PublicacionRespuesta]
    siguiente_antes_de: int | None


class ComentarioRespuesta(BaseModel):
    id: int
    autor: UsuarioEncontrado
    contenido: str
    fecha_creacion: datetime


class ComentariosRespuesta(BaseModel):
    comentarios: list[ComentarioRespuesta]
    siguiente_despues_de: int | None