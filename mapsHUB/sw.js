const CACHE_NAME = 'mapshub-v7'; 
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
    // Explicitly cache the font file referenced by lucide.css
    'https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.woff2',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets including icons');
            // We use {cache: 'reload'} to ensure we get fresh assets on install
            return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { mode: 'no-cors' })));
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

    // 1. Tiles Strategy (Cache First with specific cache)
    if (url.host.includes('tile.openstreetmap.org') || 
        url.host.includes('arcgisonline.com') || 
        url.host.includes('google.com')) {
        
        event.respondWith(
            caches.open(TILE_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(event.request).then((response) => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone()).catch(() => {});
                        }
                        return response;
                    }).catch(() => {
                        // Offline tile fallback (transparent pixel)
                        return new Response(
                            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 
                            { headers: { 'Content-Type': 'image/png' } }
                        );
                    });
                });
            })
        );
        return;
    }

    // 2. Navigation
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

    // 4. Default Cache First
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                // API Fallbacks
                if (url.pathname.includes('.json')) {
                    return new Response('{}', { 
                        status: 200, 
                        headers: { 'Content-Type': 'application/json' } 
                    });
                }
            });
        })
    );
});