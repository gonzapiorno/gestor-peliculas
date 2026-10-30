# Pruebas locales con fixtures

Este directorio es un harness de desarrollo aislado. Sus películas, puntuaciones y sinopsis son **datos simulados de prueba**, nunca información real del usuario. Los pósters utilizan URLs públicas de imágenes de TMDB; si no están disponibles, la aplicación muestra su reemplazo habitual.

Con Vite iniciado (`npm run dev`), abrir `/qa/index.html`. Antes de importar la aplicación real, el harness reemplaza `window.fetch` para el origen de API configurado por `VITE_API_URL` o, por defecto, `http://127.0.0.1:8000`. Ninguna petición de ese origen se reenvía al backend, ni siquiera rutas desconocidas. El resto de los recursos sigue cargando normalmente. No cambia servicios, endpoints ni datos reales persistentes y no se importa desde la entrada de producción. Los escenarios anteriores arrancan con sesión simulada activa para conservar sus regresiones.

## Escenarios

- `/qa/index.html?scenario=normal`: colección con cuatro películas y catálogo con seis.
- `/qa/index.html?scenario=quick-add`: abre Descubrir con La llegada, Interstellar, El gran hotel Budapest y Vidas pasadas guardadas; Dune: Parte dos y Blade Runner 2049 quedan disponibles para agregar.
- `/qa/index.html?scenario=quick-add-persist`: igual que `quick-add`, conservando únicamente esta colección simulada en `sessionStorage` de la pestaña para probar recargas del harness.
- `/qa/index.html?scenario=empty`: colección vacía.
- `/qa/index.html?scenario=error`: error persistente al cargar la colección.
- `/qa/index.html?scenario=loading`: GET con ocho segundos de demora para observar skeletons.
- `/qa/index.html?scenario=detail-collection-error`: detalle de Dune visible mientras falla la comprobación de colección.
- `/qa/index.html?scenario=edge`: agrega una quinta película con título largo (incluida una palabra sin espacios), año nulo y póster roto para verificar 320 px y el estado guardando.
- `/qa/index.html?scenario=personal-detail`: detalle personal de La llegada, con ID interno 40, vista, favorita y nota 9.
- `/qa/index.html?scenario=personal-metadata-error`: abre el detalle personal 40; su GET de colección responde correctamente mientras el GET de metadatos de TMDB devuelve 500.
- `/qa/index.html?scenario=personal-load-error`: solo el GET del detalle personal devuelve 500; la lista de colección y TMDB siguen disponibles.
- `/qa/index.html?scenario=personal-loading`: demora ocho segundos únicamente el GET del detalle personal para observar su carga; los otros GET mantienen sus tiempos normales.
- `/qa/index.html?scenario=personal-not-found`: abre `/coleccion/99999`, un ID interno inexistente, con respuesta 404.
- Agregar `&page=discover` para Descubrir, `&page=detail` para Dune, `&page=/pelicula/157336` para otro ID de catálogo o `&page=/coleccion/30` para otro ID interno. La página por defecto es `/coleccion`, salvo los escenarios que indican una ruta propia.

La URL pasa a la ruta de la aplicación con `?qa=1` mediante `history.replaceState`, sin recargarla. Para reiniciar una prueba se debe volver a `/qa/index.html`: recargar directamente una ruta de producto abre la entrada normal, sin harness.

## Panel y contratos

El panel fijo «Pruebas locales · datos simulados» registra método, URL completa, cuerpo, resultado y cantidad de cambios enviados/correctos. Incluye un contador separado `GET colección` para comprobar que Descubrir no consulta una vez por tarjeta ni repite la carga cuando la aplicación deduplica StrictMode. El simulador registra cada request recibido; no oculta peticiones duplicadas.

«Fallar próximo cambio» devuelve 500 una sola vez, sin cambiar el fixture. «Simular duplicado en próximo agregado» hace que el próximo POST válido devuelva 409 y guarda la película en la colección simulada, imitando que otra vista ya la había agregado. Estos controles se reemplazan entre sí: activar uno desactiva el otro. «Vaciar colección», «Fallar carga colección» y «Restablecer datos» reinician el harness con el escenario correspondiente. «Restablecer conexión» habilita nuevamente los GET de colección sin recargar: después se usa el botón Reintentar de la aplicación. «Recargar harness» abre nuevamente la entrada de QA conservando el escenario y la ruta actual.

