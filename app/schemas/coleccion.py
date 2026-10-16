from pydantic import BaseModel, Field
from typing import Literal

class ColeccionAgregar(BaseModel):
    id_tmdb: int = Field(gt=0)

class ColeccionActualizarEstado(BaseModel):
    estado: Literal["vista", "pendiente"] #Literal: herramienta de Python que nos permite limitar los valores aceptados.