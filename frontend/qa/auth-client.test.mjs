// Pruebas aisladas del cliente real. No abren conexiones ni utilizan cuentas,
// cookies o tokens reales. Ejecutar con Node 24: node --test qa/auth-client.test.mjs
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

// Vite permite importaciones relativas sin extensión; este hook reproduce sólo
// esa resolución para los servicios, sin transformar ni copiar su código.
const resolver = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)
      && context.parentURL?.includes("/src/services/")) {
      return nextResolve(`${specifier}.js`, context);
    }
    return nextResolve(specifier, context);
  },
});

const client = await import("../src/services/apiClient.js");
const auth = await import("../src/services/authApi.js");
const collection = await import("../src/services/coleccionApi.js");
const nativeFetch = globalThis.fetch;
const subscriptions = [];
let calls;
let respond;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function response(status = 200, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function listen() {
  const result = { count: 0 };
  subscriptions.push(client.onSessionExpired(() => { result.count += 1; }));
  return result;
}

function count(path, method) {
  return calls.filter((call) => call.path === path && (!method || call.method === method)).length;
}

beforeEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  client.resetSessionSecurity();
  calls = [];
  respond = () => { throw new Error("Petición no prevista en fixture"); };
  globalThis.fetch = async (url, options) => {
    const call = { ...options, path: new URL(url).pathname, headers: new Headers(options.headers) };
    calls.push(call);
    return respond(call);
  };
});

after(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  globalThis.fetch = nativeFetch;
  resolver.deregister();
});

test("GET usa cookies del navegador y no solicita CSRF", async () => {
  respond = () => response(200, []);
  await collection.obtenerColeccion();
  await auth.obtenerUsuarioActual();
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.credentials === "include"));
  assert.ok(calls.every((call) => call.cache === "no-store"));
  assert.ok(calls.every((call) => call.signal instanceof AbortSignal));
  assert.ok(calls.every((call) => !call.headers.has("X-CSRF-Token")));
  assert.equal(count("/usuarios/csrf"), 0);
});

test("login 401 y bootstrap 401 no anuncian expiración de una sesión activa", async () => {
  const expired = listen();
  respond = () => response(401, { detail: "Dato remoto que no se debe mostrar" });
  await assert.rejects(auth.iniciarSesion("fixture@example.invalid", "fixture-password-only"),
    (error) => error.status === 401 && error.message === "Correo electrónico o contraseña incorrectos");
  await assert.rejects(auth.obtenerUsuarioActual(), (error) => error.status === 401);
  assert.equal(expired.count, 0);
  assert.equal(count("/usuarios/csrf"), 0);
  assert.ok(calls.every((call) => call.credentials === "include"));
  const login = calls.find((call) => call.path === "/usuarios/login");
  assert.equal(login.method, "POST");
  assert.equal(login.headers.get("Content-Type"), "application/json");
  assert.deepEqual(Object.keys(JSON.parse(login.body)).sort(), ["email", "password"]);
});

test("un 401 privado anuncia expiración una sola vez en solicitudes concurrentes", async () => {
  const expired = listen();
  const gate = deferred();
  respond = async () => { await gate.promise; return response(401); };
  const first = collection.obtenerColeccion();
  const second = collection.obtenerPeliculaColeccion(40);
  gate.resolve();
  const results = await Promise.allSettled([first, second]);
  assert.ok(results.every((item) => item.status === "rejected" && item.reason.status === 401));
  assert.equal(expired.count, 1);
});

