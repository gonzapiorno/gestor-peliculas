from pydantic import BaseModel, Field
from typing import Literal
from decimal import Decimal

class ColeccionAgregar(BaseModel):
    id_tmdb: int = Field(gt=0)

class ColeccionActualizarEstado(BaseModel):
    estado: Literal["vista", "pendiente"] #Literal: herramienta de Python que nos permite limitar los valores aceptados.


class ColeccionActualizarFavorita(BaseModel):
    favorita: bool


class ColeccionActualizarPuntuacion(BaseModel):
    puntuacion_personal: Decimal | None = Field(
        ...,
        ge=Decimal("1"),
        le=Decimal("10"),
        multiple_of=Decimal("0.5")
    )

