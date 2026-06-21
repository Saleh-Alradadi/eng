/* Service worker: app shell offline + installability */
const CACHE = "kalimati-v3";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (_) {}
  if (sameOrigin) {
    // network-first for app shell so updates arrive immediately
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  } else {
    // network for external APIs (dictionary, translation, sentences, audio)
    e.respondWith(fetch(req).catch(() => new Response("", { status: 504 })));
  }
});

/* periodic background reminder (experimental, Chrome Android installed PWA) */
self.addEventListener("periodicsync", e => {
  if (e.tag === "review-reminder") {
    e.waitUntil(self.registration.showNotification("كلماتي 📚", {
      body: "حان وقت مراجعة كلماتك اليوم!",
      icon: "icon-192.png", badge: "icon-192.png", tag: "review-reminder", lang: "ar", dir: "rtl"
    }));
  }
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("./");
  }));
});
