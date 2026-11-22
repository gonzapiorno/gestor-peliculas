import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, Query, Request, Response
from sqlalchemy import and_, case, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.auth import exigir_email_verificado, obtener_usuario_actual
from app.core.csrf import exigir_csrf
from app.core.rate_limit import limiter
from app.db.models import PeliculaColeccion, SolicitudAmistad, Usuario
from app.db.session import engine
from app.schemas.amistades import (
    BandejaAmistades,
    EnviarSolicitudAmistad,
    ResponderSolicitudAmistad,
    SolicitudAmistadCreada,
    SolicitudAmistadPendiente,
    UsuarioEncontrado,
    PeliculaDestacadaAmigo,
    PerfilAmigo,
    ColeccionAmigo,
    PeliculaVistaAmigo,
    PeliculaPendienteAmigo,
)
from app.services.notificaciones import avisar_solicitud_amistad


router = APIRouter(prefix="/amistades", tags=["Amistades"])


@router.get(
    "/buscar",
    response_model=UsuarioEncontrado,
    dependencies=[Depends(exigir_email_verificado)],
)
@limiter.limit("20/minute")
def buscar_usuario(
    request: Request,
    usuario: str = Query(max_length=64),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    nombre = usuario.strip().removeprefix("@")
    if not re.fullmatch(r"[a-zA-Z0-9_]{3,30}", nombre):
        raise HTTPException(422, "Ingresá un nombre de usuario válido.")

    consulta = select(
        Usuario.id,
        Usuario.nombre_usuario,
        Usuario.nombre_visible,
        Usuario.avatar,
    ).where(
        Usuario.nombre_usuario == nombre.lower(),
        Usuario.id != usuario_actual.id,
        Usuario.email_verificado.is_(True),
    )

    with Session(engine) as sesion:
        perfil = sesion.execute(consulta).mappings().one_or_none()

    if perfil is None:
        raise HTTPException(404, "No encontramos ese usuario.")

    return UsuarioEncontrado(**perfil)

@router.post(
    "/solicitudes",
    response_model=SolicitudAmistadCreada,
    status_code=201,
    dependencies=[Depends(exigir_email_verificado), Depends(exigir_csrf)],
)
@limiter.limit("10/minute")
def enviar_solicitud(
    request: Request,
    datos: EnviarSolicitudAmistad,
    background_tasks: BackgroundTasks,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    if datos.destinatario_id == usuario_actual.id:
        raise HTTPException(422, "No podés enviarte una solicitud.")

    with Session(engine) as sesion:
        destinatario_id = sesion.scalar(
            select(Usuario.id).where(
                Usuario.id == datos.destinatario_id,
                Usuario.email_verificado.is_(True),
            )
        )
        if destinatario_id is None:
            raise HTTPException(404, "No encontramos ese usuario.")

        solicitud = (
            insert(SolicitudAmistad)
            .values(
                remitente_id=usuario_actual.id,
                destinatario_id=destinatario_id,
            )
            .on_conflict_do_nothing(
                index_elements=[
                    func.least(
                        SolicitudAmistad.remitente_id,
                        SolicitudAmistad.destinatario_id,
                    ),
                    func.greatest(
                        SolicitudAmistad.remitente_id,
                        SolicitudAmistad.destinatario_id,
                    ),
                ]
            )
            .returning(SolicitudAmistad.id)
        )

        solicitud_id = sesion.scalar(solicitud)
        if solicitud_id is None:
            raise HTTPException(409, "Ya existe una solicitud o amistad entre estas cuentas.")

        sesion.commit()

    background_tasks.add_task(avisar_solicitud_amistad, solicitud_id)
    return SolicitudAmistadCreada(id=solicitud_id, estado="pendiente")


@router.get(
    "/solicitudes",
    response_model=BandejaAmistades,
    dependencies=[Depends(exigir_email_verificado)],
)
def listar_amistades(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    usuario_id = usuario_actual.id
    otra_persona_id = case(
        (SolicitudAmistad.remitente_id == usuario_id, SolicitudAmistad.destinatario_id),
        else_=SolicitudAmistad.remitente_id,
    )

    consulta = (
        select(
            SolicitudAmistad.id,
            SolicitudAmistad.estado,
            SolicitudAmistad.destinatario_id,
            SolicitudAmistad.fecha_creacion,
            Usuario.id.label("usuario_id"),
            Usuario.nombre_usuario,
            Usuario.nombre_visible,
            Usuario.avatar,
            Usuario.foto_perfil_version,
        )
        .join(Usuario, Usuario.id == otra_persona_id)
        .where(
            or_(
                SolicitudAmistad.remitente_id == usuario_id,
                SolicitudAmistad.destinatario_id == usuario_id,
            ),
            SolicitudAmistad.estado.in_(("pendiente", "aceptada")),
        )
        .order_by(SolicitudAmistad.fecha_creacion.desc(), SolicitudAmistad.id.desc())
    )

    bandeja = BandejaAmistades(recibidas=[], enviadas=[], amigos=[])
    with Session(engine) as sesion:
        for fila in sesion.execute(consulta).mappings():
            perfil = UsuarioEncontrado(
                id=fila["usuario_id"],
                nombre_usuario=fila["nombre_usuario"],
                nombre_visible=fila["nombre_visible"],
                avatar=fila["avatar"],
                foto_perfil_version=fila["foto_perfil_version"],
            )
            if fila["estado"] == "aceptada":
                bandeja.amigos.append(perfil)
                continue

            pendiente = SolicitudAmistadPendiente(
                id=fila["id"],
                usuario=perfil,
                fecha_creacion=fila["fecha_creacion"],
            )
            if fila["destinatario_id"] == usuario_id:
                bandeja.recibidas.append(pendiente)
            else:
                bandeja.enviadas.append(pendiente)

    return bandeja


@router.patch(
    "/solicitudes/{solicitud_id}",
    status_code=204,
    dependencies=[Depends(exigir_email_verificado), Depends(exigir_csrf)],
)
def responder_solicitud(
    datos: ResponderSolicitudAmistad,
    solicitud_id: int = Path(gt=0, le=2_147_483_647),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    consulta = (
        update(SolicitudAmistad)
        .where(
            SolicitudAmistad.id == solicitud_id,
            SolicitudAmistad.destinatario_id == usuario_actual.id,
            SolicitudAmistad.estado == "pendiente",
        )
        .values(estado=datos.estado, fecha_respuesta=func.now())
        .returning(SolicitudAmistad.id)
    )

    with Session(engine) as sesion:
        if sesion.scalar(consulta) is None:
            raise HTTPException(404, "No encontramos esa solicitud pendiente.")
        sesion.commit()

    return Response(status_code=204)


@router.get(
    "/usuarios/{usuario_id}/foto",
    dependencies=[Depends(exigir_email_verificado)],
)
def obtener_foto_amistad(
    usuario_id: int = Path(gt=0, le=2_147_483_647),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    remitente = SolicitudAmistad.remitente_id
    destinatario = SolicitudAmistad.destinatario_id
    actual_id = usuario_actual.id

    vinculo = (
        select(SolicitudAmistad.id)
        .where(
            SolicitudAmistad.estado.in_(("pendiente", "aceptada")),
            or_(
                and_(remitente == actual_id, destinatario == usuario_id),
                and_(remitente == usuario_id, destinatario == actual_id),
            ),
        )
        .exists()
    )

    with Session(engine) as sesion:
        foto = sesion.scalar(
            select(Usuario.foto_perfil).where(
                Usuario.id == usuario_id,
                Usuario.email_verificado.is_(True),
                vinculo,
            )
        )

    if foto is None:
        raise HTTPException(404, "Foto no disponible.")

    return Response(
        content=foto,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, no-store"},
    )

def existe_amistad_aceptada(actual_id: int, usuario_id: int):
    remitente = SolicitudAmistad.remitente_id
    destinatario = SolicitudAmistad.destinatario_id
    return (
        select(SolicitudAmistad.id)
        .where(
            SolicitudAmistad.estado == "aceptada",
            or_(
                and_(remitente == actual_id, destinatario == usuario_id),
                and_(remitente == usuario_id, destinatario == actual_id),
            ),
        )
        .exists()
    )

@router.get(
    "/usuarios/{usuario_id}/perfil",
    response_model=PerfilAmigo,
    dependencies=[Depends(exigir_email_verificado)],
)
def obtener_perfil_amigo(
    usuario_id: int = Path(gt=0, le=2_147_483_647),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    amistad_aceptada = existe_amistad_aceptada(usuario_actual.id, usuario_id)

    consulta = (
        select(
            Usuario.id,
            Usuario.nombre_usuario,
            Usuario.nombre_visible,
            Usuario.avatar,
            Usuario.foto_perfil_version,
            Usuario.bio,
            PeliculaColeccion.id_tmdb,
            PeliculaColeccion.titulo,
            PeliculaColeccion.anio,
            PeliculaColeccion.poster,
            PeliculaColeccion.posicion_destacada,
        )
        .select_from(Usuario)
        .outerjoin(
            PeliculaColeccion,
            and_(
                PeliculaColeccion.usuario_id == Usuario.id,
                PeliculaColeccion.posicion_destacada.is_not(None),
            ),
        )
        .where(
            Usuario.id == usuario_id,
            Usuario.email_verificado.is_(True),
            amistad_aceptada,
        )
        .order_by(PeliculaColeccion.posicion_destacada)
    )

    with Session(engine) as sesion:
        filas = sesion.execute(consulta).mappings().all()

    if not filas:
        raise HTTPException(404, "Perfil no disponible.")

    destacadas = [
        PeliculaDestacadaAmigo.model_validate(fila)
        for fila in filas
        if fila["posicion_destacada"] is not None
    ]
    return PerfilAmigo(**filas[0], destacadas=destacadas)


@router.delete(
    "/usuarios/{usuario_id}/amistad",
    status_code=204,
    dependencies=[Depends(exigir_email_verificado), Depends(exigir_csrf)],
)
def quitar_amistad(
    usuario_id: int = Path(gt=0, le=2_147_483_647),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    actual_id = usuario_actual.id
    remitente = SolicitudAmistad.remitente_id
    destinatario = SolicitudAmistad.destinatario_id

    consulta = (
        delete(SolicitudAmistad)
        .where(
            SolicitudAmistad.estado == "aceptada",
            or_(
                and_(remitente == actual_id, destinatario == usuario_id),
                and_(remitente == usuario_id, destinatario == actual_id),
            ),
        )
        .returning(SolicitudAmistad.id)
    )

    with Session(engine) as sesion:
        if sesion.scalar(consulta) is None:
            raise HTTPException(404, "No encontramos esa amistad.")
        sesion.commit()

    return Response(status_code=204)

@router.get(
    "/usuarios/{usuario_id}/coleccion",
    response_model=ColeccionAmigo,
    dependencies=[Depends(exigir_email_verificado)],
)
def obtener_coleccion_amigo(
    response: Response,
    usuario_id: int = Path(gt=0, le=2_147_483_647),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    vistas_compartidas = and_(
        PeliculaColeccion.estado == "vista",
        Usuario.coleccion_visible_amigos.is_(True),
    )
    pendientes_compartidas = and_(
        PeliculaColeccion.estado == "pendiente",
        Usuario.pendientes_visibles_amigos.is_(True),
    )

    consulta = (
        select(
            Usuario.coleccion_visible_amigos,
            Usuario.pendientes_visibles_amigos,
            PeliculaColeccion.id_tmdb,
            PeliculaColeccion.titulo,
            PeliculaColeccion.anio,
            PeliculaColeccion.poster,
            PeliculaColeccion.estado,
            PeliculaColeccion.puntuacion_personal,
        )
        .select_from(Usuario)
        .outerjoin(
            PeliculaColeccion,
            and_(
                PeliculaColeccion.usuario_id == Usuario.id,
                or_(vistas_compartidas, pendientes_compartidas),
            ),
        )
        .where(
            Usuario.id == usuario_id,
            Usuario.email_verificado.is_(True),
            existe_amistad_aceptada(usuario_actual.id, usuario_id),
        )
        .order_by(PeliculaColeccion.id.desc())
    )

    with Session(engine) as sesion:
        filas = sesion.execute(consulta).mappings().all()

    if not filas:
        raise HTTPException(404, "Perfil no disponible.")

    vistas = [
        PeliculaVistaAmigo.model_validate(fila)
        for fila in filas
        if fila["estado"] == "vista"
    ]
    pendientes = [
        PeliculaPendienteAmigo.model_validate(fila)
        for fila in filas
        if fila["estado"] == "pendiente"
    ]

    response.headers["Cache-Control"] = "private, no-store"

    return ColeccionAmigo(
        visible=filas[0]["coleccion_visible_amigos"],
        peliculas=vistas,
        pendientes_visibles=filas[0]["pendientes_visibles_amigos"],
        pendientes=pendientes,
    )
