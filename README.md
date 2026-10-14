# Muvis

Muvis es una aplicación web para descubrir películas y gestionar una colección personal.

El proyecto nació como un gestor de películas desarrollado en Python para practicar programación y fue evolucionando progresivamente hacia una aplicación full stack con PostgreSQL, SQLAlchemy, FastAPI, React y una integración con TMDB.

Actualmente se encuentra en desarrollo.

---

## Objetivo del proyecto

El objetivo de Muvis es permitir que un usuario pueda:

- Descubrir películas desde un catálogo externo.
- Consultar información detallada de cada película.
- Guardar películas en una colección personal.
- Marcar películas como vistas o pendientes.
- Agregar películas a favoritos.
- Registrar una puntuación personal.
- Buscar, filtrar y organizar su colección.

A futuro, Muvis contará con usuarios y autenticación para que cada persona tenga su propia colección.

---

## Estado actual

Actualmente Muvis cuenta con:

### Backend

- API REST desarrollada con FastAPI.
- PostgreSQL como base de datos.
- SQLAlchemy ORM para acceso y manipulación de datos.
- Pydantic para validación de datos.
- CRUD completo de películas.
- Integración con la API de TMDB.
- Obtención de películas populares.
- Obtención de detalles de películas por ID de TMDB.
- Manejo de variables de entorno mediante `.env`.
- PostgreSQL y pgAdmin ejecutándose mediante Docker.

### Frontend

- React + Vite.
- Navegación con React Router.
- Página de descubrimiento de películas.
- Página de detalle de película.
- Página de colección personal.
- Catálogo de películas con posters e información obtenida desde TMDB.
- Diseño responsive para escritorio, tablet y dispositivos móviles.
- Componentes reutilizables.
- Separación entre páginas, componentes y servicios HTTP.

### Aplicación de consola

El proyecto conserva además la versión de consola desarrollada durante las primeras etapas del aprendizaje.

Permite:

- Agregar películas.
- Ver películas.
- Buscar películas.
- Modificar películas.
- Eliminar películas.

La aplicación de consola actualmente utiliza la misma capa de persistencia basada en PostgreSQL y SQLAlchemy.

---

## Arquitectura actual

La aplicación está dividida en frontend y backend.

React
  ↓
FastAPI
  ↓
├── PostgreSQL
│      ↓
│   SQLAlchemy
│
└── TMDB API

React nunca se comunica directamente con TMDB.
Las consultas al catálogo externo se realizan desde FastAPI, permitiendo mantener el token de TMDB protegido dentro del backend.

## Estructura del proyecyo
gestor-peliculas/
│
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── peliculas.py
│   │       └── catalogo.py
│   │
│   ├── cli/
│   │   ├── main.py
│   │   └── peliculas.py
│   │
│   ├── db/
│   │   ├── models.py
│   │   └── session.py
│   │
│   ├── repositories/
│   │   └── database.py
│   │
│   ├── schemas/
│   │   └── peliculas.py
│   │
│   ├── services/
│   │   └── tmdb.py
│   │
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── docker-compose.yml
├── requirements.txt
├── .gitignore
└── README.md

## Tecnologías Utilizadas
Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL
- psycopg
- HTTPX
- python-dotenv
- Uvicorn
Frontend
- React
- Vite
- React Router
- JavaScript
- CSS
Infraestructura y herramientas
- Docker
- Docker Compose
- pgAdmin
- Git
- GitHub
- VS Code
API externa
- TMDB (The Movie Database)


Los datos cinematográficos y posters utilizados por Muvis son obtenidos mediante la API de TMDB.
Muvis utiliza la API de TMDB, pero no está respaldado, certificado ni aprobado por TMDB.
Evolución del proyecto
El proyecto fue desarrollado de manera incremental con el objetivo de aprender cada tecnología antes de incorporar la siguiente.

## V1 - Python + JSON
Primera versión del gestor.
Se implementó:
- Menú de consola.
- CRUD de películas.
- Listas y diccionarios.
- Funciones.
- Validaciones.
- Manejo de errores.
- Persistencia mediante JSON.
- Separación del código en módulos.

## V2 - PostgreSQL + SQL
La persistencia JSON fue reemplazada por PostgreSQL.
Se aprendió e implementó:
- Docker para PostgreSQL.
- pgAdmin.
- SQL.
- INSERT.
- SELECT.
- UPDATE.
- DELETE.
- Primary Keys.
- Consultas parametrizadas.
- psycopg.
- Variables de entorno.
- Manejo de conexiones y transacciones.

## SQLAlchemy ORM
El acceso directo mediante SQL fue migrado a SQLAlchemy.
Se incorporó:
- Engine.
- Session.
- Modelos ORM.
- DeclarativeBase.
- Consultas con select().
- Inserción, modificación y eliminación mediante objetos.
- Separación de responsabilidades entre modelos, sesiones y repositorios.

