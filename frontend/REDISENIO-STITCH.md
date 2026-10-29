# Muvis — Informe del rediseño inspirado en Stitch

**Actualización de esta iteración:** la película destacada fue retirada y se compactaron Comunidad, Cuenta y Colección. El estado actual, los archivos, las pruebas y las limitaciones se detallan en [PULIDO-UI-UX.md](PULIDO-UI-UX.md). El resto de este documento conserva el registro de la primera etapa.

Informe actualizado el 29 de octubre de 2026. Rama: `feat/redisenio-muvis`.

La implementación del rediseño está guardada. Build, lint y 27 tests pasan. Se realizaron pruebas visuales y funcionales con un entorno aislado; quedaron comprobaciones visuales finales pendientes tras la interrupción. No se comprobó la integración con el backend real, que no estaba disponible durante la prueba.

## 1. Cambios visuales

- Paleta centralizada: verde principal `#D8E8A4`, secundario `#A8C590`, amarillo `#F4D06F` y fondo `#101210`.
- Tipografía Plus Jakarta Sans alojada dentro del frontend, con licencia OFL incluida. No depende de Google Fonts durante el uso.
- Superficies oscuras, botones sólidos redondeados, filtros en cápsula, indicadores de foco y adaptación a movimiento reducido.
- Identidad Muvis BETA en la navegación.
- Descubrir conserva la cuadrícula de pósteres e incorpora una cabecera destacada basada en una película real del catálogo recibido. No presenta una selección editorial ficticia.
- Mi colección, detalles del catálogo, detalle personal, login y registro comparten la nueva identidad.

## 2. Archivos creados y modificados

Todas las rutas siguientes son relativas a `frontend/`. Los pares JSX/CSS se indican juntos.

### Archivos nuevos de la aplicación

- `src/components/layout/AppLayout.jsx` y `AppLayout.css`.
- `src/components/movies/FeaturedMovie.jsx` y `FeaturedMovie.css`.
- `src/components/movies/GlobalSearch.jsx` y `GlobalSearch.css`.
- `src/components/movies/MovieListItem.jsx` y `MovieListItem.css`.
- `src/components/movies/StatsCard.jsx` y `StatsCard.css`.
- `src/components/movies/ViewModeToggle.jsx` y `ViewModeToggle.css`.
- `src/components/movies/collectionStatistics.js`.
- `src/components/ui/FeedbackPanel.jsx` y `FeedbackPanel.css`.
- `src/hooks/useMovieMetadata.js` y `movieMetadataCache.js`.
- `src/utils/catalogSearchCache.js`.
- `src/pages/AccountPage.jsx` y `AccountPage.css`.
- `src/pages/CommunityPage.jsx` y `CommunityPage.css`.
- `public/fonts/PlusJakartaSans-Variable.ttf` y `OFL.txt`.

### Archivos existentes modificados

- `index.html`, `package.json`, `src/App.jsx`, `src/index.css`.
- `src/components/layout/Header.jsx`, `Header.css` y `Footer.css`.
- `src/components/movies/CatalogMovieCard.jsx`, `CatalogMovieCard.css` y `CatalogMovieGrid.css`.
- `src/components/movies/MovieCard.jsx`, `MovieCard.css`, `MovieGrid.jsx`, `MovieGrid.css` y `MovieSearch.jsx`.
- `src/components/ui/Dialog.css`, `Icon.jsx`, `PageState.css` y `Poster.jsx`.
- `src/hooks/useMovieSearch.js`.
- `src/pages/CollectionPage.jsx`, `CollectionPage.css`, `DiscoverPage.jsx` y `DiscoverPage.css`.
- `src/pages/AuthPage.css`, `MovieDetailPage.css` y `CollectionMovieDetailPage.css`.

### Verificación y documentación

