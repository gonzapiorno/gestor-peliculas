import os
import psycopg
from dotenv import load_dotenv

# Cargamos las variables guardadas en el archivo .env
load_dotenv()


def conectar_db():

    try:
        conexion = psycopg.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )

        print("Conexión exitosa a PostgreSQL")
        return conexion

    except psycopg.Error as error:
        print(f"Error al conectar con PostgreSQL: {error}")
        return None


conexion = conectar_db()

with conexion.cursor() as cursor:
    cursor.execute("SELECT * FROM peliculas")
    resultados = cursor.fetchall()

    print(resultados)

conexion.close()