from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db.session import engine
from app.db.models import Pelicula


# Convierte un objeto Pelicula de SQLAlchemy
# al formato diccionario que peliculas.py todavía utiliza
def pelicula_a_diccionario(pelicula):
    return {
        "id_pelicula": pelicula.id_pelicula,
        "nombre": pelicula.nombre,
        "anio": pelicula.anio,
        "genero": pelicula.genero,
        "puntuacion": pelicula.puntuacion
    }


# Agregar película
def insertar_pelicula(nombre, anio, genero, puntuacion):

    with Session(engine) as session:

        # Creamos el objeto ORM
        pelicula = Pelicula(
            nombre=nombre,
            anio=anio,
            genero=genero,
            puntuacion=puntuacion
        )

        # Lo agregamos y confirmamos el INSERT
        session.add(pelicula)
        session.commit()

        # Recuperamos los datos definitivos,
        # incluyendo el ID generado por PostgreSQL
        session.refresh(pelicula)

        return pelicula_a_diccionario(pelicula)


# Obtener todas las películas
def obtener_peliculas():

    with Session(engine) as session:

        sentencia = (
            select(Pelicula)
            .order_by(Pelicula.id_pelicula)
        )

        peliculas = session.scalars(sentencia).all()

        # Convertimos todos los objetos ORM a diccionarios
        return [
            pelicula_a_diccionario(pelicula)
            for pelicula in peliculas
        ]


# Buscar película por nombre
def buscar_pelicula_db(nombre):

    sentencia = (
        select(Pelicula)
        .where(func.lower(Pelicula.nombre) == nombre.lower())
        .order_by(Pelicula.id_pelicula)
        .limit(1)
    )

    with Session(engine) as session:

        pelicula = session.execute(
            sentencia
        ).scalar_one_or_none()

        if pelicula is None:
            return None

        return pelicula_a_diccionario(pelicula)


# Eliminar película
def eliminar_pelicula_db(id_pelicula):

    with Session(engine) as session:

        # Busca directamente por primary key
        pelicula = session.get(Pelicula, id_pelicula)

        if pelicula is None:
            return None

        # Guardamos sus datos antes de eliminar el objeto
        pelicula_eliminada = pelicula_a_diccionario(pelicula)

        session.delete(pelicula)
        session.commit()

        return pelicula_eliminada


# Modificar película
def actualizar_pelicula_db(id_pelicula, campo, nuevo_valor):

    campos_permitidos = {
        "nombre",
        "anio",
        "genero",
        "puntuacion"
    }

    if campo not in campos_permitidos:
        return None

    with Session(engine) as session:

        pelicula = session.get(Pelicula, id_pelicula)

        if pelicula is None:
            return None

        # Por ejemplo:
        # campo = "puntuacion"
        # nuevo_valor = 9
        #
        # equivale a:
        # pelicula.puntuacion = 9
        setattr(pelicula, campo, nuevo_valor)

        session.commit()
        session.refresh(pelicula)

        return pelicula_a_diccionario(pelicula)