from fastapi import APIRouter, HTTPException
from app.schemas.peliculas import PeliculaRespuesta, PeliculaCrear, PeliculaActualizar
from app.repositories.database import obtener_peliculas, insertar_pelicula, obtener_pelicula_por_id, eliminar_pelicula_db, actualizar_pelicula_completa_db


router = APIRouter(
    prefix="/peliculas",
    tags=["Películas"]
)


@router.get(
    "/",
    response_model=list[PeliculaRespuesta] #Este endpoint devuelve una lista de objetos con esta estructura.
)
def listar_peliculas():
    return obtener_peliculas()


@router.post(
    "/",
    response_model=PeliculaRespuesta
)
def crear_pelicula(datos: PeliculaCrear):

    pelicula = insertar_pelicula(
        datos.nombre,
        datos.anio,
        datos.genero,
        datos.puntuacion
    )

    return pelicula


@router.get(
    "/{id_pelicula}",
    response_model=PeliculaRespuesta
)
def obtener_pelicula(id_pelicula: int):

    pelicula = obtener_pelicula_por_id(id_pelicula)

    if pelicula is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada"
        )

    return pelicula


@router.delete(
    "/{id_pelicula}",
    response_model=PeliculaRespuesta
)
def eliminar_pelicula(id_pelicula: int):

    pelicula_eliminada = eliminar_pelicula_db(id_pelicula)

    if pelicula_eliminada is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada"
        )

    return pelicula_eliminada

@router.put(
    "/{id_pelicula}",
    response_model=PeliculaRespuesta
)
def actualizar_pelicula(
    id_pelicula: int,
    datos: PeliculaActualizar
):
    pelicula_actualizada = actualizar_pelicula_completa_db(
        id_pelicula,
        datos.nombre,
        datos.anio,
        datos.genero,
        datos.puntuacion
    )

    if pelicula_actualizada is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada"
        )

    return pelicula_actualizada


