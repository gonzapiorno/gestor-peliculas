# Buscador completo de Muvis — 17 de octubre de 2026

Descubrir conserva su diseño y su cuadrícula de pósters. El buscador ahora consulta el catálogo completo mediante `buscarPeliculas(titulo)`, reutilizando sin cambios la función existente de `src/services/catalogoApi.js`.

## Comportamiento

- Con el campo vacío o con un solo carácter se muestran los populares ya cargados. Se necesitan al menos dos caracteres, sin contar espacios en los extremos.
- Cada edición espera 350 ms antes de consultar `GET /catalogo/buscar?titulo=...`. Escribir de nuevo cancela el temporizador anterior.
- El panel muestra hasta cinco sugerencias, con póster pequeño, título, año y los primeros dos géneros disponibles. Los datos ausentes tienen un reemplazo explícito.
- Las flechas recorren las sugerencias; Enter abre la seleccionada por `id_tmdb`. Enter sin selección y el botón «Ver los N resultados» cierran el panel y enfocan la cuadrícula con todos los resultados recibidos.
- Escape, salir del formulario con el foco y hacer clic afuera cierran el panel. Su cierre no borra la consulta ni los resultados. Tab permite acceder a Limpiar, Reintentar y Ver resultados.
- Se presentan estados de carga, vacío y error con reintento, tanto en el panel como en la cuadrícula.
- Cambiar o limpiar la consulta invalida inmediatamente las peticiones anteriores. La revisión de consulta y la generación de petición impiden que un éxito o error antiguo cambie resultados vigentes, incluso en una secuencia A → B → A. Las respuestas tardías tampoco reabren un panel cerrado.
- El panel adapta su altura al espacio disponible, tiene desplazamiento interno y no aplica el efecto de hover durante un gesto táctil.

No se agregó paginación: se muestran todos los elementos del array que devuelve actualmente el endpoint, correspondiente a su primera página. React no consulta directamente la API de TMDB ni recibe su token.

## Archivos de aplicación

- Modificados: `src/pages/DiscoverPage.jsx` y `DiscoverPage.css`, para integrar el buscador y alternar populares/resultados sin reemplazar la cuadrícula existente.
- Creados: `src/components/movies/MovieSearch.jsx` y `MovieSearch.css`, para el desplegable, las sugerencias, la navegación y los estilos responsive.
- Creado: `src/hooks/useMovieSearch.js`, para el debounce y la protección frente a respuestas antiguas.

El servicio `catalogoApi.js` se reutilizó intacto. No cambiaron los componentes, servicios o interacciones de la colección ni las rutas de detalle. No se instalaron dependencias.

## Comprobaciones

- `npm run build`: correcto.
- `npm run lint`: correcto, sin advertencias.
- 28 comprobaciones de interfaz aprobadas. Resultados detallados en `qa/buscador-resultados.json`.
- Integración real comprobada en el navegador contra FastAPI: Interstellar devolvió 20 películas, se mostraron cinco sugerencias y 20 tarjetas, y la selección abrió `/pelicula/157336`. Se comprobó además una película real sin año ni póster.
- Los casos de debounce, errores y respuestas fuera de orden se verificaron con respuestas controladas en el harness aislado. Se extendieron `qa/main.jsx` y `qa/README.md` para esos escenarios; sus datos no se importan desde la entrada de producción.
- Responsive comprobado con datos reales a 1440, 768, 390 y 320 px: sin desbordamiento horizontal, con el panel dentro del alto disponible.
- Capturas reales: `qa/screenshots/buscador-real-1440.jpg` y `buscador-real-390.jpg`.

No quedó pendiente ninguna implementación solicitada. Las comprobaciones responsive se realizaron en el navegador con distintos tamaños de viewport.

## Alcance preservado

Todos los archivos modificados o creados en esta tarea están dentro de `frontend/`. No se modificó ningún archivo fuera de ese directorio. El cambio preexistente en `app/services/tmdb.py` quedó intacto, al igual que la función de búsqueda que el usuario había añadido a `catalogoApi.js`. No se modificaron PostgreSQL, Docker, variables de entorno ni contratos. No se realizaron commits ni push.
