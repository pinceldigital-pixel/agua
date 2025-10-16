// service-worker.js
const CACHE_NAME = 'water-tracker-cache-v1';
// Define la URL del ícono para usar en las notificaciones
const ICON_URL = 'data:image/png;base64,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';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    // Forza al nuevo Service Worker a activarse inmediatamente
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    // Toma el control de todas las pestañas abiertas inmediatamente
    event.waitUntil(self.clients.claim());
});

let notificationInterval;
let notificationSettings = { start: 9, end: 20 };

// Escucha mensajes desde la app principal (app.js)
self.addEventListener('message', (event) => {
    if (event.data.action === 'stopNotifications') {
        if (notificationInterval) clearInterval(notificationInterval);
        notificationInterval = null;
        console.log('Service Worker: Notifications stopped.');
    }
    
    if (event.data.action === 'scheduleNotifications') {
        if (notificationInterval) clearInterval(notificationInterval);
        notificationSettings = event.data.settings;
        
        console.log('Service Worker: Scheduling notifications.');

        notificationInterval = setInterval(() => {
            const now = new Date();
            const hour = now.getHours();
            
            if (hour >= notificationSettings.start && hour < notificationSettings.end) {
                self.registration.showNotification('Hey! 💧 ¡Es hora de tomar agua!', {
                    body: 'Mantente hidratado para un día lleno de energía.',
                    icon: ICON_URL,
                    badge: ICON_URL, // Ícono para la barra de notificaciones en Android
                    vibrate: [200, 100, 200]
                });
            }
        }, 2 * 60 * 60 * 1000); // Cada 2 horas
    }
});


// ===== Injected basic offline shell =====

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open('water-tracker-cache-v1');
    await cache.addAll([
      './',
      './index.html',
      './app.js',
      './manifest.json',
      './icons/icon-192.png',
      './icons/icon-512.png'
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith((async () => {
    // Network first for navigation; cache fallback
    if (req.mode === 'navigate') {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open('water-tracker-cache-v1');
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open('water-tracker-cache-v1');
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        throw e;
      }
    }
    // Cache-first for others
    const cache = await caches.open('water-tracker-cache-v1');
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  })());
});
