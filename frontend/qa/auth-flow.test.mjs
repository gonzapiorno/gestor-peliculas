import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVerificationCooldown,
  normalizeVerificationCode,
  safeAuthDestination,
  validateAuthFields,
} from "../src/utils/authFlow.js";

const origin = "http://127.0.0.1:5173";
const fields = (changes = {}) => ({
  nombre_usuario: "cine_prueba",
  email: "cine@example.invalid",
  password: "frase de prueba",
  confirmacion: "frase de prueba",
  ...changes,
});

test("destino conserva rutas internas y sus parametros sin permitir un origen externo", () => {
  assert.equal(safeAuthDestination("/coleccion/42?modo=lista#puntuacion", origin), "/coleccion/42?modo=lista#puntuacion");
  assert.equal(safeAuthDestination({ pathname: "/pelicula/157336", search: "?desde=cuenta", hash: "#detalle" }, origin), "/pelicula/157336?desde=cuenta#detalle");
  assert.equal(safeAuthDestination("/", origin), "/");
  for (const route of ["https://ajeno.invalid/coleccion", "//ajeno.invalid", "javascript:alert(1)", "coleccion", "?destino=coleccion"]) {
    assert.equal(safeAuthDestination(route, origin), "/coleccion");
  }
});

test("destinos bloquean backslash, controles y variantes codificadas peligrosas", () => {
  for (const route of ["/\\ajeno.invalid", "/cine\n", "/cine\u0000", "/%5cajeno.invalid", "/%0acoleccion", "/%2f%2fajeno.invalid", "/%ZZ"]) {
    assert.equal(safeAuthDestination(route, origin), "/coleccion");
  }
});

test("destinos evitan bucles hacia login, registro y verificacion incluso con escapes o subrutas", () => {
  for (const route of ["/login", "/LOGIN/", "/registro?from=/coleccion", "/verificar-email#codigo", "/login/otro", "/%6cogin", "/%72egistro", "/verificar%2Demail", "/registro%2Fotro"]) {
    assert.equal(safeAuthDestination(route, origin), "/coleccion");
  }
  assert.equal(safeAuthDestination({ pathname: "/login", search: "?email=fixture" }, origin), "/coleccion");
  for (const value of [null, undefined, false, 42, {}, { pathname: 42 }]) {
    assert.equal(safeAuthDestination(value, origin), "/coleccion");
  }
});

test("registro valida nombre ASCII, email y coincidencia de contraseñas", () => {
  assert.deepEqual(validateAuthFields(fields(), true), {});
  assert.deepEqual(validateAuthFields(fields({ nombre_usuario: "  cine_prueba  ", email: " cine@example.invalid " }), true), {});
  for (const nombre_usuario of ["ab", "a".repeat(31), "cinéfilo", "cine prueba", "cine-prueba"]) {
    assert.ok(validateAuthFields(fields({ nombre_usuario }), true).nombre_usuario);
  }
  for (const email of ["", "cine", "cine@@example.invalid", "cine prueba@example.invalid"]) {
    assert.ok(validateAuthFields(fields({ email }), true).email);
  }
  assert.ok(validateAuthFields(fields({ confirmacion: "otra frase de prueba" }), true).confirmacion);
});

test("registro respeta los limites de 12 y 128 caracteres de contraseña", () => {
  for (const length of [11, 12, 128, 129]) {
    const password = "a".repeat(length);
    const errors = validateAuthFields(fields({ password, confirmacion: password }), true);
    assert.equal(Boolean(errors.password), length < 12 || length > 128);
    assert.equal(errors.confirmacion, undefined);
  }
  const errors = validateAuthFields(fields({ password: "", confirmacion: "" }), true);
  assert.ok(errors.password);
});

test("longitud de contraseña cuenta puntos de codigo Unicode y no unidades UTF-16", () => {
  for (const length of [6, 11, 12, 128, 129]) {
    const password = "🍿".repeat(length);
    assert.equal(password.length, length * 2);
    const errors = validateAuthFields(fields({ password, confirmacion: password }), true);
    assert.equal(Boolean(errors.password), length < 12 || length > 128);
  }
});

