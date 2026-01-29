self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('chatrtc-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/group.html',
        '/styles.css',
        '/app.js',
        '/assets/default-avatar.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Try network first for new content, fallback to cache
  event.respondWith(
    fetch(event.request).then(resp => {
      // update cache for navigation and GETs
      if(event.request.method === 'GET'){
        caches.open('chatrtc-v1').then(cache => cache.put(event.request, resp.clone()));
      }
      return resp;
    }).catch(()=>caches.match(event.request))
  );
});