- Se agregaron `qa/catalog-search.test.mjs` y `qa/collection-metadata.test.mjs`.
- Se ajustó el entorno aislado existente en `qa/main.jsx` para las pruebas móviles y las recargas durante desarrollo.
- Se guardaron capturas en `qa/screenshots/`. La captura `stitch-descubrir-desktop.jpg` es válida. La captura `stitch-descubrir-movil.jpg` quedó defectuosa y necesita repetirse; no debe usarse para evaluar el resultado móvil.
- Este informe: `REDISENIO-STITCH.md`.

La carpeta `qa/` ya existía al comenzar esta etapa; sus archivos anteriores no son todos entregables nuevos del rediseño.

## 3. Componentes implementados y reutilizados

`AppLayout` organiza sidebar, cabecera y navegación móvil. `GlobalSearch` incorpora el buscador existente a todas las secciones principales. `FeaturedMovie` presenta la película destacada. `MovieListItem`, `ViewModeToggle` y `StatsCard` permiten explorar la colección de dos maneras y consultar estadísticas.

Se reutilizaron los servicios HTTP, los componentes de búsqueda, los diálogos, el selector de puntuación, los pósteres y las acciones existentes de la colección. La página Cuenta reutiliza el manejo de sesión y cierre de sesión de la cabecera.

## 4. Funcionalidades conservadas

- Registro, login, recuperación de usuario, sesión y cierre de sesión.
- Protección de rutas privadas, cookies y mecanismo CSRF existente.
- Descubrimiento, búsqueda, detalle del catálogo y agregado rápido.
- Detalle personal por identificador interno de colección.
- Vista/Pendiente, favoritos, puntuaciones, eliminación con confirmación y filtros.
- Distinción entre puntuación pública TMDB y puntuación personal.

No se reescribieron los servicios de autenticación ni los contratos de la API. Los tests y las pruebas aisladas respaldan los flujos descritos; no sustituyen una verificación con el servidor real.

## 5. Mejoras de experiencia y rendimiento

- Búsqueda global por título con espera de aproximadamente 350 ms, sugerencias, teclado, errores y protección frente a respuestas antiguas. Conserva el acceso a todos los resultados recibidos en Descubrir, sin inventar paginación.
- Atajo Ctrl+K o Cmd+K para enfocar el buscador.
- Filtro local de Mi colección separado de la búsqueda del catálogo.
- Filtros con contadores calculados a partir de la colección recibida.
- Alternancia lista/cuadrícula; únicamente la preferencia de presentación se guarda localmente.
- Estadísticas calculadas: total, vistas, favoritas y promedio de puntuaciones personales válidas. Sin puntuaciones válidas, el promedio queda ausente.
- La vista lista carga géneros, duración y sinopsis cuando las filas se acercan al área visible. Limita las solicitudes simultáneas a tres y comparte metadatos públicos en memoria, con vencimiento de 15 minutos y descarte de entradas no utilizadas.
- La búsqueda comparte solicitudes y resultados públicos recientes entre cabecera y página, con vencimiento de 30 segundos y límite de 20 búsquedas.
- Pósteres con tamaños responsivos y carga diferida donde corresponde. No se agregaron dependencias nuevas.

## 6. Versión móvil

Se implementó navegación inferior con Descubrir, Mi colección, Comunidad y Cuenta, con espacio reservado y consideración del área segura del dispositivo. El buscador continúa visible y el acceso a feedback está en Cuenta.

Se inspeccionaron anchos de 360, 390 y 768 px: no se detectó desbordamiento horizontal de la página. Se probaron navegación móvil, lista, búsqueda, Cuenta y feedback en el entorno aislado. Se ajustaron las acciones de lista y los tamaños táctiles.

Pendiente: repetir las capturas finales móviles y completar las últimas comprobaciones de geometría del desplegable y del filtro de puntuación por teclado. No se certificó una revisión exhaustiva en dispositivos físicos ni con el teclado virtual abierto.

## 7. Versión escritorio

Se implementó sidebar simplificada, cabecera con buscador global, cabecera destacada compacta y cuadrículas adaptables. Se inspeccionaron 1024 y 1440 px, sin desbordamiento horizontal. La fuente se verificó cargada en los cinco anchos probados.

