from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import engine
from app.db.models import PeliculaColeccion, Usuario
from app.schemas.coleccion import ColeccionAgregar, ColeccionActualizarEstado, ColeccionActualizarFavorita, ColeccionActualizarPuntuacion
from app.services.tmdb import obtener_detalle_pelicula
from app.core.auth import (
    obtener_usuario_actual,
    exigir_email_verificado,
)
from app.core.csrf import verificar_origen, exigir_csrf


router = APIRouter(
    prefix="/coleccion",
    tags=["Colección"],
    dependencies=[Depends(exigir_email_verificado)]
)


@router.post("/", status_code=201, dependencies=[Depends(exigir_csrf)])
async def agregar_pelicula(datos: ColeccionAgregar, usuario: Usuario = Depends(obtener_usuario_actual)):

    # Buscamos la película en TMDB usando su ID.
    pelicula_tmdb = await obtener_detalle_pelicula(datos.id_tmdb)

    if pelicula_tmdb is None:
        raise HTTPException(
            status_code=404,
            detail="Película no encontrada en TMDB"
        )

    # Abrimos una sesión con PostgreSQL.
    with Session(engine) as sesion:

        # Comprueba si un usuario ya tiene guardada guardada esa película.
        existe = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id_tmdb == datos.id_tmdb,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

        if existe:
            raise HTTPException(
                status_code=409,
                detail="La película ya está en tu colección"
            )

        # Construimos el objeto que guardaremos.
        nueva_pelicula = PeliculaColeccion(
            usuario_id=usuario.id,
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
def listar_coleccion(usuario: Usuario = Depends(obtener_usuario_actual)):

    # Abrimos una sesión con nuestra base de datos.
    with Session(engine) as sesion:

        # Recuperamos todas las películas de nuestra colección.
        peliculas = sesion.scalars(
            select(PeliculaColeccion)
            .where(PeliculaColeccion.usuario_id == usuario.id)
            .order_by(PeliculaColeccion.id.desc())
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


@router.get("/{id}")
def obtener_pelicula_coleccion(id: int,  usuario: Usuario = Depends(obtener_usuario_actual)):

    with Session(engine) as sesion:

        pelicula = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id == id,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

        if pelicula is None:
            raise HTTPException(
                status_code=404,
                detail="La película no existe en tu colección"
            )
        
        # Convertimos los objetos de SQLAlchemy en diccionarios.
        return {
                "id": pelicula.id,
                "id_tmdb": pelicula.id_tmdb,
                "titulo": pelicula.titulo,
                "anio": pelicula.anio,
                "poster": pelicula.poster,
                "estado": pelicula.estado,
                "favorita": pelicula.favorita,
                "puntuacion_personal": pelicula.puntuacion_personal
            }


@router.patch("/{id}", dependencies=[Depends(exigir_csrf)])
def actualizar_estado(id: int, datos: ColeccionActualizarEstado, usuario: Usuario = Depends(obtener_usuario_actual)):

    # Abrimos una sesión con PostgreSQL.
    with Session(engine) as sesion:

        # Buscamos la película por su ID interno.
        pelicula = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id == id,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

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


@router.patch("/{id}/favorita", dependencies=[Depends(exigir_csrf)])
def actualizar_favorita(id: int, datos: ColeccionActualizarFavorita, usuario: Usuario = Depends(obtener_usuario_actual)):

    with Session(engine) as sesion:

        # Buscamos la película por su ID interno.
        pelicula = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id == id,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

        if pelicula is None:
            raise HTTPException(
                status_code=404,
                detail="La película no existe en tu colección"
            )

        # Actualizamos únicamente su estado de favorita.
        pelicula.favorita = datos.favorita

        sesion.commit()
        sesion.refresh(pelicula)

        return {
            "mensaje": "Favoritos actualizados correctamente",
            "id": pelicula.id,
            "titulo": pelicula.titulo,
            "favorita": pelicula.favorita
        }


@router.patch("/{id}/puntuacion", dependencies=[Depends(exigir_csrf)])
def actualizar_puntuacion(id: int, datos: ColeccionActualizarPuntuacion, usuario: Usuario = Depends(obtener_usuario_actual)):

    with Session(engine) as sesion:

        # Buscamos la película por su ID interno.
        pelicula = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id == id,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

        if pelicula is None:
            raise HTTPException(
                status_code=404,
                detail="La película no existe en tu colección"
            )

        # Actualizamos únicamente la puntuación personal.
        pelicula.puntuacion_personal = datos.puntuacion_personal

        # Guardamos el cambio.
        sesion.commit()
        sesion.refresh(pelicula)

        return {
            "mensaje": "Puntuación actualizada correctamente",
            "id": pelicula.id,
            "titulo": pelicula.titulo,
            "puntuacion_personal": (
                float(pelicula.puntuacion_personal)
                if pelicula.puntuacion_personal is not None
                else None
            )
        }

@router.delete("/{id}", status_code=204, dependencies=[Depends(exigir_csrf)])
def eliminar_de_coleccion(id: int, usuario: Usuario = Depends(obtener_usuario_actual)):

    # Abrimos una sesión con PostgreSQL.
    with Session(engine) as sesion:

        # Buscamos la película por su ID interno.
        pelicula = sesion.scalar(
            select(PeliculaColeccion).where(
                PeliculaColeccion.id == id,
                PeliculaColeccion.usuario_id == usuario.id
            )
        )

        # Si no existe, devolvemos un error 404.
        if pelicula is None:
            raise HTTPException(
                status_code=404,
                detail="La película no existe en tu colección"
            )

        # Marcamos el registro para eliminarlo.
        sesion.delete(pelicula)

        # Confirmamos la eliminación en PostgreSQL.
        sesion.commit()

