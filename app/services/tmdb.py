import os

import httpx
from dotenv import load_dotenv


load_dotenv()

TMDB_TOKEN = os.getenv("TMDB_TOKEN")
TMDB_URL = "https://api.themoviedb.org/3"


# Headers utilizados para autenticarnos contra TMDB.
HEADERS = {
    "Authorization": f"Bearer {TMDB_TOKEN}",
    "accept": "application/json"
}


async def obtener_populares():

    async with httpx.AsyncClient(timeout=10.0) as client:

        respuesta = await client.get(
            f"{TMDB_URL}/movie/popular",
            headers=HEADERS,
            params={
                "language": "es-AR",
                "region": "AR",
                "page": 1
            }
        )

        respuesta.raise_for_status()

        datos = respuesta.json()

        peliculas = []

        # Transformamos la respuesta de TMDB
        # al formato que necesita nuestro frontend.
        for pelicula in datos["results"]:

            poster_path = pelicula.get("poster_path")

            peliculas.append({
                "id_tmdb": pelicula["id"],
                "titulo": pelicula["title"],
                "anio": (
                    pelicula["release_date"][:4]
                    if pelicula.get("release_date")
                    else None
                ),
                "puntuacion": round(
                    pelicula.get("vote_average", 0),
                    1
                ),
                "poster": (
                    f"https://image.tmdb.org/t/p/w500{poster_path}"
                    if poster_path
                    else None
                )
            })

        return peliculas


async def obtener_detalle_pelicula(id_tmdb):

    async with httpx.AsyncClient(timeout=10.0) as client:
        respuesta = await client.get(
            f"{TMDB_URL}/movie/{id_tmdb}",
            headers=HEADERS,
            params={
                "language": "es-AR"
            }
        )

        # Si TMDB no conoce ese ID, devolvemos None.
        if respuesta.status_code == 404:
            return None

        respuesta.raise_for_status()

        pelicula = respuesta.json()

        poster_path = pelicula.get("poster_path")

        return {
            "id_tmdb": pelicula["id"],
            "titulo": pelicula["title"],
            "anio": (
                pelicula["release_date"][:4]
                if pelicula.get("release_date")
                else None
            ),
            "sinopsis": pelicula.get("overview"),
            "duracion": pelicula.get("runtime"),
            "puntuacion": round(
                pelicula.get("vote_average", 0),
                1
            ),
            "generos": [
                genero["name"]
                for genero in pelicula.get("genres", [])
            ],
            "poster": (
                f"https://image.tmdb.org/t/p/w500{poster_path}"
                if poster_path
                else None
            )
        }