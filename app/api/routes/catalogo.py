from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query
from app.services.tmdb import (
    TMDB_MAX_PAGINA,
    obtener_populares,
    obtener_pagina_catalogo,
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


@router.get("/explorar")
async def explorar_catalogo(
    categoria: Literal["populares", "thriller", "drama", "romance"] = "populares",
    pagina: int = Query(default=1, ge=1, le=TMDB_MAX_PAGINA),
    decada: int | None = Query(default=None, ge=1900, le=2020, multiple_of=10),
):
    try:
        resultado = await obtener_pagina_catalogo(categoria, pagina, decada)
        if decada is not None:
            resultado["decada"] = decada
        return resultado
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502, detail="No se pudo consultar el catálogo de películas"
        ) from None


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
