from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
    Response,
    Depends,
    Cookie,
    Request,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.db.session import engine
from app.db.models import Usuario, SesionUsuario
from app.schemas.usuarios import (
    UsuarioRegistro,
    UsuarioRespuesta,
    UsuarioLogin,
    ReenviarVerificacionSolicitud,
    SolicitudRecuperacionPassword,
    RestablecerPasswordSolicitud,
)
from app.core.security import hash_password, verify_password, hash_token_sesion
from app.core.auth import crear_sesion_usuario, obtener_usuario_actual, exigir_email_verificado
from app.core.csrf import verificar_origen, generar_token_csrf, exigir_csrf
from app.core.rate_limit import limiter, permitir_reenvio_email, permitir_recuperacion_email
from app.core.login_attempts import esta_bloqueado_login, registrar_fallo_login, limpiar_intentos_login
from app.core.email_verification import verificar_codigo_email, procesar_reenvio_verificacion
from app.core.password_reset import procesar_solicitud_recuperacion, restablecer_password_con_token

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

class VerificarEmailSolicitud(BaseModel):
    email: EmailStr
    codigo: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$"
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
    request: Request,
    background_tasks: BackgroundTasks
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

    background_tasks.add_task(
        procesar_reenvio_verificacion,
        email
    )

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
        if esta_bloqueado_login(sesion, email):
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos. Probá nuevamente más tarde."
            )

        usuario = sesion.scalar(
            select(Usuario)
            .where(Usuario.email == email)
            .with_for_update()
        )

        if (
            usuario is None
            or usuario.password_hash is None
            or not verify_password(datos.password, usuario.password_hash)
        ):
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

        exigir_email_verificado(usuario)

        limpiar_intentos_login(sesion, email)

        crear_sesion_usuario(sesion, usuario.id, response)

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


@router.post(
    "/verificar-email",
    dependencies=[Depends(verificar_origen)]
)
@limiter.limit("10/minute")
def verificar_email(
    datos: VerificarEmailSolicitud,
    request: Request
):
    email = str(datos.email).lower()

    with Session(engine) as sesion:
        usuario_id = sesion.scalar(
            select(Usuario.id).where(
                Usuario.email == email
            )
        )

    if usuario_id is None:
        raise HTTPException(
            status_code=400,
            detail="Código inválido o vencido"
        )

    verificado = verificar_codigo_email(
        usuario_id=usuario_id,
        codigo=datos.codigo
    )

    if not verificado:
        raise HTTPException(
            status_code=400,
            detail="Código inválido o vencido"
        )

    return {
        "mensaje": "Correo verificado correctamente"
    }


@router.post(
    "/reenviar-verificacion",
    status_code=202,
    dependencies=[Depends(verificar_origen)]
)
@limiter.limit("3/minute;10/hour")
def reenviar_verificacion(
    datos: ReenviarVerificacionSolicitud,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks
):
    email = str(datos.email).lower()

    if not permitir_reenvio_email(email):
        raise HTTPException(
            status_code=429,
            detail="Demasiadas solicitudes. Probá nuevamente más tarde."
        )

    background_tasks.add_task(procesar_reenvio_verificacion, email)
    response.headers["Cache-Control"] = "no-store"

    return {
        "mensaje": (
            "Si corresponde, se intentará enviar un código de verificación. "
            "Revisá tu correo y esperá al menos 60 segundos "
            "antes de volver a solicitarlo."
        )
    }


@router.post(
    "/recuperar-password",
    status_code=202,
    dependencies=[Depends(verificar_origen)],
)
@limiter.limit("3/minute;10/hour")
def solicitar_recuperacion_password(
    datos: SolicitudRecuperacionPassword,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    email = str(datos.email).strip().lower()

    if permitir_recuperacion_email(email):
        background_tasks.add_task(procesar_solicitud_recuperacion, email)

    response.headers["Cache-Control"] = "no-store"

    return {
        "mensaje": (
            "Si la cuenta puede recuperarse, "
            "te enviaremos un enlace por correo."
        )
    }


async def leer_solicitud_restablecimiento(
    request: Request,
) -> RestablecerPasswordSolicitud:
    try:
        cuerpo = await request.json()
        return RestablecerPasswordSolicitud.model_validate(cuerpo)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Revisá el enlace y usá una contraseña de 12 a 128 caracteres.",
            headers={"Cache-Control": "no-store"},
        ) from None


@router.post(
    "/restablecer-password",
    status_code=204,
    response_class=Response,
    dependencies=[Depends(verificar_origen)],
)
@limiter.limit("10/minute")
def restablecer_password(
    request: Request,
    datos: RestablecerPasswordSolicitud = Depends(
        leer_solicitud_restablecimiento
    ),
) -> Response:
    headers = {"Cache-Control": "no-store"}

    if not restablecer_password_con_token(datos.token, datos.password):
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido o venció. Solicitá uno nuevo.",
            headers=headers,
        )

    return Response(status_code=204, headers=headers)


