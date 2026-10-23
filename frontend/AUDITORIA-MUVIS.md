# Muvis — autenticación implementada y auditoría integral

Fecha: 22 de octubre de 2026. La implementación se limitó a `frontend/`. El resto del repositorio se leyó para diagnóstico. No hubo migraciones, instalaciones correctivas, cambios de datos reales, commits ni push.

## 1. Resumen ejecutivo

Muvis tiene una base adecuada para seguir aprendiendo y evolucionar: React separado de FastAPI, metadatos externos gestionados desde el servidor y colección con propietario. La autenticación del frontend quedó integrada con los contratos existentes, sin JWT ni almacenamiento de credenciales en JavaScript.

No recomiendo publicar la API tal como está: continúa expuesto el CRUD legacy sin autenticación, faltan controles de abuso y la instalación/migraciones necesitan revisión. No se encontraron vulnerabilidades críticas demostradas. Sí hay una vulnerabilidad alta de control de acceso y riesgos altos condicionados al despliegue. Aprobar build/lint y pruebas aisladas no certifica seguridad de producción.

## 2. Trabajo realizado

Se implementaron login, registro, recuperación y cierre de sesión, información del usuario, rutas privadas, retorno interno seguro y manejo diferenciado de 401/403/404/409. Todas las peticiones envían cookies; las escrituras personales y logout obtienen y envían CSRF en memoria. Se deduplica el token concurrente y se rechazan respuestas de otra sesión. Al cambiar de cuenta se reinician vistas y estados personales. Descubrir conserva catálogo, cuadrícula, buscador y detalle público; guardar requiere sesión.

Se reutilizaron React Router, componentes de estado, iconos, diálogos de puntuación/eliminación, estilos y contratos de colección. No se instalaron dependencias ni se modificaron backend o configuración de raíz.

El listado de archivos, contratos y configuración está en [AUTENTICACION.md](AUTENTICACION.md). Las pruebas quedaron en `qa/auth-client.test.mjs`, `qa/main.jsx`, `qa/README.md`, `qa/auth-ui-resultados.json` y las capturas `qa/screenshots/auth-*.jpg`.

## 3. Pruebas y límites

- Build y lint del frontend correctos, sin advertencias finales de lint.
- 15 pruebas automatizadas de servicios reales con fetch aislado: credenciales, CSRF, concurrencia, 401/403/409, 204, errores redactados y respuestas tardías de otras sesiones.
- 16 grupos de pruebas UI aisladas: registro/login, validaciones, logout con error, cambio de cuenta, colección, búsqueda, agregado rápido, filtros, notas/favoritas/estado/eliminación, 404, expiración, reintentos, deduplicación de cargas y responsive a 320/390 píxeles.
- Backend real, sin cookies: GET públicos, rechazo 401 de privados y navegación a login. Preflight CORS con origen React 127.0.0.1 respondió 200 y permite credenciales.
- `npm audit --json --ignore-scripts`: cero avisos en el árbol instalado observado. `pip check`: consistente en el Python disponible. Ninguno equivale a un escaneo completo de seguridad ni a una instalación reproducible.
- No se ejecutaron pruebas autenticadas con PostgreSQL, explotación de escrituras legacy, fuerza bruta, carga, migraciones, restore, HTTPS o infraestructura de producción. No se registraron cuentas ni sesiones reales. Estos límites son deliberados para respetar los datos existentes.

## 4. Puntos fuertes

El hash de contraseña utiliza pwdlib con Argon2; el token de sesión es aleatorio y en la DB se guarda su hash. Las cookies son HttpOnly y SameSite=Lax, con Secure fuera del entorno de desarrollo. La sesión vence en servidor y logout revoca la sesión actual. CSRF utiliza HMAC ligado a la sesión, comparación constante y verificación de origen; CORS utiliza listas explícitas.

La colección filtra por usuario en cada consulta individual y actualización, toma el propietario de la sesión y tiene UNIQUE(usuario_id,id_tmdb). No se identificó IDOR en el flujo estático revisado; falta comprobarlo con dos usuarios reales. El ORM parametriza las consultas observadas. React renderiza texto sin HTML externo; no se encontró un recorrido de SQL injection o XSS en los flujos revisados. TMDB permanece detrás del backend y su token no se incluye en las respuestas públicas.

