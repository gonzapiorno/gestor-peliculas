// El foco no debe mover un control que ya está visible. Sólo los errores de un
// campo fuera del viewport requieren desplazarlo para poder corregirlos.
export function focusAuthField(element, reveal = false, viewport = globalThis.visualViewport || { offsetTop: 0, height: globalThis.innerHeight }) {
  if (!element) return;
  element.focus({ preventScroll: true });
  if (!reveal) return;
  const rect = element.getBoundingClientRect();
  const top = viewport.offsetTop || 0;
  if (rect.top < top + 12 || rect.bottom > top + viewport.height - 12) {
    element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
}
