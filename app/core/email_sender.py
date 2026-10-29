import os
import smtplib
import ssl

from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()


def enviar_codigo_verificacion(
    destinatario: str,
    codigo: str
) -> None:

    mensaje = EmailMessage()
    mensaje["Subject"] = "Tu código de verificación de Muvis"
    mensaje["From"] = os.environ["SMTP_FROM"]
    mensaje["To"] = destinatario

    mensaje.set_content(
        f"¡Bienvenido a Muvis!\n\n"
        f"Tu código de verificación es: {codigo}\n\n"
        f"Este código vence en 10 minutos.\n\n"
        f"Si no solicitaste este código, ignorá este mensaje."
    )

    servidor = os.environ["SMTP_HOST"]
    puerto = int(os.environ["SMTP_PORT"])

    with smtplib.SMTP(
        servidor,
        puerto,
        timeout=10
    ) as smtp:

        if os.getenv("SMTP_STARTTLS") == "true":
            smtp.starttls(
                context=ssl.create_default_context()
            )

        usuario = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASSWORD")

        if usuario and password:
            smtp.login(usuario, password)

        smtp.send_message(mensaje)