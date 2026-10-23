# Autenticación del frontend de Muvis

Implementación: 22 de octubre de 2026. Solo se modificaron archivos de `frontend/`.

## Uso y configuración

Desde `frontend/`, ejecutar `npm run dev` y abrir **http://127.0.0.1:5173**. Vite queda ligado a `127.0.0.1`; si el puerto está ocupado, revisar la dirección que informa Vite y la lista de orígenes autorizados del backend. No mezclar `localhost` y `127.0.0.1`: son hosts diferentes para cookies y para CORS.

La API predeterminada es **http://127.0.0.1:8000**. El cliente acepta `VITE_API_URL` como URL HTTP(S) absoluta, también con prefijo de ruta, sin usuario/contraseña, query ni fragmento. Es configuración pública incorporada al build: jamás colocar allí secretos. Por ejemplo, una instalación de producción puede utilizar la URL HTTPS pública del backend y definir `VITE_API_URL` al construir React. No se modificaron `.env` ni archivos del backend. Reiniciar Vite o reconstruir tras cambiar configuración de entorno.

El backend debe permitir el origen exacto de React en CORS y CSRF. El frontend no desactiva ninguna defensa ni intenta establecer manualmente el encabezado Origin. La cookie HttpOnly la establece y envía el navegador; HTTPS, Secure, SameSite y listas de orígenes deben funcionar también en el despliegue elegido. Servir `dist/` con fallback de SPA para las rutas internas; Vite de desarrollo no es un servidor de producción.

## Contratos reutilizados

| Método y ruta | Datos enviados / comportamiento |
| --- | --- |
| POST `/usuarios/registro` | `{nombre_usuario, email, password}`. Usuario de 3–30 letras ASCII/números/guion bajo; contraseña de 12–128 caracteres. El backend registra, pero no inicia sesión. |
| POST `/usuarios/login` | `{email, password}`. El frontend recupera después el perfil con `/usuarios/me`; no inventa campos de respuesta de login. |
| GET `/usuarios/me` | Recupera `{id,nombre_usuario,email,fecha_creacion}` y restaura la sesión al cargar React. |
| GET `/usuarios/csrf` | Devuelve `csrf_token`; se obtiene cuando hace falta una escritura autenticada. |
| POST `/usuarios/logout` | Sin cuerpo; CSRF y cookies; admite 204 sin intentar leer JSON. |
| GET/POST/PATCH/DELETE `/coleccion/...` | Conservan rutas y cuerpos existentes. Cookies en todas las consultas y CSRF en escrituras. |

Login y registro usan la verificación de origen existente; no solicitan un CSRF que el backend sólo emite a usuarios autenticados.

## Sesión y navegación

- `/login` y `/registro` ofrecen formularios con etiquetas, validación, errores y bloqueo de doble envío. El registro lleva a login con email prellenado y contraseña vacía.
- `/coleccion` y `/coleccion/:id` son privadas. Esperan la recuperación de sesión, muestran error recuperable ante indisponibilidad y dirigen a login ante ausencia/expiración, conservando un destino interno validado.
- Descubrir y `/pelicula/:id_tmdb` siguen públicos. Una persona anónima puede buscar y consultar detalles; para guardar se dirige a login.
- La cabecera muestra nombre/email y cierre de sesión. Si logout falla, la sesión visible se conserva y se ofrece reintentar. Un 401 de la sesión ya inválida sí elimina el estado privado local.
- Las respuestas privadas de una revisión anterior se descartan, incluso si el cuerpo JSON termina después de un cambio de sesión. Las vistas personales y el estado de membresía se reinician por identidad. Las altas que terminan después de navegar se separan por sesión.
- Al recuperar foco/visibilidad se revalida el perfil, con bloqueo de revalidaciones simultáneas y sin competir con login/registro/logout. Esto ayuda a detectar cambios hechos en otra pestaña. No hay un canal de notificaciones instantáneas del servidor: una sesión vencida se detecta al comprobarla o recibir 401.

## Peticiones y seguridad

`apiClient.js` centraliza el origen, `credentials: "include"`, `cache: "no-store"`, errores con estado HTTP y timeout de 20 segundos. El token CSRF permanece exclusivamente en memoria, se comparte entre escrituras concurrentes y se descarta al cambiar de sesión o recibir 403. Se envía mediante `X-CSRF-Token`; nunca en URLs.

