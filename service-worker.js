const CACHE = 'interview-practice-v1';
const ASSETS = ['./','./index.html','./style.css','./app.js','./questions.json','./manifest.json','./icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => e.waitUntil ? e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))) : null);
