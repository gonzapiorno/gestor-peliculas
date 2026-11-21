from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, func, Integer, false, ForeignKey
from sqlalchemy import CheckConstraint, LargeBinary, UniqueConstraint,Index
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

    __table_args__ = (
        UniqueConstraint("usuario_id", "id_tmdb", name="uq_coleccion_usuario_tmdb"),
        UniqueConstraint(
            "usuario_id",
            "posicion_destacada",
            name="uq_coleccion_usuario_posicion_destacada",
        ),
        CheckConstraint(
            "posicion_destacada BETWEEN 1 AND 4",
            name="ck_coleccion_posicion_destacada",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identificador de la película en TMDB
    id_tmdb: Mapped[int] = mapped_column(nullable=False)

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False
    )

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
    posicion_destacada: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre_usuario: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    nombre_visible: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(200), nullable=True)
    coleccion_visible_amigos: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )
    pendientes_visibles_amigos: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )
    avatar: Mapped[str | None] = mapped_column(String(16), nullable=True)
    foto_perfil: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    foto_perfil_version: Mapped[str | None] = mapped_column(String(32), nullable=True)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    email_verificado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false()
    )

    fecha_verificacion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    nullable=False
    )


class SolicitudAmistad(Base):
    __tablename__ = "solicitudes_amistad"

    __table_args__ = (
        CheckConstraint(
            "remitente_id <> destinatario_id",
            name="ck_solicitudes_amistad_usuarios_distintos",
        ),
        CheckConstraint(
            "estado IN ('pendiente', 'aceptada', 'rechazada')",
            name="ck_solicitudes_amistad_estado",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    remitente_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    destinatario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    estado: Mapped[str] = mapped_column(String(10), server_default="pendiente")
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


Index(
    "uq_solicitudes_amistad_pareja",
    func.least(SolicitudAmistad.remitente_id, SolicitudAmistad.destinatario_id),
    func.greatest(SolicitudAmistad.remitente_id, SolicitudAmistad.destinatario_id),
    unique=True,
)


class IdentidadExterna(Base):
    __tablename__ = "identidades_externas"

    __table_args__ = (
        UniqueConstraint(
            "proveedor",
            "sujeto",
            name="uq_identidades_externas_proveedor_sujeto",
        ),
    )

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    proveedor: Mapped[str] = mapped_column(String(32), primary_key=True)
    sujeto: Mapped[str] = mapped_column(String(255), nullable=False)


class IntentoGoogle(Base):
    __tablename__ = "intentos_google"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    nonce: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    sujeto: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paso: Mapped[str | None] = mapped_column(String(32), nullable=True)


class CodigoVerificacionEmail(Base):
    __tablename__ = "codigos_verificacion_email"

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True
    )

    codigo_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    intentos_fallidos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0"
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class TokenRecuperacionPassword(Base):
    __tablename__ = "tokens_recuperacion_password"

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )

    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class SesionUsuario(Base):
    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(primary_key=True)

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False
    )

    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )


class IntentoLogin(Base):
    __tablename__ = "intentos_login"

    email_hash: Mapped[str] = mapped_column(
        String(64),
        primary_key=True
    )

    intentos_fallidos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    inicio_ventana: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    bloqueo_hasta: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )


class Feedback(Base):
    __tablename__ = "feedback"

    __table_args__ = (
        CheckConstraint("tipo IN ('error', 'sugerencia')", name="ck_feedback_tipo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(1000), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Publicacion(Base):
    __tablename__ = "publicaciones"

    __table_args__ = (
        CheckConstraint(
            "estado IN ('viendo', 'vista')",
            name="ck_publicaciones_estado",
        ),
        CheckConstraint(
            "puntuacion_personal BETWEEN 1 AND 10 "
            "AND puntuacion_personal * 2 = trunc(puntuacion_personal * 2)",
            name="ck_publicaciones_puntuacion",
        ),
        CheckConstraint(
            "estado = 'vista' OR puntuacion_personal IS NULL",
            name="ck_publicaciones_nota_solo_vista",
        ),
        Index("ix_publicaciones_usuario_id_id", "usuario_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    id_tmdb: Mapped[int] = mapped_column(nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    anio: Mapped[int | None] = mapped_column(nullable=True)
    poster: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duracion: Mapped[int | None] = mapped_column(nullable=True)

    estado: Mapped[str] = mapped_column(String(10), nullable=False)
    contenido: Mapped[str] = mapped_column(
        String(280),
        nullable=False,
        server_default="",
    )
    puntuacion_personal: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 1),
        nullable=True,
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class MeGustaPublicacion(Base):
    __tablename__ = "me_gusta_publicaciones"

    publicacion_id: Mapped[int] = mapped_column(
        ForeignKey("publicaciones.id", ondelete="CASCADE"),
        primary_key=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )


class ComentarioPublicacion(Base):
    __tablename__ = "comentarios_publicaciones"

    __table_args__ = (
        CheckConstraint(
            "char_length(trim(contenido)) BETWEEN 1 AND 280",
            name="ck_comentarios_publicaciones_contenido",
        ),
        Index("ix_comentarios_publicacion_id_id", "publicacion_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    publicacion_id: Mapped[int] = mapped_column(
        ForeignKey("publicaciones.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    contenido: Mapped[str] = mapped_column(String(280), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

class PreferenciasNotificaciones(Base):
    __tablename__ = "preferencias_notificaciones"

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    solicitudes_amistad: Mapped[bool] = mapped_column(
        nullable=False,
        server_default="true",
    )
    actividad_amigos: Mapped[bool] = mapped_column(
        nullable=False,
        server_default=false(),
    )


class DispositivoNotificaciones(Base):
    __tablename__ = "dispositivos_notificaciones"

    endpoint_sha256: Mapped[str] = mapped_column(String(64), primary_key=True)
    sesion_id: Mapped[int] = mapped_column(
        ForeignKey("sesiones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    endpoint: Mapped[str] = mapped_column(String(2048), nullable=False)
    p256dh: Mapped[str] = mapped_column(String(128), nullable=False)
    auth: Mapped[str] = mapped_column(String(64), nullable=False)

