import httpx

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy import delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.api.routes.amistades import existe_amistad_aceptada
from app.core.auth import exigir_email_verificado, obtener_usuario_actual
from app.core.csrf import exigir_csrf
from app.db.models import (
    ComentarioPublicacion,
    MeGustaPublicacion,
    Publicacion,
    Usuario,
)
from app.db.session import engine
from app.schemas.amistades import UsuarioEncontrado
from app.schemas.publicaciones import (
    ComentarioRespuesta,
    ComentariosRespuesta,
    CrearComentario,
    CrearPublicacion,
    MuroRespuesta,
    PeliculaPublicacion,
    PublicacionRespuesta,
)
from app.services.tmdb import obtener_detalle_pelicula


router = APIRouter(
    prefix="/publicaciones",
    tags=["Publicaciones"],
    dependencies=[Depends(exigir_email_verificado)],
)


def consulta_publicaciones(usuario_id: int):
    likes = (
        select(func.count())
        .where(MeGustaPublicacion.publicacion_id == Publicacion.id)
        .correlate(Publicacion)
        .scalar_subquery()
    )
    comentarios = (
        select(func.count())
        .where(ComentarioPublicacion.publicacion_id == Publicacion.id)
        .correlate(Publicacion)
        .scalar_subquery()
    )
    propio_like = (
        select(MeGustaPublicacion.publicacion_id)
        .where(
            MeGustaPublicacion.publicacion_id == Publicacion.id,
            MeGustaPublicacion.usuario_id == usuario_id,
        )
        .correlate(Publicacion)
        .exists()
    )
    return (
        select(Publicacion, Usuario, likes, comentarios, propio_like)
        .join(Usuario, Usuario.id == Publicacion.usuario_id)
        .where(
            Usuario.email_verificado.is_(True),
            or_(
                Publicacion.usuario_id == usuario_id,
                existe_amistad_aceptada(usuario_id, Publicacion.usuario_id),
            ),
        )
    )


def respuesta_publicacion(fila):
    publicacion, autor, likes, comentarios, propio_like = fila
    return PublicacionRespuesta(
        id=publicacion.id,
        autor=UsuarioEncontrado(
            id=autor.id,
            nombre_usuario=autor.nombre_usuario,
            nombre_visible=autor.nombre_visible,
            avatar=autor.avatar,
            foto_perfil_version=autor.foto_perfil_version,
        ),
        pelicula=PeliculaPublicacion(
            id_tmdb=publicacion.id_tmdb,
            titulo=publicacion.titulo,
            anio=publicacion.anio,
            poster=publicacion.poster,
            duracion=publicacion.duracion,
        ),
        estado=publicacion.estado,
        contenido=publicacion.contenido,
        puntuacion_personal=publicacion.puntuacion_personal,
        fecha_creacion=publicacion.fecha_creacion,
        cantidad_me_gusta=likes,
        cantidad_comentarios=comentarios,
        me_gusta=propio_like,
    )


