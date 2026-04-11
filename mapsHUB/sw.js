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
    './components/TourEditor.js'
];

// 🚀 INSTALL
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 🔄 ACTIVATE
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names.map(name => {
                    if (name !== CACHE_NAME && name !== TILE_CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            )
        )
    );
});

// 🌐 FETCH
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 🗺️ TILES (cache-first)
    if (url.host.includes('tile.openstreetmap.org') || 
        url.host.includes('arcgisonline.com')) {

        event.respondWith(
            caches.open(TILE_CACHE_NAME).then(cache =>
                cache.match(event.request).then(res =>
                    res || fetch(event.request).then(net => {
                        if (net.status === 200) {
                            cache.put(event.request, net.clone());
                        }
                        return net;
                    }).catch(() => new Response('', { status: 200 }))
                )
            )
        );
        return;
    }

    // 📄 NAVEGAÇÃO (CORRIGIDO ✅)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(res => {
                return res || fetch(event.request);
            })
        );
        return;
    }

    // ⚡ CACHE FIRST (GERAL)
    event.respondWith(
        caches.match(event.request).then(res => {
            if (res) return res;

            return fetch(event.request).then(net => {
                if (!net || net.status !== 200) return net;

                const clone = net.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone).catch(() => {});
                });

                return net;
            }).catch(() => {
                // fallback offline básico
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});