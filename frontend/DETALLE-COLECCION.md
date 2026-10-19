# Detalle personal de Mi colección

Implementación y comprobaciones del 19 de octubre de 2026.

## Funcionamiento

La ruta `/coleccion/:id` utiliza el identificador interno guardado en PostgreSQL. Los enlaces de póster y título de Mi colección apuntan a ella. Descubrir conserva `/pelicula/:id_tmdb` y su detalle del catálogo.

La página consulta primero `GET /coleccion/{id}` mediante `obtenerPeliculaColeccion`. Después consulta `GET /catalogo/peliculas/{id_tmdb}` para completar géneros, duración, sinopsis y puntuación pública. Un fallo de esta segunda consulta permite seguir viendo y administrando los datos guardados; se ofrece reintentar la información. Un ID inexistente o inválido muestra un estado 404 y permite volver al listado.

El panel «Tu colección» ofrece un interruptor accesible «Ya la vi», el selector de puntuación existente, un corazón de favorita y una acción discreta de eliminación confirmada. Las operaciones usan siempre el ID interno, bloquean envíos simultáneos y actualizan los datos visibles después de la confirmación del servidor. Los errores mantienen los valores anteriores y permiten reintentar. Marcar como vista no solicita una puntuación.

Cada ID tiene un ciclo de carga independiente; las respuestas tardías no cambian otra película. Si un guardado termina después de volver al listado, un evento local actualiza la colección visible. También se sincroniza la membresía de Descubrir si esa vista está abierta cuando termina una operación.

## Archivos de la aplicación

| Archivo | Cambio |
| --- | --- |
| `src/pages/CollectionMovieDetailPage.jsx` | Nueva página, cargas independientes y gestión personal. |
| `src/pages/CollectionMovieDetailPage.css` | Panel personal y adaptación a celulares. |
| `src/App.jsx` | Ruta personal con React Router existente. |
| `src/components/movies/MovieCard.jsx` | Póster y título enlazan al ID interno. |
| `src/services/coleccionApi.js` | Nuevo GET individual, conservando el estado HTTP de los errores. |
| `src/utils/collectionEvents.js` | Aviso local tras completar una operación personal. |
| `src/pages/CollectionPage.jsx` | Actualización del listado ante ese aviso, conservando filtros. |
| `src/hooks/useCatalogCollection.js` | Actualización de membresía ante ese aviso. |

Se reutilizan `MovieDetailPage.css`, `Poster`, `Icon`, `PageState`, `RatingDialog`, `Dialog`, los estilos globales y todos los métodos existentes de actualización y eliminación. No se agregaron dependencias ni se cambió el contrato de la API.

## Comprobaciones

- `npm run build`: correcto.
- `npm run lint`: correcto.
- Navegación personal con ID interno, navegación del catálogo conservada y recarga de enlaces directos.
- Vista/Pendiente en ambas direcciones, con clic y teclado, sin actualización optimista y con bloqueo durante la operación.
- Puntuación con teclado: 1, 9,5 y 10; eliminación de la nota mediante `null`. La puntuación personal queda separada de la pública y no obliga a cambiar el estado.
- Favorita en ambas direcciones, errores HTTP 500 y reintentos sin alterar el dato anterior.
- Eliminación cancelada con Escape sin enviar DELETE; eliminación fallida mantiene la página y el diálogo; reintento correcto vuelve al listado.
- GET individual fallido con recuperación; metadatos TMDB fallidos con gestión personal disponible y recuperación; ID inexistente e ID no numérico.
- Guardado pendiente al volver al listado: la respuesta inicial anterior al PATCH no deja la tarjeta desactualizada.
- Carga lenta de ocho segundos y cambio de película antes de terminar: la respuesta anterior no reemplaza la nueva página.
- Regresión de búsqueda y filtro de vistas en Mi colección.
- 320 y 390 píxeles sin desbordamiento horizontal; controles principales de 44 píxeles; diálogo accesible con foco inicial, Escape y retorno al control. Título largo, año nulo y póster roto usan los estados existentes.

El harness aislado en `qa/main.jsx` y sus instrucciones en `qa/README.md` incorporan GET individual y escenarios personales. Intercepta la API antes de cargar React y nunca reenvía esas peticiones al backend. Sus datos simulados no se importan desde la entrada de producción. Los resultados y registros están en `qa/detalle-coleccion-resultados.json`; las capturas se guardan en `qa/screenshots/detalle-coleccion-*.jpg`.

## Backend real y alcance

Se verificaron únicamente lecturas reales: detalle de Ex Machina (ID interno 12, TMDB 264660), navegación desde Mi colección, recarga, metadatos y respuesta 404 de un ID inexistente. La página real no produjo errores de consola durante esta comprobación.

Las escrituras y eliminaciones se verificaron en el harness aislado. No se envió POST, PATCH ni DELETE a la colección real; su comprobación persistente queda reservada a una prueba autorizada por el usuario.

Todos los archivos creados o modificados para esta tarea están dentro de `frontend/`. El cambio preexistente del usuario en `app/api/routes/coleccion.py` se conservó intacto. No se modificaron variables de entorno, PostgreSQL, Docker ni configuración externa. No se hizo commit ni push.