test("tres escrituras simultáneas comparten un solo GET CSRF y conservan contratos", async () => {
  const gate = deferred();
  respond = async (call) => call.path === "/usuarios/csrf"
    ? (await gate.promise, response(200, { csrf_token: "fixture-csrf-one" }))
    : response(200, {});
  const pending = [
    collection.actualizarEstado(40, "pendiente"),
    collection.actualizarFavorita(30, true),
    collection.actualizarPuntuacion(20, null),
  ];
  assert.equal(count("/usuarios/csrf"), 1);
  assert.equal(calls.length, 1, "No debe escribirse antes de obtener CSRF");
  gate.resolve();
  await Promise.all(pending);
  assert.equal(calls.length, 4);
  const writes = calls.filter((call) => call.method === "PATCH");
  assert.equal(writes.length, 3);
  assert.ok(writes.every((call) => call.headers.get("X-CSRF-Token") === "fixture-csrf-one"));
  assert.ok(writes.every((call) => call.credentials === "include"));
  assert.deepEqual(writes.map((call) => JSON.parse(call.body)), [
    { estado: "pendiente" }, { favorita: true }, { puntuacion_personal: null },
  ]);
});

test("403 no repite escrituras, conserva sesión y renueva CSRF sólo al reintentar", async () => {
  const expired = listen();
  let csrfReads = 0;
  let writes = 0;
  respond = (call) => {
    if (call.path === "/usuarios/csrf") return response(200, { csrf_token: `fixture-csrf-${++csrfReads}` });
    writes += 1;
    return response(writes === 1 ? 403 : 200);
  };
  await assert.rejects(collection.actualizarFavorita(40, true), (error) => error.status === 403);
  assert.equal(writes, 1);
  assert.equal(csrfReads, 1);
  assert.equal(expired.count, 0);
  await collection.actualizarFavorita(40, true);
  assert.equal(writes, 2);
  assert.equal(csrfReads, 2);
});

test("logout acepta 204 sin intentar leer JSON", async () => {
  respond = (call) => call.path === "/usuarios/csrf"
    ? response(200, { csrf_token: "fixture-csrf-logout" })
    : { status: 204, ok: true, json: () => { assert.fail("204 no tiene JSON"); } };
  assert.equal(await auth.cerrarSesion(), null);
  assert.equal(count("/usuarios/logout", "POST"), 1);
  assert.ok(calls.every((call) => call.credentials === "include"));
});

test("reset de sesión obliga a obtener un CSRF nuevo después del reingreso", async () => {
  let reads = 0;
  respond = (call) => call.path === "/usuarios/csrf"
    ? response(200, { csrf_token: `fixture-session-${++reads}` })
    : response(200);
  await collection.actualizarEstado(40, "vista");
  client.resetSessionSecurity(); // Mismo límite usado por AuthProvider al salir/ingresar.
  await auth.iniciarSesion("fixture@example.invalid", "fixture-password-only");
  client.resetSessionSecurity();
  await collection.actualizarEstado(40, "pendiente");
  assert.equal(reads, 2);
  const writes = calls.filter((call) => call.method === "PATCH");
  assert.ok(writes[0].headers.get("X-CSRF-Token") !== writes[1].headers.get("X-CSRF-Token"));
});

test("CSRF faltante o una sesión rechazada impiden enviar la escritura", async () => {
  respond = () => response(200, {});
  await assert.rejects(collection.eliminarDeColeccion(40), (error) => error instanceof client.ApiError);
  assert.equal(count("/coleccion/40", "DELETE"), 0);
  client.resetSessionSecurity();
  const expired = listen();
  respond = () => response(401);
  await assert.rejects(collection.eliminarDeColeccion(40), (error) => error.status === 401);
  assert.equal(count("/coleccion/40", "DELETE"), 0);
  assert.equal(expired.count, 1);
});

test("un GET CSRF antiguo no habilita escrituras después de cambiar sesión", async () => {
  const gate = deferred();
  respond = async () => { await gate.promise; return response(200, { csrf_token: "fixture-old-session" }); };
  const pending = collection.actualizarEstado(40, "vista");
  client.resetSessionSecurity();
  gate.resolve();
  await assert.rejects(pending, (error) => error.status === 401);
  assert.equal(count("/coleccion/40", "PATCH"), 0);
});

test("una respuesta privada antigua se descarta aunque el body tarde más que los headers", async () => {
  const body = deferred();
  const parsing = deferred();
  respond = () => ({ status: 200, ok: true, json: () => { parsing.resolve(); return body.promise; } });
  const pending = collection.obtenerColeccion();
  await parsing.promise;
  client.resetSessionSecurity();
  body.resolve([{ id: 40, id_tmdb: 329865 }]);
  await assert.rejects(pending, (error) => error.status === 401);
});

