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
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Fazendo download de todos os assets vitais e CDNs para o Cache...');
            // Omitindo { mode: 'no-cors' } obrigatoriamente. A maioria dos CDNs modernos suporta CORS nativamente.
            return cache.addAll(ASSETS_TO_CACHE);
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
                        console.log('[SW] Apagando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);

    // 1. Ignorar Firebase (pois já possui sua própria lógica de cache e indexDB)
    if (url.host.includes('firebaseio.com')) return;

    // 2. Cache de Tiles do Mapa (Estratégia específica)
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

    // 3. Estratégia CACHE-FIRST para Index, CDNs e Assets locais
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Se encontrou no cache, retorna IMEDIATAMENTE (Cache-First)
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não encontrou, tenta buscar na rede
            return fetch(event.request).then((networkResponse) => {
                // Só faz cache de respostas com sucesso (status 200) ou opacas (type 'opaque' se o navegador insistir em não-CORS para algumas imagens)
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                    return networkResponse;
                }

                // Salva a resposta dinamicamente para o próximo uso offline
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache).catch(() => {});
                });

                return networkResponse;
            }).catch(() => {
                // Fallback de erro total (Offline puro)
                
                // Se tentou navegar para alguma página
                if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
                    return caches.match('./index.html');
                }
                
                // Se tentou carregar uma imagem que falhou offline
                if (event.request.destination === 'image') {
                    return new Response(
                        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 
                        { headers: { 'Content-Type': 'image/png' } }
                    );
                }
                
                // Outros arquivos
                return new Response('', { status: 404, statusText: 'Offline' });
            });
        })
    );
});