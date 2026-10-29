// Harness de desarrollo aislado: estos registros son fixtures, nunca datos del usuario.
// Este módulo no se importa desde la aplicación ni se incluye en su build normal.
const API_ORIGIN = new URL(import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000").origin;
const query = new URLSearchParams(window.location.search);
const scenario = query.get("scenario") || "normal";
const persistirColeccion = scenario === "quick-add-persist";
const PERSISTENCE_KEY = "muvis.qa.quick-add-persist.v1";
const poster = (path) => `https://image.tmdb.org/t/p/w500${path}`;

const catalogo = [
  { id_tmdb: 693134, titulo: "Dune: Parte dos", anio: "2024", puntuacion: 8.5, poster: poster("/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg") },
  { id_tmdb: 329865, titulo: "La llegada", anio: "2016", puntuacion: 7.9, poster: poster("/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg") },
  { id_tmdb: 157336, titulo: "Interstellar", anio: "2014", puntuacion: 8.7, poster: poster("/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg") },
  { id_tmdb: 120467, titulo: "El gran hotel Budapest", anio: "2014", puntuacion: 8.1, poster: poster("/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg") },
  { id_tmdb: 666277, titulo: "Vidas pasadas", anio: "2023", puntuacion: 7.9, poster: poster("/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg") },
  { id_tmdb: 335984, titulo: "Blade Runner 2049", anio: "2017", puntuacion: 8.0, poster: poster("/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg") },
];

const detalles = {
  693134: { generos: ["Ciencia ficción", "Aventura", "Drama"], duracion: 166, sinopsis: "Paul Atreides se une a Chani y a los Fremen en una travesía por Arrakis. Entre las decisiones del presente y las visiones del futuro, deberá encontrar su propio camino. Sinopsis de prueba para verificar el diseño." },
  329865: { generos: ["Ciencia ficción", "Drama"], duracion: 116, sinopsis: "Una lingüista intenta comprender la llegada de visitantes a la Tierra. Una historia sobre el lenguaje, el tiempo y las decisiones que nos acercan. Sinopsis de prueba." },
  157336: { generos: ["Ciencia ficción", "Aventura", "Drama"], duracion: 169, sinopsis: "Un grupo de exploradores viaja más allá de nuestro sistema solar en busca de un futuro para la humanidad. Sinopsis de prueba para verificar textos de varias líneas." },
  120467: { generos: ["Comedia", "Drama"], duracion: 100, sinopsis: "Las aventuras del conserje de un hotel europeo y su joven aprendiz se cruzan con una herencia inesperada. Sinopsis de prueba." },
  666277: { generos: ["Drama", "Romance"], duracion: 106, sinopsis: "Dos amigos de la infancia vuelven a encontrarse después de muchos años y reflexionan sobre los caminos que tomaron sus vidas. Sinopsis de prueba." },
  335984: { generos: ["Ciencia ficción", "Drama"], duracion: 164, sinopsis: "Un descubrimiento lleva a un investigador a seguir un rastro que podría cambiar su mundo. Sinopsis de prueba." },
};

if (scenario === "edge") {
  catalogo.push({
    id_tmdb: 999001,
    titulo: "Una película con un título muy largo y CinematografíaExtraordinariamenteLarguísimaSinEspacios para probar el diseño",
    anio: null,
    puntuacion: 0,
    poster: "/qa/poster-inexistente-para-pruebas.jpg",
  });
  detalles[999001] = { generos: [], duracion: null, sinopsis: null };
}

function registroColeccion(idTmdb, id, estado, favorita, puntuacionPersonal) {
  const pelicula = catalogo.find((item) => item.id_tmdb === idTmdb);
  return {
    id,
    id_tmdb: pelicula.id_tmdb,
    titulo: pelicula.titulo,
    anio: pelicula.anio ? Number(pelicula.anio) : null,
    poster: pelicula.poster,
    estado,
    favorita,
    puntuacion_personal: puntuacionPersonal,
  };
}

function normalizarBusqueda(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
}

// El endpoint de búsqueda devuelve un array plano, con los géneros disponibles.
// «normal» y «prueba» permiten probar seis resultados aunque la UI exija varios caracteres.
function resultadosBusqueda(consulta) {
  let peliculas;
  if (consulta === "sinresultados") peliculas = [];
  else if (consulta === "lenta") peliculas = catalogo.filter((item) => item.id_tmdb === 329865);
  else if (consulta === "rapida") peliculas = catalogo.filter((item) => item.id_tmdb === 157336);
  else if (["normal", "prueba"].includes(consulta)) peliculas = catalogo;
  else peliculas = catalogo.filter((item) => normalizarBusqueda(item.titulo).includes(consulta));

  return peliculas.map((item) => ({ ...item, generos: [...(detalles[item.id_tmdb]?.generos || [])] }));
}

let coleccion = scenario === "empty" ? [] : [
  registroColeccion(329865, 40, "vista", true, 9),
  registroColeccion(157336, 30, "vista", true, 10),
  registroColeccion(120467, 20, "vista", false, 8),
  registroColeccion(666277, 10, "pendiente", false, null),
];
if (scenario === "edge") coleccion.unshift(registroColeccion(999001, 50, "pendiente", false, 9.5));
let persistenciaDisponible = true;

function guardarColeccionSimulada(datos = coleccion, usuarioId = 1) {
  if (!persistirColeccion || usuarioId !== 1) return;
  try {
    sessionStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: 1, coleccion: datos }));
  } catch {
    persistenciaDisponible = false;
  }
}