@router.post(
    "",
    status_code=201,
    response_model=PublicacionRespuesta,
    dependencies=[Depends(exigir_csrf)],
)
async def crear_publicacion(
    datos: CrearPublicacion,
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    try:
        pelicula = await obtener_detalle_pelicula(datos.id_tmdb)
    except httpx.HTTPError:
        raise HTTPException(
            503,
            "No pudimos consultar la película. Intentá de nuevo.",
        )

    if pelicula is None:
        raise HTTPException(404, "Película no encontrada.")

    nueva = Publicacion(
        usuario_id=usuario.id,
        id_tmdb=pelicula["id_tmdb"],
        titulo=pelicula["titulo"],
        anio=int(pelicula["anio"]) if pelicula.get("anio") else None,
        poster=pelicula.get("poster"),
        duracion=pelicula.get("duracion"),
        estado=datos.estado,
        contenido=datos.contenido,
        puntuacion_personal=datos.puntuacion_personal,
    )

    with Session(engine) as sesion:
        sesion.add(nueva)
        sesion.flush()
        fila = sesion.execute(
            consulta_publicaciones(usuario.id).where(
                Publicacion.id == nueva.id
            )
        ).one()
        resultado = respuesta_publicacion(fila)
        sesion.commit()

    response.headers["Cache-Control"] = "private, no-store"
    return resultado


@router.get("", response_model=MuroRespuesta)
def obtener_muro(
    response: Response,
    antes_de: int | None = Query(default=None, gt=0, le=2_147_483_647),
    limite: int = Query(default=20, ge=1, le=50),
    autor_id: int | None = Query(default=None, gt=0, le=2_147_483_647),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    consulta = consulta_publicaciones(usuario.id)

    if antes_de is not None:
        consulta = consulta.where(Publicacion.id < antes_de)
    if autor_id is not None:
        consulta = consulta.where(Publicacion.usuario_id == autor_id)

    consulta = consulta.order_by(Publicacion.id.desc()).limit(limite + 1)

    with Session(engine) as sesion:
        filas = sesion.execute(consulta).all()
        publicaciones = [
            respuesta_publicacion(fila)
            for fila in filas[:limite]
        ]

    response.headers["Cache-Control"] = "private, no-store"
    return MuroRespuesta(
        publicaciones=publicaciones,
        siguiente_antes_de=(
            publicaciones[-1].id if len(filas) > limite else None
        ),
    )


@router.get("/{publicacion_id}", response_model=PublicacionRespuesta)
def obtener_publicacion(
    response: Response,
    publicacion_id: int = Path(gt=0, le=2_147_483_647),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    with Session(engine) as sesion:
        fila = sesion.execute(
            consulta_publicaciones(usuario.id).where(
                Publicacion.id == publicacion_id
            )
        ).first()

        if fila is None:
            raise HTTPException(404, "Publicación no disponible.")

        resultado = respuesta_publicacion(fila)

    response.headers["Cache-Control"] = "private, no-store"
    return resultado


def exigir_publicacion_visible(
    sesion: Session,
    publicacion_id: int,
    usuario_id: int,
    bloquear: bool = False,
):
    consulta = (
        consulta_publicaciones(usuario_id)
        .with_only_columns(Publicacion.id)
        .where(Publicacion.id == publicacion_id)
    )

    if bloquear:
        consulta = consulta.with_for_update(of=Publicacion)

    if sesion.scalar(consulta) is None:
        raise HTTPException(404, "Publicación no disponible.")


def respuesta_comentario(comentario, autor):
    return ComentarioRespuesta(
        id=comentario.id,
        autor=UsuarioEncontrado(
            id=autor.id,
            nombre_usuario=autor.nombre_usuario,
            nombre_visible=autor.nombre_visible,
            avatar=autor.avatar,
            foto_perfil_version=autor.foto_perfil_version,
        ),
        contenido=comentario.contenido,
        fecha_creacion=comentario.fecha_creacion,
    )


def cambiar_me_gusta(publicacion_id: int, usuario_id: int, agregar: bool):
    with Session(engine) as sesion:
        exigir_publicacion_visible(
            sesion,
            publicacion_id,
            usuario_id,
            bloquear=True,
        )

        if agregar:
            sesion.execute(
                insert(MeGustaPublicacion)
                .values(
                    publicacion_id=publicacion_id,
                    usuario_id=usuario_id,
                )
                .on_conflict_do_nothing()
            )
        else:
            sesion.execute(
                delete(MeGustaPublicacion).where(
                    MeGustaPublicacion.publicacion_id == publicacion_id,
                    MeGustaPublicacion.usuario_id == usuario_id,
                )
            )

        fila = sesion.execute(
            consulta_publicaciones(usuario_id).where(
                Publicacion.id == publicacion_id
            )
        ).one()

        resultado = respuesta_publicacion(fila)
        sesion.commit()

    return resultado


@router.post(
    "/{publicacion_id}/me-gusta",
    response_model=PublicacionRespuesta,
    dependencies=[Depends(exigir_csrf)],
)
def dar_me_gusta(
    response: Response,
    publicacion_id: int = Path(gt=0, le=2_147_483_647),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    resultado = cambiar_me_gusta(
        publicacion_id,
        usuario.id,
        agregar=True,
    )

    response.headers["Cache-Control"] = "private, no-store"
    return resultado


@router.delete(
    "/{publicacion_id}/me-gusta",
    response_model=PublicacionRespuesta,
    dependencies=[Depends(exigir_csrf)],
)
def quitar_me_gusta(
    response: Response,
    publicacion_id: int = Path(gt=0, le=2_147_483_647),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    resultado = cambiar_me_gusta(
        publicacion_id,
        usuario.id,
        agregar=False,
    )

    response.headers["Cache-Control"] = "private, no-store"
    return resultado


@router.post(
    "/{publicacion_id}/comentarios",
    status_code=201,
    response_model=ComentarioRespuesta,
    dependencies=[Depends(exigir_csrf)],
)
def crear_comentario(
    datos: CrearComentario,
    response: Response,
    publicacion_id: int = Path(gt=0, le=2_147_483_647),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    with Session(engine) as sesion:
        exigir_publicacion_visible(
            sesion,
            publicacion_id,
            usuario.id,
            bloquear=True,
        )

        comentario = ComentarioPublicacion(
            publicacion_id=publicacion_id,
            usuario_id=usuario.id,
            contenido=datos.contenido,
        )

        sesion.add(comentario)
        sesion.flush()
        resultado = respuesta_comentario(comentario, usuario)
        sesion.commit()

    response.headers["Cache-Control"] = "private, no-store"
    return resultado


@router.get(
    "/{publicacion_id}/comentarios",
    response_model=ComentariosRespuesta,
)
def obtener_comentarios(
    response: Response,
    publicacion_id: int = Path(gt=0, le=2_147_483_647),
    despues_de: int | None = Query(default=None, gt=0, le=2_147_483_647),
    limite: int = Query(default=20, ge=1, le=50),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    with Session(engine) as sesion:
        exigir_publicacion_visible(
            sesion,
            publicacion_id,
            usuario.id,
        )

        consulta = (
            select(ComentarioPublicacion, Usuario)
            .join(
                Usuario,
                Usuario.id == ComentarioPublicacion.usuario_id,
            )
            .where(
                ComentarioPublicacion.publicacion_id == publicacion_id
            )
        )

        if despues_de is not None:
            consulta = consulta.where(
                ComentarioPublicacion.id > despues_de
            )

        filas = sesion.execute(
            consulta.order_by(ComentarioPublicacion.id).limit(limite + 1)
        ).all()

        comentarios = [
            respuesta_comentario(comentario, autor)
            for comentario, autor in filas[:limite]
        ]

    response.headers["Cache-Control"] = "private, no-store"
    return ComentariosRespuesta(
        comentarios=comentarios,
        siguiente_despues_de=(
            comentarios[-1].id if len(filas) > limite else None
        ),
    )