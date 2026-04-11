const CACHE_NAME = 'mapshub-v10'; 
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
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
    'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css',
    'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Iniciando cache individual de assets (Tolerante a falhas)...');
            // Busca cada asset individualmente para evitar que 1 erro cancele todo o processo (o que acontece com cache.addAll)
            await Promise.all(
                ASSETS_TO_CACHE.map(async (url) => {
                    try {
                        const req = new Request(url);
                        const res = await fetch(req);
                        if (res.ok || res.type === 'opaque') {
                            await cache.put(req, res);
                        } else {
                            console.warn('[SW] Falha ao fazer cache do asset (Status não-200):', url);
                        }
                    } catch (err) {
                        console.error('[SW] Falha de rede ao fazer cache de:', url, err);
                    }
                })
            );
            console.log('[SW] Cache inicial concluído.');
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
                        console.log('[SW] Limpando cache antigo:', cache);
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

    // 1. Ignorar chamadas de API do Firebase (deixamos o fetch nativo ou falhar se offline)
    if (url.host.includes('firebaseio.com') || url.host.includes('nominatim.openstreetmap.org')) {
        return; 
    }

    // 2. Cache estrito para Tiles de Mapa (OSM / Google)
    if (url.host.includes('tile.openstreetmap.org') || url.host.includes('google.com') || url.host.includes('arcgisonline.com')) {
        event.respondWith(
            caches.open(TILE_CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(event.request);
                if (cached) return cached;
                try {
                    const res = await fetch(event.request);
                    if (res && res.status === 200) {
                        cache.put(event.request, res.clone()).catch(() => {});
                    }
                    return res;
                } catch (e) {
                    return new Response('', { status: 404 });
                }
            })
        );
        return;
    }

    // 3. Estratégia CACHE-FIRST para todos os arquivos da aplicação e CDNs
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(async (cachedResponse) => {
            // Se encontrou no cache, retorna IMEDIATAMENTE (Garante funcionamento offline)
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não estava no cache prévio, tenta buscar na rede e já salva dinamicamente
            try {
                const networkResponse = await fetch(event.request);
                
                // Salva no cache apenas respostas válidas
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, networkResponse.clone()).catch(() => {});
                }
                
                return networkResponse;
            } catch (err) {
                // Fallbacks puros de Offline
                
                // Se tentou navegar (ex: recarregar a página), entrega o index.html
                if (event.request.mode === 'navigate') {
                    const indexCache = await caches.match('./index.html');
                    if (indexCache) return indexCache;
                }
                
                // Se for um asset que falhou e não temos no cache
                return new Response('', { status: 404, statusText: 'Offline' });
            }
        })
    );
});