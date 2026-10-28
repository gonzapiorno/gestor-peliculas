from fastapi import APIRouter, HTTPException, Response, Depends, Cookie, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import os

from datetime import datetime, timedelta, timezone

from app.db.session import engine
from app.db.models import Usuario, SesionUsuario
from app.schemas.usuarios import UsuarioRegistro, UsuarioRespuesta, UsuarioLogin
from app.core.security import hash_password, verify_password, generar_token_sesion, hash_token_sesion
from app.core.auth import obtener_usuario_actual
from app.core.csrf import verificar_origen, generar_token_csrf, exigir_csrf
from app.core.rate_limit import limiter
from app.core.login_attempts import (esta_bloqueado_login, registrar_fallo_login, limpiar_intentos_login)

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.post(
    "/registro",
    response_model=UsuarioRespuesta,
    status_code=201,
    dependencies=[Depends(verificar_origen)]
)
@limiter.limit("10/hour")
def registrar_usuario(
    datos: UsuarioRegistro, 
    request: Request
):
    nombre_usuario = datos.nombre_usuario.lower()
    email = str(datos.email).lower()

    with Session(engine) as sesion:

        existe = sesion.scalar(
            select(Usuario).where(
                (Usuario.nombre_usuario == nombre_usuario) |
                (Usuario.email == email)
            )
        )

        if existe:
            raise HTTPException(
                status_code=409,
                detail="El nombre de usuario o correo ya está registrado"
            )

        nuevo_usuario = Usuario(
            nombre_usuario=nombre_usuario,
            email=email,
            password_hash=hash_password(datos.password)
        )

        sesion.add(nuevo_usuario)

        try:
            sesion.commit()

        except IntegrityError:
            sesion.rollback()
            raise HTTPException(
                status_code=409,
                detail="El nombre de usuario o correo ya está registrado"
            )

        sesion.refresh(nuevo_usuario)

    return nuevo_usuario


@router.post(
    "/login",
    dependencies=[Depends(verificar_origen)]
)
@limiter.limit("5/minute")
def login_usuario(
    datos: UsuarioLogin,
    response: Response,
    request: Request
):

    email = str(datos.email).lower()

    with Session(engine) as sesion:

        # Verificamos si existe una espera activa.
        if esta_bloqueado_login(sesion, email):
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos. Probá nuevamente más tarde."
            )

        # Buscamos al usuario.
        usuario = sesion.scalar(
            select(Usuario).where(Usuario.email == email)
        )

        # Comprobamos las credenciales.
        if usuario is None or not verify_password(
            datos.password,
            usuario.password_hash
        ):

            # Registramos el intento fallido.
            intentos, bloqueado = registrar_fallo_login(
                sesion,
                email
            )

            if bloqueado:
                raise HTTPException(
                    status_code=429,
                    detail="Demasiados intentos. Probá nuevamente más tarde."
                )

            raise HTTPException(
                status_code=401,
                detail="Correo electrónico o contraseña incorrectos"
            )

        # Las credenciales son correctas.
        # Limpiamos los intentos fallidos.
        limpiar_intentos_login(sesion, email)

        # Generamos el token de sesión.
        token = generar_token_sesion()

        expiracion = datetime.now(timezone.utc) + timedelta(days=21)

        nueva_sesion = SesionUsuario(
            usuario_id=usuario.id,
            token_hash=hash_token_sesion(token),
            fecha_expiracion=expiracion
        )

        sesion.add(nueva_sesion)
        sesion.commit()

        # Enviamos la cookie.
        response.set_cookie(
            key="muvis_session",
            value=token,
            httponly=True,
            secure=os.getenv("APP_ENV") != "development",
            samesite="lax",
            max_age=21 * 24 * 60 * 60,
            path="/"
        )

    return {"mensaje": "Inicio de sesión correcto"}


@router.get(
    "/me", 
    response_model=UsuarioRespuesta
)
def obtener_mi_perfil(
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    return usuario


@router.get("/csrf")
def obtener_token_csrf(
    request: Request,
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    token_sesion = request.cookies.get("muvis_session")

    if token_sesion is None:
        raise HTTPException(
            status_code=401,
            detail="No autenticado"
        )

    token_hash = hash_token_sesion(token_sesion)

    token_csrf = generar_token_csrf(token_hash)

    response.headers["Cache-Control"] = "no-store"

    return {"csrf_token": token_csrf}


@router.post(
    "/logout", 
    status_code=204, 
    dependencies=[Depends(exigir_csrf)]
)
def cerrar_sesion(
    response: Response,
    muvis_session: str | None = Cookie(default=None)
):
    #invalidamos la sesión.
    if muvis_session is not None:

        token_hash = hash_token_sesion(muvis_session)

        with Session(engine) as sesion:

            sesion_actual = sesion.scalar(
                select(SesionUsuario).where(
                    SesionUsuario.token_hash == token_hash
                )
            )

            if sesion_actual is not None:
                sesion.delete(sesion_actual)
                sesion.commit()

    response.delete_cookie(
    key="muvis_session",
    path="/"
)
