# Auditoría de seguridad de Muvis — backend

Fecha: 22 de octubre de 2026. Alcance: revisión del código y configuración disponibles, inventario del entorno Python activo y comprobaciones HTTP anónimas de solo lectura. Este informe es un diagnóstico: no se corrigió el backend, no se ejecutaron migraciones y no se registraron usuarios ni sesiones ni se modificaron películas.

## Resultado principal

La colección nueva tiene controles de sesión, CSRF y pertenencia por usuario. No se encontró un IDOR en sus consultas. El problema de acceso más importante está en el CRUD antiguo `/peliculas`: continúa publicado y permite operaciones sobre una tabla compartida sin autenticación. Antes de exponer Muvis a Internet conviene resolver esa ruta y limitar los intentos de autenticación y el consumo de recursos.

El resultado no equivale a una certificación de seguridad. No se probaron operaciones autenticadas con dos cuentas, fuerza bruta, carga, recuperación de cuentas, infraestructura de producción ni todos los avisos de vulnerabilidades de las dependencias. Las conclusiones distinguen lo demostrado por código de los riesgos condicionados al despliegue.

## Cómo interpretar los hallazgos

- **Confirmado por código:** el flujo o la ausencia de control se ve directamente en los archivos citados. No significa que se haya explotado en producción.
- **Observado por GET:** se comprobó una respuesta del servidor local sin enviar credenciales ni cambiar datos.
- **Potencial:** la condición existe, pero el impacto depende de exposición, infraestructura o una prueba adicional.
- **Mejora opcional:** defensa adicional; no demuestra por sí misma una vulnerabilidad.

La severidad es contextual. Se considera un despliegue público con datos reales; el riesgo de una instancia accesible únicamente desde la máquina del desarrollador es menor. No se asignaron puntuaciones CVSS sin información suficiente.

| ID | Severidad | Estado | Hallazgo |
|---|---|---|---|
| B01 | Alta | Código + GET | CRUD legacy `/peliculas` sin autenticación ni autorización |
| B02 | Alta al publicar | Código; infraestructura no verificada | Login y registro sin límites de intentos en la aplicación |
| B03 | Media | Código; abuso no ejecutado | Catálogo público sin límites de consumo de TMDB |
| B04 | Media | Código; timing potencial | Enumeración de cuentas por registro y diferencias de trabajo en login |
| B05 | Media | Código; riesgo contextual | Sesiones de 21 días sin inactividad ni revocación global |
| B06 | Media | Código; límites del proxy no verificados | Límites incompletos de entrada, tamaño y volumen |
| B07 | Baja | Código; fallos no provocados | Errores externos y duplicados concurrentes sin traducción controlada |
| B08 | Media operativa | Código/configuración | Configuración de seguridad no validada al iniciar ni documentada en el ejemplo |
| B09 | Media operativa | Parser + metadatos | Dependencias no reproducibles y línea de requirements inválida |
| B10 | Baja | Código; logs externos no verificados | Sin registro específico de eventos de seguridad |
| B11 | Condicional | Código + GET local | Preparación de HTTPS, caché y encabezados de producción pendiente |

## Controles que ya están bien implementados

### Autenticación y contraseñas

