from fastapi import FastAPI
from app.api.routes.peliculas import router as peliculas_router

# Creamos nuestra aplicación FastAPI
app = FastAPI(
    title="Gestor de Películas API"
)

app.include_router(peliculas_router)

# Primera ruta de prueba
@app.get("/")
def inicio():
    return {
        "mensaje": "API del Gestor de Películas funcionando"
    }