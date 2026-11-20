export function attachMobileNavigation(navigation) {
  let touch = null;
  let activation = null;

  function start(event) {
    touch = null;
    if (event.defaultPrevented || event.touches.length !== 1) return;
    const link = event.target.closest("a");
    if (!link || !navigation.contains(link)) return;
    const point = event.touches[0];
    touch = { link, id: point.identifier, x: point.clientX, y: point.clientY, time: event.timeStamp };
    // Detiene la inercia de iOS antes de completar el toque sobre la barra fija.
    window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: "instant" });
  }

  function move(event) {
    if (!touch) return;
    const point = [...event.touches].find(({ identifier }) => identifier === touch.id);
    if (event.touches.length !== 1 || !point
      || Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 10) touch = null;
  }

  function end(event) {
    const pending = touch;
    touch = null;
    if (!pending || event.defaultPrevented || event.touches.length
      || event.timeStamp - pending.time > 500) return;
    const point = [...event.changedTouches].find(({ identifier }) => identifier === pending.id);
    if (!point || Math.hypot(point.clientX - pending.x, point.clientY - pending.y) > 10) return;
    const bounds = pending.link.getBoundingClientRect();
    if (point.clientX < bounds.left || point.clientX > bounds.right
      || point.clientY < bounds.top || point.clientY > bounds.bottom) return;
    if (event.cancelable) event.preventDefault();
    activation = { link: pending.link, time: event.timeStamp };
    pending.link.click();
  }

  function cancel() { touch = null; }

  function click(event) {
    if (activation && event.isTrusted && event.detail > 0
      && event.timeStamp - activation.time < 700
      && event.target.closest("a") === activation.link) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  navigation.addEventListener("touchstart", start, { passive: true });
  navigation.addEventListener("touchmove", move, { passive: true });
  navigation.addEventListener("touchend", end, { passive: false });
  navigation.addEventListener("touchcancel", cancel, { passive: true });
  navigation.addEventListener("click", click, true);
  return () => {
    navigation.removeEventListener("touchstart", start);
    navigation.removeEventListener("touchmove", move);
    navigation.removeEventListener("touchend", end);
    navigation.removeEventListener("touchcancel", cancel);
    navigation.removeEventListener("click", click, true);
  };
}
