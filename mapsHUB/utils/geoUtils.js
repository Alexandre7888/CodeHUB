// Utilities for Geocoding and Map operations

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const PHOTON_API_URL = 'https://photon.komoot.io/api/';
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const PROXY_BASE_URL = 'https://proxy-api.trickle-app.host/?url=';

// Search with Location Bias
async function searchPlaces(query, userLocation = null) {
    if (!query || query.length < 3) return [];
    
    // Offline fallback
    if (!navigator.onLine) {
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

    let results = [];

    try {
        // STRATEGY: Use Photon (OSM) as primary.
        // It provides the best "Google-like" fuzzy search for free.
        const params = new URLSearchParams({
            q: query,
            limit: 20, // Increased limit to find more candidates
            lang: 'pt'
        });

        // Add Location Bias (Soft)
        if (userLocation && userLocation.lat && userLocation.lon) {
            params.append('lat', userLocation.lat);
            params.append('lon', userLocation.lon);
            // Lower zoom slightly to broaden the "neighborhood" concept
            params.append('zoom', '14'); 
            // 0.6 is good, keeps remote results possible
            params.append('location_bias_scale', '0.6'); 
        }
        
        const response = await fetch(`${PHOTON_API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        results = data.features.map(f => {
            const props = f.properties;
            const coords = f.geometry.coordinates;
            return {
                lat: coords[1],
                lon: coords[0],
                // Formatting name: Name or Street, City
                display_name: formatDisplayName(props), 
                title: props.name || props.street || "Local sem nome",
                type: props.osm_value || 'place',
                address: {
                    road: props.street,
                    house_number: props.housenumber,
                    city: props.city,
                    state: props.state,
                    country: props.country,
                    postcode: props.postcode
                },
                osm_id: props.osm_id,
                source: 'osm'
            };
        });

    } catch (error) {
        console.warn("Primary search failed, trying fallback:", error);
        
        // Fallback to Nominatim
        try {
             const params = new URLSearchParams({
                q: query,
                format: 'json',
                addressdetails: 1,
                limit: 10,
                'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8'
            });
            
            // Viewbox bias if location known (Preference only, not strict)
            if (userLocation) {
                const viewbox = [
                    (userLocation.lon - 0.5), 
                    (userLocation.lat + 0.5), 
                    (userLocation.lon + 0.5), 
                    (userLocation.lat - 0.5)
                ].join(',');
                params.append('viewbox', viewbox);
                // Removed 'bounded=1' to allow finding places outside the user's current area
            }

            const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`);
            if(response.ok) {
                const nomData = await response.json();
                results = nomData.map(item => ({
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    display_name: item.display_name,
                    title: item.name || item.display_name.split(',')[0],
                    type: item.type,
                    address: item.address,
                    source: 'osm'
                }));
            }
        } catch(e) {}
    }

    // HYBRID SORTING: Balance Distance vs Relevance
    // If exact name match, prioritize it even if far. Otherwise, prioritize distance.
    if (userLocation && userLocation.lat && userLocation.lon && results.length > 0) {
        results.forEach(item => {
            item.distance = calculateDistance(userLocation.lat, userLocation.lon, item.lat, item.lon);
        });
        
        results.sort((a, b) => {
            // Check for exact title matches (case-insensitive)
            const queryLower = query.toLowerCase();
            const aExact = a.title && a.title.toLowerCase() === queryLower;
            const bExact = b.title && b.title.toLowerCase() === queryLower;
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Otherwise sort by distance
            return a.distance - b.distance;
        });
    }
    
    // De-duplicate results
    const seen = new Set();
    results = results.filter(item => {
        const key = item.osm_id || `${item.lat.toFixed(4)},${item.lon.toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Limit output
    return results.slice(0, 10);
}

function formatDisplayName(props) {
    const parts = [];
    if (props.name) parts.push(props.name);
    if (props.street) parts.push(props.street);
    
    const context = [];
    if (props.city) context.push(props.city);
    else if (props.state) context.push(props.state);
    
    const main = parts.join(', ');
    const ctx = context.join(', ');
    
    return ctx ? `${main} - ${ctx}` : main;
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

// Helper: Find an Admin drawn route if start and end are on it
function findAdminRoute(startCoords, endCoords) {
    try {
        const cache = JSON.parse(localStorage.getItem('cache_admin_routes') || '{}');
        const adminRoutes = cache.data || [];
        
        for (const route of adminRoutes) {
            const pathsToTest = route.paths || (route.path ? [route.path] : []);
            
            for (const path of pathsToTest) {
                if (!path || path.length < 2) continue;
                
                // Very simple check: Are both start and end near this polyline?
                let startNear = false;
                let endNear = false;
                let startIndex = -1;
                let endIndex = -1;
                
                for (let i = 0; i < path.length; i++) {
                    const pt = { lat: path[i][0], lon: path[i][1] };
                    if (!startNear && calculateDistance(startCoords.lat, startCoords.lon, pt.lat, pt.lon) < 0.5) {
                        startNear = true;
                        startIndex = i;
                    }
                    if (!endNear && calculateDistance(endCoords.lat, endCoords.lon, pt.lat, pt.lon) < 0.5) {
                        endNear = true;
                        endIndex = i;
                    }
                }
                
                if (startNear && endNear) {
                    // Valid admin route found. Build a faux OSRM response.
                    // Slice path from start to end
                    const stepPath = startIndex <= endIndex 
                        ? path.slice(startIndex, endIndex + 1)
                        : path.slice(endIndex, startIndex + 1).reverse();
                    
                    const geojsonPath = stepPath.map(p => [p[1], p[0]]); // GeoJSON wants [lon, lat]
                    const dist = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon) * 1000;
                    
                    return {
                        code: 'Ok',
                        isAdminRoute: true,
                        routeDirection: route.direction,
                        originalPath: path, // Full path to calculate bearing
                        routes: [{
                            distance: dist,
                            duration: (dist / 40) * 3600,
                            geometry: { coordinates: geojsonPath, type: 'LineString' },
                            legs: [{
                                steps: [{
                                    maneuver: { type: 'depart', modifier: 'straight', location: [startCoords.lon, startCoords.lat] },
                                    name: route.name || 'Rota Manual',
                                    distance: dist,
                                    duration: (dist / 40) * 3600,
                                    mode: 'driving'
                                }],
                                distance: dist,
                                duration: (dist / 40) * 3600
                            }]
                        }]
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error reading admin routes", e);
    }
    return null;
}

// Helper: Find a saved route that matches destination
function findSavedRoute(startCoords, endCoords) {
    try {
        const savedRoutes = JSON.parse(localStorage.getItem('offline_routes') || '[]');
        
        // Find route with matching destination (approx 200m radius)
        const match = savedRoutes.find(r => {
            const distDest = calculateDistance(r.destinationCoords.lat, r.destinationCoords.lon, endCoords.lat, endCoords.lon);
            return distDest < 0.2; 
        });

        if (match) {
            // Found a route to the destination.
            // Check if user is near the start OR anywhere along the path (Snap to Route)
            const route = JSON.parse(JSON.stringify(match.route)); // Deep copy
            
            // 1. Check start
            const distStart = calculateDistance(match.startCoords.lat, match.startCoords.lon, startCoords.lat, startCoords.lon);
            if (distStart < 0.5) return route;

            // 2. Check if user is along the path (within 100m of any point)
            // This prevents "Straight Line" fallback if user restarts nav mid-route
            if (route.geometry && route.geometry.coordinates) {
                const path = route.geometry.coordinates; // [lon, lat]
                // Simple scan (optimization: could use spatial index but array scan is fast enough for single route)
                let nearestDist = Infinity;
                let nearestIndex = -1;

                for (let i = 0; i < path.length; i += 5) { // Check every 5th point for speed
                    const p = path[i];
                    const d = calculateDistance(startCoords.lat, startCoords.lon, p[1], p[0]);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearestIndex = i;
                    }
                }

                if (nearestDist < 0.2) { // Within 200m of the route
                    // Slice the route to start from nearest point
                    // We don't slice strictly to keep context, but we return it as valid
                    console.log("Snap to offline route successful");
                    return route;
                }
            }
            
            // If we are far from start but have the geometry, return it anyway but warn?
            // Better to return it than the straight line if it's the only option
            console.log("Returning saved route despite distance (Best Effort)");
            return route;
        }
    } catch (e) {
        console.error("Error finding saved route:", e);
    }
    return null;
}

async function getRoute(startCoords, endCoords, profile = 'driving') {
    const cacheKey = `cached_route_${startCoords.lat}_${startCoords.lon}_to_${endCoords.lat}_${endCoords.lon}`;

    // 0. ADMIN ROUTE CHECK (Highest Priority Offline/Online)
    const adminRoute = findAdminRoute(startCoords, endCoords);
    if (adminRoute) return adminRoute.routes[0];

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