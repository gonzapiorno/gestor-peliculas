from limits import parse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import hash_email_login


limiter = Limiter(
    key_func=get_remote_address
)

LIMITE_REENVIO_EMAIL = parse("5/hour")


def permitir_reenvio_email(email: str) -> bool:
    identificador = hash_email_login(email)

    return limiter.limiter.hit(
        LIMITE_REENVIO_EMAIL,
        "reenvio-verificacion-email",
        identificador
    )