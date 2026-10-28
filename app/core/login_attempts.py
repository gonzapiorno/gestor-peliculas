from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.security import hash_email_login
from app.db.models import IntentoLogin


MAX_INTENTOS = 10
VENTANA = timedelta(minutes=15)
TIEMPO_BLOQUEO = timedelta(minutes=15)


def registrar_fallo_login(sesion: Session, email: str) -> tuple[int, bool]:

    identificador = hash_email_login(email)
    ahora = datetime.now(timezone.utc)

    # Creamos el registro si todavía no existe.
    consulta = insert(IntentoLogin).values(
        email_hash=identificador,
        intentos_fallidos=0,
        inicio_ventana=ahora,
        bloqueo_hasta=None
    ).on_conflict_do_nothing(
        index_elements=["email_hash"]
    )

    sesion.execute(consulta)

    # Bloqueamos la fila durante esta transacción.
    registro = sesion.scalar(
        select(IntentoLogin)
        .where(IntentoLogin.email_hash == identificador)
        .with_for_update()
    )

    if registro is None:
        raise RuntimeError("No se pudo obtener el contador de login")

    ahora = datetime.now(timezone.utc)

    # Si todavía está bloqueado, no extendemos el bloqueo.
    if registro.bloqueo_hasta and registro.bloqueo_hasta > ahora:
        sesion.commit()
        return registro.intentos_fallidos, True

    # Reiniciamos el contador cuando corresponda.
    if (
        ahora - registro.inicio_ventana >= VENTANA
        or (
            registro.bloqueo_hasta is not None
            and registro.bloqueo_hasta <= ahora
        )
    ):
        registro.intentos_fallidos = 0
        registro.inicio_ventana = ahora
        registro.bloqueo_hasta = None

    registro.intentos_fallidos += 1

    # Aplicamos una espera temporal al alcanzar el límite.
    if registro.intentos_fallidos >= MAX_INTENTOS:
        registro.bloqueo_hasta = ahora + TIEMPO_BLOQUEO

    bloqueado = registro.bloqueo_hasta is not None
    intentos = registro.intentos_fallidos

    sesion.commit()

    return intentos, bloqueado


def esta_bloqueado_login(sesion: Session, email: str) -> bool:

    identificador = hash_email_login(email)

    bloqueo_hasta = sesion.scalar(
        select(IntentoLogin.bloqueo_hasta).where(
            IntentoLogin.email_hash == identificador
        )
    )

    if bloqueo_hasta is None:
        return False

    return bloqueo_hasta > datetime.now(timezone.utc)


def limpiar_intentos_login(sesion: Session, email: str) -> None:

    identificador = hash_email_login(email)

    sesion.execute(
        delete(IntentoLogin).where(
            IntentoLogin.email_hash == identificador
        )
    )