## 5. Vulnerabilidades y riesgos altos

| Hallazgo | Clasificación y evidencia | Impacto y acción recomendada |
| --- | --- | --- |
| CRUD `/peliculas` sin controles | **Alta, confirmada por código; GET anónimo observado.** `app/main.py:32`; `app/api/routes/peliculas.py:12`, `:20`, `:36`, `:53`, `:69`. | Un cliente que alcanza la API puede operar sobre la tabla legacy. No es un bypass demostrado de `/coleccion`, que usa otra tabla y sí tiene propietario. La UI actual no usa ese CRUD; el repositorio también sirve al CLI. Decidir si retirar su router de la API pública o añadir una política de autenticación/autorización específica. Quitar el enlace de React o confiar en CORS no lo protege. |
| Login/registro sin límites de intentos | **Alta al publicar; ausencia confirmada en aplicación, protección externa no verificada.** `app/api/routes/usuarios.py:28`, `:71`; `app/main.py:24`. | Permite automatización e intentos masivos; Argon2 puede consumir recursos. Implementar límites por cuenta/IP y globales, retrasos progresivos, 429 y monitoreo. No se realizó fuerza bruta. |
| Migración elimina colección | **Alta operativa, confirmada estáticamente, condicionada a ejecutarla con datos valiosos.** `alembic/versions/a3c9a8b16d67_crear_usuarios_y_vincular_coleccion.py:35`. | Ejecuta `DELETE FROM coleccion`. Revisar preservación/asignación de filas y backup probado antes de aplicarla a otra base. No se afirmó que haya ocurrido pérdida ni se ejecutó la migración. No reescribir una revisión ya compartida sin analizar su historial. |
| Instalación Python no reproducible | **Alta operativa de despliegue, error de parser confirmado.** `requirements.txt:8`. | El especificador de pwdlib está entre comillas externas y pip lo rechaza. Además falta declarar email-validator requerido por EmailStr. Corregir en una tarea posterior, resolver/fijar dependencias y comprobar una instalación limpia. No se modificó requirements ni se instaló nada. |

