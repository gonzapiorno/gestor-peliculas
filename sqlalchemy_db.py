import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase

# Cargamos las variables guardadas en el archivo .env
load_dotenv()

#Construimos URL de conexión
DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
    database=os.getenv("DB_NAME")
)

#crea un Engine que configura el acceso a la base de datos y administra conexiones reutilizables
engine=create_engine(DATABASE_URL) #La conexion se abre cuando la solicitamos

class Base(DeclarativeBase):
    pass

#script de prueba
if __name__ == "__main__":

    with engine.connect() as conexion:
        resultado = conexion.execute(text("SELECT 1"))
        print(resultado.scalar_one())