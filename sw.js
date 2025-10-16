const CACHE = 'aguapp-pro-v1';
const ASSETS = ['./','./index.html','./main.js','./manifest.webmanifest'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached=>{
      const network = fetch(request).then(resp=>{
        const url = new URL(request.url);
        if (resp.ok && (url.origin===location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE).then(c=>c.put(request, clone));
        }
        return resp;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});

// click en la notificación => enfocar/abrir app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