Referencias: [OWASP: autorización por objeto](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/), [OWASP: autenticación y límites](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Los controles concretos y sus límites están explicados en [AUDITORIA-SEGURIDAD.md](AUDITORIA-SEGURIDAD.md).

## 6. Problemas medios y bajos

| Tema | Tipo y evidencia | Recomendación |
| --- | --- | --- |
| Carrera de alta duplicada | Potencial de concurrencia; `app/api/routes/coleccion.py:35`, `:62`. La UNIQUE existe. | Capturar IntegrityError concreto, rollback y devolver 409. El lock del navegador no cubre dos clientes. |
| Consumo y errores TMDB | Riesgo de abuso/disponibilidad; `app/api/routes/catalogo.py:16`, `:34`; `app/services/tmdb.py:52`, `:100`, `:147`. | Limitar cuota/concurrencia, cachear con TTL y traducir timeouts/429/errores. Debounce no protege llamadas directas. |
| Sesiones de 21 días | Política confirmada; `app/api/routes/usuarios.py:95`; `app/core/auth.py:39`. | Definir inactividad, limpieza y revocación global/dispositivos según riesgo. No se halló una sesión que ignore su vencimiento. |
| Enumeración de cuentas | Registro distinguible confirmado; timing de login potencial; `app/api/routes/usuarios.py:34`, `:82`. | Limitar consultas y ejecutar verificación comparable con un hash ficticio cuando el usuario no existe. Evaluar la información que debe revelar el registro. |
| Integridad y rollback de esquema | Declaraciones confirmadas, DB efectiva no consultada; `app/db/models.py:44`, `:46`; migración de usuarios `:47`. | Añadir CHECK de estado/nota tras revisar datos; el downgrade de unicidad global puede fallar con la misma película en dos usuarios. |
| Volumen e índices | Riesgo potencial; `app/api/routes/coleccion.py:79`, `app/db/models.py:20`, `:81`. | Medir listas completas; paginar cuando sea necesario. El índice UNIQUE compuesto ya sirve para usuario. Valorar índices por orden/expiración con consultas reales. |
| Configuración incompleta y operación | Confirmado en ejemplo/repositorio, hosting no observado; `.env.example:1`, `docker-compose.yml:3`, `:19`. | Documentar seguridad y validar al arrancar; completar despliegue, salud, backups, monitoreo y límites de cuerpo/recursos. |
| Frontend | Mejoras opcionales y límites de QA; `frontend/src/hooks/useMovieSearch.js:31`, `frontend/qa/main.jsx:1`. | Cancelar GET obsoletos para ahorrar tráfico. Ya hay debounce, descarte de respuestas anteriores y timeout HTTP de 20 segundos. Fixtures no prueban cookies ni aislamiento SQL. |

El detalle con severidades, fuentes y recomendaciones didácticas está en [AUDITORIA-ARQUITECTURA.md](AUDITORIA-ARQUITECTURA.md). No se presentan ausencias de funcionalidades opcionales como vulnerabilidades explotadas.

## 7. Arquitectura y evolución

Mantener el monolito FastAPI y React es razonable. Antes de añadir capas, centralizar una sesión DB por request y funciones de acceso que reciban siempre el usuario autorizado. El POST de colección mezcla HTTPX asíncrono con DB síncrona en el event loop (`app/api/routes/coleccion.py:20`, `:32`); mover la unidad DB a threadpool o adoptar AsyncSession coherentemente. Reutilizar el cliente HTTPX mediante lifespan y añadir schemas de salida facilita tests y contratos.

PostgreSQL es suficiente para perfiles, amistad y reseñas. Incorporar tablas y políticas explícitas, con privado por defecto y autorización en todas las consultas/contadores. No publicar email al crear perfiles públicos. Elegir entre amistad simétrica o seguimiento dirigido antes de diseñar relaciones. Para reseñas, definir autoría, spoilers, visibilidad, moderación y notas sin fuentes duplicadas. Para anime/series, la identidad debe incluir proveedor, tipo de medio e ID; movie/tv no comparten necesariamente un namespace. Después vendrán temporadas, episodios y progreso si el producto lo necesita.

Priorizar paginado, índices, caché y métricas antes de Redis, colas o microservicios. El informe de arquitectura desarrolla cada opción y sus decisiones previas.

## 8. Preparación para producción

Faltan una instalación backend reproducible, un procedimiento de migraciones revisado, HTTPS y hosting de SPA/API, configuración pública y secretos gestionados sin versionarlos, pruebas de cookies/orígenes y dos usuarios, límites contra abuso y cierre del CRUD legacy.

Compose observado contiene DB y pgAdmin locales ligados a loopback; no es un despliegue completo de API/frontend. Los volúmenes no demuestran un backup. Definir cuánto dato se puede perder y cuánto puede tardar la recuperación (RPO/RTO), copias externas, retención y restauración ensayada; healthchecks, alertas, logs redactados y correlación; CI con tests y revisión de dependencias. Fijar versiones/digests con un proceso de actualización, no fijarlos y olvidarlos. Comprobar que el backend no quede accesible por una vía que eluda las protecciones del proxy.

## 9. Plan priorizado

1. **Antes de publicar:** cerrar o proteger legacy y controlar intentos de autenticación. Revisar migración destructiva con backup; reparar requisitos y configuración en una tarea autorizada fuera del frontend. No probar pérdida de datos contra la colección real.
2. **Antes de confiar datos reales al servicio:** tests de integración con DB descartable/dos cuentas, cookies reales, origen/CSRF, caducidad y logout; conflictos concurrentes y fallos de TMDB; instalación limpia y restore probado.
3. **Para operación y crecimiento:** despliegue HTTPS reproducible, observabilidad, cuotas y caché, paginado e índices medidos. Después perfiles, privacidad/amigos, reseñas y anime mediante un modelo de datos explícito.

## 10. Conclusión

La base es aprovechable y la autenticación del frontend ya acompaña al backend existente. Los desafíos principales están en cerrar la superficie legacy, preservar datos y convertir el entorno local en un sistema reproducible y verificable. El siguiente paso útil es una base descartable de integración, no una reescritura completa.

Todos los cambios de esta tarea están dentro de `frontend/`. Los hallazgos de backend e infraestructura son diagnóstico y propuestas; no se corrigieron aquí. No hubo commit ni push.
