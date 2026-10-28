from pwdlib import PasswordHash
import secrets
import hashlib
import os
import hmac
from dotenv import load_dotenv

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def generar_token_sesion() -> str:
    return secrets.token_urlsafe(32)


def hash_token_sesion(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


load_dotenv()


def hash_email_login(email: str) -> str:

    clave = os.getenv("LOGIN_ATTEMPTS_SECRET")

    if not clave:
        raise RuntimeError(
            "Falta configurar LOGIN_ATTEMPTS_SECRET"
        )

    email_normalizado = email.strip().lower()

    return hmac.new(
        clave.encode("utf-8"),
        email_normalizado.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

