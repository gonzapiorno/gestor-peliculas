from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FeedbackSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    tipo: Literal["error", "sugerencia"]
    descripcion: str = Field(min_length=1, max_length=1000)