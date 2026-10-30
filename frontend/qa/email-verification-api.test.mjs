// Ejercita los servicios reales sin red, cookies, códigos ni cuentas reales.
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

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

function response(status, body = {}, headers = {}) {
  return { status, ok: status >= 200 && status < 300, headers: new Headers(headers), json: async () => body };
}

beforeEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  client.resetSessionSecurity();
  calls = [];
  respond = () => { throw new Error("Solicitud no prevista en esta prueba"); };
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

test("verificar manda email y codigo como string, conserva ceros y no solicita sesion ni CSRF", async () => {
  const codigo = String(42).padStart(6, "0");
  respond = () => response(200, { mensaje: "Correo verificado correctamente" });
  await auth.verificarEmail("prueba@example.invalid", codigo);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/usuarios/verificar-email");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), { email: "prueba@example.invalid", codigo });
  assert.equal(calls[0].credentials, "include");
  assert.equal(calls[0].headers.get("Content-Type"), "application/json");
  assert.ok(!calls[0].headers.has("X-CSRF-Token"));
  assert.equal(calls[0].cache, "no-store");
});

test("reenvio acepta 202 y realiza solo la solicitud publica, sin generar login ni confirmar entrega", async () => {
  const payload = { mensaje: "Si corresponde, se intentará enviar un código" };
  respond = () => response(202, payload);
  assert.deepEqual(await auth.reenviarVerificacion("prueba@example.invalid"), payload);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/usuarios/reenviar-verificacion");
  assert.deepEqual(JSON.parse(calls[0].body), { email: "prueba@example.invalid" });
  assert.equal(calls[0].credentials, "include");
  assert.ok(!calls[0].headers.has("X-CSRF-Token"));
});

test("403 EMAIL_NO_VERIFICADO conserva un codigo reconocido sin exponer el mensaje remoto ni expirar sesion", async () => {
  let expired = 0;
  subscriptions.push(client.onSessionExpired(() => { expired += 1; }));
  respond = () => response(403, { detail: { codigo: "EMAIL_NO_VERIFICADO", mensaje: "detalle-remoto-no-confiable", password: "dato-privado-de-fixture" } });
  await assert.rejects(auth.iniciarSesion("prueba@example.invalid", "valor-sintetico"), (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.code, "EMAIL_NO_VERIFICADO");
    assert.equal(error.message, "Verificá tu correo electrónico para continuar");
    assert.equal(error.retryAfter, null);
    assert.ok(!JSON.stringify(error).includes("dato-privado"));
    return true;
  });
  assert.equal(expired, 0);
  assert.equal(calls.length, 1);
});

test("403 en coleccion informa verificacion pendiente sin invalidar la sesion", async () => {
  let expired = 0;
  subscriptions.push(client.onSessionExpired(() => { expired += 1; }));
  respond = () => response(403, { detail: { codigo: "EMAIL_NO_VERIFICADO" } });
  await assert.rejects(collection.obtenerColeccion(), (error) => error.code === "EMAIL_NO_VERIFICADO" && error.status === 403);
  assert.equal(expired, 0);
  assert.equal(calls.length, 1);
});

test("codigos desconocidos y codigo de verificacion fuera de 403 no se confian", async () => {
  respond = () => response(403, { detail: { codigo: "CODIGO_INVENTADO", mensaje: "dato-remoto" } });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.code === null && !error.message.includes("dato-remoto"));
  respond = () => response(500, { detail: { codigo: "EMAIL_NO_VERIFICADO", mensaje: "dato-remoto" } });
  await assert.rejects(auth.verificarEmail("prueba@example.invalid", "codigo-simulado"), (error) => error.code === null && !error.message.includes("dato-remoto"));
});

test("400 de verificacion no distingue entre codigo incorrecto, vencido o intentos agotados", async () => {
  const messages = [];
  for (const detail of ["incorrecto", "vencido", "agotado", { sql: "detalle-interno" }]) {
    respond = () => response(400, { detail });
    await assert.rejects(auth.verificarEmail("prueba@example.invalid", "codigo-simulado"), (error) => {
      assert.equal(error.status, 400);
      messages.push(error.message);
      return true;
    });
  }
  assert.equal(new Set(messages).size, 1);
  assert.ok(messages[0].includes("solicitá otro"));
  assert.ok(!messages[0].includes("detalle-interno"));
});

test("429 expone una espera numerica acotada y no reenvia automaticamente", async () => {
  respond = () => response(429, { detail: "detalle-interno" }, { "Retry-After": "65" });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.retryAfter, 65);
    assert.ok(error.message.startsWith("Demasiadas solicitudes"));
    assert.ok(!error.message.includes("detalle-interno"));
    return true;
  });
  assert.equal(calls.length, 1);
  respond = () => response(429, {}, { "Retry-After": "999999999" });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.retryAfter === 86400);
});

test("Retry-After admite fecha HTTP futura y pasada sin aceptar valores mal formados", async () => {
  const future = new Date(Date.now() + 120000).toUTCString();
  respond = () => response(429, {}, { "Retry-After": future });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.retryAfter >= 118 && error.retryAfter <= 120);
  respond = () => response(429, {}, { "Retry-After": "Mon, 01 Jan 2001 00:00:00 GMT" });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.retryAfter === 0);
  for (const value of ["-1", "1.5", "Infinity", "espera", ""]) {
    respond = () => response(429, {}, { "Retry-After": value });
    await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.retryAfter === null);
  }
});

test("errores de validacion, servidor y red conservan mensajes seguros y permiten reintento explicito", async () => {
  for (const status of [422, 500, 503]) {
    respond = () => response(status, { detail: [{ input: "dato-privado-de-fixture" }] });
    await assert.rejects(auth.verificarEmail("prueba@example.invalid", "codigo-simulado"), (error) => error.status === status && !error.message.includes("dato-privado"));
  }
  respond = () => { throw new Error("detalle-red-privado"); };
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.status === 0 && !error.message.includes("detalle-red"));
  respond = () => response(202, { mensaje: "solicitud aceptada" });
  await auth.reenviarVerificacion("prueba@example.invalid");
  assert.equal(calls.length, 5);
});

test("401 publico no anuncia expiracion y 403 de seguridad no se interpreta como verificacion pendiente", async () => {
  let expired = 0;
  subscriptions.push(client.onSessionExpired(() => { expired += 1; }));
  respond = () => response(401);
  await assert.rejects(auth.verificarEmail("prueba@example.invalid", "codigo-simulado"), (error) => error.status === 401 && error.code === null);
  respond = () => response(403, { detail: "Token CSRF inválido" });
  await assert.rejects(auth.reenviarVerificacion("prueba@example.invalid"), (error) => error.status === 403 && error.code === null);
  assert.equal(expired, 0);
  assert.equal(calls.length, 2);
});
