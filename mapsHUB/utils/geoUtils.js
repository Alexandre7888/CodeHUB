// Utilities for Geocoding and Map operations

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const PROXY_BASE_URL = 'https://proxy-api.trickle-app.host/?url=';

async function searchPlaces(query) {
    if (!query || query.length < 3) return [];
    
    // Offline fallback for search? 
    // Difficult without local DB, but we could search saved markers.
    if (!navigator.onLine) {
        return [];
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

// Format address for display
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

function getPlaceIconType(type, category) {
    if (category === 'amenity') {
        if (type === 'restaurant' || type === 'cafe') return 'utensils';
        if (type === 'fuel') return 'fuel';
        if (type === 'parking') return 'circle-parking';
        if (type === 'school' || type === 'university') return 'graduation-cap';
        if (type === 'hospital' || type === 'clinic') return 'activity';
    }
    if (category === 'shop') return 'shopping-bag';
    if (category === 'tourism') return 'camera';
    if (category === 'leisure' && type === 'park') return 'trees';
    
    return 'map-pin';
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
                    name: 'Direção Direta',
                    distance: dist * 1000,
                    duration: (dist / 40) * 3600,
                    mode: 'direct'
                }],
                distance: dist * 1000,
                duration: (dist / 40) * 3600
            }]
        }],
        isDirect: true // Flag to indicate this is a fallback
    };
}

// Get Route between two points with Offline Fallback
async function getRoute(startCoords, endCoords, profile = 'driving') {
    const cacheKey = `cached_route_${startCoords.lat}_${startCoords.lon}_to_${endCoords.lat}_${endCoords.lon}`;

    // 1. Check Offline Mode Explicitly
    if (!navigator.onLine) {
        console.log("Network status: Offline. Checking cache...");
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            console.log("Route found in cache.");
            return JSON.parse(cached);
        }
        console.log("No cache found. Switching to Direct Mode.");
        const direct = getDirectRoute(startCoords, endCoords);
        return direct.routes[0];
    }

    // 2. Try Online Fetch via Proxy
    try {
        const start = `${startCoords.lon},${startCoords.lat}`;
        const end = `${endCoords.lon},${endCoords.lat}`;
        
        const targetUrl = `${OSRM_BASE_URL}/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;
        // Use proxy to avoid CORS and mixed content issues
        const proxyUrl = `${PROXY_BASE_URL}${encodeURIComponent(targetUrl)}`;
        
        console.log("Fetching route...");
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No Route found in API response');
        
        // Cache successful route
        try {
            localStorage.setItem('last_active_route', JSON.stringify(data.routes[0]));
            localStorage.setItem(cacheKey, JSON.stringify(data.routes[0]));
        } catch (e) {
            console.warn("Cache quota exceeded for route, clearing old routes...");
            // Simple cleanup: remove all cached routes to make space for the new one
            Object.keys(localStorage).forEach(key => {
                if(key.startsWith('cached_route_')) localStorage.removeItem(key);
            });
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data.routes[0]));
            } catch(e2) {}
        }
        
        return data.routes[0];
    } catch (error) {
        // 3. Fallback on Error
        console.warn("Routing API failed, using Direct Mode fallback.", error.message);
        
        // Try cache one last time even if we thought we were online
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);

        const direct = getDirectRoute(startCoords, endCoords);
        return direct.routes[0];
    }
}

// Calculate distance between two coords in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Calculate bearing between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(deg2rad(lon2 - lon1)) * Math.cos(deg2rad(lat2));
    const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
              Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lon2 - lon1));
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360; // Degrees
}

// Text to Speech (Offline Optimized)
function speak(text) {
    if (!window.speechSynthesis) return;
    
    // Simple debounce/cancel to avoid stacking
    window.speechSynthesis.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    
    // Explicitly try to find an OFFLINE/LOCAL voice
    // This helps significantly with responsiveness and offline usage
    const voices = window.speechSynthesis.getVoices();
    
    // Priority: Local PT-BR -> Any PT-BR -> Any PT -> First Local
    const bestVoice = 
        voices.find(v => v.lang.includes('pt-BR') && v.localService === true) || 
        voices.find(v => v.lang.includes('pt-BR')) ||
        voices.find(v => v.lang.includes('pt')) ||
        voices.find(v => v.localService === true); 

    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}