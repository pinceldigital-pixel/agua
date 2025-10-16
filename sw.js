const CACHE='aguapp-es-svg-v3';
const ASSETS=['./','./index.html','./main.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const u=new URL(e.request.url);if(r.ok&&u.origin===location.origin){const cl=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,cl));}return r;}).catch(()=>c)));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const c of ws){if('focus'in c)return c.focus();} if(clients.openWindow) return clients.openWindow('./');}));});
