from fastapi import APIRouter, HTTPException
from app.services.tmdb import (
    obtener_populares,
    obtener_detalle_pelicula
)



router = APIRouter(
    prefix="/catalogo",
    tags=["Catálogo"]
)


@router.get("/populares")
async def listar_populares():
    return await obtener_populares()

@router.get("/peliculas/{id_tmdb}")
async def detalle_pelicula(id_tmdb: int):

    pelicula = await obtener_detalle_pelicula(id_tmdb)

    if pelicula is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada"
        )

    return pelicula