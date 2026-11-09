import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, SecretStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.auth import crear_sesion_usuario, exigir_email_verificado, obtener_usuario_actual
from app.core.csrf import exigir_csrf, verificar_origen
from app.core.google_auth import decidir_acceso_google, verificar_credencial_google
from app.core.login_attempts import esta_bloqueado_login, limpiar_intentos_login, registrar_fallo_login
from app.core.rate_limit import limiter
from app.core.security import generar_token_sesion, hash_token_sesion, verify_password
from app.db.models import IdentidadExterna, IntentoGoogle, SesionUsuario, Usuario
from app.db.session import engine
from app.schemas.usuarios import AltaGoogleSolicitud

RUTA_GOOGLE = "/usuarios/google"
COOKIE_INTENTO = "muvis_google_intento"
VIGENCIA_INTENTO = 5 * 60
VIGENCIA_ALTA = 10 * 60

router = APIRouter(
    prefix=RUTA_GOOGLE,
    tags=["Usuarios"],
    dependencies=[Depends(verificar_origen)],
)


class CredencialGoogleSolicitud(BaseModel):
    credencial: SecretStr

class VincularGoogleSolicitud(CredencialGoogleSolicitud):
    password: SecretStr

def guardar_cookie_intento(response: Response, token: str, vigencia: int) -> None:
    response.set_cookie(
        key=COOKIE_INTENTO,
        value=token,
        httponly=True,
        secure=os.getenv("APP_ENV") != "development",
        samesite="lax",
        max_age=vigencia,
        path=RUTA_GOOGLE,
    )


def hash_intento_vinculacion(token: str, token_sesion: str) -> str:
    return hash_token_sesion(f"google:vincular:{token_sesion}:{token}")


def preparar_intento_google(
    response: Response,
    token_sesion: str | None = None,
) -> dict[str, str]:
    if not os.getenv("GOOGLE_CLIENT_ID", "").strip():
        raise HTTPException(503, "El acceso con Google todavía no está configurado")

    token = generar_token_sesion()
    nonce = generar_token_sesion()
    ahora = datetime.now(timezone.utc)
    token_hash = hash_token_sesion(token)
    paso = None

    if token_sesion is not None:
        token_hash = hash_intento_vinculacion(token, token_sesion)
        paso = "vincular"

    with Session(engine) as sesion:
        sesion.execute(
            delete(IntentoGoogle).where(IntentoGoogle.fecha_expiracion <= ahora)
        )
        sesion.add(
            IntentoGoogle(
                token_hash=token_hash,
                nonce=nonce,
                fecha_expiracion=ahora + timedelta(seconds=VIGENCIA_INTENTO),
                paso=paso,
            )
        )
        sesion.commit()

    response.headers["Cache-Control"] = "no-store"
    guardar_cookie_intento(response, token, VIGENCIA_INTENTO)
    return {"nonce": nonce}


@router.post("/intento")
@limiter.limit("10/minute")
def iniciar_intento_google(request: Request, response: Response):
    return preparar_intento_google(response)


