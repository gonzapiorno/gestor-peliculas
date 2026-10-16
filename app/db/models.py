from sqlalchemy import String, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from app.db.session import Base

class Pelicula(Base):
    __tablename__ = "peliculas"

    id_pelicula: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    anio: Mapped[int] = mapped_column(nullable=False)
    genero: Mapped[str] = mapped_column(String(100), nullable=False)
    puntuacion: Mapped[int] = mapped_column(nullable=False)

class PeliculaColeccion(Base):
    __tablename__ = "coleccion"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identificador de la película en TMDB
    id_tmdb: Mapped[int] = mapped_column(unique=True, nullable=False)

    # Información que obtenemos de TMDB
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    anio: Mapped[int | None] = mapped_column(nullable=True)
    poster: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Información personalizada de nuestra colección
    estado: Mapped[str] = mapped_column(String(20), default="pendiente", nullable=False)
    favorita: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    puntuacion_personal: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 1),
        nullable=True
    )