Los GET normales demoran 250 ms y las mutaciones 650 ms para observar el estado guardando. GET `/coleccion/{id}` devuelve un único objeto de la colección simulada por ID interno o 404 si no existe. Los PATCH/DELETE también buscan el ID interno (40, 30, 20, 10), mientras el POST recibe `id_tmdb`. El simulador valida campos, métodos, JSON, Content-Type y la puntuación nula o entre 1 y 10 en pasos de 0,5. POST responde `{mensaje,id,titulo}`, PATCH devuelve únicamente `{id,campoActualizado}` y DELETE responde 204 sin cuerpo. Duplicados devuelven 409.

Los fixtures se reinician en cada carga del harness, salvo `quick-add-persist`. Vite no incorpora `qa/index.html` al build normal de la aplicación porque no se configuró como entrada de producción.

## Agregado rápido desde tarjetas

`quick-add-checking` demora solo el GET de colección dos segundos, para observar tarjetas navegables con la acción deshabilitada mientras se comprueba la membresía. `quick-add-slow` demora los POST dos segundos para probar altas concurrentes y salir/volver a Descubrir antes de que termine un guardado.

«Simular desconexión en próximo agregado» hace que el siguiente POST rechace con un error de red, sin modificar el fixture. El panel lo registra como «Sin conexión»; el reintento normal puede guardar después.

Desde `frontend/`, ejecutar `npm run dev` y abrir `/qa/index.html?scenario=quick-add`. Confirmar que las cuatro películas de la biblioteca aparecen guardadas y que el contador `GET colección` refleja la carga inicial realizada por la aplicación.

- Agregar Dune desde su tarjeta debe registrar un único POST con `{ "id_tmdb": 693134 }`, mostrar el estado de guardado durante 650 ms y terminar con la película guardada. Si se vuelve a consultar la colección, el GET incluye el registro nuevo; el POST responde únicamente `{mensaje,id,titulo}`.
- Antes de agregar Blade Runner, activar «Fallar próximo cambio». El POST devuelve 500 y no cambia la colección simulada; un nuevo intento puede responder 201.
- En una prueba reiniciada, activar «Simular duplicado en próximo agregado» y agregar Dune. El POST devuelve 409 una sola vez, la colección simulada contiene Dune y la interfaz puede sincronizarla como guardada.
- Abrir `/qa/index.html?scenario=error&page=discover` para fallar la comprobación inicial de colección. El catálogo sigue respondiendo. Activar «Restablecer conexión» y después el reintento de la aplicación: solo entonces la interfaz debe habilitar el agregado si antes no conocía las películas guardadas.

Para probar persistencia sin backend, abrir `/qa/index.html?scenario=quick-add-persist`, agregar Dune (o simular el duplicado 409) y usar «Recargar harness». Dune sigue presente en el GET simulado. El estado de PATCH y DELETE también se conserva dentro de este escenario. **No recargar directamente `/?qa=1` ni `/coleccion?qa=1`**, porque esas rutas abren la entrada normal sin simulación; usar el botón del panel o volver a `/qa/index.html?scenario=quick-add-persist` en la misma pestaña.

Solo `quick-add-persist` lee o escribe la clave exclusiva `muvis.qa.quick-add-persist.v1` de `sessionStorage`; no utiliza `localStorage`, otras claves ni datos reales. El almacenamiento se valida contra las películas de prueba y sus campos de colección. «Restablecer datos» dentro de ese escenario borra la clave y vuelve a las cuatro películas iniciales, conservando el escenario. Los otros escenarios no leen ni modifican esa clave. Si el navegador bloquea `sessionStorage`, el panel lo indica y el harness sigue funcionando sin persistencia.

## Autenticación aislada

Las cuentas, sesiones y protección CSRF de esta sección son fixtures en memoria. El harness no crea usuarios reales ni establece cookies, y no escribe autenticación en `localStorage`, `sessionStorage` o archivos. Solo el escenario anterior `quick-add-persist` conserva datos de películas de la cuenta de prueba principal, sin información de autenticación.

