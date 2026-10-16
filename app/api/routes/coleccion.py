from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import engine
from app.db.models import PeliculaColeccion
from app.schemas.coleccion import ColeccionAgregar, ColeccionActualizarEstado
from app.services.tmdb import obtener_detalle_pelicula


router = APIRouter(
    prefix="/coleccion",
    tags=["Colección"]
)


@router.post("/", status_code=201)
async def agregar_pelicula(datos: ColeccionAgregar):

    # Buscamos la película en TMDB usando su ID.
    pelicula_tmdb = await obtener_detalle_pelicula(datos.id_tmdb)

    if pelicula_tmdb is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada en TMDB"
        )

    # Abrimos una sesión con PostgreSQL.
    with Session(engine) as sesion:

        # Comprobamos si ya tenemos guardada esa película.
        existe = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id_tmdb == datos.id_tmdb
            )
        )

        if existe:
            raise HTTPException(
                status_code=409,
                detail="La película ya está en tu colección"
            )

        # Construimos el objeto que guardaremos.
        nueva_pelicula = PeliculaColeccion(
            id_tmdb=pelicula_tmdb["id_tmdb"],
            titulo=pelicula_tmdb["titulo"],
            anio=int(pelicula_tmdb["anio"]) if pelicula_tmdb["anio"] else None,
            poster=pelicula_tmdb["poster"],
            estado="pendiente",
            favorita=False,
            puntuacion_personal=None
        )

        # Guardamos la película.
        sesion.add(nueva_pelicula)
        sesion.commit()
        sesion.refresh(nueva_pelicula)

        return {
            "mensaje": "Película agregada correctamente",
            "id": nueva_pelicula.id,
            "titulo": nueva_pelicula.titulo
        }


@router.get("/")
def listar_coleccion():

    # Abrimos una sesión con nuestra base de datos.
    with Session(engine) as sesion:

        # Recuperamos todas las películas de nuestra colección.
        peliculas = sesion.scalars(
            select(PeliculaColeccion).order_by(PeliculaColeccion.id.desc())
        ).all()

        # Convertimos los objetos de SQLAlchemy en diccionarios.
        return [
            {
                "id": pelicula.id,
                "id_tmdb": pelicula.id_tmdb,
                "titulo": pelicula.titulo,
                "anio": pelicula.anio,
                "poster": pelicula.poster,
                "estado": pelicula.estado,
                "favorita": pelicula.favorita,
                "puntuacion_personal": pelicula.puntuacion_personal
            }
            for pelicula in peliculas
        ]


@router.patch("/{id}")
def actualizar_estado(id: int, datos: ColeccionActualizarEstado):

    # Abrimos una sesión con PostgreSQL.
    with Session(engine) as sesion:

        # Buscamos la película por su ID interno.
        pelicula = sesion.get(PeliculaColeccion, id)

        # Si no existe, devolvemos un error 404.
        if pelicula is None:
            raise HTTPException(
                status_code=404,
                detail="La película no existe en tu colección"
            )

        # Modificamos solamente el estado.
        pelicula.estado = datos.estado

        # Guardamos el cambio en PostgreSQL.
        sesion.commit()

        # Actualizamos el objeto con los datos guardados.
        sesion.refresh(pelicula)

        return {
            "mensaje": "Estado actualizado correctamente",
            "id": pelicula.id,
            "titulo": pelicula.titulo,
            "estado": pelicula.estado
        }



