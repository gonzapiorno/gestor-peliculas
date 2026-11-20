import assert from "node:assert/strict";
import test from "node:test";
import { attachMobileNavigation } from "../src/utils/mobileNavigation.js";

function fixture() {
  const listeners = new Map();
  const clicks = [];
  const scrolls = [];
  const link = {
    closest: () => link,
    getBoundingClientRect: () => ({ left: 0, right: 100, top: 700, bottom: 780 }),
    click: () => clicks.push("navigation"),
  };
  const navigation = {
    contains: (node) => node === link,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  globalThis.window = { scrollX: 0, scrollY: 1400, scrollTo: (position) => scrolls.push(position) };
  const cleanup = attachMobileNavigation(navigation);
  function send(type, overrides = {}) {
    const point = { identifier: 1, clientX: 40, clientY: 730 };
    const event = {
      target: link,
      touches: type === "touchend" ? [] : [point],
      changedTouches: [point],
      timeStamp: type === "touchstart" ? 100 : 200,
      defaultPrevented: false,
      cancelable: true,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
      ...overrides,
    };
    listeners.get(type)?.(event);
    return event;
  }
  return { send, clicks, scrolls, cleanup, listeners };
}

test("un toque detiene la inercia en la posición actual y navega una sola vez", () => {
  const f = fixture();
  f.send("touchstart");
  assert.deepEqual(f.scrolls, [{ top: 1400, left: 0, behavior: "instant" }]);
  assert.equal(f.send("touchend").defaultPrevented, true);
  assert.equal(f.clicks.length, 1);
  const duplicate = f.send("click", { isTrusted: true, detail: 1, timeStamp: 210 });
  assert.equal(duplicate.stopped, true);
  assert.equal(f.send("click", { isTrusted: true, detail: 0 }).defaultPrevented, false);
  assert.equal(f.send("click", { isTrusted: true, detail: 1, timeStamp: 1000 }).defaultPrevented, false);
  f.cleanup();
  assert.equal(f.listeners.size, 0);
});

test("arrastrar y volver al mismo botón conserva el gesto sin navegar", () => {
  const f = fixture();
  f.send("touchstart");
  f.send("touchmove", { touches: [{ identifier: 1, clientX: 70, clientY: 730 }] });
  assert.equal(f.send("touchend").defaultPrevented, false);
  assert.equal(f.clicks.length, 0);
  f.cleanup();
});

test("pulsación larga, multitáctil y gesto cancelado conservan el comportamiento del navegador", () => {
  const f = fixture();
  f.send("touchstart");
  f.send("touchend", { timeStamp: 800 });
  f.send("touchstart");
  f.send("touchstart", { touches: [{ identifier: 1 }, { identifier: 2 }] });
  f.send("touchend");
  f.send("touchstart");
  f.send("touchcancel");
  f.send("touchend");
  assert.equal(f.clicks.length, 0);
  f.cleanup();
});

test("un gesto que termina fuera del botón o ya fue manejado no activa otra sección", () => {
  const f = fixture();
  f.send("touchstart");
  f.send("touchend", { changedTouches: [{ identifier: 1, clientX: 40, clientY: 680 }] });
  f.send("touchstart");
  f.send("touchend", { defaultPrevented: true });
  assert.equal(f.clicks.length, 0);
  f.cleanup();
});
