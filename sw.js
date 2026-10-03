const CACHE_NAME = 'mein-dashboard-v4';
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Supabase/CDN unangetastet lassen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((antwort) => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, kopie));
      }
      return antwort;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titel: 'Mein Dashboard', text: event.data ? event.data.text() : '' }; }
  event.waitUntil(Promise.all([
    self.registration.showNotification(d.titel || 'Mein Dashboard', {
      body: d.text || '',
      tag: d.tag,
      icon: './icon.svg',
      data: { url: d.url || '#/home' },
    }),
    typeof d.badge === 'number' && self.navigator.setAppBadge
      ? (d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => {})
      : Promise.resolve(),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = new URL((event.notification.data && event.notification.data.url) || '#/home', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenster) => {
      for (const f of fenster) {
        if ('focus' in f) { f.navigate(ziel).catch(() => {}); return f.focus(); }
      }
      return self.clients.openWindow(ziel);
    })
  );
});
