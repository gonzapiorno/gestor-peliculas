from fastapi import FastAPI

from app.main import app as api

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/api", api)