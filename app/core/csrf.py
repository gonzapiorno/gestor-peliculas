import os
from urllib.parse import urlsplit

import hmac
import hashlib
from dotenv import load_dotenv
from fastapi import HTTPException, Request, Depends, Header
from app.core.auth import obtener_usuario_actual
from app.core.security import hash_token_sesion
from app.db.models import Usuario

load_dotenv()


def verificar_origen(request: Request) -> None:
    permitidos = {
        origen.strip().rstrip("/")
        for origen in os.getenv("CSRF_ALLOWED_ORIGINS", "").split(",")
        if origen.strip()
    }

    origen = request.headers.get("origin")

    if not origen:
        referer = request.headers.get("referer")

        if referer:
            url = urlsplit(referer)

            if url.scheme in ("http", "https") and url.netloc:
                origen = f"{url.scheme}://{url.netloc}"

    if origen not in permitidos:
        raise HTTPException(
            status_code=403,
            detail="Origen de la petición no permitido"
        )


def generar_token_csrf(token_hash: str) -> str:

    secreto = os.getenv("CSRF_SECRET")

    if not secreto:
        raise RuntimeError("Falta configurar CSRF_SECRET")

    return hmac.new(
        secreto.encode("utf-8"),
        token_hash.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verificar_token_csrf(
    token_hash: str,
    token_recibido: str
) -> bool:

    token_esperado = generar_token_csrf(token_hash)

    return hmac.compare_digest(
        token_esperado,
        token_recibido
    )


def exigir_csrf(
    request: Request,
    origen_verificado: None = Depends(verificar_origen),
    usuario: Usuario = Depends(obtener_usuario_actual),
    token_csrf: str | None = Header(default=None, alias="X-CSRF-Token")
) -> None:

    token_sesion = request.cookies.get("muvis_session")

    if not token_sesion or not token_csrf:
        raise HTTPException(
            status_code=403,
            detail="Token CSRF faltante"
        )

    token_hash = hash_token_sesion(token_sesion)

    if not verificar_token_csrf(token_hash, token_csrf):
        raise HTTPException(
            status_code=403,
            detail="Token CSRF inválido"
        )

