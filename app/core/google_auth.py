import os
import secrets
from dataclasses import dataclass
from functools import partial
from typing import Literal

from fastapi import HTTPException
from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from pydantic import EmailStr, TypeAdapter, ValidationError
from requests import Session as SesionHTTP
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import IdentidadExterna, Usuario


PasoGoogle = Literal["entrar", "vincular", "elegir_nombre", "verificar_correo"]
validador_email = TypeAdapter(EmailStr)


@dataclass(frozen=True)
class IdentidadGoogle:
    sujeto: str
    email: str
    email_confiable: bool


def verificar_credencial_google(
    credencial: str,
    nonce_esperado: str,
) -> IdentidadGoogle:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(503, "El acceso con Google todavía no está configurado")

    if not nonce_esperado or not nonce_esperado.isascii():
        raise HTTPException(401, "La solicitud de acceso con Google no es válida")

    try:
        with SesionHTTP() as sesion_http:
            transporte = partial(Request(session=sesion_http), timeout=5)
            datos = id_token.verify_oauth2_token(
                credencial,
                transporte,
                audience=client_id,
            )
    except TransportError:
        raise HTTPException(503, "Google no está disponible en este momento") from None
    except (ValueError, GoogleAuthError):
        raise HTTPException(401, "La credencial de Google no es válida") from None

    sujeto = datos.get("sub")
    nonce = datos.get("nonce")
    if (
        not isinstance(sujeto, str)
        or not sujeto
        or len(sujeto) > 255
        or not sujeto.isascii()
        or not isinstance(nonce, str)
        or not nonce.isascii()
        or not secrets.compare_digest(nonce, nonce_esperado)
    ):
        raise HTTPException(401, "La credencial de Google no es válida")

    try:
        email = validador_email.validate_python(datos.get("email")).lower()
    except ValidationError:
        raise HTTPException(401, "La credencial de Google no tiene un correo válido") from None

    dominio_google = datos.get("hd")
    es_workspace = isinstance(dominio_google, str) and bool(dominio_google)
    email_confiable = datos.get("email_verified") is True and (
        email.endswith("@gmail.com") or es_workspace
    )

    return IdentidadGoogle(sujeto, email, email_confiable)


def decidir_acceso_google(
    sesion: Session,
    identidad: IdentidadGoogle,
) -> tuple[PasoGoogle, int | None]:
    usuario_id = sesion.scalar(
        select(IdentidadExterna.usuario_id).where(
            IdentidadExterna.proveedor == "google",
            IdentidadExterna.sujeto == identidad.sujeto,
        )
    )
    if usuario_id is not None:
        return "entrar", usuario_id

    if not identidad.email_confiable:
        return "verificar_correo", None

    usuario_existente = sesion.scalar(
        select(Usuario.id).where(Usuario.email == identidad.email)
    )
    if usuario_existente is not None:
        return "vincular", None

    return "elegir_nombre", None