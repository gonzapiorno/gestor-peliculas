self.addEventListener("push", (event) => {
  if (!event.data) return;
  let aviso;
  try {
    aviso = event.data.json();
  } catch {
    return;
  }

  if (typeof aviso?.titulo !== "string" || typeof aviso.cuerpo !== "string") return;
  let destino = "/comunidad";
  if (aviso.tipo === "amistad") {
    destino = "/comunidad?vista=amigos#community-recibidas";
  } else if (aviso.tipo === "publicacion" && Number.isSafeInteger(aviso.publicacion_id) && aviso.publicacion_id > 0) {
    destino = `/comunidad/publicaciones/${aviso.publicacion_id}`;
  }

  event.waitUntil(self.registration.showNotification(aviso.titulo, {
    body: aviso.cuerpo,
    icon: "/logos/muvis-app-192.png",
    data: destino,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data;
  const rutaValida = typeof destino === "string" && (
    destino === "/comunidad" || destino === "/comunidad?vista=amigos#community-recibidas"
    || /^\/comunidad\/publicaciones\/[1-9]\d*$/.test(destino)
  );
  const url = new URL(rutaValida ? destino : "/comunidad", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const ventana = ventanas.find((cliente) => cliente.url.startsWith(`${self.location.origin}/`));
    if (ventana) {
      try {
        const abierta = ventana.url === url ? ventana : await ventana.navigate(url);
        if (abierta) return abierta.focus();
      } catch {
        // El sistema puede cerrar una ventana mientras se abre la notificación.
      }
    }
    return self.clients.openWindow(url);
  })());
});
