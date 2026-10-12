import os
import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from sqlalchemy_db import engine
from models import Pelicula

# Cargamos las variables guardadas en el archivo .env
load_dotenv()

#Funcion para conectar la base
def conectar_db():

    try:
        conexion = psycopg.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            row_factory=dict_row,
            connect_timeout=5
        )

        print("Conexión exitosa a PostgreSQL")
        return conexion

    except psycopg.Error as error:
        print(f"Error al conectar con PostgreSQL: {error}")
        raise #vuelve a lanzar el mismo error que acabamos de capturar

#Funcion para insertar peliculas
def insertar_pelicula(nombre, anio, genero, puntuacion):

    # Creamos una sesión para trabajar con PostgreSQL usando SQLAlchemy
    with Session(engine) as session:

        # Creamos un objeto Pelicula con los datos recibidos
        pelicula = Pelicula(
            nombre=nombre,
            anio=anio,
            genero=genero,
            puntuacion=puntuacion
        )

        # Le decimos a SQLAlchemy que queremos guardar este objeto
        session.add(pelicula)

        # Confirmamos la transacción
        # Por debajo SQLAlchemy ejecuta el INSERT
        session.commit()

        # Actualizamos el objeto con los datos que quedaron en PostgreSQL,
        # especialmente el id_pelicula generado automáticamente
        session.refresh(pelicula)

        # Seguimos devolviendo un diccionario para no romper peliculas.py
        return {
            "id_pelicula": pelicula.id_pelicula,
            "nombre": pelicula.nombre,
            "anio": pelicula.anio,
            "genero": pelicula.genero,
            "puntuacion": pelicula.puntuacion
        }

#Funcion para obtener peliculas
def obtener_peliculas():
    with Session(engine) as session:
        sentencia = select(Pelicula).order_by(Pelicula.id_pelicula)

        peliculas_orm = session.scalars(sentencia).all()

    peliculas = []

    for pelicula in peliculas_orm:
        peliculas.append({
            "id_pelicula": pelicula.id_pelicula,
            "nombre": pelicula.nombre,
            "anio": pelicula.anio,
            "genero": pelicula.genero,
            "puntuacion": pelicula.puntuacion
        })

    return peliculas

def eliminar_pelicula_db(id_pelicula):

    # Abrimos una sesión con SQLAlchemy
    with Session(engine) as session:

        pelicula = session.get(Pelicula, id_pelicula)

        if pelicula is None:
            return None

        pelicula_eliminada = {
            "id_pelicula": pelicula.id_pelicula,
            "nombre": pelicula.nombre,
            "anio": pelicula.anio,
            "genero": pelicula.genero,
            "puntuacion": pelicula.puntuacion
        }

        # Marcamos el objeto para eliminarlo
        session.delete(pelicula)

        # Confirmamos la transacción
        # Por debajo SQLAlchemy ejecuta el DELETE
        session.commit()

        return pelicula_eliminada


def actualizar_pelicula_db(id_pelicula, campo, nuevo_valor):

    # Solo permitimos modificar estas columnas
    campos_permitidos = {"nombre", "anio", "genero", "puntuacion"}

    if campo not in campos_permitidos:
        return None

    # Abrimos una sesión con SQLAlchemy
    with Session(engine) as session:

        # Buscamos la película por su clave primaria
        pelicula = session.get(Pelicula, id_pelicula)

        if pelicula is None:
            return None

        # Modificamos el atributo indicado
        setattr(pelicula, campo, nuevo_valor)
        session.commit()

        # Refrescamos el objeto con el estado actual de PostgreSQL
        session.refresh(pelicula)

        # Por ahora seguimos devolviendo un diccionario
        return {
            "id_pelicula": pelicula.id_pelicula,
            "nombre": pelicula.nombre,
            "anio": pelicula.anio,
            "genero": pelicula.genero,
            "puntuacion": pelicula.puntuacion
        }

def buscar_pelicula_db(nombre):
    sentencia = (
        select(Pelicula)
        .where(func.lower(Pelicula.nombre) == nombre.lower())
        .order_by(Pelicula.id_pelicula)
        .limit(1)
    )

    with Session(engine) as session:
        pelicula = session.execute(sentencia).scalar_one_or_none()

    if pelicula:
        return {
            "id_pelicula": pelicula.id_pelicula,
            "nombre": pelicula.nombre,
            "anio": pelicula.anio,
            "genero": pelicula.genero,
            "puntuacion": pelicula.puntuacion
        }

    return None