| URL del harness | Estado inicial |
| --- | --- |
| `/qa/index.html?scenario=auth-anonymous` | Anónimo; abre `/coleccion`, para verificar que la UI dirige a login. |
| `/qa/index.html?scenario=auth-login` | Anónimo; abre `/login`. |
| `/qa/index.html?scenario=auth-session` | Cuenta principal autenticada, con la colección habitual de cuatro películas. |
| `/qa/index.html?scenario=auth-session-alt` | Segunda cuenta autenticada, solo Dune pendiente (ID interno 70). |
| `/qa/index.html?scenario=auth-error` | `/usuarios/me` devuelve 500; «Restablecer conexión» permite reintentar la recuperación de sesión. |
| `/qa/index.html?scenario=auth-expired` | El bootstrap `/usuarios/me` responde; la próxima petición personal distinta de `/me` expira la sesión y devuelve 401. |
| `/qa/index.html?scenario=auth-forbidden` | Cuenta autenticada; la próxima escritura personal o logout devuelve 403 una sola vez, sin cambiar datos. |

Se puede añadir `&page=/login`, `&page=/registro`, `&page=/coleccion/40` o las otras rutas previamente admitidas. Las cuentas iniciales son **cine@muvis.test** y **otra@muvis.test**; la clave sintética de ambas es **MuvisQA-prueba2026**. Son valores exclusivos de prueba, no credenciales de personas ni del backend. Cualquier otra clave devuelve 401. Cada cuenta tiene su propia colección; por ejemplo, `/coleccion/40` devuelve 404 para la segunda cuenta.

El registro exige exactamente `nombre_usuario`, `email` y `password`, usuario ASCII de 3–30 caracteres y clave de 12–128. Responde 201 con los campos públicos, **sin iniciar sesión automáticamente**. Los duplicados devuelven 409. Después de verificar su correo, se puede iniciar sesión con esa nueva cuenta y clave dentro de la misma ejecución del harness; su colección empieza vacía. Para comparar claves se conserva solo un resumen SHA-256 de fixture en memoria, nunca la contraseña en claro. Esto sirve para la simulación; no representa ni recomienda el almacenamiento de contraseñas de producción.

El cliente debe enviar `credentials: "include"` en todas las peticiones de API; de lo contrario el harness devuelve 400. `GET /usuarios/me` responde usuario o 401; `GET /usuarios/csrf` entrega un string sintético asociado a la revisión de la sesión. Las mutaciones de colección y `POST /usuarios/logout` exigen sesión y `X-CSRF-Token` válido; faltante/inválido devuelve 403. Logout responde 204 y elimina la sesión simulada. No se simulan atributos de cookie, CORS del navegador ni la firma HMAC real del backend.

## Verificación de correo aislada

Las cuentas iniciales `cine@muvis.test` y `otra@muvis.test` están verificadas. La cuenta adicional **pendiente@muvis.test**, nombre `pendiente_qa`, usa la misma contraseña sintética de QA y comienza sin verificar. Ninguno de estos registros existe por efecto del harness en PostgreSQL.

| Escenario | Inicio y comportamiento |
| --- | --- |
| `auth-pending` | Sesión anónima, login con el correo pendiente precargado. Con credenciales correctas responde `403` y `detail.codigo = EMAIL_NO_VERIFICADO`. |
| `auth-pending-session` | Sesión anterior sin verificar; `/usuarios/me`, CSRF y logout disponibles, colección bloqueada con `403 EMAIL_NO_VERIFICADO`. |
| `auth-verification` | Abre `/verificar-email` con el correo pendiente en el estado de navegación; sesión anónima. |
| `auth-verification-network` | Igual, pero la primera solicitud de verificación o reenvío simula un fallo de red. |
| `auth-verification-rate` | Igual, pero la primera solicitud de verificación o reenvío devuelve `429` y `Retry-After: 60`. |

También se admite `&page=/verificar-email`. La navegación inicial de React recibe el correo del fixture a través de su estado, no de parámetros con credenciales. Recargar desde el panel vuelve a la entrada aislada. No recargar manualmente una ruta de producto si se pretende mantener la simulación.

