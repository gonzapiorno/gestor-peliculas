import assert from "node:assert/strict";
import test from "node:test";
import { createMovieMetadataCache } from "../src/hooks/movieMetadataCache.js";
import { collectionStatistics } from "../src/components/movies/collectionStatistics.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const publicData = { generos: ["Drama"], duracion: 115, sinopsis: "Sinopsis de prueba." };

test("la cola limita a tres solicitudes, incluso si se observan muchas filas a la vez", async () => {
  let active = 0;
  let maximum = 0;
  const pending = new Map();
  const calls = [];
  const cache = createMovieMetadataCache((id) => {
    calls.push(id);
    active += 1;
    maximum = Math.max(maximum, active);
    return new Promise((resolve) => pending.set(id, () => { active -= 1; resolve(publicData); }));
  });
  const unsubscribers = Array.from({ length: 18 }, (_, index) => cache.subscribe(index + 1, () => {}));
  await tick();
  assert.equal(calls.length, 3);
  while (pending.size) {
    const batch = [...pending.values()];
    pending.clear();
    batch.forEach((resolve) => resolve());
    await tick();
  }
  assert.equal(calls.length, 18);
  assert.equal(maximum, 3);
  unsubscribers.forEach((unsubscribe) => unsubscribe());
});

test("una fila que sale de pantalla cancela su solicitud todavía en cola", async () => {
  const calls = [];
  const pending = [];
  const cache = createMovieMetadataCache((id) => {
    calls.push(id);
    return new Promise((resolve) => pending.push(resolve));
  });
  const unsubscribers = Array.from({ length: 12 }, (_, index) => cache.subscribe(index + 1, () => {}));
  await tick();
  unsubscribers.slice(3).forEach((unsubscribe) => unsubscribe());
  pending.forEach((resolve) => resolve(publicData));
  await tick();
  assert.deepEqual(calls, [1, 2, 3]);
  unsubscribers.slice(0, 3).forEach((unsubscribe) => unsubscribe());
});

test("dos filas de la misma película comparten request y solo se cachean datos públicos permitidos", async () => {
  let calls = 0;
  let finish;
  const cache = createMovieMetadataCache(() => { calls += 1; return new Promise((resolve) => { finish = resolve; }); });
  const seen = [];
  const offFirst = cache.subscribe(157336, () => {});
  const offSecond = cache.subscribe("157336", (value) => seen.push(value));
  await tick();
  offFirst();
  finish({ ...publicData, favorita: true, puntuacion_personal: 9, usuario_id: 8, email: "fixture@example.test" });
  await tick();
  assert.equal(calls, 1);
  assert.deepEqual(cache.read(157336).data, publicData);
  assert.equal(seen.at(-1).status, "success");
  offSecond();
  const offCached = cache.subscribe(157336, () => {});
  await tick();
  assert.equal(calls, 1);
  offCached();
});

test("un error no crea un bucle ni se reintenta al volver a mostrar la fila; requiere acción explícita", async () => {
  let calls = 0;
  const cache = createMovieMetadataCache(async () => {
    calls += 1;
    if (calls === 1) throw new Error("Fallo de red de prueba");
    return publicData;
  });
  const off = cache.subscribe(10, () => {});
  await tick();
  assert.equal(cache.read(10).status, "error");
  off();
  const offAgain = cache.subscribe(10, () => {});
  await tick();
  assert.equal(calls, 1);
  const offRetry = cache.subscribe(10, () => {}, { retry: true });
  await tick();
  assert.equal(calls, 2);
  assert.equal(cache.read(10).status, "success");
  offAgain(); offRetry();
});

test("la caché libera entradas antiguas sin suscriptores y refresca éxitos vencidos bajo demanda", async () => {
  let clock = 0;
  const calls = [];
  const cache = createMovieMetadataCache(async (id) => { calls.push(id); return publicData; }, { maxEntries: 2, ttl: 20, now: () => clock });
  for (const id of [1, 2, 3]) {
    const off = cache.subscribe(id, () => {});
    await tick();
    off();
    clock += 1;
  }
  assert.equal(cache.read(1), null);
  assert.equal(cache.read(2).status, "success");
  clock = 30;
  assert.equal(cache.read(3), null);
  assert.deepEqual(calls, [1, 2, 3]);
  const off = cache.subscribe(3, () => {});
  await tick();
  assert.deepEqual(calls, [1, 2, 3, 3]);
  off();
});

test("IDs inválidos no consultan catálogo y campos públicos ausentes conservan su ausencia", async () => {
  let calls = 0;
  const cache = createMovieMetadataCache(async () => { calls += 1; return { generos: [null, "", " Drama "], duracion: -5, sinopsis: " " }; });
  for (const id of [0, -1, "abc", null, 4.2]) cache.subscribe(id, () => {});
  await tick();
  assert.equal(calls, 0);
  const off = cache.subscribe(4, () => {});
  await tick();
  assert.deepEqual(cache.read(4).data, { generos: ["Drama"], duracion: null, sinopsis: null });
  off();
});

test("el promedio excluye notas nulas, no numéricas o fuera del contrato de medio punto", () => {
  const notas = [null, 9.5, 0, 10.5, -1, 8.2, "9", NaN, Infinity, 10, 1];
  const stats = collectionStatistics(notas.map((nota, index) => ({ puntuacion_personal: nota, estado: index < 2 ? "vista" : "pendiente", favorita: index === 0 })));
  assert.equal(stats.todas, 11);
  assert.equal(stats.vistas, 2);
  assert.equal(stats.pendientes, 9);
  assert.equal(stats.favoritas, 1);
  assert.equal(stats.puntuadas, 3);
  assert.equal(stats.promedio, 20.5 / 3);
});

test("una colección sin notas válidas muestra promedio ausente, sin inventar cero", () => {
  assert.equal(collectionStatistics([]).promedio, null);
  assert.equal(collectionStatistics([{ estado: "pendiente", favorita: false, puntuacion_personal: null }]).promedio, null);
});