No se persisten contraseñas, cookies ni tokens en almacenamiento web, ni se leen cookies desde JavaScript, ni se registran credenciales en consola. Los errores no muestran cuerpos de validación que podrían contener contraseñas, trazas SQL o detalles internos de fallos 500. Un 403 no provoca logout ni repite una escritura automáticamente; un reintento manual obtiene CSRF nuevo. Un 409 de alta se reconoce como película ya guardada. Un 404 personal conserva su pantalla de película inexistente. Cancelar o agotar el tiempo de una escritura no garantiza que el servidor no la haya aplicado; no hay reintentos automáticos de mutaciones.

## Archivos de la aplicación

| Archivo | Responsabilidad |
| --- | --- |
| `src/services/apiClient.js` | Cliente HTTP, errores, CSRF en memoria e invalidación de respuestas antiguas. |
| `src/services/authApi.js` | Funciones con contratos reales de usuario. |
| `src/auth/AuthContext.jsx`, `src/auth/useAuth.js` | Proveedor de sesión, recuperación, login/registro/logout y hook. |
| `src/auth/RequireAuth.jsx` | Protección de rutas personales y retorno a login. |
| `src/pages/AuthPage.jsx`, `src/pages/AuthPage.css` | Pantallas de login/registro. |
| `src/components/layout/Header.jsx`, `Header.css` | Identidad, acciones de sesión y adaptación móvil. |
| `src/App.jsx` | Rutas y reinicio del estado privado al cambiar identidad. |
| `src/services/coleccionApi.js`, `catalogoApi.js`, `peliculasApi.js` | Uso del cliente común, sin cambiar contratos. El servicio legacy sigue sin uso en las páginas actuales. |
| `src/hooks/useCatalogCollection.js` | Colección sólo para usuarios autenticados; altas y respuestas separadas por sesión. |
| `src/pages/MovieDetailPage.jsx` | Catálogo público, ingreso para guardar y membresía autenticada. |
| `src/pages/DiscoverPage.jsx`, `CollectionPage.jsx`, `CollectionMovieDetailPage.jsx` | Reutilización de la carga en curso durante el doble montaje de desarrollo, conservando reintentos y protección contra respuestas anteriores. |
| `vite.config.js` | Host local coherente con el backend. |
| `package.json` | Comando `npm test`, sin dependencias nuevas. |

## Verificación

Se ejecutaron build, lint y `npm test`. El último comando utiliza Node 24 y ejecuta 15 pruebas del código real de servicios mediante `node:test`, con fetch simulado y sin red. El hook de resolución del test sólo reproduce las importaciones sin extensión que acepta Vite; no copia la implementación.

El harness `qa/main.jsx` conserva los escenarios anteriores y añade usuarios/sesiones/CSRF/bibliotecas en memoria. Antes de cualquier operación UI se comprobó la presencia de su panel. Se probaron 16 grupos de flujos con navegador: validación, registro 201/409, login 401/200, cierre fallido y reintento, cambio de cuenta, expiración, 403, controles personales, eliminación, búsqueda, agregado, filtros, 404 y responsive de 320/390 píxeles. Se verificó también una sola carga por montaje en sesión, colección, detalle, populares y catálogo, y un reintento nuevo tras error. Sus cuerpos de autenticación se omiten de los registros. Resultados: `qa/auth-ui-resultados.json`; pruebas automatizadas: `qa/auth-client.test.mjs`; capturas: `qa/screenshots/auth-*.jpg`.

**Con backend real sólo se hicieron lecturas y OPTIONS:** una colección anónima dirigió a login; `/usuarios/me`, `/usuarios/csrf` y `/coleccion/` anónimos respondieron 401; preflight desde `http://127.0.0.1:5173` respondió 200 con origen explícito y credenciales habilitadas. No se iniciaron sesiones reales, no se registraron usuarios ni se enviaron escrituras de colección.

Queda pendiente la integración con una base descartable y dos cuentas reales: persistencia efectiva de cookie tras recarga, atributos HTTPS, revocación en PostgreSQL, rechazo de IDs ajenos y todas las combinaciones reales de CSRF/origen. Los fixtures no prueban esas propiedades del backend.
