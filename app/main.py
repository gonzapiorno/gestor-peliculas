from fastapi import FastAPI
from app.api.routes.peliculas import router as peliculas_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.catalogo import router as catalogo_router

# Creamos nuestra aplicación FastAPI
app = FastAPI(
    title="Gestor de Películas API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(peliculas_router)
app.include_router(catalogo_router)


# Primera ruta de prueba
@app.get("/")
def inicio():
    return {
        "mensaje": "API del Gestor de Películas funcionando"
    }