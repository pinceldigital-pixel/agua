const CACHE = 'aguapp-es-svg-v4';
const ASSETS = [
    './',
    './index.html',
    './main.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(c => {
            return c || fetch(e.request).then(r => {
                const u = new URL(e.request.url);
                if (r.ok && u.origin === location.origin) {
                    const cl = r.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, cl));
                }
                return r;
            }).catch(() => c);
        })
    );
});

// --- LÓGICA DE NOTIFICACIONES EN SEGUNDO PLANO ---

let swState = {};
let remindersTmr = null;

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SET_STATE') {
        swState = event.data.state;
        scheduleReminders();
    }
});

function parseTime(h) {
    if (!h) return new Date();
    const [hh, mm] = h.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
}

function minutesSince(ts) {
    return (Date.now() - ts) / 60000;
}

function within(now, start, end) {
    const s = new Date(now);
    s.setHours(start.getHours(), start.getMinutes(), 0, 0);
    const e = new Date(now);
    e.setHours(end.getHours(), end.getMinutes(), 0, 0);
    return now >= s && now <= e;
}

function scheduleReminders() {
    if (remindersTmr) clearInterval(remindersTmr);
    remindersTmr = setInterval(checkReminder, 60000);
    checkReminder();
}

function checkReminder() {
    if (!swState.reminders || !swState.hasOwnProperty('lastNotifyAt')) {
        return;
    }

    const now = new Date();
    const s = parseTime(swState.reminders.start);
    const e = parseTime(swState.reminders.end);

    if (!within(now, s, e)) {
        return;
    }

    if (minutesSince(swState.lastNotifyAt) >= swState.reminders.intervalMin) {
        notify('¡Hey! 💧 Es hora de tomar agua');
    }
}

async function notify(body) {
    const now = Date.now();
    swState.lastNotifyAt = now;

    await self.registration.showNotification('AguApp', {
        body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'agua-min',
        renotify: true
    });

    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
        client.postMessage({ type: 'UPDATE_LAST_NOTIFY', timestamp: now });
    });
}