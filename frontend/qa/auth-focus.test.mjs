import assert from "node:assert/strict";
import { test } from "node:test";
import { focusAuthField } from "../src/utils/authFocus.js";

function field(rect) {
  const events = [];
  return {
    events,
    focus(options) { events.push(["focus", options]); },
    getBoundingClientRect() { events.push(["measure"]); return rect; },
    scrollIntoView(options) { events.push(["scroll", options]); },
  };
}

const viewport = { offsetTop: 0, height: 800 };
const nearest = { block: "nearest", inline: "nearest", behavior: "instant" };

test("foco de autenticacion tolera referencias inexistentes", () => {
  assert.doesNotThrow(() => focusAuthField(null, true, viewport));
  assert.doesNotThrow(() => focusAuthField(undefined, false, viewport));
});

test("un cambio de foco sin revelar nunca mide ni desplaza el campo", () => {
  const element = field({ top: 950, bottom: 998 });
  focusAuthField(element, false, viewport);
  assert.deepEqual(element.events, [["focus", { preventScroll: true }]]);
});

test("un campo visible conserva el scroll incluso al solicitar revelar el error", () => {
  for (const rect of [{ top: 100, bottom: 148 }, { top: 12, bottom: 788 }]) {
    const element = field(rect);
    focusAuthField(element, true, viewport);
    assert.deepEqual(element.events, [["focus", { preventScroll: true }], ["measure"]]);
  }
});

test("errores fuera del viewport se revelan con el desplazamiento minimo y sin animacion", () => {
  for (const rect of [{ top: -50, bottom: -2 }, { top: 790, bottom: 838 }]) {
    const element = field(rect);
    focusAuthField(element, true, viewport);
    assert.deepEqual(element.events, [
      ["focus", { preventScroll: true }],
      ["measure"],
      ["scroll", nearest],
    ]);
  }
});

test("el area visible reducida por teclado considera su altura y desplazamiento", () => {
  const keyboardViewport = { offsetTop: 120, height: 320 };
  const visible = field({ top: 150, bottom: 198 });
  focusAuthField(visible, true, keyboardViewport);
  assert.equal(visible.events.some(([event]) => event === "scroll"), false);

  for (const rect of [{ top: 110, bottom: 158 }, { top: 420, bottom: 468 }]) {
    const element = field(rect);
    focusAuthField(element, true, keyboardViewport);
    assert.deepEqual(element.events.at(-1), ["scroll", nearest]);
  }
});

test("usa visualViewport del navegador por defecto cuando esta disponible", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "visualViewport");
  Object.defineProperty(globalThis, "visualViewport", {
    configurable: true,
    value: { offsetTop: 200, height: 250 },
  });
  try {
    const element = field({ top: 440, bottom: 488 });
    focusAuthField(element, true);
    assert.deepEqual(element.events.at(-1), ["scroll", nearest]);
  } finally {
    if (original) Object.defineProperty(globalThis, "visualViewport", original);
    else delete globalThis.visualViewport;
  }
});
