from fastapi import APIRouter, HTTPException, Query
from app.services.tmdb import (
    obtener_populares,
    obtener_detalle_pelicula,
    buscar_peliculas
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


@router.get("/buscar")
async def buscar_en_catalogo(titulo: str = Query(min_length=2, max_length=100)):

    titulo = titulo.strip()

    if len(titulo) < 2:
        raise HTTPException(
            status_code=422,
            detail="Ingresá al menos dos caracteres"
        )

    return await buscar_peliculas(titulo)