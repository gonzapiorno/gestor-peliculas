import os
import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
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
            row_factory=dict_row
        )

        print("Conexión exitosa a PostgreSQL")
        return conexion

    except psycopg.Error as error:
        print(f"Error al conectar con PostgreSQL: {error}")
        return None

#Funcion para insertar peliculas
def insertar_pelicula(nombre, anio, genero, puntuacion):
    conexion = conectar_db()

    with conexion.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO peliculas (nombre, anio, genero, puntuacion)
            VALUES (%s, %s, %s, %s)
            RETURNING id_pelicula, nombre, anio, genero, puntuacion
            """,
            (nombre, anio, genero, puntuacion)
        )

        peliculas = cursor.fetchone()

        conexion.commit()
    conexion.close()
    return peliculas

#Funcion para obtener peliculas
def obtener_peliculas():
    conexion = conectar_db()

    with conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT id_pelicula, nombre, anio, genero, puntuacion
            FROM peliculas
            ORDER BY id_pelicula
            """
        )
        peliculas = cursor.fetchall()
    conexion.close()

    return peliculas

def eliminar_pelicula_db(id_pelicula):
    conexion = conectar_db()

    with conexion.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM peliculas
            WHERE id_pelicula = %s
            RETURNING id_pelicula, nombre, anio, genero, puntuacion
            """,
            (id_pelicula,)
        )

        pelicula = cursor.fetchone()
        conexion.commit()
    conexion.close()
    return pelicula






