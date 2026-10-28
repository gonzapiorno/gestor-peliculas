from fastapi import FastAPI
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.catalogo import router as catalogo_router
from app.api.routes.coleccion import router as coleccion_router
from app.api.routes.usuarios import router as usuarios_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter


load_dotenv()

# Creamos nuestra aplicación FastAPI
app = FastAPI(
    title="Gestor de Películas API"
)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

origenes_permitidos = [
    origen.strip()
    for origen in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origen.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"]
)

app.include_router(catalogo_router)
app.include_router(coleccion_router)
app.include_router(usuarios_router)


# Primera ruta de prueba
@app.get("/")
def inicio():
    return {
        "mensaje": "API del Gestor de Películas funcionando"
    }