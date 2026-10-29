# Muvis — Retoques de UI/UX

29 de octubre de 2026 · rama feat/redisenio-muvis.

Se trabajó sobre el rediseño existente y se conservaron sus cambios previos. Todas las escrituras del proyecto de esta etapa están dentro de frontend/. No se realizaron commits, push ni merge; no se modificaron backend, datos, servicios de autenticación ni contratos HTTP.

## Cambios

- Descubrir presenta el catálogo directamente. Se retiraron la importación y el uso de FeaturedMovie; sus componentes reutilizables se conservan fuera del build activo. No se agregaron recomendaciones ficticias.
- Comunidad resume las funciones futuras en una tarjeta compacta, con encabezado breve y acceso a Descubrir. Su ancho máximo de 800 px y márgenes automáticos equilibran el área de escritorio.
- Mi cuenta presenta el nombre real junto al avatar, email, cierre de sesión y feedback. El nombre conserva una etiqueta accesible. Se omiten textos duplicados mediante una prop de presentación; la lógica de sesión permanece igual. El texto de feedback indica que el envío todavía no está disponible.
- Comunidad y Cuenta usan una atribución de TMDB desplegable nativa. El texto legal íntegro y el enlace continúan disponibles; al expandirse, el contenido puede desplazarse normalmente.
- Mi colección conserva widgets, filtros, contadores, buscador y modos de vista. Se redujeron márgenes y rellenos; «Películas vistas» ahora aclara «Marcadas como vistas».
- Las sinopsis de lista se limitan a tres líneas con line-clamp y 3lh para respetar el interlineado. La sinopsis original y el detalle, la carga progresiva y la caché se conservan. Se aumentaron controles de lista a 44 px y algunos textos secundarios.
- El buscador móvil usa texto de 16 px y limita su menú al espacio real disponible. Reacciona al desplazamiento del viewport visual; las flechas desplazan solamente el menú y conservan la selección y Enter/Escape.
- La barra inferior conserva su estructura. Las etiquetas pueden envolver y «Pronto» queda dentro de su celda. El contenido reserva la altura real de la barra mediante ResizeObserver, incluyendo áreas seguras y cambios de tamaño. Hay un valor CSS de respaldo. Ambas entradas HTML habilitan viewport-fit=cover.

## Archivos de esta etapa

Rutas relativas a frontend/:

- index.html.
- src/pages/DiscoverPage.jsx.
- src/pages/CommunityPage.jsx y CommunityPage.css.
- src/pages/AccountPage.jsx y AccountPage.css.
- src/pages/CollectionPage.jsx y CollectionPage.css.
- src/components/layout/Header.jsx, Footer.jsx, Footer.css, AppLayout.jsx y AppLayout.css.
- src/components/movies/StatsCard.css, MovieListItem.css, MovieSearch.jsx y GlobalSearch.css.
- qa/index.html y qa/main.jsx: acceso directo a Cuenta/Comunidad y parámetro capture=1 para ocultar únicamente el panel de pruebas.
- REDISENIO-STITCH.md y este informe.

## Pruebas

| Comprobación final | Resultado |
| --- | --- |
| npm run build | Correcto, 87 módulos |
| npm run lint | Correcto |
| npm test | 27 aprobados, 0 fallos |
| Diferencias versionadas fuera de frontend/ | Ninguna |

Los 27 tests existentes cubren autenticación/cookies/CSRF, búsqueda/caché y metadatos/estadísticas. No se agregaron tests que repliquen el CSS.

Se utilizó el harness aislado existente: intercepta la API con fixtures y no reenvía peticiones al backend. En el navegador se comprobaron geometría, contenido accesible y navegación de Comunidad y Cuenta:

| Viewport CSS | Comunidad | Mi cuenta | Desbordamiento horizontal |
| --- | --- | --- | --- |
| 360 × 800 | Sin scroll de página | Sin scroll de página | Ninguno |
| 390 × 844 | Sin scroll de página | Sin scroll de página | Ninguno |
| 768 × 1024 | Sin scroll de página | Sin scroll de página | Ninguno |
| 1024 × 768 | Sin scroll de página | Sin scroll de página | Ninguno |
| 1440 × 1000 | Sin scroll de página | Sin scroll de página | Ninguno |

En 390 × 844, la tarjeta de Comunidad termina aproximadamente en y=551 y el bloque de feedback de Cuenta en y=626; la barra inferior comienza aproximadamente en y=772. El footer cerrado también queda visible. Se inspeccionó visualmente Comunidad en móvil. El navegador requirió compensar la escala de Windows para obtener las dimensiones CSS indicadas; se midieron desde el documento.

Buscador: cinco sugerencias y acceso a los seis resultados de prueba. En 390 × 844, el menú terminaba en y≈650, por encima de la navegación. En 390 × 380, terminaba en y≈296, con la navegación desde y≈308. Al recorrer las cinco opciones con flechas, la quinta permaneció visible, el menú se desplazó y la página mantuvo scrollY=0. Enter navegó al detalle. No se contactó al backend real.

## Límites y revisión pendiente

- No se verificó integración real de login, TMDB o colección contra el backend. Los datos de las comprobaciones fueron simulados.
- La revisión visual quedó parcial: la captura integrada produjo escalas inconsistentes y el control del navegador local se detuvo porque no pudo verificar su URL con suficiente confianza. No se guardaron capturas nuevas que puedan confundirse con evidencia final fiable.
- Queda revisar visualmente toda la colección, su lista, títulos largos y los detalles en móvil/escritorio, además de Cuenta anónima y los diálogos. Su implementación fue revisada estáticamente y pasa build/lint/tests.
- No se probaron un teclado virtual real, el notch de un dispositivo físico, zoom/texto ampliado ni interlineado personalizado. La reserva dinámica de navegación y el límite 3lh se añadieron al cierre tras la revisión estática y no recibieron una nueva comprobación visual por el bloqueo del navegador.
- En poca altura, textos largos, zoom o atribución desplegada se permite scroll natural: no se fijaron alturas que recorten la página ni se bloqueó el desplazamiento.
- Los archivos no versionados fuera del frontend que ya estaban presentes al comenzar (motivacion/motivacionFutura.png y tmp/) permanecieron ajenos a esta etapa.

Para repetir con datos aislados: ejecutar npm run dev y abrir /qa/index.html?scenario=normal&page=/comunidad&capture=1 o page=/cuenta. Para colección usar page=/coleccion; scenario=edge incluye títulos extremos. Entrar siempre por /qa/index.html al recargar para mantener la simulación activa.