## V4 - FastApi
El gestor comenzó a transformarse en una aplicación web.
Se implementó:
- API REST.
- Endpoints GET, POST, PUT y DELETE.
- Validación con Pydantic.
- Manejo de errores HTTP.
- Swagger/OpenAPI mediante /docs.
- CORS.
- Organización mediante APIRouter.

## React + TMDB
Se incorporó el frontend web.
Actualmente incluye:
- React.
- Vite.
- React Router.
- Componentes reutilizables.
- Navegación entre páginas.
- Integración frontend/backend.
- Catálogo externo mediante TMDB.
- Posters reales.
- Detalle de películas.
- Diseño responsive inicial.

## Funcionalidades Actuales
Descubrir:
Permite visualizar películas obtenidas desde TMDB junto con:
- Poster.
- Título.
- Año.
- Puntuación del catálogo.
Cada película puede abrirse para consultar sus detalles.

Detalle de película:
Actualmente muestra:
- Poster.
- Título.
- Año.
- Duración.
- Géneros.
- Puntuación de TMDB.
- Sinopsis.

La interfaz incluye la acción: 
Agregar a mi colección:
La integración definitiva de esta acción con la colección personal se encuentra actualmente en desarrollo.

Mi colección:
Actualmente existe una colección persistida en PostgreSQL.
La próxima evolución reemplazará el modelo CRUD inicial por una colección basada en películas de TMDB.
Cada película podrá almacenar información personal como:
- Estado: pendiente o vista.
- Favorita.
- Puntuación personal.
- Fecha de incorporación.

## Proximos objetivos
El desarrollo continuará principalmente sobre los siguientes puntos:
- Integrar completamente TMDB con la colección personal.
- Guardar id_tmdb para identificar películas del catálogo.
- Separar puntuación de TMDB y puntuación personal.
- Estados pendiente y vista.
- Favoritos.
- Migraciones de base de datos con Alembic.
- Mejorar manejo de errores externos.
- Búsqueda de películas.
- Filtros y ordenamiento.
- Mejorar página de colección.
- Mejorar diseño y experiencia responsive.
- Usuarios y autenticación.
- Colecciones independientes por usuario.
- Preparar la aplicación para despliegue.
- Dockerizar la aplicación completa.
- Testing.

## Modelo de colección planificado
La colección personal evolucionará hacia un modelo similar al siguiente:
Pelicula guardada
│
├── id local
├── id de TMDB
├── título
├── año
├── poster
├── estado
│   ├── pendiente
│   └── vista
├── favorita
└── puntuación personal

La información cinematográfica será obtenida desde TMDB, mientras que los datos personales del usuario serán almacenados en PostgreSQL.

## Instalación
Requisitos
- Python
- Node.js
- Docker
- Git
1. Clonar el repositorio
git clone https://github.com/gonzapiorno/gestor-peliculas.git
cd gestor-peliculas

2. Instalar dependencias de Python
python -m pip install -r requirements.txt

3. Configurar variables de entorno
Crear un archivo .env en la raíz del proyecto.
Ejemplo:
DB_HOST=localhost
DB_PORT=5433
DB_NAME=peliculas_db
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña

TMDB_TOKEN=tu_token_de_tmdb

El archivo .env no debe subirse al repositorio.
4. Iniciar PostgreSQL
docker compose up -d

5. Ejecutar el backend
python -m uvicorn app.main:app --reload

La API estará disponible en:
http://127.0.0.1:8000

Documentación interactiva:
http://127.0.0.1:8000/docs

6. Ejecutar el frontend
cd frontend
npm install
npm run dev

El frontend normalmente estará disponible en:
http://localhost:5173

## Ejecutar la versión de consola
Desde la raíz del proyecto:
python -m app.cli.main

## Seguridad
Las credenciales y tokens deben almacenarse exclusivamente mediante variables de entorno.
Nunca deben incluirse en el código fuente ni subirse al repositorio.
Especialmente:
- Credenciales de PostgreSQL.
- Token de TMDB.
- Claves o secretos futuros de autenticación.

## Filosofía del proyecto
Muvis es principalmente un proyecto de aprendizaje.
Cada etapa busca incorporar nuevas tecnologías de manera progresiva, intentando comprender primero los fundamentos antes de utilizar abstracciones más avanzadas.
El proyecto comenzó con Python y estructuras básicas, continuó con SQL y PostgreSQL, luego incorporó SQLAlchemy, FastAPI y finalmente React e integración con servicios externos.
La intención es continuar evolucionándolo hasta convertirlo en una aplicación web completa y publicable.

## Autor
Desarrollado por Gonzalo Piorno.
Proyecto personal de aprendizaje y práctica de desarrollo full stack