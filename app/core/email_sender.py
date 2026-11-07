import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


def _enviar_correo(destinatario: str, asunto: str, cuerpo: str) -> None:
    es_desarrollo = os.getenv("APP_ENV") == "development"
    configuracion_tls = os.getenv("SMTP_STARTTLS", "false").strip().lower()

    if configuracion_tls not in ("true", "false"):
        raise RuntimeError("SMTP_STARTTLS debe ser true o false")

    usar_starttls = configuracion_tls == "true"
    usuario = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    if bool(usuario) != bool(password):
        raise RuntimeError("Configuración SMTP incompleta")

    if not usar_starttls and (not es_desarrollo or usuario):
        raise RuntimeError(
            "Se requiere STARTTLS fuera de desarrollo o al usar credenciales SMTP"
        )

    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = os.environ["SMTP_FROM"]
    mensaje["To"] = destinatario
    mensaje.set_content(cuerpo)

    servidor = os.environ["SMTP_HOST"]
    puerto = int(os.environ["SMTP_PORT"])

    with smtplib.SMTP(servidor, puerto, timeout=10) as smtp:
        if usar_starttls:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()

        if usuario and password:
            smtp.login(usuario, password)

        smtp.send_message(mensaje)


def enviar_codigo_verificacion(destinatario: str, codigo: str) -> None:
    _enviar_correo(
        destinatario,
        "Tu código de verificación de Muvis",
        "¡Bienvenido a Muvis!\n\n"
        f"Tu código de verificación es: {codigo}\n\n"
        "Este código vence en 10 minutos.\n\n"
        "Si no solicitaste este código, ignorá este mensaje.",
    )


def enviar_enlace_recuperacion(destinatario: str, enlace: str) -> None:
    _enviar_correo(
        destinatario,
        "Restablecé tu contraseña de Muvis",
        "Abrí este enlace para elegir una contraseña nueva:\n\n"
        f"{enlace}\n\n"
        "El enlace es temporal y se puede usar una sola vez.\n\n"
        "Si no solicitaste el cambio, ignorá este mensaje.",
    )