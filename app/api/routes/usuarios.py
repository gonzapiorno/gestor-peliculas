from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.db.models import Usuario
from app.schemas.usuarios import UsuarioRegistro, UsuarioRespuesta
from app.core.security import hash_password


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
        sesion.commit()
        sesion.refresh(nuevo_usuario)

    return nuevo_usuario