if (persistirColeccion) {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(PERSISTENCE_KEY) || "null");
    const registros = guardado?.version === 1 ? guardado.coleccion : null;
    if (Array.isArray(registros) && registros.every((item) => item
      && Number.isInteger(item.id) && item.id > 0
      && catalogo.some((pelicula) => pelicula.id_tmdb === item.id_tmdb)
      && ["vista", "pendiente"].includes(item.estado)
      && typeof item.favorita === "boolean"
      && (item.puntuacion_personal === null || (Number.isFinite(item.puntuacion_personal)
        && item.puntuacion_personal >= 1 && item.puntuacion_personal <= 10
        && Number.isInteger(item.puntuacion_personal * 2))))
      && new Set(registros.map((item) => item.id)).size === registros.length
      && new Set(registros.map((item) => item.id_tmdb)).size === registros.length) {
      coleccion = registros.map((item) => registroColeccion(item.id_tmdb, item.id, item.estado, item.favorita, item.puntuacion_personal));
    }
  } catch {
    persistenciaDisponible = false;
  }
  guardarColeccionSimulada();
}

// Cuentas y sesión totalmente sintéticas. No se escriben cookies ni storage de auth.
const usuariosQa = [
  { id: 1, nombre_usuario: "cine_qa", email: "cine@muvis.test", fecha_creacion: "2026-10-22T12:00:00Z" },
  { id: 2, nombre_usuario: "otra_mirada", email: "otra@muvis.test", fecha_creacion: "2026-10-22T12:00:00Z" },
];
const coleccionesQa = new Map([
  [1, coleccion],
  [2, [registroColeccion(693134, 70, "pendiente", false, null)]],
]);
function siguienteIdColeccionQa() {
  return Math.max(40, ...Array.from(coleccionesQa.values()).flatMap((registros) => registros.map((item) => item.id))) + 1;
}
async function resumirClaveQa(valor) {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
// Se conserva sólo un resumen en memoria para poder probar contraseñas incorrectas.
// Es un mecanismo de fixtures, no una implementación de autenticación para producción.
const resumenInicial = await resumirClaveQa("MuvisQA-prueba2026");
const clavesQa = new Map([[1, resumenInicial], [2, resumenInicial]]);
let usuarioSesionQa = ["auth-anonymous", "auth-login"].includes(scenario)
  ? null
  : usuariosQa[scenario === "auth-session-alt" ? 1 : 0];
let revisionSesionQa = 1;
let csrfQa = null;
let fallarSesion = scenario === "auth-error";
let expirarProximaPeticion = scenario === "auth-expired";
let rechazarProximoCsrf = scenario === "auth-forbidden";

function cambiarSesionQa(usuario) {
  usuarioSesionQa = usuario;
  revisionSesionQa += 1;
  csrfQa = null;
}

let fallarProximoCambio = false;
let duplicarProximoAgregado = false;
let desconectarProximoAgregado = false;
let fallarColeccion = scenario === "error" || scenario === "detail-collection-error";
let fallarDetalleColeccion = scenario === "personal-load-error";
let fallarMetadatos = scenario === "personal-metadata-error";
const solicitudes = [];
const fetchOriginal = window.fetch.bind(window);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function rutaInicial() {
  const page = query.get("page");
  if (page === "discover") return "/";
  if (page === "detail") return "/pelicula/693134";
  if (page && /^\/pelicula\/\d+$/.test(page)) return page;
  if (page && /^\/coleccion\/\d+$/.test(page)) return page;
  if (["/", "/coleccion", "/login", "/registro", "/comunidad", "/cuenta"].includes(page)) return page;
  if (scenario === "auth-login") return "/login";
  if (scenario.startsWith("quick-add")) return "/";
  if (scenario === "personal-not-found") return "/coleccion/99999";
  if (scenario.startsWith("personal-")) return "/coleccion/40";
  return scenario === "detail-collection-error" ? "/pelicula/693134" : "/coleccion";
}

function reiniciar(escenario, page = window.location.pathname) {
  const parametros = new URLSearchParams({ scenario: escenario, page });
  window.location.href = `/qa/index.html?${parametros}`;
}

function restablecerDatos() {
  if (persistirColeccion) {
    try { sessionStorage.removeItem(PERSISTENCE_KEY); } catch { persistenciaDisponible = false; }
  }
  reiniciar(scenario.startsWith("quick-add") ? scenario : "normal");
}

function crearPanel() {
  const style = document.createElement("style");
  style.textContent = `
    #muvis-qa-panel{position:fixed;right:12px;bottom:10px;z-index:900;max-width:min(570px,calc(100vw - 24px));box-sizing:border-box;border:1px solid #586944;border-radius:8px;background:#182013;color:#f1f2eb;font:12px/1.5 system-ui,sans-serif;box-shadow:0 4px 20px #0005}
    #muvis-qa-panel>summary{padding:9px 13px;cursor:pointer;font-weight:600;font-size:11px}
    @media(max-width:899px){#muvis-qa-panel{bottom:calc(86px + env(safe-area-inset-bottom,0px))}}
    #muvis-qa-panel[open]{width:570px}
    #muvis-qa-panel .qa-body{max-height:47vh;overflow:auto;padding:0 13px 12px}
    #muvis-qa-panel .qa-warning{margin:0 0 9px;color:#d7e8a2;font-size:11px}
    #muvis-qa-panel .qa-buttons{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
    #muvis-qa-panel button{min-height:30px;border:1px solid #586944;border-radius:4px;padding:5px 7px;background:#242d1d;color:#f1f2eb;font:11px system-ui;cursor:pointer}
    #muvis-qa-panel button:hover{background:#334229}
    #muvis-qa-panel .qa-count{margin:6px 0;font-size:11px}
    #muvis-qa-panel .qa-feedback{margin:5px 0 8px;color:#d7e8a2;font-size:11px}
    #muvis-qa-panel .qa-log{list-style:none;margin:0;padding:0}
    #muvis-qa-panel pre{margin:5px 0;padding:7px;border-top:1px solid #38452d;white-space:pre-wrap;overflow-wrap:anywhere;color:#d6ddce;font:10px/1.5 ui-monospace,monospace}
  `;
  document.head.append(style);
  const panel = document.createElement("details");
  panel.id = "muvis-qa-panel";
  panel.hidden = query.get("capture") === "1";
  const summary = document.createElement("summary");
  summary.textContent = "Pruebas locales · datos simulados";
  panel.append(summary);
  const body = document.createElement("div");
  body.className = "qa-body";
  const warning = document.createElement("p");
  warning.className = "qa-warning";
  warning.textContent = `Fixtures de QA: ninguna petición API se envía al backend ni cambia datos reales.${persistirColeccion
    ? persistenciaDisponible ? " Persistencia simulada activa solo en esta pestaña." : " El almacenamiento de sesión no está disponible."
    : ""}`;
  body.append(warning);
  const controls = document.createElement("div");
  controls.className = "qa-buttons";
  const feedback = document.createElement("p");
  feedback.className = "qa-feedback";
  feedback.setAttribute("role", "status");
  const buttons = [
    ["Simular desconexión en próximo agregado", () => { desconectarProximoAgregado = true; fallarProximoCambio = false; duplicarProximoAgregado = false; feedback.textContent = "El próximo POST fallará como una conexión de red interrumpida, sin cambiar datos."; }],
    ["Fallar próximo cambio", () => { fallarProximoCambio = true; duplicarProximoAgregado = false; desconectarProximoAgregado = false; feedback.textContent = "El próximo POST, PATCH o DELETE responderá 500 sin modificar los fixtures."; }],
    ["Simular duplicado en próximo agregado", () => { duplicarProximoAgregado = true; fallarProximoCambio = false; desconectarProximoAgregado = false; feedback.textContent = "El próximo POST válido devolverá 409 y la película quedará guardada en el fixture, como si se hubiera agregado desde otra vista."; }],
    ["Vaciar colección", () => reiniciar("empty", "/coleccion")],
    ["Fallar carga colección", () => reiniciar("error")],
    ["Abrir detalle personal", () => reiniciar("personal-detail", "/coleccion/40")],
    ["Fallar metadatos del detalle", () => reiniciar("personal-metadata-error", "/coleccion/40")],
    ["Fallar carga individual", () => reiniciar("personal-load-error", "/coleccion/40")],
    ["Carga individual lenta", () => reiniciar("personal-loading", "/coleccion/40")],
    ["Detalle personal inexistente", () => reiniciar("personal-not-found", "/coleccion/99999")],
    ["Expirar sesión simulada", () => { cambiarSesionQa(null); feedback.textContent = "La sesión de prueba expiró. La siguiente petición personal devolverá 401; los datos simulados se conservan."; }],
    ["Rechazar próximo cambio por CSRF", () => { rechazarProximoCsrf = true; feedback.textContent = "La próxima escritura de colección o logout devolverá 403 una sola vez, sin cambiar datos."; }],
    ["Cambiar cuenta de fixture", () => reiniciar(usuarioSesionQa?.id === 2 ? "auth-session" : "auth-session-alt")],
    ["Probar sesión anónima", () => reiniciar("auth-anonymous", "/coleccion")],
    ["Probar formulario login", () => reiniciar("auth-login", "/login")],
    ["Restablecer conexión", () => { fallarColeccion = false; fallarDetalleColeccion = false; fallarMetadatos = false; fallarSesion = false; feedback.textContent = "Conexión simulada restablecida para sesión, colección y metadatos TMDB. Usa Reintentar en la aplicación para volver a cargar."; }],
    ["Recargar harness", () => reiniciar(scenario)],
    ["Restablecer datos", restablecerDatos],
  ];
  for (const [label, handler] of buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    controls.append(button);
  }
  const count = document.createElement("p");
  count.className = "qa-count";
  const log = document.createElement("ol");
  log.className = "qa-log";
  log.setAttribute("aria-label", "Registro de peticiones simuladas");
  body.append(controls, feedback, count, log);
  panel.append(body);
  document.body.append(panel);
  return { count, log };
}

const panel = crearPanel();

function actualizarRegistro() {
  const cambios = solicitudes.filter((item) => item.method !== "GET");
  const correctos = cambios.filter((item) => item.status >= 200 && item.status < 300).length;
  const cargasColeccion = solicitudes.filter((item) => item.method === "GET" && new URL(item.url).pathname === "/coleccion/").length;
  const cargasIndividuales = solicitudes.filter((item) => item.method === "GET" && /^\/coleccion\/\d+$/.test(new URL(item.url).pathname)).length;
  const cargasCsrf = solicitudes.filter((item) => item.method === "GET" && new URL(item.url).pathname === "/usuarios/csrf").length;
  panel.count.textContent = `Peticiones: ${solicitudes.length} · GET colección: ${cargasColeccion} · GET individual: ${cargasIndividuales} · GET CSRF: ${cargasCsrf} · Cambios enviados: ${cambios.length} · Cambios correctos: ${correctos}`;
  panel.log.replaceChildren(...solicitudes.map((item) => {
    const row = document.createElement("li");
    const pre = document.createElement("pre");
    pre.textContent = `#${item.numero} ${item.method} ${item.url}\nCuerpo: ${item.body == null ? "—" : JSON.stringify(item.body)}\nInicio: ${item.inicio} ms · Duración: ${item.duracion == null ? "Pendiente" : `${item.duracion} ms`}\nRespuesta: ${item.status || "En curso"}${item.detail ? ` · ${item.detail}` : ""}`;
    row.append(pre);
    return row;
  }));
}
actualizarRegistro();

function tieneUnicoCampo(body, campo) {
  return body != null && typeof body === "object" && !Array.isArray(body)
    && Object.keys(body).length === 1 && Object.hasOwn(body, campo);
}

window.fetch = async function fetchSimulado(input, init) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.href);
  if (url.origin !== API_ORIGIN) return fetchOriginal(input, init);

  const request = new Request(input, init);
  const esAuth = url.pathname.startsWith("/usuarios/");
  const usuarioSolicitud = usuarioSesionQa;
  const revisionSolicitud = revisionSesionQa;
  let coleccion = coleccionesQa.get(usuarioSolicitud?.id) || [];
  let body = null;
  let cuerpoInvalido = false;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const texto = await request.clone().text();
    if (texto) {
      try { body = JSON.parse(texto); } catch { body = texto; cuerpoInvalido = true; }
    }
  }

  // No conservar datos escritos en formularios de auth dentro del registro.
  const urlRegistro = new URL(url);
  if (esAuth) urlRegistro.search = "";
  const entrada = { numero: solicitudes.length + 1, method: request.method, url: urlRegistro.href, body: esAuth && body != null ? "[omitido]" : body, status: null, inicio: Math.round(performance.now()), duracion: null };
  solicitudes.push(entrada);
  actualizarRegistro();
  const mutacion = ["POST", "PATCH", "DELETE"].includes(request.method);
  const falloProgramado = mutacion && fallarProximoCambio;
  if (falloProgramado) fallarProximoCambio = false;
  const desconexionProgramada = request.method === "POST" && url.pathname === "/coleccion/" && desconectarProximoAgregado;
  if (desconexionProgramada) desconectarProximoAgregado = false;
  const esBusqueda = request.method === "GET" && url.pathname === "/catalogo/buscar";
  const tituloBusqueda = esBusqueda ? url.searchParams.get("titulo") : null;
  const consultaBusqueda = normalizarBusqueda(tituloBusqueda || "");
  let demora = request.method === "GET" ? (scenario === "loading" && !esAuth ? 8000 : 250) : 650;
  if (scenario === "quick-add-slow" && request.method === "POST") demora = 2000;
  if (scenario === "quick-add-checking" && request.method === "GET" && url.pathname === "/coleccion/") demora = 2000;
  if (scenario === "personal-loading" && request.method === "GET" && /^\/coleccion\/\d+$/.test(url.pathname)) demora = 8000;
  if (esBusqueda && consultaBusqueda === "lenta") demora = 1200;
  if (esBusqueda && consultaBusqueda === "rapida") demora = 150;
  await sleep(demora);

  function responder(datos, status = 200, detail = "") {
    entrada.status = status;
    entrada.duracion = Math.round(performance.now()) - entrada.inicio;
    entrada.detail = detail || (esBusqueda && Array.isArray(datos)
      ? `${datos.length} resultados: ${datos.map((item) => item.titulo).join(" · ") || "ninguno"}`
      : "");
    actualizarRegistro();
    return new Response(status === 204 ? null : JSON.stringify(datos), {
      status,
      headers: status === 204 ? undefined : { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  const error = (status, detail) => responder({ detail }, status, detail);
  if (request.credentials !== "include") return error(400, "El cliente debe enviar credentials: include");
  const requiereSesion = url.pathname.startsWith("/coleccion/")
    || ["/usuarios/me", "/usuarios/csrf", "/usuarios/logout"].includes(url.pathname);
  if (expirarProximaPeticion && requiereSesion && url.pathname !== "/usuarios/me") {
    expirarProximaPeticion = false;
    cambiarSesionQa(null);
    return error(401, "La sesión ha expirado");
  }
  if (requiereSesion && (!usuarioSolicitud || revisionSolicitud !== revisionSesionQa)) return error(401, "No hay una sesión iniciada");
  if (mutacion && (url.pathname.startsWith("/coleccion/") || url.pathname === "/usuarios/logout")) {
    if (rechazarProximoCsrf) {
      rechazarProximoCsrf = false;
      return error(403, "Token CSRF inválido");
    }
    if (!csrfQa || request.headers.get("X-CSRF-Token") !== csrfQa) return error(403, "Token CSRF faltante o inválido");
  }
  if (desconexionProgramada) {
    entrada.status = "Sin conexión";
    entrada.duracion = Math.round(performance.now()) - entrada.inicio;
    actualizarRegistro();
    throw new TypeError("Conexión interrumpida de prueba");
  }
  if (falloProgramado) return error(500, "Fallo simulado del próximo cambio");
  if (cuerpoInvalido) return error(422, "El cuerpo debe contener JSON válido");
  if (["POST", "PATCH"].includes(request.method) && !request.headers.get("Content-Type")?.includes("application/json")) {
    if (url.pathname !== "/usuarios/logout") return error(422, "Falta Content-Type: application/json");
  }

  if (request.method === "GET" && url.pathname === "/usuarios/me") {
    return fallarSesion ? error(500, "Fallo simulado al recuperar la sesión") : responder({ ...usuarioSolicitud });
  }
  if (request.method === "GET" && url.pathname === "/usuarios/csrf") {
    csrfQa ||= `qa-csrf-sintetico-${revisionSesionQa}`;
    return responder({ csrf_token: csrfQa });
  }
  if (request.method === "POST" && url.pathname === "/usuarios/registro") {
    const campos = ["nombre_usuario", "email", "password"];
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== campos.length || !campos.every((campo) => Object.hasOwn(body, campo))) return error(422, "El registro espera nombre_usuario, email y password");
    if (typeof body.nombre_usuario !== "string" || !/^[a-zA-Z0-9_]{3,30}$/.test(body.nombre_usuario)
      || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return error(422, "Datos de registro fuera del contrato");
    const nombreUsuario = body.nombre_usuario.toLocaleLowerCase("es");
    const email = body.email.toLocaleLowerCase("es");
    if (usuariosQa.some((usuario) => usuario.nombre_usuario === nombreUsuario || usuario.email === email)) return error(409, "El nombre de usuario o correo ya está registrado");
    const usuario = { id: Math.max(...usuariosQa.map((item) => item.id)) + 1, nombre_usuario: nombreUsuario, email, fecha_creacion: "2026-10-22T12:00:00Z" };
    const resumen = await resumirClaveQa(body.password);
    body = null;
    usuariosQa.push(usuario);
    clavesQa.set(usuario.id, resumen);
    coleccionesQa.set(usuario.id, []);
    return responder({ ...usuario }, 201);
  }
  if (request.method === "POST" && url.pathname === "/usuarios/login") {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 2
      || typeof body.email !== "string" || typeof body.password !== "string") return error(422, "El login espera email y password");
    const usuario = usuariosQa.find((item) => item.email === body.email.toLocaleLowerCase("es"));
    const resumen = await resumirClaveQa(body.password);
    body = null;
    if (!usuario || clavesQa.get(usuario.id) !== resumen) return error(401, "Correo electrónico o contraseña incorrectos");
    cambiarSesionQa(usuario);
    return responder({ mensaje: "Inicio de sesión correcto" });
  }
  if (request.method === "POST" && url.pathname === "/usuarios/logout") {
    if (body != null) return error(422, "Logout no debe enviar un cuerpo");
    cambiarSesionQa(null);
    return responder(null, 204);
  }

  if (esBusqueda) {
    if (tituloBusqueda == null) return error(422, "Falta el parámetro titulo");
    if (consultaBusqueda === "error") return error(500, "Fallo simulado de búsqueda");
    return responder(resultadosBusqueda(consultaBusqueda));
  }
  if (request.method === "GET" && url.pathname === "/catalogo/populares") return responder(catalogo);
  const detalle = /^\/catalogo\/peliculas\/(\d+)$/.exec(url.pathname);
  if (request.method === "GET" && detalle) {
    if (fallarMetadatos) return error(500, "Fallo simulado de metadatos TMDB; la colección personal sigue disponible");
    const pelicula = catalogo.find((item) => item.id_tmdb === Number(detalle[1]));
    return pelicula ? responder({ ...pelicula, ...detalles[pelicula.id_tmdb] }) : error(404, "Película no encontrada");
  }
  if (url.pathname === "/coleccion/" && request.method === "GET") {
    return fallarColeccion ? error(500, "Fallo simulado de carga de colección") : responder([...coleccion].sort((a, b) => b.id - a.id));
  }
  if (url.pathname === "/coleccion/" && request.method === "POST") {
    if (!tieneUnicoCampo(body, "id_tmdb") || !Number.isInteger(body.id_tmdb) || body.id_tmdb <= 0) return error(422, "POST espera únicamente un id_tmdb entero positivo");
    const pelicula = catalogo.find((item) => item.id_tmdb === body.id_tmdb);
    if (!pelicula) return error(404, "Película no encontrada en TMDB");
    if (duplicarProximoAgregado) {
      duplicarProximoAgregado = false;
      if (!coleccion.some((item) => item.id_tmdb === body.id_tmdb)) {
        const id = siguienteIdColeccionQa();
        coleccion.push(registroColeccion(body.id_tmdb, id, "pendiente", false, null));
        guardarColeccionSimulada(coleccion, usuarioSolicitud.id);
      }
      return error(409, "La película ya está en tu colección");
    }
    if (coleccion.some((item) => item.id_tmdb === body.id_tmdb)) return error(409, "La película ya está en tu colección");
    const id = siguienteIdColeccionQa();
    coleccion.push(registroColeccion(body.id_tmdb, id, "pendiente", false, null));
    guardarColeccionSimulada(coleccion, usuarioSolicitud.id);
    return responder({ mensaje: "Película agregada correctamente", id, titulo: pelicula.titulo }, 201);
  }

  const recurso = /^\/coleccion\/(\d+)(?:\/(favorita|puntuacion))?$/.exec(url.pathname);
  if (recurso) {
    const id = Number(recurso[1]);
    const pelicula = coleccion.find((item) => item.id === id);
    if (!pelicula) return error(404, "ID interno de colección no encontrado (no usar id_tmdb)");
    if (request.method === "GET" && !recurso[2]) {
      return fallarDetalleColeccion
        ? error(500, "Fallo simulado de carga del detalle personal")
        : responder({ ...pelicula });
    }
    if (request.method === "DELETE" && !recurso[2]) {
      if (body != null) return error(422, "DELETE no debe enviar un cuerpo");
      coleccion = coleccion.filter((item) => item.id !== id);
      coleccionesQa.set(usuarioSolicitud.id, coleccion);
      guardarColeccionSimulada(coleccion, usuarioSolicitud.id);
      return responder(null, 204);
    }
    if (request.method === "PATCH") {
      const campo = recurso[2] === "favorita" ? "favorita" : recurso[2] === "puntuacion" ? "puntuacion_personal" : "estado";
      if (!tieneUnicoCampo(body, campo)) return error(422, `PATCH espera únicamente el campo ${campo}`);
      const valor = body[campo];
      if (campo === "estado" && !["vista", "pendiente"].includes(valor)) return error(422, "Estado fuera de contrato");
      if (campo === "favorita" && typeof valor !== "boolean") return error(422, "Favorita debe ser booleana");
      if (campo === "puntuacion_personal" && valor !== null && (!Number.isFinite(valor) || valor < 1 || valor > 10 || !Number.isInteger(valor * 2))) return error(422, "La puntuación debe ser null o un número de 1 a 10 en pasos de 0,5");
      pelicula[campo] = valor;
      guardarColeccionSimulada(coleccion, usuarioSolicitud.id);
      return responder({ id, [campo]: valor });
    }
  }
  return error(404, "Ruta o método fuera del contrato simulado. No se contactó el backend.");
};

window.history.replaceState(null, "", `${rutaInicial()}?qa=1`);
// Un reload de Vite debe volver a la entrada aislada, nunca a la API real.
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", () => {
    const reloadQuery = new URLSearchParams(query);
    reloadQuery.set("page", window.location.pathname);
    window.history.replaceState(null, "", `/qa/index.html?${reloadQuery.toString()}`);
  });
}
await import("../src/main.jsx");