La captura de Descubrir en escritorio está disponible en `qa/screenshots/stitch-descubrir-desktop.jpg`. La captura de colección de escritorio se tomó antes de los últimos ajustes de compactación y tipografía.

## 8. Comprobaciones realizadas

Reejecutadas al preparar este informe:

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | Correcto; 89 módulos transformados |
| `npm run lint` | Correcto |
| `npm test` | 27 aprobados, 0 fallos |
| `git diff --check -- frontend` | Sin errores |
| Diferencias de archivos versionados fuera de `frontend/` | Ninguna |

Los tests cubren 15 casos del cliente de autenticación/CSRF, cuatro de caché de búsqueda y ocho de metadatos/estadísticas de colección.

Durante la implementación se probaron en navegador, con respuestas y datos aislados:

- Búsqueda desde colección, cinco sugerencias y cuadrícula con todos los resultados recibidos.
- Una sola petición compartida entre buscador y resultados.
- Escritura rápida: una respuesta lenta anterior no sustituyó la búsqueda más reciente.
- Selección mediante flechas y Enter; cierre mediante Escape; búsqueda vacía de resultados y error con reintento.
- Cambio Vista/Pendiente, favoritos, modificación y eliminación de puntuación.
- Cancelación y confirmación de eliminación, exclusivamente sobre datos aislados.
- Agregado rápido con teclado y sincronización entre tarjeta y cabecera destacada.
- Alternancia lista/cuadrícula, persistencia de la preferencia y carga progresiva de metadatos.
- Cierre de sesión, protección de colección y reingreso con cuentas sintéticas.
- Comunidad y feedback: envío deshabilitado y ausencia de peticiones de escritura del formulario.

El backend local rechazaba la conexión durante la comprobación. No se verificaron el login, las búsquedas ni las escrituras contra PostgreSQL o TMDB mediante el servidor real. No se eliminaron ni modificaron películas reales de tu colección.

## 9. Límites e integración pendiente

**Feedback:** la interfaz informa que todavía no envía ni guarda mensajes. El texto se descarta al cerrar. No se inventó un endpoint ni se conectó un servicio externo. Para habilitarlo, habría que acordar e implementar en FastAPI un endpoint autenticado de recepción, validación del tipo y longitud, almacenamiento, protección CSRF, límites de uso y respuestas de éxito/error; después conectarlo desde el frontend y probarlo.

**Comunidad:** presenta únicamente información de próximas funciones, sin fechas, suscripciones ni acciones sociales falsas.

**Catálogo:** la búsqueda sigue limitada a título y a los resultados que entrega el endpoint existente. La cabecera destacada utiliza los recursos disponibles; no se agregó un contrato de imágenes panorámicas ni filtros sin soporte del backend.

**Cierre de QA:** faltan las últimas revisiones visuales indicadas y la integración con el backend disponible. La interrupción impidió completar ese cierre; este informe no presenta el rediseño como validado íntegramente de extremo a extremo.

## 10. Recomendaciones opcionales

1. Revisar visualmente el diseño y repetir las capturas móviles pendientes.
2. Con el backend activo, verificar sesión, búsqueda y lectura de colección con tu entorno real. Para pruebas que escriban datos, usar una cuenta de prueba o solicitar autorización.
3. Definir el contrato de feedback antes de habilitar su botón de envío.
4. Evaluar imágenes panorámicas y funciones sociales sólo cuando el backend ofrezca los datos y permisos correspondientes.

## Alcance respetado

Todos los cambios realizados en esta etapa están dentro de `frontend/`. No se modificaron backend, PostgreSQL, Docker, migraciones ni variables de entorno. Los elementos no versionados `motivacion/motivacionFutura.png` y `tmp/` ya estaban presentes al comenzar y no forman parte de este trabajo.

No se realizaron commits, push ni fusiones. Los cambios quedan guardados para tu revisión en `feat/redisenio-muvis`.
