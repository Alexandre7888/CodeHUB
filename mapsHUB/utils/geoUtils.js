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

// Helper: Save a specific route to offline storage
async function saveRouteForOffline(routeData, startCoords, endPlace) {
    const routeId = endPlace.id || `route_${Date.now()}`;
    const storageItem = {
        id: routeId,
        destinationName: endPlace.title || endPlace.display_name,
        destinationCoords: { lat: endPlace.lat, lon: endPlace.lon },
        startCoords: startCoords,
        route: routeData,
        timestamp: Date.now()
    };
    
    // Save to a dedicated list of saved routes
    try {
        const savedRoutes = JSON.parse(localStorage.getItem('offline_routes') || '[]');
        // Remove old route to same destination if exists
        const filtered = savedRoutes.filter(r => {
            const d = calculateDistance(r.destinationCoords.lat, r.destinationCoords.lon, endPlace.lat, endPlace.lon);
            return d > 0.1; // Keep if distance > 100m
        });
        filtered.push(storageItem);
        localStorage.setItem('offline_routes', JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.warn("Storage full", e);
        return false;
    }
}

// Helper: Find a saved route that matches destination
function findSavedRoute(startCoords, endCoords) {
    try {
        const savedRoutes = JSON.parse(localStorage.getItem('offline_routes') || '[]');
        
        // Find route with matching destination (approx 100m radius)
        const match = savedRoutes.find(r => {
            const distDest = calculateDistance(r.destinationCoords.lat, r.destinationCoords.lon, endCoords.lat, endCoords.lon);
            return distDest < 0.1; 
        });

        if (match) {
            // We found a route to this destination!
            // But does it start near where we are?
            const distStart = calculateDistance(r.startCoords.lat, r.startCoords.lon, startCoords.lat, startCoords.lon);
            
            if (distStart < 0.5) {
                return match.route;
            } else {
                const route = JSON.parse(JSON.stringify(match.route)); // Deep copy
                // Patch geometry: Add current pos as first point
                if (route.geometry && route.geometry.coordinates) {
                    route.geometry.coordinates.unshift([startCoords.lon, startCoords.lat]);
                }
                return route;
            }
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}

async function getRoute(startCoords, endCoords, profile = 'driving') {
    const cacheKey = `cached_route_${startCoords.lat}_${startCoords.lon}_to_${endCoords.lat}_${endCoords.lon}`;

    // 1. OFFLINE MODE CHECK
    if (!navigator.onLine) {
        const cachedStrict = localStorage.getItem(cacheKey);
        if (cachedStrict) return JSON.parse(cachedStrict);

        const smartRoute = findSavedRoute(startCoords, endCoords);
        if (smartRoute) return smartRoute;

        const direct = getDirectRoute(startCoords, endCoords);
        return direct.routes[0];
    }

    // 2. ONLINE FETCH
    try {
        const start = `${startCoords.lon},${startCoords.lat}`;
        const end = `${endCoords.lon},${endCoords.lat}`;
        
        const targetUrl = `${OSRM_BASE_URL}/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;
        const proxyUrl = `${PROXY_BASE_URL}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No Route found');
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data.routes[0]));
        } catch (e) {}
        
        return data.routes[0];
    } catch (error) {
        const smartRoute = findSavedRoute(startCoords, endCoords);
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

// Error Message Helper
function getGeoErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Permissão de localização negada.";
        case error.POSITION_UNAVAILABLE:
            return "Informações de localização indisponíveis.";
        case error.TIMEOUT:
            return "Tempo limite para obter localização esgotado.";
        case error.UNKNOWN_ERROR:
            return "Ocorreu um erro desconhecido ao obter localização.";
        default:
            return "Erro ao obter localização.";
    }
}

// SOUND UTILS
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playAlertSound() {
    if (audioContext.state === 'suspended') audioContext.resume();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Ding
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05; // Slightly faster for natural flow
    utterance.pitch = 1.0;
    
    // Priority for Google Voices (usually better quality)
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = 
        voices.find(v => v.name.includes('Google') && v.lang.includes('pt-BR')) || 
        voices.find(v => v.name.includes('Luciana') && v.lang.includes('pt-BR')) || // iOS high quality
        voices.find(v => v.lang.includes('pt-BR') && v.localService === false) || // Network voices often better
        voices.find(v => v.lang.includes('pt-BR'));
        
    if (bestVoice) { utterance.voice = bestVoice; }
    
    window.speechSynthesis.speak(utterance);
}