@router.post("/vincular/intento", dependencies=[Depends(exigir_csrf)])
@limiter.limit("5/minute")
def iniciar_vinculacion_google(
    request: Request,
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    exigir_email_verificado(usuario)
    return preparar_intento_google(
        response,
        token_sesion=request.cookies["muvis_session"],
    )


@router.post("/credencial")
@limiter.limit("5/minute")
def recibir_credencial_google(
    datos: CredencialGoogleSolicitud,
    request: Request,
    response: Response,
):
    token = request.cookies.get(COOKIE_INTENTO)
    credencial = datos.credencial.get_secret_value()
    if not token or not 1 <= len(credencial) <= 8192:
        raise HTTPException(401, "Volvé a iniciar el acceso con Google")

    token_hash = hash_token_sesion(token)
    with Session(engine) as sesion:
        nonce = sesion.scalar(
            select(IntentoGoogle.nonce).where(
                IntentoGoogle.token_hash == token_hash,
                IntentoGoogle.paso.is_(None),
                IntentoGoogle.fecha_expiracion > datetime.now(timezone.utc),
            )
        )

    if nonce is None:
        raise HTTPException(401, "Volvé a iniciar el acceso con Google")

    identidad = verificar_credencial_google(credencial, nonce)

    response.headers["Cache-Control"] = "no-store"
    with Session(engine) as sesion:
        intento = sesion.get(IntentoGoogle, token_hash, with_for_update=True)
        ahora = datetime.now(timezone.utc)

        if (
            intento is None
            or intento.nonce != nonce
            or intento.paso is not None
            or intento.fecha_expiracion <= ahora
        ):
            raise HTTPException(401, "Volvé a iniciar el acceso con Google")

        paso, usuario_id = decidir_acceso_google(sesion, identidad)

        if paso in ("elegir_nombre", "verificar_correo"):
            intento.nonce = None
            intento.sujeto = identidad.sujeto
            intento.email = identidad.email
            intento.paso = paso
            intento.fecha_expiracion = ahora + timedelta(seconds=VIGENCIA_ALTA)
            sesion.commit()
            guardar_cookie_intento(response, token, VIGENCIA_ALTA)
            return {"paso": paso}

        sesion.delete(intento)
        if usuario_id is not None:
            usuario = sesion.get(Usuario, usuario_id, with_for_update=True)
            if usuario is None:
                raise HTTPException(401, "No se pudo iniciar sesión")
            exigir_email_verificado(usuario)
            crear_sesion_usuario(sesion, usuario.id, response)
        else:
            sesion.commit()

    response.delete_cookie(key=COOKIE_INTENTO, path=RUTA_GOOGLE)
    return {"paso": paso}


@router.post("/alta", status_code=201)
@limiter.limit("10/minute")
def completar_alta_google(
    datos: AltaGoogleSolicitud,
    request: Request,
    response: Response,
):
    token = request.cookies.get(COOKIE_INTENTO)
    if not token:
        raise HTTPException(401, "Volvé a iniciar el acceso con Google")

    token_hash = hash_token_sesion(token)

    with Session(engine) as sesion:
        intento = sesion.get(IntentoGoogle, token_hash, with_for_update=True)
        ahora = datetime.now(timezone.utc)

        if (
            intento is None
            or intento.nonce is not None
            or intento.paso != "elegir_nombre"
            or intento.fecha_expiracion <= ahora
            or intento.sujeto is None
            or intento.email is None
        ):
            raise HTTPException(401, "Volvé a iniciar el acceso con Google")

        usuario = Usuario(
            nombre_usuario=datos.nombre_usuario.lower(),
            email=intento.email,
            email_verificado=True,
            fecha_verificacion=ahora,
            password_hash=None,
        )

        try:
            sesion.add(usuario)
            sesion.flush()

            sesion.add(
                IdentidadExterna(
                    usuario_id=usuario.id,
                    proveedor="google",
                    sujeto=intento.sujeto,
                )
            )
            sesion.delete(intento)
            crear_sesion_usuario(sesion, usuario.id, response)
        except IntegrityError as error:
            sesion.rollback()
            diagnostico = getattr(error.orig, "diag", None)
            restriccion = getattr(diagnostico, "constraint_name", None)

            if restriccion == "usuarios_nombre_usuario_key":
                raise HTTPException(
                    409,
                    detail={
                        "codigo": "NOMBRE_USUARIO_OCUPADO",
                        "mensaje": "Ese nombre de usuario ya está ocupado.",
                    },
                ) from None

            if restriccion in (
                "usuarios_email_key",
                "uq_identidades_externas_proveedor_sujeto",
            ):
                raise HTTPException(
                    409,
                    detail={
                        "codigo": "GOOGLE_REINICIAR",
                        "mensaje": "Volvé a iniciar el acceso con Google.",
                    },
                ) from None

            raise HTTPException(500, "No se pudo completar el registro") from None

    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(key=COOKIE_INTENTO, path=RUTA_GOOGLE)
    return {"paso": "entrar"}

@router.post("/vincular", dependencies=[Depends(exigir_csrf)])
@limiter.limit("5/minute")
def vincular_google(
    datos: VincularGoogleSolicitud,
    request: Request,
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    token = request.cookies.get(COOKIE_INTENTO)
    token_sesion = request.cookies["muvis_session"]
    credencial = datos.credencial.get_secret_value()
    password = datos.password.get_secret_value()

    detalle_intento = {
        "codigo": "GOOGLE_REINICIAR",
        "mensaje": "Volvé a iniciar la vinculación con Google.",
    }
    if not token or not 1 <= len(credencial) <= 8192:
        raise HTTPException(400, detail=detalle_intento)

    if not 1 <= len(password) <= 128:
        raise HTTPException(400, "Ingresá tu contraseña de Muvis")

    token_hash = hash_intento_vinculacion(token, token_sesion)
    with Session(engine) as sesion:
        nonce = sesion.scalar(
            select(IntentoGoogle.nonce).where(
                IntentoGoogle.token_hash == token_hash,
                IntentoGoogle.paso == "vincular",
                IntentoGoogle.fecha_expiracion > datetime.now(timezone.utc),
            )
        )

    if nonce is None:
        raise HTTPException(400, detail=detalle_intento)

    try:
        identidad = verificar_credencial_google(credencial, nonce)
    except HTTPException as error:
        if error.status_code != 401:
            raise
        raise HTTPException(400, detail=detalle_intento) from None

    with Session(engine) as sesion:
        cuenta = sesion.get(Usuario, usuario.id, with_for_update=True)
        if cuenta is None:
            raise HTTPException(401, "Tu sesión ya no está activa")

        sesion_actual = sesion.scalar(
            select(SesionUsuario).where(
                SesionUsuario.usuario_id == cuenta.id,
                SesionUsuario.token_hash == hash_token_sesion(token_sesion),
            ).with_for_update()
        )
        intento = sesion.get(IntentoGoogle, token_hash, with_for_update=True)
        ahora = datetime.now(timezone.utc)

        if sesion_actual is None or sesion_actual.fecha_expiracion <= ahora:
            raise HTTPException(401, "Tu sesión ya no está activa")

        if (
            intento is None
            or intento.paso != "vincular"
            or intento.nonce != nonce
            or intento.fecha_expiracion <= ahora
        ):
            raise HTTPException(400, detail=detalle_intento)

        exigir_email_verificado(cuenta)
        if not identidad.email_confiable or identidad.email != cuenta.email:
            raise HTTPException(400, detail={
                "codigo": "GOOGLE_CORREO_NO_VALIDO",
                "mensaje": "Elegí en Google el mismo correo que usás en Muvis.",
            })

        if cuenta.password_hash is None:
            raise HTTPException(409, "Esta cuenta no tiene una contraseña de Muvis")

        mensaje_bloqueo = "Demasiados intentos. Probá de nuevo más tarde."
        if esta_bloqueado_login(sesion, cuenta.email):
            raise HTTPException(429, mensaje_bloqueo)

        if not verify_password(password, cuenta.password_hash):
            _, bloqueado = registrar_fallo_login(sesion, cuenta.email)
            if bloqueado:
                raise HTTPException(429, mensaje_bloqueo)
            raise HTTPException(400, detail={
                "codigo": "PASSWORD_INCORRECTA",
                "mensaje": "La contraseña de Muvis es incorrecta.",
            })

        vinculo = sesion.get(IdentidadExterna, (cuenta.id, "google"))
        if vinculo is not None and vinculo.sujeto != identidad.sujeto:
            raise HTTPException(409, "Tu cuenta ya tiene otro acceso de Google vinculado")

        try:
            if vinculo is None:
                sesion.add(IdentidadExterna(
                    usuario_id=cuenta.id,
                    proveedor="google",
                    sujeto=identidad.sujeto,
                ))

            sesion.delete(intento)
            limpiar_intentos_login(sesion, cuenta.email)
            sesion.commit()
        except IntegrityError as error:
            sesion.rollback()
            diagnostico = getattr(error.orig, "diag", None)
            restriccion = getattr(diagnostico, "constraint_name", None)
            if restriccion in (
                "identidades_externas_pkey",
                "uq_identidades_externas_proveedor_sujeto",
            ):
                raise HTTPException(409, "Ese acceso de Google ya está vinculado") from None
            raise HTTPException(500, "No se pudo guardar la vinculación") from None

    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(key=COOKIE_INTENTO, path=RUTA_GOOGLE)
    return {"vinculado": True}


@router.get("/vincular")
def estado_vinculacion_google(
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    with Session(engine) as sesion:
        vinculo = sesion.get(IdentidadExterna, (usuario.id, "google"))

    response.headers["Cache-Control"] = "no-store"
    return {
        "vinculado": vinculo is not None,
        "puede_vincular": usuario.email_verificado and usuario.password_hash is not None,
    }