test("un 403 de una sesión anterior no invalida el CSRF de la sesión actual", async () => {
  const oldBody = deferred();
  const parsing = deferred();
  let reads = 0;
  let writes = 0;
  respond = (call) => {
    if (call.path === "/usuarios/csrf") return response(200, { csrf_token: `fixture-generation-${++reads}` });
    writes += 1;
    return writes === 1
      ? { status: 403, ok: false, json: () => { parsing.resolve(); return oldBody.promise; } }
      : response(200);
  };
  const old = collection.actualizarEstado(40, "vista");
  await parsing.promise;
  client.resetSessionSecurity();
  await collection.actualizarEstado(30, "vista");
  const expired = listen();
  oldBody.resolve({ detail: "Token CSRF inválido" });
  await assert.rejects(old, (error) => error.status === 401);
  await collection.actualizarEstado(20, "vista");
  assert.equal(reads, 2, "El error viejo no debe borrar el token de la nueva sesión");
  assert.equal(expired.count, 0);
});

test("la finalización de un GET CSRF viejo no rompe la deduplicación del nuevo", async () => {
  const oldGate = deferred();
  const currentGate = deferred();
  let reads = 0;
  respond = async (call) => {
    if (call.path !== "/usuarios/csrf") return response(200);
    reads += 1;
    await (reads === 1 ? oldGate.promise : currentGate.promise);
    return response(200, { csrf_token: "fixture-current-security-context" });
  };
  const old = collection.actualizarFavorita(40, true);
  const rejectedOld = assert.rejects(old, (error) => error.status === 401);
  client.resetSessionSecurity();
  const current = collection.actualizarFavorita(30, true);
  oldGate.resolve();
  await rejectedOld;
  const alsoCurrent = collection.actualizarFavorita(20, true);
  assert.equal(reads, 2);
  currentGate.resolve();
  await Promise.all([current, alsoCurrent]);
  assert.equal(calls.filter((call) => call.method === "PATCH").length, 2);
});

test("registro no inicia sesión, no obtiene CSRF y conserva el conflicto 409", async () => {
  const expired = listen();
  respond = () => response(201, { id: 7, nombre_usuario: "fixture" });
  const created = await auth.registrarUsuario("fixture", "fixture@example.invalid", "fixture-password-only");
  assert.equal(created.id, 7);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/usuarios/registro");
  assert.equal(calls[0].method, "POST");
  assert.ok(!calls[0].headers.has("X-CSRF-Token"));
  respond = () => response(409);
  await assert.rejects(auth.registrarUsuario("fixture", "fixture@example.invalid", "fixture-password-only"),
    (error) => error.status === 409 && error.message === "El nombre de usuario o correo ya está registrado");
  assert.equal(count("/usuarios/login"), 0);
  assert.equal(count("/usuarios/me"), 0);
  assert.equal(expired.count, 0);
});

test("errores públicos 500 o de red no filtran el detalle remoto", async () => {
  respond = () => response(500, { detail: "fixture-secret-internal-detail" });
  await assert.rejects(client.apiRequest("/catalogo/populares"),
    (error) => error.status === 500 && !error.message.includes("fixture-secret"));
  respond = () => { throw new Error("fixture-private-network-info"); };
  await assert.rejects(collection.obtenerColeccion(),
    (error) => error.status === 0 && !error.message.includes("fixture-private"));
});

test("409 de alta mantiene compatibilidad con el estado ya guardado", async () => {
  respond = (call) => call.path === "/usuarios/csrf"
    ? response(200, { csrf_token: "fixture-csrf-conflict" })
    : response(409);
  await assert.rejects(collection.agregarAColeccion(693134),
    (error) => error.status === 409 && error.message === "Esta película ya está en tu colección");
  assert.equal(count("/coleccion/", "POST"), 1);
});
