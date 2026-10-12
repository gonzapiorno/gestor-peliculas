from pydantic import BaseModel, Field


class PeliculaRespuesta(BaseModel):
    id_pelicula: int
    nombre: str
    anio: int
    genero: str
    puntuacion: int

class PeliculaCrear(BaseModel):
    nombre: str
    anio: int
    genero: str
    puntuacion: int = Field(ge=1, le=10)

class PeliculaActualizar(BaseModel):
    nombre: str
    anio: int
    genero: str
    puntuacion: int = Field(ge=1, le=10)


