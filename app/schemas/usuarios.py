from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime


class UsuarioRegistro(BaseModel):

    nombre_usuario: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$"
    )

    email: EmailStr

    password: str = Field(
        min_length=12,
        max_length=128
    )

class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_usuario: str
    email: EmailStr
    fecha_creacion: datetime

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

