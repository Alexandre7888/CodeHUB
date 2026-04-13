// Utilities for Geocoding and Map operations

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const PROXY_BASE_URL = 'https://proxy-api.trickle-app.host/?url=';

async function searchPlaces(query) {
    if (!query || query.length < 3) return [];
    
    // Offline fallback: Search in saved places (UserPlaces) or downloaded POIs
    if (!navigator.onLine) {
        try {
            const results = [];
            const q = query.toLowerCase();
            
            // 1. Saved User Places
            const savedPlaces = JSON.parse(localStorage.getItem('userPlaces') || '{}');
            if (savedPlaces.home && savedPlaces.home.title.toLowerCase().includes(q)) results.push(savedPlaces.home);
            if (savedPlaces.car && savedPlaces.car.title.toLowerCase().includes(q)) results.push(savedPlaces.car);
            
            // 2. Downloaded Offline POIs
            const db = await initRouteDB();
            const tx = db.transaction('offline_pois', 'readonly');
            const store = tx.objectStore('offline_pois');
            const allPois = await new Promise((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
            
            allPois.forEach(poi => {
                if (poi.name.toLowerCase().includes(q)) {
                    results.push({
                        lat: poi.lat,
                        lon: poi.lon,
                        display_name: poi.name,
                        address: { road: "Local Offline" },
                        type: 'poi'
                    });
                }
            });
            
            return results.slice(0, 10); // Limita a 10 resultados offline
        } catch (e) {
            return [];
        }
    }

    try {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: 5,
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8'
        });
        
        const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        return await response.json();
    } catch (error) {
        console.warn("Search error (likely offline or blocked):", error);
        return [];
    }
}

async function reverseGeocode(lat, lon) {
    if (!navigator.onLine) return { display_name: "Local Offline", address: { road: "Desconhecido" } };

    try {
        const params = new URLSearchParams({
            lat: lat,
            lon: lon,
            format: 'json',
            addressdetails: 1,
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8'
        });
        
        const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        return await response.json();
    } catch (error) {
        console.warn("Reverse geocode error:", error);
        return null;
    }
}

function formatAddress(item) {
    const address = item.address || {};
    const parts = [];
    
    if (address.road) parts.push(address.road);
    if (address.house_number) parts.push(address.house_number);
    if (address.suburb) parts.push(address.suburb);
    if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
    if (address.state) parts.push(address.state);
    
    return parts.join(', ');
}

// --- IndexedDB for Offline Routes ---
const DB_NAME = 'mapsHubOfflineDB';
const STORE_NAME = 'saved_routes';

function initRouteDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 3);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('offline_pois')) {
                db.createObjectStore('offline_pois', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('offline_tiles')) {
                db.createObjectStore('offline_tiles', { keyPath: 'url' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Helper: IndexedDB para Tiles (Mapas Offline)
window.saveTileToDB = async function(url, base64Data) {
    try {
        const db = await initRouteDB();
        return new Promise((resolve) => {
            const tx = db.transaction('offline_tiles', 'readwrite');
            tx.objectStore('offline_tiles').put({ url: url, data: base64Data, timestamp: Date.now() });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch(e) { return false; }
};

window.getTileFromDB = async function(url) {
    try {
        const db = await initRouteDB();
        return new Promise((resolve) => {
            const tx = db.transaction('offline_tiles', 'readonly');
            const req = tx.objectStore('offline_tiles').get(url);
            req.onsuccess = () => {
                if (req.result) resolve(req.result.data);
                else resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    } catch(e) { return null; }
};

// Exported helpers for SavedRoutes.js UI
window.getAllSavedRoutesMeta = async function() {
    try {
        const db = await initRouteDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => {
                // Retornar os metadados sem carregar o Blob gigante na memória
                const list = req.result.map(item => ({
                    id: item.id,
                    destinationName: item.destinationName,
                    destinationCoords: item.destinationCoords,
                    timestamp: item.timestamp
                }));
                resolve(list);
            };
            req.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
};

window.deleteSavedRoute = async function(id) {
    try {
        const db = await initRouteDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch(e) { return false; }
};

// Helper: Save a specific route to offline storage
async function saveRouteForOffline(routeData, startCoords, endPlace, userId = null) {
    try {
        const db = await initRouteDB();
        const routeId = endPlace.id || `route_${Date.now()}`;
        
        // Salva os dados massivos da geometria dentro de um Blob para usar no IndexedDB
        const routeBlob = new Blob([JSON.stringify(routeData)], { type: 'application/json' });
        
        const storageItem = {
            id: routeId,
            destinationName: endPlace.title || endPlace.display_name,
            destinationCoords: { lat: endPlace.lat, lon: endPlace.lon },
            startCoords: startCoords,
            routeBlob: routeBlob, // Secreto e sem limites do localStorage
            timestamp: Date.now()
        };
        
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(storageItem);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        console.warn("IndexedDB Save Error", e);
        return false;
    }
}

// Helper: Find a saved route that matches destination
async function findSavedRoute(startCoords, endCoords) {
    try {
        const db = await initRouteDB();
        const routes = await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
        
        // Procurar rota pro destino
        const match = routes.find(r => {
            const distDest = calculateDistance(r.destinationCoords.lat, r.destinationCoords.lon, endCoords.lat, endCoords.lon);
            return distDest < 0.1; 
        });

        if (match) {
            // Extrair o JSON embutido no Blob (o arquivo 'secreto') salvo no IndexedDB
            const text = await match.routeBlob.text();
            const route = JSON.parse(text);

            const distStart = calculateDistance(match.startCoords.lat, match.startCoords.lon, startCoords.lat, startCoords.lon);
            
            if (distStart < 0.5) {
                return route;
            } else {
                if (route.geometry && route.geometry.coordinates) {
                    route.geometry.coordinates.unshift([startCoords.lon, startCoords.lat]);
                }
                return route;
            }
        }
    } catch (e) {
        console.error("Error finding route in IndexedDB:", e);
    }
    return null;
}

// --- Offline Dijkstra Routing Engine ---
async function calculateOfflineRoute(startCoords, endCoords) {
    try {
        // Obter chaves do IndexedDB ou localStorage se usar lá
        // Os arquivos de ruas continuam no cache via SW ou localStorage
        // Para simplificar, manter a leitura que já existe no Cache API para o Overpass JSON de ruas, 
        // ou ajustar, como pedido pelo user, tudo pro DB
        
        const cache = await caches.open('mapshub-offline-tiles-v1');
        const keys = await cache.keys();
        const roadKeys = keys.filter(k => k.url.includes('offline-roads-'));
        
        if (roadKeys.length === 0) return null;

        const graph = new Map();
        
        for (const req of roadKeys) {
            const res = await cache.match(req);
            const data = await res.json();
            if (data && data.elements) {
                data.elements.forEach(el => {
                    if (el.type === 'way' && el.geometry) {
                        const isOneway = el.tags && el.tags.oneway === 'yes';
                        for (let i = 0; i < el.geometry.length - 1; i++) {
                            const p1 = el.geometry[i];
                            const p2 = el.geometry[i+1];
                            const id1 = `${p1.lat},${p1.lon}`;
                            const id2 = `${p2.lat},${p2.lon}`;
                            const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);

                            // Ignorar distâncias zero ou nós duplicados para reduzir o grafo
                            if (dist > 0.0001) {
                                if (!graph.has(id1)) graph.set(id1, { lat: p1.lat, lon: p1.lon, edges: [] });
                                if (!graph.has(id2)) graph.set(id2, { lat: p2.lat, lon: p2.lon, edges: [] });

                                graph.get(id1).edges.push({ to: id2, dist });
                                if (!isOneway) {
                                    graph.get(id2).edges.push({ to: id1, dist });
                                }
                            }
                        }
                    }
                });
            }
        }

        if (graph.size === 0) return null;

        // Encontrar os nós mais próximos no grafo
        let startNodeId = null;
        let endNodeId = null;
        let minStartDist = Infinity;
        let minEndDist = Infinity;

        graph.forEach((node, id) => {
            const dStart = calculateDistance(startCoords.lat, startCoords.lon, node.lat, node.lon);
            const dEnd = calculateDistance(endCoords.lat, endCoords.lon, node.lat, node.lon);
            if (dStart < minStartDist) { minStartDist = dStart; startNodeId = id; }
            if (dEnd < minEndDist) { minEndDist = dEnd; endNodeId = id; }
        });

        // Se estiver muito longe da malha viária baixada, falha
        if (!startNodeId || !endNodeId || minStartDist > 2 || minEndDist > 2) return null;

        // OTIMIZAÇÃO: Algoritmo A* (A-Star) para velocidade absurda no cálculo de rotas offline
        const gScore = new Map();
        const fScore = new Map();
        const previous = new Map();
        const openSet = new Set();

        graph.forEach((_, id) => {
            gScore.set(id, Infinity);
            fScore.set(id, Infinity);
        });

        const startNode = graph.get(startNodeId);
        const endNode = graph.get(endNodeId);

        gScore.set(startNodeId, 0);
        fScore.set(startNodeId, calculateDistance(startNode.lat, startNode.lon, endNode.lat, endNode.lon));
        openSet.add(startNodeId);

        while (openSet.size > 0) {
            let current = null;
            let minF = Infinity;
            openSet.forEach(id => {
                const f = fScore.get(id);
                if (f < minF) { minF = f; current = id; }
            });

            if (!current || minF === Infinity) break;
            if (current === endNodeId) break;

            openSet.delete(current);

            const node = graph.get(current);
            node.edges.forEach(edge => {
                const tentativeG = gScore.get(current) + edge.dist;
                if (tentativeG < gScore.get(edge.to)) {
                    previous.set(edge.to, current);
                    gScore.set(edge.to, tentativeG);
                    
                    const neighbor = graph.get(edge.to);
                    const h = calculateDistance(neighbor.lat, neighbor.lon, endNode.lat, endNode.lon);
                    fScore.set(edge.to, tentativeG + h);
                    openSet.add(edge.to);
                }
            });
        }

        if (!previous.has(endNodeId) && startNodeId !== endNodeId) return null; // Sem caminho

        // Reconstruir o caminho
        const pathCoords = [];
        let curr = endNodeId;
        while (curr) {
            const node = graph.get(curr);
            pathCoords.unshift([node.lon, node.lat]); // OSRM usa [lon, lat]
            curr = previous.get(curr);
        }

        // Otimização: Interpolação para evitar que o ponto pareça fora da rua quando o zoom é muito grande
        // Pega as coordenadas exatas do nó de entrada e saída na malha
        const startNodeCoords = graph.get(startNodeId);
        const endNodeCoords = graph.get(endNodeId);
        
        pathCoords.unshift([startNodeCoords.lon, startNodeCoords.lat]); // Ponto exato da rua
        pathCoords.unshift([startCoords.lon, startCoords.lat]); // Ponto do GPS
        
        pathCoords.push([endNodeCoords.lon, endNodeCoords.lat]); // Ponto exato da rua
        pathCoords.push([endCoords.lon, endCoords.lat]); // Destino
        
        // Remove duplicatas consecutivas
        const cleanPath = pathCoords.filter((coord, idx, arr) => {
            if (idx === 0) return true;
            return coord[0] !== arr[idx-1][0] || coord[1] !== arr[idx-1][1];
        });

        const totalDistMeters = (gScore.get(endNodeId) + minStartDist + minEndDist) * 1000;
        const durationSecs = (totalDistMeters / 40000) * 3600; // Assume 40km/h

        return {
            distance: totalDistMeters,
            duration: durationSecs,
            geometry: {
                coordinates: cleanPath,
                type: 'LineString'
            },
            legs: [{
                steps: [{
                    maneuver: { type: 'depart', modifier: 'straight', location: [startCoords.lon, startCoords.lat] },
                    name: 'Rota Offline (Ruas)',
                    distance: totalDistMeters,
                    duration: durationSecs,
                    mode: 'driving'
                }],
                distance: totalDistMeters,
                duration: durationSecs
            }],
            isOfflineGraph: true
        };

    } catch (e) {
        console.error("Erro no cálculo de rota offline:", e);
        return null;
    }
}

async function getRoute(startCoords, endCoords, profile = 'driving') {
    const cacheKey = `cached_route_${startCoords.lat}_${startCoords.lon}_to_${endCoords.lat}_${endCoords.lon}`;

    // 1. OFFLINE MODE CHECK
    if (!navigator.onLine) {
        console.log("Offline: Resolvendo rota...");
        
        // A. Cache Estrito Local
        const cachedStrict = localStorage.getItem(cacheKey);
        if (cachedStrict) return JSON.parse(cachedStrict);

        // B. Cálculo real com grafo de ruas (Malha viária baixada)
        const offlineGraphRoute = await calculateOfflineRoute(startCoords, endCoords);
        if (offlineGraphRoute) {
            console.log("Offline: Caminho calculado usando malha de ruas reais baixada.");
            return offlineGraphRoute;
        }

        // C. Sem fallback simulado. Falha se não achar as ruas reais.
        console.error("Offline: Não foi possível traçar a rota real usando os mapas baixados. A área pode não ter sido baixada completamente.");
        return null;
    }

    // 2. STRICT ONLINE FETCH
    try {
        console.log("Calculando rota exata na API OSRM...");
        const start = `${startCoords.lon},${startCoords.lat}`;
        const end = `${endCoords.lon},${endCoords.lat}`;
        
        // Using Trickle proxy to avoid CORS
        const targetUrl = `${OSRM_BASE_URL}/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;
        const proxyUrl = `${PROXY_BASE_URL}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No Route found');
        
        const calculatedRoute = data.routes[0];

        // Cache strictly local for offline fallback only
        try {
            localStorage.setItem(cacheKey, JSON.stringify(calculatedRoute));
        } catch (e) {}
        
        return calculatedRoute;
    } catch (error) {
        // Tenta rota salva localmente se a API falhar (ex: bloqueio de rede instável)
        const smartRoute = await findSavedRoute(startCoords, endCoords);
        if (smartRoute) return smartRoute;

        return null; // Força falha para evitar rota simulada em linha reta
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; 
    return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(deg2rad(lon2 - lon1)) * Math.cos(deg2rad(lat2));
    const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
              Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lon2 - lon1));
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360; 
}

// --- AI / Smart Mapping Features ---
// Busca locais próximos (comércios, restaurantes) rapidamente para injetar no 360
async function getNearbyOSMPlaces(lat, lon, radius = 100) {
    if (!navigator.onLine) return [];
    try {
        // Usa Overpass API via proxy para buscar amenidades reais próximas
        const query = `
            [out:json];
            (
              node["amenity"](around:${radius},${lat},${lon});
              node["shop"](around:${radius},${lat},${lon});
            );
            out 5;
        `;
        const targetUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(targetUrl);
        
        if (!response.ok) return [];
        const data = await response.json();
        
        const places = [];
        const seenNames = new Set();
        if (data && data.elements) {
            data.elements.forEach(el => {
                if (el.tags && el.tags.name && !seenNames.has(el.tags.name)) {
                    seenNames.add(el.tags.name);
                    places.push({
                        name: el.tags.name,
                        lat: el.lat,
                        lon: el.lon,
                        type: el.tags.shop ? 'shop' : 'restaurant'
                    });
                }
            });
        }
        
        return places;
    } catch (e) {
        console.warn("Failed to fetch nearby POIs for AI:", e);
        return [];
    }
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = 
        voices.find(v => v.lang.includes('pt-BR') && v.localService === true) || 
        voices.find(v => v.lang.includes('pt-BR')) ||
        voices.find(v => v.lang.includes('pt')) ||
        voices.find(v => v.localService === true); 
    if (bestVoice) { utterance.voice = bestVoice; }
    window.speechSynthesis.speak(utterance);
}