**Código sintético inicial de QA: `042731`.** Conserva el cero inicial para comprobar escritura, pegado y autocompletado de seis dígitos. No es un código real ni se muestra en la interfaz o en los registros. El primer reenvío que efectivamente emite otro código cambia el fixture a **`581204`**; emisiones posteriores alternan ambos valores. Esta secuencia determinista sirve para comprobar el rechazo del código anterior. No representa la generación aleatoria del servidor.

El registro ahora devuelve `email_verificado: false`, crea un código inicial en memoria y nunca inicia sesión. Para completar el flujo: registrar una dirección sintética distinta, ingresar el código inicial, verificar, volver al login e ingresar con esa cuenta. Su colección comienza vacía.

`POST /usuarios/verificar-email` exige email y código de seis dígitos ASCII, preserva ceros iniciales, rechaza registros vencidos o agotados con el mensaje genérico `Código inválido o vencido`, cuenta cinco intentos incorrectos y consume el código al acertar. No crea sesión. El simulador aplica diez solicitudes de verificación por minuto.

`POST /usuarios/reenviar-verificacion` admite únicamente email y responde `202` genérico para direcciones inexistentes, verificadas, en espera o que admiten un envío. Cambia el código únicamente cuando pasan 60 segundos desde la última emisión; reinicia sus cinco intentos y diez minutos de vigencia. Los límites de solicitudes simulados son tres por minuto y diez por hora para la IP de la pestaña, y cinco por hora por dirección (incluidas las inexistentes). Los errores `429` incluyen un `Retry-After` sintético. Esto no prueba contadores compartidos, concurrencia, SMTP ni recepción real.

Controles adicionales del panel: **Desconectar próxima verificación**, **Limitar próxima verificación**, **Vencer códigos simulados**, **Agotar intentos simulados** y **Habilitar reenvío simulado**. El último modifica únicamente las fechas y contadores de QA para no esperar un minuto entre pruebas; no cambia el código actual ni demuestra que la aplicación real pueda eludir las restricciones del backend. Los cuerpos de todas las solicitudes `/usuarios/*` siguen omitidos en el panel.

Los cuerpos enviados a `/usuarios/*` se guardan en el panel como **`[omitido]`**; tampoco se registran query strings de esas rutas, headers ni respuestas con el token. El contador **GET CSRF** muestra cuántas consultas se hicieron, sin valores de seguridad. El código del harness no imprime credenciales ni tokens en consola.

Controles nuevos del panel:

- **Expirar sesión simulada** elimina la sesión del fixture; la siguiente petición personal responde 401 y permite observar la reacción de la aplicación. No borra las películas.
- **Rechazar próximo cambio por CSRF** devuelve 403 una vez en la siguiente escritura personal o logout; no repite ni modifica la operación. Un reintento explícito puede volver a pedir CSRF y guardar.
- **Cambiar cuenta de fixture** reinicia el harness con la otra cuenta y la misma ruta, para comparar bibliotecas. Reinicia fixtures en memoria y no prueba por sí solo un cambio de cuenta con request pendiente; para eso usar logout/login desde la UI durante un cambio demorado.
- **Probar sesión anónima** y **Probar formulario login** abren los escenarios correspondientes.
- **Restablecer conexión** también habilita nuevamente `/usuarios/me` tras `auth-error`; después se pulsa el reintento de sesión de la aplicación.

Verificar en UI: login correcto/incorrecto; registro válido, duplicado y sin autologin; protección de `/coleccion` y detalle; recuperar la sesión al montar la app; expiración 401; 403 sin reenvío automático; logout 204; y ausencia de notas/favoritos/estados de la cuenta anterior al iniciar sesión con la segunda. En `quick-add-slow`, un POST tarda dos segundos para probar salida de la vista y cambio de sesión. Las mutaciones de todas las pruebas siguen siendo simuladas.

## Detalle personal de colección

Abrir `/qa/index.html?scenario=personal-detail` o `/qa/index.html?scenario=normal&page=/coleccion/40`. El GET `/coleccion/40` devuelve exclusivamente los campos de colección disponibles: `id`, `id_tmdb`, `titulo`, `anio`, `poster`, `estado`, `favorita` y `puntuacion_personal`. No inventa puntuación pública ni fecha de incorporación. El GET de metadatos `/catalogo/peliculas/329865` responde por separado con el fixture de La llegada. El contador `GET individual` permite distinguirlo de las cargas de la lista completa.

