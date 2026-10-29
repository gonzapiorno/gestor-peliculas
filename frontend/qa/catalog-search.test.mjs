import assert from "node:assert/strict";
import { after, test } from "node:test";
import { registerHooks } from "node:module";
const resolver = registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) && context.parentURL?.includes("/src/services/") ? `${specifier}.js` : specifier, context);
} });
const { createCatalogSearchCache } = await import("../src/utils/catalogSearchCache.js");
after(() => resolver.deregister());

test("búsqueda global y página de resultados comparten una petición en curso", async () => {
  let calls = 0;
  let finish;
  const cache = createCatalogSearchCache(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const first = cache(" Interstellar ");
  const second = cache("Interstellar");
  await Promise.resolve();
  assert.equal(calls, 1);
  finish([{ id_tmdb: 157336 }]);
  assert.deepEqual(await first, await second);
});
test("la caché pública vence y permite un reintento explícito", async () => {
  let time = 0;
  let calls = 0;
  const cache = createCatalogSearchCache(async () => ++calls, { now: () => time, ttl: 100 });
  assert.equal(await cache("Dune"), 1);
  assert.equal(await cache("Dune"), 1);
  time = 101;
  assert.equal(await cache("Dune"), 2);
  assert.equal(await cache("Dune", { fresh: true }), 3);
});
test("errores no quedan cacheados y respuestas viejas no sustituyen un reintento", async () => {
  let finish;
  let calls = 0;
  const cache = createCatalogSearchCache(() => ++calls === 1 ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve("nuevo"));
  const old = cache("Dune");
  await Promise.resolve();
  assert.equal(await cache("Dune", { fresh: true }), "nuevo");
  finish("viejo");
  await old;
  assert.equal(await cache("Dune"), "nuevo");
  const fail = createCatalogSearchCache(async () => { throw new Error("simulado"); });
  await assert.rejects(fail("Error"));
  await assert.rejects(fail("Error"));
});
test("el límite de búsquedas usa descarte LRU", async () => {
  let calls = 0;
  const cache = createCatalogSearchCache(async () => ++calls, { limit: 2 });
  await cache("a"); await cache("b"); await cache("a"); await cache("c");
  assert.equal(await cache("a"), 1);
  assert.equal(await cache("b"), 4);
});
