const STATIC_CACHE="select-orders-shell-v3";
const STATIC=["./","./styles.css","./app.js","./affiliate.js","./affiliate-admin.js","./config.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(STATIC_CACHE)
 .then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("select-orders-shell-") && k!==STATIC_CACHE).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 // NEVER cache requests to Supabase, API endpoints, or customer order data.
 if(event.request.method!=="GET"||url.origin!==self.location.origin||
  !url.pathname.startsWith("/preview/select-unified-v1/orders-admin/"))return;
 event.respondWith(fetch(event.request,{cache:"no-store"}).catch(()=>caches.match(event.request)));
});