| Ruta inicial | Película y estado de prueba |
| --- | --- |
| `&page=/coleccion/40` | La llegada: vista, favorita, nota 9 |
| `&page=/coleccion/30` | Interstellar: vista, favorita, nota 10 |
| `&page=/coleccion/20` | El gran hotel Budapest: vista, no favorita, nota 8 |
| `&page=/coleccion/10` | Vidas pasadas: pendiente, no favorita, sin puntuar |
| `&page=/coleccion/329865` | 404: es un ID de TMDB, no un ID interno |

En el detalle personal, cambiar vista/pendiente debe enviar PATCH al ID interno sin sufijo, cambiar favorita al sufijo `/favorita` y confirmar o quitar puntuación al sufijo `/puntuacion`. Mover el slider o cancelar su diálogo no debe enviar cambios; quitar la nota envía `null`. Los cambios se reflejan también al volver a Mi colección dentro de la misma sesión del harness. La eliminación exige la confirmación de la aplicación; después de un DELETE correcto, GET al mismo ID devuelve 404. Cancelar no modifica el fixture.

«Fallar próximo cambio» permite verificar por separado los errores y reintentos de estado, favorita, puntuación o eliminación: solo falla el siguiente POST/PATCH/DELETE y los datos anteriores se conservan. Las siguientes operaciones pueden guardar normalmente. Para verificar errores de lectura, usar `personal-load-error` o `personal-metadata-error`; «Restablecer conexión» desactiva ambos fallos y el de lista, y después se pulsa Reintentar en la aplicación. `personal-loading` conserva ocho segundos de demora en cada GET individual del escenario.

El panel incluye accesos a detalle personal, error de metadatos, error individual, carga individual lenta y registro inexistente. Estos accesos reinician fixtures y abren la entrada de QA correspondiente. Todos los endpoints API quedan interceptados; ninguna de estas pruebas modifica ni consulta datos reales.

## Búsqueda de Descubrir

Desde `frontend/`, ejecutar `npm run dev` y abrir `/qa/index.html?scenario=normal&page=discover`. El harness intercepta `GET http://127.0.0.1:8000/catalogo/buscar?titulo=...` antes de cargar la aplicación. Devuelve un **array plano** de objetos de catálogo (`id_tmdb`, `titulo`, `anio`, `puntuacion`, `poster`) con `generos` como array de textos. No utiliza ni modifica datos reales ni reenvía esta petición al backend.

| Texto escrito | Respuesta simulada | Demora desde la petición |
| --- | --- | --- |
| `normal` o `prueba` | Seis resultados, con géneros variados | 250 ms |
| `sinresultados` | Array vacío | 250 ms |
| `error` | HTTP 500 | 250 ms |
| `lenta` | La llegada | 1200 ms |
| `rapida` o `rápida` | Interstellar | 150 ms |
| Cualquier otro título | Coincidencias entre los títulos de la muestra, ignorando acentos y mayúsculas | 250 ms |

El escenario `edge` conserva su séptima película de catálogo para pruebas de títulos largos. `loading` demora los GET normales ocho segundos; las consultas especiales `lenta` y `rapida` siempre conservan sus tiempos de 1200/150 ms.

Para verificar debounce, escribir varios caracteres seguidos y contar las solicitudes de `/catalogo/buscar` en el panel: la interfaz debe enviar únicamente la consulta final cuando termina la espera. El registro incluye el inicio y la duración en milisegundos de cada request, además de los títulos devueltos, para distinguir solicitudes de respuestas visibles.

Para probar respuestas fuera de orden, buscar `lenta`, esperar a que su request figure «En curso» y reemplazar el texto por `rapida`. La respuesta de Interstellar llega antes que la de La llegada; la interfaz debe seguir mostrando la búsqueda más reciente cuando finalicen ambas. Probar también limpiar el texto mientras `lenta` está pendiente: su respuesta no debe restaurar resultados de una consulta ya borrada. Estos pasos requieren que la lógica de debounce/cancelación esté implementada en la aplicación; el harness solo aporta respuestas deterministas.

Comprobación del harness: `npm exec oxlint -- qa/main.jsx`. No se agregaron dependencias ni entradas al build de producción. Las comprobaciones con backend real se realizan fuera de este harness; el simulador no reenvía ninguna petición de API.
