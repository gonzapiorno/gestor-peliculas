from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import os

from datetime import datetime, timedelta, timezone

from app.db.session import engine
from app.db.models import Usuario, SesionUsuario
from app.schemas.usuarios import UsuarioRegistro, UsuarioRespuesta, UsuarioLogin
from app.core.security import hash_password, verify_password, generar_token_sesion, hash_token_sesion

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.post(
    "/registro",
    response_model=UsuarioRespuesta,
    status_code=201
)
def registrar_usuario(datos: UsuarioRegistro):
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


@router.post("/login")
def login_usuario(datos: UsuarioLogin, response: Response):

    email = str(datos.email).lower()

    with Session(engine) as sesion:

        # Acá buscaremos al usuario en PostgreSQL.
        usuario = sesion.scalar(
            select(Usuario).where(Usuario.email==email)
        )

        if usuario is None or not verify_password(
            datos.password,
            usuario.password_hash
        ):
            raise HTTPException(
                status_code=401,
                detail="Correo electrónico o contraseña incorrectos"
            )

        # Generamos un token nuevo para esta sesión.
        token = generar_token_sesion()

        # Definimos cuándo dejará de ser válida.
        expiracion = datetime.now(timezone.utc) + timedelta(days=21)

        # Creamos el registro de sesión.
        nueva_sesion = SesionUsuario(
            usuario_id=usuario.id,
            token_hash=hash_token_sesion(token),
            fecha_expiracion=expiracion
        )

        # Guardamos la sesión en PostgreSQL.
        sesion.add(nueva_sesion)
        sesion.commit()
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
