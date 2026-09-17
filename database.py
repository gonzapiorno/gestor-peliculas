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

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO peliculas (nombre, anio, genero, puntuacion)
                VALUES (%s, %s, %s, %s)
                RETURNING id_pelicula, nombre, anio, genero, puntuacion
                """,
                (nombre, anio, genero, puntuacion)
            )

            pelicula = cursor.fetchone()
    return pelicula

#Funcion para obtener peliculas
def obtener_peliculas():

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_pelicula, nombre, anio, genero, puntuacion
                FROM peliculas
                ORDER BY id_pelicula
                """
            )
            peliculas = cursor.fetchall()
    return peliculas

def eliminar_pelicula_db(id_pelicula):
    with conectar_db() as conexion:
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
    return pelicula


def actualizar_pelicula_db(id_pelicula, campo, nuevo_valor):
    
    campos_permitidos = {"nombre", "anio", "genero", "puntuacion"}
            
    if campo not in campos_permitidos:
        return None

    with conectar_db() as conexion:
        with conexion.cursor() as cursor:

            cursor.execute(
                f"""
                UPDATE peliculas
                SET {campo} = %s
                WHERE id_pelicula = %s
                RETURNING id_pelicula, nombre, anio, genero, puntuacion
                """,
                (nuevo_valor, id_pelicula)
            )

            pelicula = cursor.fetchone()
    return pelicula

def buscar_pelicula_db(nombre):
    with conectar_db() as conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_pelicula, nombre, anio, genero, puntuacion
                FROM peliculas
                WHERE LOWER(nombre) = LOWER(%s)
                ORDER BY id_pelicula
                LIMIT 1
                """,
                (nombre,)
                
            )
            pelicula = cursor.fetchone()
    return pelicula