test("login exige correo y clave pero no aplica requisitos de registro ni confirmacion", () => {
  const errors = validateAuthFields(fields({ nombre_usuario: "", password: "corta", confirmacion: "" }));
  assert.deepEqual(errors, {});
  const missing = validateAuthFields(fields({ email: "", password: "" }));
  assert.deepEqual(Object.keys(missing).sort(), ["email", "password"]);
});

test("codigo conserva ceros iniciales, acepta pegado y limita a seis digitos ASCII", () => {
  assert.equal(normalizeVerificationCode("000042"), "000042");
  assert.equal(normalizeVerificationCode(" 00-00 42\n"), "000042");
  assert.equal(normalizeVerificationCode("000042789"), "000042");
  assert.equal(normalizeVerificationCode("ab12cd34ef56"), "123456");
  assert.equal(normalizeVerificationCode("１２３４５６٠١٢٣٤٥"), "");
  assert.equal(normalizeVerificationCode(""), "");
});

test("espera en memoria respeta expiracion exacta y redondea segundos hacia arriba", () => {
  const cooldown = createVerificationCooldown();
  const email = "cine@example.invalid";
  assert.equal(cooldown.remaining(email, 1000), 0);
  cooldown.start(email, 60, 1000);
  assert.equal(cooldown.remaining(email, 1000), 60);
  assert.equal(cooldown.remaining(email, 1001), 60);
  assert.equal(cooldown.remaining(email, 2000), 59);
  assert.equal(cooldown.remaining(email, 60999), 1);
  assert.equal(cooldown.remaining(email, 61000), 0);
  assert.equal(cooldown.remaining(email, 62000), 0);
});

test("espera comparte mayusculas y espacios, separa correos y no se acorta al reiniciar", () => {
  const cooldown = createVerificationCooldown();
  cooldown.start(" Cine@Example.Invalid ", 60, 1000);
  assert.equal(cooldown.remaining("cine@example.invalid", 1000), 60);
  assert.equal(cooldown.remaining("CINE@EXAMPLE.INVALID", 2000), 59);
  assert.equal(cooldown.remaining("otra@example.invalid", 1000), 0);
  cooldown.start("cine@example.invalid", 1, 2000);
  assert.equal(cooldown.remaining("cine@example.invalid", 2000), 59);
  cooldown.start("cine@example.invalid", 120, 2000);
  assert.equal(cooldown.remaining("cine@example.invalid", 2000), 120);
  cooldown.start("otra@example.invalid", -60, 2000);
  assert.equal(cooldown.remaining("otra@example.invalid", 2000), 0);
});

test("esperas independientes no comparten estado y el historial en memoria queda acotado", () => {
  const first = createVerificationCooldown();
  const second = createVerificationCooldown();
  first.start("primero@example.invalid", 60, 1000);
  assert.equal(second.remaining("primero@example.invalid", 1000), 0);
  for (let index = 0; index < 50; index += 1) first.start(`cine${index}@example.invalid`, 60, 1000);
  assert.equal(first.remaining("primero@example.invalid", 1000), 0);
  assert.equal(first.remaining("cine49@example.invalid", 1000), 60);
});

test("utilidades del flujo no leen ni guardan datos en almacenamiento persistente", () => {
  const descriptors = new Map();
  for (const name of ["localStorage", "sessionStorage"]) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() { throw new Error(`No debe accederse a ${name}`); },
      set() { throw new Error(`No debe escribirse ${name}`); },
    });
  }
  try {
    const cooldown = createVerificationCooldown();
    cooldown.start("cine@example.invalid", 60, 1000);
    assert.equal(cooldown.remaining("cine@example.invalid", 1000), 60);
    assert.deepEqual(validateAuthFields(fields(), true), {});
    assert.equal(safeAuthDestination("/coleccion", origin), "/coleccion");
    assert.equal(normalizeVerificationCode("000042"), "000042");
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
