from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from sqlalchemy_db import Base

class Pelicula(Base):
    __tablename__ = "peliculas"

    id_pelicula: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    anio: Mapped[int] = mapped_column(nullable=False)
    genero: Mapped[str] = mapped_column(String(100), nullable=False)
    puntuacion: Mapped[int] = mapped_column(nullable=False)
     