// VisionBooth Kundenbereich: Hintergrund-Helfer für die Web-App (Installation + Mitteilungen).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// Netzwerk direkt durchreichen (kein Offline-Cache – Inhalte sollen immer aktuell sein)
self.addEventListener("fetch", () => {});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "VisionBooth", {
      body: d.body || "",
      icon: "/visionbooth/icon-192.png",
      badge: "/visionbooth/icon-192.png",
      tag: d.tag || "visionbooth",
      renotify: true,
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes(url) && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