`app/core/security.py:5` utiliza `PasswordHash.recommended()` de pwdlib; no usa SHA-256 para contraseñas. En el entorno Python inspeccionado, pwdlib 0.3.1 selecciona Argon2id con memoria de 65 536 KiB, tres iteraciones y paralelismo cuatro. Son los parámetros observados del entorno, no una garantía sobre otro despliegue o sobre todos los hashes históricos almacenados. No se consultaron hashes de la base de datos. Argon2id es una opción recomendada para este fin por [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

`app/schemas/usuarios.py:15` exige entre 12 y 128 caracteres al registrar una contraseña. El nombre de usuario tiene longitud y patrón limitados (`:7`) y el email utiliza `EmailStr` (`:13`). `UsuarioRespuesta` enumera campos públicos y excluye `password_hash` (`:20`); registro y `/me` declaran ese modelo de respuesta en `app/api/routes/usuarios.py:24` y `:120`.

### Sesiones y cookies

`app/core/security.py:16` genera tokens con 32 bytes aleatorios mediante `secrets.token_urlsafe`. La base de datos guarda su SHA-256 (`:20` y `app/api/routes/usuarios.py:100`), no el token reutilizable en texto claro. Un hash rápido es adecuado para un identificador aleatorio de alta entropía; no debe confundirse con el almacenamiento de contraseñas.

`app/core/auth.py:27` busca la sesión por hash, rechaza las inexistentes, verifica la caducidad en el servidor (`:39`) y obtiene a su propietario (`:46`). Cada login correcto genera un token nuevo; no se reutiliza un identificador aportado por el cliente. No se observó fijación de sesión en ese flujo.

La cookie se establece en `app/api/routes/usuarios.py:107` con `HttpOnly`, `SameSite=Lax`, `Path=/` y sin atributo `Domain`. `Secure` está activado salvo cuando `APP_ENV` es exactamente `development` (`:111`). El logout protegido elimina la sesión persistida (`:168`) y borra la cookie con el mismo nombre y ruta (`:172`). No hay JWT en este diseño; los riesgos propios de algoritmos o firmas JWT no aplican.

### CSRF, origen y CORS

Las escrituras de colección declaran `Depends(exigir_csrf)` en `app/api/routes/coleccion.py:19`, `:132`, `:170`, `:203` y `:240`; logout también lo exige (`app/api/routes/usuarios.py:150`). La dependencia requiere una sesión válida, comprueba el origen y exige el encabezado `X-CSRF-Token` (`app/core/csrf.py:67`).

El token se deriva mediante HMAC-SHA256 con secreto del servidor y el hash de esa sesión (`app/core/csrf.py:40`), y se compara con `hmac.compare_digest` (`:61`). `/usuarios/csrf` requiere autenticación y responde `Cache-Control: no-store` (`app/api/routes/usuarios.py:127`). Es un token vinculado a la sesión y entregado por JSON, no una cookie doble sin firmar.

`verificar_origen` compara el origen completo con una lista explícita. Si falta `Origin`, extrae el origen de `Referer`; si no encuentra uno permitido, rechaza (`app/core/csrf.py:15`). No usa una comparación por prefijo que permita dominios terminados en `.atacante.example`. Login y registro también comprueban origen, aunque todavía no exista una sesión para emitir CSRF (`app/api/routes/usuarios.py:26` y `:70`). No se identificó login CSRF simplemente por no exigir un token previo al login. La combinación de token vinculado a sesión y verificación de origen es coherente con [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

`app/main.py:24` configura CORS con una lista, credenciales y encabezados explícitos. El análisis local, sin publicar valores, encontró dos orígenes CORS y tres CSRF; ninguna lista contiene `*` ni `null`. La diferencia puede ser deliberada —por ejemplo, para documentación servida por el propio backend— y no demuestra una vulnerabilidad. CORS no reemplaza autenticación ni bloquea clientes HTTP externos que no sean navegadores.

### Autorización e integridad de la colección

| Operación | Evidencia del filtro por propietario |
|---|---|
| Listar | `app/api/routes/coleccion.py:81` |
| Consultar por ID interno | `app/api/routes/coleccion.py:109` |
| Cambiar vista/pendiente | `app/api/routes/coleccion.py:142` |
| Cambiar favorita | `app/api/routes/coleccion.py:179` |
| Cambiar puntuación | `app/api/routes/coleccion.py:212` |
| Eliminar | `app/api/routes/coleccion.py:250` |
| Agregar y comprobar duplicado | `app/api/routes/coleccion.py:38` y `:50` |

El propietario se toma del usuario autenticado, no de un `usuario_id` editable en el cuerpo. Las consultas individuales combinan ID de película y usuario; una película ajena devuelve el mismo 404 que una inexistente. La restricción única es `(usuario_id, id_tmdb)` (`app/db/models.py:20`). Los esquemas de modificación sólo declaran los campos permitidos. No se encontró asignación masiva que permita cambiar propietario o ID a través de estas rutas. Tener IDs secuenciales no constituye por sí mismo un IDOR cuando se controla la pertenencia; el criterio relevante es la autorización del objeto, como explica [OWASP API1](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).

### Inyección y datos externos

Las consultas revisadas utilizan expresiones y operaciones del ORM de SQLAlchemy, sin concatenar entradas en SQL: `app/repositories/database.py:26`, `:67`, `:91`, `:156` y las consultas de colección. El `setattr` legacy tiene una lista cerrada de campos (`app/repositories/database.py:108`). La sentencia de migración `DELETE FROM coleccion` es estática, no recibe datos externos; su riesgo es operativo y se explica más abajo. No se encontró SQL injection en los flujos revisados.

TMDB usa un origen HTTPS fijo (`app/services/tmdb.py:10`), parámetros de HTTPX (`:152`) y un ID tipado como entero en la ruta (`app/api/routes/catalogo.py:21`). No se acepta una URL arbitraria de destino, por lo que no se encontró SSRF en este cliente. El token de TMDB se añade como encabezado del backend (`app/services/tmdb.py:14`) y no forma parte de las respuestas transformadas ni de URLs enviadas al frontend. HTTPX tiene timeout de diez segundos y no desactiva la validación TLS.

Las rutas devuelven JSON. En el frontend existente se observó renderizado de títulos/sinopsis como texto JSX y no se encontró `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en `frontend/src`. No se demostró un XSS almacenado con estos campos. Esto no sustituye la revisión independiente del frontend ni autoriza a introducir HTML externo sin sanitizar.

## Hallazgos y remediación

### B01 — CRUD antiguo expuesto sin control de acceso

**Severidad alta. Confirmado por código; lectura anónima observada.**

Evidencia: `app/main.py:32` monta el router legacy. `app/api/routes/peliculas.py:12`, `:20`, `:36`, `:53` y `:69` implementan listar, crear, consultar, eliminar y actualizar sin dependencias de sesión, origen o CSRF. `app/db/models.py:8` define una tabla `peliculas` independiente, sin propietario. El GET anónimo local `/peliculas/` respondió 200; no se enviaron POST, PUT ni DELETE para probarlo.

Impacto: quien alcance la API puede leer y, según el flujo de código, alterar o borrar registros legacy. No implica acceso a las filas de `/coleccion`, que tienen controles diferentes. Ocultar el menú o quitar `/peliculas` del frontend no cierra estos endpoints. CORS tampoco protege frente a peticiones directas; que PUT no aparezca entre métodos CORS sólo afecta determinados navegadores.

Remediación: decidir si el CRUD sigue siendo necesario. Si era una etapa anterior, no publicar su router en el servicio web. Si debe permanecer, definir una política explícita de roles/propiedad y aplicar autenticación y autorización a cada operación; proteger también las escrituras basadas en cookies contra CSRF. No convertir automáticamente todos sus datos en públicos por ser “legacy”.

### B02 — Autenticación sin control de intentos o automatización

**Severidad alta antes de una exposición pública. Ausencia confirmada en el código; no se verificó si existe protección externa.**

Evidencia: `app/api/routes/usuarios.py:28` y `:71` ejecutan registro y login sin contadores de fallos, cuotas, demoras progresivas ni limitador. `app/main.py:24` sólo añade CORS. El chequeo de origen no evita que un programa HTTP suministre un origen permitido; esa defensa está diseñada para peticiones de navegador, no para detener bots.

Impacto: intentos masivos contra contraseñas, creación automatizada de cuentas y consumo de CPU/memoria de Argon2. Cada login correcto crea otra sesión (`app/api/routes/usuarios.py:98`), sin límite visible por usuario. No se ejecutó fuerza bruta ni carga.

Remediación: limitar por cuenta y por IP con ventanas y retrasos progresivos, combinar límites globales de concurrencia y respuestas 429, y registrar abusos. Evitar bloqueos permanentes fáciles de provocar contra otra persona. Si se limita en proxy, verificar también que el backend no tenga un acceso directo que lo eluda. [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) recomienda throttling y defensas contra automatización.

### B03 — Consumo público de TMDB sin cuotas locales

**Severidad media. Confirmado por código; agotamiento no probado.**

Evidencia: catálogo público en `app/api/routes/catalogo.py:16`, `:20` y `:34`; cada consulta realiza peticiones salientes (`app/services/tmdb.py:52`, `:100` y `:147`). Sólo los géneros están cacheados (`:21`). No se encontró límite por cliente, caché de populares/detalles ni presupuesto global. La búsqueda sí tiene límites de longitud de 2 a 100 caracteres; el timeout también existe y no debe considerarse ausente.

Impacto: terceros pueden consumir la cuota del proveedor y capacidad del servidor usando su credencial de TMDB, aunque nunca conozcan el token. El debounce del frontend no limita a un cliente que llame directamente a la API. Durante la primera búsqueda, varias solicitudes simultáneas pueden además repetir la carga inicial de géneros.

Remediación: introducir cuotas y límites de concurrencia, cachés con expiración y un tratamiento controlado de 429 del proveedor. Mantener público el catálogo puede ser una decisión válida; no hace falta imponer login como única solución. El problema es el consumo sin presupuesto. Ver [OWASP API4](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).

### B04 — Enumeración de cuentas y diferencia de tiempos

**Severidad media. Respuestas de registro confirmadas por código; canal temporal potencial.**

Evidencia: registro devuelve 201 o 409 según exista nombre/email (`app/api/routes/usuarios.py:34`). Un nombre distinto para cada intento permite aislar la existencia del email consultado. Login sí usa el mismo 401 y mensaje para ambos fallos, lo cual es positivo, pero el `or` de `app/api/routes/usuarios.py:82` evita ejecutar Argon2 cuando no existe usuario. Una cuenta existente requiere una verificación costosa; una inexistente no.

Impacto: posible descubrimiento de personas registradas y preparación de ataques dirigidos. No se midieron tiempos ni se consultaron emails reales para demostrarlo; latencia y controles externos influyen en la explotación temporal.

Remediación: verificar contra un hash ficticio válido también cuando la cuenta no existe, conservar mensajes genéricos y limitar consultas. Evaluar qué información de duplicados debe revelar el registro; en un flujo con verificación por correo puede responderse de forma uniforme. Si se mantiene el 409 por usabilidad, documentar el compromiso y aplicar límites. Esto sigue las recomendaciones de respuestas genéricas y trabajo comparable de [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### B05 — Ventana de sesión larga y control de revocación limitado

**Severidad media, dependiente de la sensibilidad y despliegue. Confirmado por código.**

Evidencia: login fija 21 días absolutos (`app/api/routes/usuarios.py:95` y `:113`); autenticación sólo compara esa expiración (`app/core/auth.py:39`). El modelo no tiene última actividad ni marcador de revocación global (`app/db/models.py:81`). Logout elimina sólo la sesión presentada. No se observaron rutas de “cerrar todas las sesiones”, gestión de dispositivos o cambio/recuperación de contraseña con revocación. Tampoco hay limpieza periódica de sesiones expiradas en el código revisado.

Impacto: una cookie obtenida por otros medios puede seguir siendo útil hasta el vencimiento o cierre de esa sesión. La ausencia de limpieza acumula filas, aunque no vuelve válidos los tokens vencidos. Tener varias sesiones válidas no demuestra fijación de sesión ni un bypass del vencimiento.

Remediación: definir duración absoluta e inactividad de acuerdo con el uso; añadir mecanismos de revocación y limpieza. Para una opción “recordarme”, separar su política de una sesión activa corta. Invalidar sesiones al recuperar o cambiar credenciales cuando se implemente ese flujo. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) trata estas políticas y la renovación.

### B06 — Tamaño y volumen de entradas sin límites completos

**Severidad media para disponibilidad. Confirmado en esquemas y consultas; límites externos no verificados.**

Evidencia: `UsuarioLogin.password` no limita longitud (`app/schemas/usuarios.py:30`), a diferencia del registro. Legacy permite cadenas sin máximos (`app/schemas/peliculas.py:12` y `:18`) aunque sus columnas son 255 y 100 caracteres (`app/db/models.py:12`). No hay paginación en la colección (`app/api/routes/coleccion.py:79`) ni en la lista legacy (`app/repositories/database.py:49`). No se encontró un límite global de cuerpo de petición en la aplicación.

Impacto: peticiones y respuestas grandes consumen memoria y tiempo; cadenas que exceden columnas pueden terminar en 500. Pydantic valida después de que el cuerpo haya sido recibido, por lo que limitar un campo no sustituye un límite de tamaño del request. No se enviaron cargas grandes ni se provocaron errores de base de datos.

Remediación: limitar cuerpo y concurrencia en el punto de entrada; definir máximos razonables en login y campos legacy; paginar las listas y, si corresponde, establecer cuotas de colección. No truncar silenciosamente contraseñas. Los límites existentes de búsqueda y puntuación deben conservarse.

### B07 — Errores externos y carrera de duplicados no controlados

**Severidad baja; principalmente estabilidad. Confirmado por flujo estático.**

Evidencia: `app/services/tmdb.py:64`, `:113` y `:160` propagan `raise_for_status`; no hay traducción de timeouts, 429 o errores del proveedor en `app/api/routes/catalogo.py`. Agregar a colección consulta TMDB antes de comprobar duplicado (`app/api/routes/coleccion.py:23` y `:35`) y hace commit sin capturar `IntegrityError` (`:62`). La restricción única correcta impide duplicados, pero dos POST concurrentes pueden superar ambos el chequeo previo y uno terminar con 500. El registro sí captura esta carrera (`app/api/routes/usuarios.py:58`).

Impacto: errores transitorios se presentan como fallo interno y pueden provocar reintentos innecesarios. No se demostró exposición de credenciales: FastAPI no está configurado con `debug=True`, y el código no devuelve excepciones completas al cliente. Un traceback en logs no es automáticamente un traceback público.

Remediación: manejar la restricción única como 409 y revertir la transacción; traducir fallos de TMDB a respuestas estables 502/503/504 según el caso; usar identificadores de correlación y registros internos redactados. No devolver SQL, cookies, contraseñas, encabezados de autorización ni trazas al navegador. Ver [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html).

### B08 — Configuración de seguridad difícil de reproducir y sin validación inicial

**Severidad media operativa. Confirmado por archivos; la configuración local tiene las claves necesarias.**

Evidencia: `.env.example:1` a `:11` documenta DB, pgAdmin y TMDB, pero omite `APP_ENV`, `CORS_ALLOWED_ORIGINS`, `CSRF_ALLOWED_ORIGINS` y `CSRF_SECRET`. `app/core/csrf.py:42` descubre la ausencia del secreto al generar/verificar un token, no al iniciar. Las listas vacías por defecto rechazan orígenes (`app/core/csrf.py:18`, `app/main.py:20`). `app/services/tmdb.py:9` permite construir un encabezado con un token ausente. No hay un modelo central de configuración validada.

Impacto: una instalación siguiendo únicamente el ejemplo puede fallar con 403 o 500, o no adjuntar una cookie Secure sobre HTTP. El comportamiento de origen vacío es restrictivo y no es una apertura de acceso. El entorno inspeccionado tiene todas esas variables no vacías; sólo se comprobaron presencia, indicadores y longitud, sin registrar valores. El secreto CSRF local supera 32 caracteres; eso no acredita su aleatoriedad.

Remediación: validar al inicio los campos obligatorios y el formato de orígenes, separar ajustes de desarrollo/producción y actualizar el ejemplo sin secretos reales. En producción no permitir `development`. Mantener secretos fuera de repositorio y logs, y prever rotación. [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) describe el ciclo de vida y acceso de estos valores.

### B09 — Dependencias y arranque no reproducibles

**Severidad media operativa; riesgo de cadena de suministro potencial. No se confirmó una CVE explotable en el entorno.**

Evidencia: `requirements.txt:1` a `:8` deja casi todas las versiones libres y no tiene lock/hashes. La línea 8 contiene literalmente comillas alrededor de `pwdlib[argon2]`; el parser de requisitos instalado la rechaza con `InvalidRequirement`. No se ejecutó una instalación para verificarlo. `app/schemas/usuarios.py:1` necesita `email-validator` por `EmailStr`, pero no se declara esa dependencia ni los extras que la traen. En los metadatos instalados figura como dependencia opcional de `fastapi[standard]` y `pydantic[email]`.

Impacto: un entorno nuevo puede fallar antes de arrancar, o resolver versiones distintas de las verificadas. El Python activo ya tiene `email-validator` y pwdlib; por eso un equipo puede funcionar mientras otro no. Un paquete sin pin no es prueba de código malicioso ni de una vulnerabilidad concreta.

Remediación: corregir la sintaxis, declarar las dependencias efectivamente usadas y generar un lock de producción revisado con versiones y hashes. Probar instalación limpia en CI y auditar ese lock contra avisos oficiales sin actualizar ciegamente. La sintaxis del archivo está documentada por [pip](https://pip.pypa.io/en/stable/reference/requirements-file-format/).

### B10 — Observabilidad de seguridad no implementada en la aplicación

**Severidad baja. Ausencia en código; registros externos no auditados.**

Evidencia: no se encontraron eventos específicos de autenticación fallida, revocaciones, denegaciones CSRF o límites en `app/core/auth.py`, `app/core/csrf.py` y `app/api/routes/usuarios.py`. Los logs de acceso que pueda producir Uvicorn no demuestran por sí solos que se pueda detectar abuso por cuenta.

Impacto: investigar intentos contra cuentas o diagnosticar una denegación de origen puede requerir reproducir el problema. La recomendación no es registrar cuerpos ni todos los encabezados.

Remediación: registrar tipo de evento, fecha, resultado, usuario cuando se conozca, identificador de petición y origen de red tratado según la política de privacidad. Redactar contraseñas, cookies, tokens de sesión, tokens CSRF y credenciales TMDB. Añadir alertas sobre patrones anómalos junto con los límites de B02.

### B11 — Controles de despliegue que aún deben verificarse

**Severidad condicional; no se confirmó un despliegue público inseguro.**

Evidencia: el indicador local de `APP_ENV` corresponde a desarrollo, por lo que `app/api/routes/usuarios.py:111` omite Secure localmente. `app/main.py` no implementa redirección HTTPS, TrustedHost, HSTS ni otros encabezados. Los GET locales inspeccionados carecen de HSTS, CSP, X-Content-Type-Options y X-Frame-Options. `/docs` y `/openapi.json` respondieron 200, acorde con `FastAPI()` por defecto (`app/main.py:14`). La aplicación no fija `Cache-Control: no-store` para perfil/colección; sí lo hace para el token CSRF exitoso.

Impacto condicionado: usar desarrollo sobre una red pública con HTTP expondría credenciales y cookies en tránsito. Un proxy mal configurado podría cachear respuestas privadas. Publicar docs sólo revela la superficie de API, no sus secretos y no sustituye ni invalida autenticación. CSP y protección contra iframes son especialmente relevantes para el servidor que entregue el HTML del frontend; agregarlas sólo al JSON no protege ese HTML.

Remediación: documentar y comprobar TLS, `APP_ENV` de producción, proxy confiable, hosts permitidos, política de caché privada/no-store y encabezados en el servidor correspondiente. Reducir exposición de docs si así se decide. Considerar prefijo `__Host-` para la cookie de producción como defensa adicional, coordinando la compatibilidad de desarrollo. No desactivar CSRF ni usar CORS abierto para resolver problemas de conectividad.

## Secretos, base de datos y migraciones

- `.gitignore:4` y `:5` excluyen `.env` y variantes, con excepción explícita del ejemplo. `git ls-files` mostró sólo `.env.example`; la consulta de historial por el nombre `.env` no encontró commits. Un escaneo limitado de patrones en fuentes versionadas no encontró claves privadas ni asignaciones literales largas de password/token/secret. No es un análisis exhaustivo de todo el historial ni descarta secretos con nombres o formatos distintos.
- No se imprimieron valores de `.env`, tokens, cookies, hashes almacenados, emails ni contenido de colecciones. La lectura de configuración produjo sólo indicadores de presencia/forma. No se importó `alembic/env.py` ni se invocó un comando de migración.
- `docker-compose.yml:13` y `:28` enlazan PostgreSQL y pgAdmin a `127.0.0.1`, una reducción de exposición adecuada para desarrollo. Usa credenciales por entorno y volúmenes persistentes. No se verificaron firewall, backups, permisos del rol PostgreSQL ni despliegues externos.
- **Precaución operativa:** `alembic/versions/a3c9a8b16d67_crear_usuarios_y_vincular_coleccion.py:35` contiene `DELETE FROM coleccion` al migrar datos de prueba hacia el modelo con propietario. Es una operación destructiva histórica confirmada por código, no un endpoint remoto. No debe reaplicarse a datos reales sin plan de conservación y copia de seguridad. No se determinó si ese esquema ya está aplicado.

## Inventario de dependencias observado

Versiones del intérprete Python activo del entorno de trabajo, no una afirmación sobre el proceso desplegado. No se instalaron ni actualizaron paquetes.

| Paquete | Versión observada |
|---|---|
| FastAPI | 0.141.1 |
| Starlette | 1.6.0 |
| Pydantic | 2.13.4 |
| pwdlib | 0.3.1 |
| argon2-cffi | 25.1.0 |
| HTTPX | 0.28.1 |
| SQLAlchemy | 2.0.51 |
| psycopg | 3.3.5 |
| Uvicorn | 0.52.0 |
| python-dotenv | 1.2.2 |
| Alembic | 1.20.0 |
| email-validator | 2.3.0 |
| python-multipart | 0.0.32 |

`python -B -m pip check` terminó con **No broken requirements found**. Comprueba consistencia de dependencias instaladas, no vulnerabilidades, reproducibilidad ni seguridad del código. `pip-audit` no está instalado; no se instaló para esta revisión.

Se consultaron avisos de los mantenedores. Como comprobación acotada, Starlette 1.6.0 está fuera de los rangos afectados de [GHSA-jp82-jpqv-5vv3](https://github.com/Kludex/starlette/security/advisories/GHSA-jp82-jpqv-5vv3) —corregido en 1.3.0—, [GHSA-82w8-qh3p-5jfq](https://github.com/Kludex/starlette/security/advisories/GHSA-82w8-qh3p-5jfq) —corregido en 1.3.1— y [GHSA-wqp7-x3pw-xc5r](https://github.com/Kludex/starlette/security/advisories/GHSA-wqp7-x3pw-xc5r) —corregido en 1.1.0—. Además, no se observó `StaticFiles` ni procesamiento `request.form()` en las rutas propias revisadas. No se deben atribuir esas vulnerabilidades al proyecto por usar Windows o Starlette sin verificar versión y recorrido de código. Esta consulta parcial no equivale a “cero CVEs” para todas las dependencias transitivas.

## Comprobaciones ejecutadas y límites

| Comprobación | Resultado |
|---|---|
| GET anónimo `/` | 200 |
| GET anónimo `/peliculas/` | 200; no se almacenó ni publicó su contenido |
| GET anónimo `/coleccion/` | 401 |
| GET anónimo `/usuarios/me` | 401 |
| GET anónimo `/usuarios/csrf` | 401 |
| GET anónimo `/docs` y `/openapi.json` | 200 |
| Revisión de fuentes de auth/CSRF/colección/legacy/TMDB | Completada; referencias indicadas |
| Inventario de dependencias, `pip check`, parser de requirements | Completados sin instalaciones |
| Análisis limitado de secretos y seguimiento de `.env` | Sin hallazgos en el conjunto descrito; no exhaustivo |
| Pruebas con dos usuarios, cookies reales y mutaciones | No ejecutadas |
| Pruebas de carga, automatización de login y explotación | No ejecutadas |
| Migraciones o cambios de infraestructura | No ejecutados |

Las consultas HTTP utilizaron un cliente nuevo sin cookies ni autenticación, únicamente GET. No se iniciaron servidores ni se alteró PostgreSQL. Para las comprobaciones Python se usó `-B` y no se generaron fuentes ni bytecode dentro del backend.

## Plan de verificación recomendado para una siguiente etapa

Estas pruebas se proponen para una base y cuentas de prueba aisladas; no se ejecutaron sobre datos reales:

1. Usuario A crea una entrada y usuario B intenta consultarla, modificar estado/favorita/nota y eliminarla. Todas las operaciones ajenas deben responder 404 sin cambiar datos.
2. Para cada escritura protegida: sin cookie → rechazo; sesión expirada → rechazo; cookie válida sin CSRF → rechazo; token de otra sesión → rechazo; origen ajeno, `null` o ausente sin Referer confiable → rechazo; origen confiable y token correcto → éxito.
3. Login y registro desde un origen ajeno deben fallar. Verificar el origen propio de Swagger y del frontend de despliegue sin ampliar listas por comodidad.
4. Comprobar atributos reales de la cookie sobre HTTPS, que login emita un token nuevo, que logout lo invalide en servidor y que no aparezca en URLs ni almacenamiento web.
5. Probar límites de intentos y concurrencia después de implementarlos, con cargas pequeñas y umbrales conocidos. Confirmar que un backend accesible directamente no eluda el límite del proxy.
6. Simular timeout, 429 y fallo de TMDB con fixtures; dos altas concurrentes del mismo usuario y película deben dar un éxito y un 409 controlado.
7. Validar instalación limpia a partir de un lock, auditoría de sus paquetes transitivos y configuración de producción. Repetir controles de rutas legacy tras cerrarlas o protegerlas.

## Mejoras opcionales sin vulnerabilidad confirmada

- Rehash al autenticar cuando cambien los parámetros recomendados de Argon2; no se vio una ruta de migración de hashes. El hash actual inspeccionado del entorno tiene parámetros sólidos.
- Evaluar MFA, comprobación de contraseñas comprometidas y verificación de email según el modelo de producto. `EmailStr` valida formato, no prueba propiedad del buzón. No se observó que el proyecto conceda privilegios especiales por ese email.
- Evaluar `__Host-` y una política de duración de sesión acorde con el riesgo. No se considera ausente Secure en producción: ya depende de `APP_ENV` con valor restrictivo por defecto.
- Definir un índice y limpieza para expiración de sesiones, pruebas automáticas de aislamiento y un proceso periódico de revisión de avisos de dependencias.

## Orden sugerido de trabajo

Primero cerrar o proteger el CRUD legacy y añadir límites de autenticación. Después controlar cuota TMDB, límites de recursos y errores; hacer reproducible el entorno y validar configuración al iniciar. Antes de un despliegue público, comprobar HTTPS, cookies, caché, logs y las pruebas con dos cuentas. Las demás mejoras deben priorizarse según el uso real de Muvis.

## Revisión posterior de la integración de autenticación en React

Se revisó también la integración frontend incorporada durante esta tarea. Esta sección complementa el diagnóstico backend; no elimina los hallazgos B01–B11 ni convierte la protección de rutas de React en autorización del servidor.

- `frontend/src/services/apiClient.js` centraliza las peticiones con `credentials: "include"`, caché desactivada y timeout de veinte segundos. El navegador administra la cookie; el código no intenta leerla. El token CSRF permanece sólo en memoria y se solicita una vez para escrituras concurrentes. No se encontró persistencia de cookies, contraseñas ni tokens en `localStorage` o `sessionStorage` dentro de `frontend/src`.
- Las escrituras privadas obtienen CSRF y no se repiten automáticamente ante un 403. Ese error conserva la sesión y elimina el token cacheado para un reintento explícito. Un 401 privado anuncia expiración; el 401 del login se presenta como credenciales incorrectas y el 401 de la recuperación inicial se trata como una visita anónima, sin anunciar falsamente que una sesión anterior terminó.
- Las respuestas privadas llevan una revisión de sesión, comprobada antes de enviar y también después de recibir y parsear la respuesta. Durante la revisión se detectó una ventana en el body JSON diferido; se corrigió en la integración y la prueba correspondiente pasa. Una respuesta antigua no puede reemplazar datos de otra sesión ni invalidar su CSRF al terminar de parsearse.
- `AuthContext.jsx` recupera el perfil sin leer la cookie, invalida operaciones anteriores y cambia `sessionKey` al entrar, salir, expirar o detectar otra identidad. El contenido de la aplicación se remonta con esa clave para descartar listas, notas y diálogos privados anteriores. `useCatalogCollection.js` limita sus operaciones compartidas a ese ámbito y no mantiene una caché global de colecciones entre cuentas. También se corrigió la recuperación de una identidad distinta y el solapamiento entre reintentar sesión y una operación de login/registro/logout.
- La revalidación al recuperar foco o visibilidad vuelve a consultar el perfil y evita solaparse con operaciones de sesión. Reduce la desactualización cuando otra pestaña cambia la cookie; no pretende ofrecer una sincronización instantánea entre pestañas ni reemplaza las verificaciones del backend.
- `RequireAuth.jsx` conserva el destino al pedir login y muestra estados de carga/error sin representar una colección anterior. Los destinos posteriores al login se limitan al propio origen; no se encontró una redirección externa libre en `AuthPage.jsx`. Los formularios mantienen las contraseñas en el estado temporal del componente y no las incluyen en rutas ni mensajes. El Header mantiene disponible el reintento si falla el cierre y no afirma que la sesión terminó cuando el backend no lo confirmó.

### Pruebas aisladas añadidas

Se creó `frontend/qa/auth-client.test.mjs`, ejecutable con **`node --test frontend/qa/auth-client.test.mjs` desde la raíz del proyecto**. Utiliza Node 24, `node:test`, los servicios reales importados y un reemplazo de `fetch` en memoria. No abre conexiones ni usa o muestra tokens, cookies, contraseñas o cuentas reales. La resolución de imports sin extensión se adapta únicamente dentro del proceso de pruebas; no cambia el producto ni instala dependencias.

Resultado final: **15 pruebas aprobadas, 0 fallidas**. Cubren credenciales/caché/señal de timeout; login y recuperación inicial 401 frente a expiración privada; CSRF concurrente; ausencia de escritura si falta CSRF; 403 sin reintento automático; logout 204 sin JSON; renovación tras cambio de sesión; respuestas CSRF y JSON privadas tardías; 403 antiguo sin invalidar la sesión nueva; finalización de una petición CSRF antigua sin romper la nueva; registro sin login implícito; mensajes sin detalles internos y compatibilidad del 409 de colección.

Estas pruebas verifican los contratos de los servicios y sus carreras asíncronas. No simulan por sí solas los hooks, la navegación, atributos reales de cookies o la interfaz del navegador. Esas comprobaciones visuales y de integración deben informarse por separado. La revisión estática del contexto, guard de rutas, aislamiento y formularios no mostró otro hallazgo bloqueante en la versión final revisada.

Los archivos creados por esta auditoría y verificación son `frontend/AUDITORIA-SEGURIDAD.md` y `frontend/qa/auth-client.test.mjs`. No se modificó ningún archivo fuera de `frontend/` ni se realizaron escrituras en servicios o bases de datos.
