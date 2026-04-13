const CACHE_NAME = 'mapshub-v9'; 
const TILE_CACHE_NAME = 'mapshub-offline-tiles-v1';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './admin.html',
    './studio.html',
    './manifest.json',
    './app.js',
    './admin.js',
    './studio.js',
    './utils/geoUtils.js',
    './utils/imageUtils.js',
    './utils/firebase.js',
    './components/Icons.js',
    './components/Map.js',
    './components/SearchBox.js',
    './components/PanoramaViewer.js',
    './components/PlaceDetail.js',
    './components/Controls.js',
    './components/LayerControl.js',
    './components/NearbyPreview.js',
    './components/Navigation.js',
    './components/UserPlaces.js',
    './components/SavedRoutes.js',
    './components/OfflineManager.js',
    './components/TourEditor.js',
    'https://cdn.tailwindcss.com',
    'https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css',
    'https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.woff2',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Caching assets for offline start');
            // Caching files using normal requests so they can be reliably read by Babel offline
            for (let url of ASSETS_TO_CACHE) {
                try {
                    await cache.add(new Request(url));
                } catch (e) {
                    console.warn('[SW] Failed to cache:', url, e);
                }
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== TILE_CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Navigation
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 3. Fonts & Icons (Critical)
    if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.ttf') || url.pathname.endsWith('.css')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchedResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, fetchedResponse.clone());
                        return fetchedResponse;
                    });
                });
            })
        );
        return;
    }

    // 4. Dynamic Caching for Everything Else (Images, Photos, Assets)
    // Exclui requisições do Firebase RTDB pois elas já têm sua própria lógica de cache local via localStorage
    if (event.request.method === 'GET' && !url.host.includes('firebaseio.com')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Se já tem no cache, retorna imediatamente
                if (cachedResponse) return cachedResponse;
                
                // Se não, busca na rede, clona a resposta e salva no cache para uso futuro
                return fetch(event.request).then((networkResponse) => {
                    // Ignora respostas com erro ou inválidas (exceto opacas de CDN de imagens)
                    if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache).catch(() => {});
                    });
                    
                    return networkResponse;
                }).catch(() => {
                    // Fallback offline
                    if (event.request.destination === 'image') {
                        return new Response(
                            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 
                            { headers: { 'Content-Type': 'image/png' } }
                        );
                    }
                    if (url.pathname.includes('.json')) {
                        return new Response('{}', { 
                            status: 200, 
                            headers: { 'Content-Type': 'application/json' } 
                        });
                    }
                });
            })
        );
        return;
    }

    // 5. Fallback Final (Para requisições não cobertas acima)
    event.respondWith(fetch(event.request).catch(() => new Response('')));
});