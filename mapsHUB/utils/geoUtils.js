// Utilities for Geocoding and Map operations

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const PROXY_BASE_URL = 'https://proxy-api.trickle-app.host/?url=';

async function searchPlaces(query) {
    if (!query || query.length < 3) return [];
    
    // Offline fallback: Search in saved places (UserPlaces) or cached history
    if (!navigator.onLine) {
        // Mock offline search in localStorage
        try {
            const savedPlaces = JSON.parse(localStorage.getItem('userPlaces') || '{}');
            const results = [];
            if (savedPlaces.home && savedPlaces.home.title.toLowerCase().includes(query.toLowerCase())) results.push(savedPlaces.home);
            if (savedPlaces.car && savedPlaces.car.title.toLowerCase().includes(query.toLowerCase())) results.push(savedPlaces.car);
            return results;
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

// Create a Direct/Compass Route (Fallback for Offline)
function getDirectRoute(startCoords, endCoords) {
    const dist = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon);
    
    return {
        code: 'Ok',
        routes: [{
            distance: dist * 1000,
            duration: (dist / 40) * 3600, // Assume 40km/h avg speed
            geometry: {
                coordinates: [
                    [startCoords.lon, startCoords.lat],
                    [endCoords.lon, endCoords.lat]
                ],
                type: 'LineString'
            },
            legs: [{
                steps: [{
                    maneuver: { type: 'depart', modifier: 'straight', location: [startCoords.lon, startCoords.lat] },
                    name: 'Direção Direta (Offline)',
                    distance: dist * 1000,
                    duration: (dist / 40) * 3600,
                    mode: 'direct'
                }],
                distance: dist * 1000,
                duration: (dist / 40) * 3600
            }]
        }],
        isDirect: true
    };
}

// --- IndexedDB for Offline Routes ---
const DB_NAME = 'mapsHubOfflineDB';
const STORE_NAME = 'saved_routes';

function initRouteDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

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

async function getRoute(startCoords, endCoords, profile = 'driving') {
    const cacheKey = `cached_route_${startCoords.lat}_${startCoords.lon}_to_${endCoords.lat}_${endCoords.lon}`;

    // 1. OFFLINE MODE CHECK
    if (!navigator.onLine) {
        console.log("Offline: Checking for smart saved routes...");
        
        // A. Strict Cache Local
        const cachedStrict = localStorage.getItem(cacheKey);
        if (cachedStrict) return JSON.parse(cachedStrict);

        // B. Smart/Fuzzy Saved Routes (The "Save Route" feature) via IndexedDB/Blob
        const smartRoute = await findSavedRoute(startCoords, endCoords);
        if (smartRoute) {
            console.log("Offline: Found saved route to destination in IndexedDB.");
            return smartRoute;
        }

        // C. Fallback Bússola
        console.log("Offline: No saved route found. Using Direct Mode.");
        const direct = getDirectRoute(startCoords, endCoords);
        return direct.routes[0];
    }

    // 2. STRICT ONLINE FETCH
    // Never use fuzzy coordinate matching or shared server caching for online route calculation
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
        // Fallback if API fails but we might have something saved
        const smartRoute = await findSavedRoute(startCoords, endCoords);
        if (smartRoute) return smartRoute;

        const direct = getDirectRoute(startCoords, endCoords);
        return direct.routes[0];
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