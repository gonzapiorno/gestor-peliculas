from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import obtener_usuario_actual
from app.core.csrf import exigir_csrf
from app.core.rate_limit import permitir_envio_feedback
from app.db.models import Feedback, Usuario
from app.db.session import engine
from app.schemas.feedback import FeedbackSolicitud


router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", status_code=201, dependencies=[Depends(exigir_csrf)])
def crear_feedback(
    datos: FeedbackSolicitud,
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    if not permitir_envio_feedback(usuario.id):
        raise HTTPException(
            status_code=429,
            detail="Alcanzaste el límite de envíos. Probá más tarde.",
        )

    with Session(engine) as sesion:
        sesion.add(
            Feedback(
                usuario_id=usuario.id,
                tipo=datos.tipo,
                descripcion=datos.descripcion,
            )
        )
        sesion.commit()

    return {"mensaje": "Gracias por tu feedback."}