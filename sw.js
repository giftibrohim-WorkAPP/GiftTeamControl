const CACHE = "gm-pulse-v64";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/app.css",
  "./js/01-config.js",
  "./js/02-data.js",
  "./js/03-helpers.js",
  "./js/04-notify.js",
  "./js/05-calc.js",
  "./js/06-ui-core.js",
  "./js/07-nav-render.js",
  "./js/08-assistant.js",
  "./js/09-orders.js",
  "./js/10-sales.js",
  "./js/11-design.js",
  "./js/12-snab.js",
  "./js/13-stock.js",
  "./js/14-piece.js",
  "./js/15-rating-payroll.js",
  "./js/16-me-employees.js",
  "./js/17-tasks.js",
  "./js/18-attendance.js",
  "./js/19-finebonus.js",
  "./js/20-modals.js",
  "./js/21-boot.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first, cache fallback (offline rejim)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});

// Bildirishnoma bosilganda ilovani ochish
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return clients.openWindow("./");
  }));
});
