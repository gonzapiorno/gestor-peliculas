from pwdlib import PasswordHash
import secrets
import hashlib

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def generar_token_sesion() -> str:
    return secrets.token_urlsafe(32)


def hash_token_sesion(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()



