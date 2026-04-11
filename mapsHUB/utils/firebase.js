const DB_URL = 'https://html-785e3-default-rtdb.firebaseio.com';

// --- CACHE HELPERS ---

// Helper to read from local cache (offline support)
function getLocalCache(key) {
    try {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            return parsed.data;
        }
    } catch (e) {
        console.warn("Cache read error", e);
    }
    return null;
}

// Helper to write to local cache
function setLocalCache(key, data) {
    try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn("Storage quota exceeded. Cleaning up old photo caches...");
            try {
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('cache_photos_')) localStorage.removeItem(k);
                });
                localStorage.setItem(`cache_${key}`, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
            } catch (retryError) {
                console.warn("Cache write failed even after cleanup", retryError);
            }
        }
    }
}

// --- API FUNCTIONS ---

// Fetch all places (with Offline Fallback)
async function fetchPlaces() {
    let localData = getLocalCache('places') || {};
    
    if (navigator.onLine) {
        try {
            const response = await fetch(`${DB_URL}/places.json`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    // Merge strategies could be complex, but for now, remote overwrite local if exists
                    // Or we assume remote is truth. 
                    // To support "Local Only" edits sticking around, we might need to merge.
                    // For this fix, we'll save remote data to cache.
                    setLocalCache('places', data);
                    return data;
                }
            }
        } catch (error) {
            console.warn("Error fetching places, using cache:", error);
        }
    }
    return localData;
}

// Save Place (Create or Update)
async function savePlace(placeData) {
    const id = placeData.id || `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataToSave = { ...placeData, id };

    // 1. Optimistic Local Save
    const currentCache = getLocalCache('places') || {};
    currentCache[id] = dataToSave;
    setLocalCache('places', currentCache);

    // 2. Try Network Save
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/places/${id}.json`, {
                method: 'PUT',
                body: JSON.stringify(dataToSave),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.warn("Network save failed, but saved locally:", error);
        }
    }
    
    return dataToSave;
}

// Delete a Place
async function deletePlace(placeId) {
    // 1. Optimistic Local Delete
    const currentCache = getLocalCache('places') || {};
    delete currentCache[placeId];
    setLocalCache('places', currentCache);

    // 2. Try Network Delete
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/places/${placeId}.json`, { method: 'DELETE' });
        } catch (error) {
            console.warn("Network delete failed, but deleted locally:", error);
        }
    }
}

// Add a photo to a place
async function addPhotoToPlace(placeId, photoData) {
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataToSave = { ...photoData, id: photoId };

    // 1. Optimistic Local Save
    const currentCache = getLocalCache(`photos_${placeId}`) || {};
    currentCache[photoId] = dataToSave;
    setLocalCache(`photos_${placeId}`, currentCache);

    // 2. Try Network Save
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/places/${placeId}/photos/${photoId}.json`, {
                method: 'PUT', // Use PUT with ID to match local structure better
                body: JSON.stringify(dataToSave),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.warn("Network photo upload failed, but saved locally:", error);
        }
    }
    
    return dataToSave;
}

// Fetch photos for a place (with Cache)
async function fetchPlacePhotos(placeId) {
    let localData = getLocalCache(`photos_${placeId}`) || {};

    if (navigator.onLine) {
        try {
            const response = await fetch(`${DB_URL}/places/${placeId}/photos.json`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setLocalCache(`photos_${placeId}`, data);
                    return data;
                }
            }
        } catch (error) {
            console.warn("Error fetching photos, using cache:", error);
        }
    }
    return localData;
}

// Delete a photo from a place
async function deletePhoto(placeId, photoId) {
    // 1. Optimistic Local Delete
    const currentCache = getLocalCache(`photos_${placeId}`) || {};
    delete currentCache[photoId];
    setLocalCache(`photos_${placeId}`, currentCache);

    // 2. Try Network Delete
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/places/${placeId}/photos/${photoId}.json`, { method: 'DELETE' });
        } catch (error) {
            console.warn("Network photo delete failed, but deleted locally:", error);
        }
    }
}

// Fetch Connections (Lines between 360 points)
async function fetchConnections() {
    let localData = getLocalCache('connections') || [];
    
    // Normalize localData if it's an object map (legacy) vs array
    if (!Array.isArray(localData)) {
         localData = Object.entries(localData).map(([key, val]) => ({ id: key, ...val }));
    }

    if (navigator.onLine) {
        try {
            const response = await fetch(`${DB_URL}/connections.json`);
            if (response.ok) {
                const data = await response.json();
                let result = [];
                if (data) {
                     result = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
                }
                setLocalCache('connections', result);
                return result;
            }
        } catch (error) {
            console.warn("Error fetching connections, using cache");
        }
    }
    return localData;
}

// Save a Connection
async function saveConnection(connection) {
    const id = connection.id || `conn_${Date.now()}`;
    const dataToSave = { ...connection, id };

    // 1. Local Save
    const currentCache = getLocalCache('connections') || [];
    // If cache is array
    const newCache = [...currentCache, dataToSave];
    setLocalCache('connections', newCache);

    // 2. Network Save
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/connections/${id}.json`, {
                method: 'PUT',
                body: JSON.stringify(dataToSave),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
             console.warn("Network connection save failed, saved locally");
        }
    }
    return dataToSave;
}

// Delete a Connection
async function deleteConnection(id) {
    // 1. Local Delete
    let currentCache = getLocalCache('connections') || [];
    currentCache = currentCache.filter(c => c.id !== id);
    setLocalCache('connections', currentCache);

    // 2. Network Delete
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/connections/${id}.json`, { method: 'DELETE' });
        } catch (error) {
            console.warn("Network connection delete failed");
        }
    }
}

// --- TOUR API ---

// Fetch all Tour Points (with Cache)
async function fetchTourPoints() {
    let localData = getLocalCache('tour_points') || [];
    
    // Normalize
    if (!Array.isArray(localData)) {
        localData = Object.values(localData);
    }

    if (navigator.onLine) {
        try {
            const response = await fetch(`${DB_URL}/tour_points.json`);
            if (response.ok) {
                const data = await response.json();
                let result = [];
                if (data) {
                     result = Object.entries(data).map(([key, val]) => ({ ...val, id: key }));
                }
                setLocalCache('tour_points', result);
                return result;
            }
        } catch (error) {
            console.warn("Error fetching tour points, using cache");
        }
    }
    return localData;
}

// Update Tour Point Partially
async function updateTourPoint(id, data) {
    if (!id) return;
    
    // 1. Local Save
    let currentCache = getLocalCache('tour_points') || [];
    if (!Array.isArray(currentCache)) currentCache = Object.values(currentCache);
    
    const index = currentCache.findIndex(p => p.id === id);
    let updatedObj = null;
    
    if (index >= 0) {
        updatedObj = { ...currentCache[index], ...data };
        currentCache[index] = updatedObj;
        setLocalCache('tour_points', currentCache);
    } else {
        // Se não existir localmente, evitamos sobrescrever com dados parciais
        return;
    }

    // 2. Network Save - Usa PUT com o objeto completo para evitar o "merge" problemático de arrays do Firebase
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/tour_points/${id}.json`, {
                method: 'PUT',
                body: JSON.stringify(updatedObj),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.warn("Network tour point update failed");
        }
    }
}

// Save a Tour Point
async function saveTourPoint(point) {
    const id = point.id || `tp_${Date.now()}`;
    const dataToSave = { ...point, id };

    // 1. Local Save (Merge into array)
    let currentCache = getLocalCache('tour_points') || [];
    if (!Array.isArray(currentCache)) currentCache = Object.values(currentCache);
    
    const index = currentCache.findIndex(p => p.id === id);
    if (index >= 0) {
        currentCache[index] = dataToSave;
    } else {
        currentCache.push(dataToSave);
    }
    setLocalCache('tour_points', currentCache);

    // 2. Network Save
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/tour_points/${id}.json`, {
                method: 'PUT',
                body: JSON.stringify(dataToSave),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.warn("Network tour point save failed, saved locally");
        }
    }
    return dataToSave;
}

// Delete a Tour Point
async function deleteTourPoint(id) {
    // 1. Local Delete
    let currentCache = getLocalCache('tour_points') || [];
    if (!Array.isArray(currentCache)) currentCache = Object.values(currentCache);
    currentCache = currentCache.filter(c => c.id !== id);
    setLocalCache('tour_points', currentCache);

    // 2. Network Delete
    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/tour_points/${id}.json`, { method: 'DELETE' });
        } catch (error) {
            console.warn("Network tour point delete failed");
        }
    }
}

// --- SESSION MANAGEMENT ---

async function saveSession(sessionId, data) {
    // Save to local storage for offline use
    localStorage.setItem(`session_${sessionId}`, JSON.stringify(data));
    
    // Also save as Blob URL locally (as requested)
    try {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        localStorage.setItem(`session_blob_${sessionId}`, url);
    } catch(e) {}

    if (navigator.onLine) {
        try {
            await fetch(`${DB_URL}/sessions/${sessionId}.json`, {
                method: 'PUT',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.warn("Falha ao salvar sessão na nuvem, salvo localmente.");
        }
    }
}

async function getSession(sessionId) {
    if (navigator.onLine) {
        try {
            const response = await fetch(`${DB_URL}/sessions/${sessionId}.json`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    localStorage.setItem(`session_${sessionId}`, JSON.stringify(data));
                    return data;
                }
            }
        } catch (e) {
            console.warn("Falha ao carregar sessão da nuvem.");
        }
    }
    
    // Fallback to local storage
    const localData = localStorage.getItem(`session_${sessionId}`);
    return localData ? JSON.parse(localData) : null;
}

// --- SHARED ROUTES API ---

// Fetch all shared routes to cache locally for offline use
async function fetchAllSharedRoutes() {
    if (!navigator.onLine) return null;
    try {
        const response = await fetch(`${DB_URL}/shared_routes.json`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Erro ao buscar todas rotas compartilhadas:", e);
    }
    return null;
}

async function saveUserOfflineRoutes(userId, routes) {
    if (!navigator.onLine) return;
    try {
        await fetch(`${DB_URL}/users/${userId}/offline_routes.json`, {
            method: 'PUT',
            body: JSON.stringify(routes),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch(e) {}
}

async function fetchUserOfflineRoutes(userId) {
    if (!navigator.onLine) return null;
    try {
        const response = await fetch(`${DB_URL}/users/${userId}/offline_routes.json`);
        if (response.ok) return await response.json();
    } catch(e) {}
    return null;
}

// Fetch a cached route from other users to speed up calculation
async function getSharedRoute(cacheKey) {
    if (!navigator.onLine) return null;
    try {
        const response = await fetch(`${DB_URL}/shared_routes/${cacheKey}.json`);
        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (e) {
        console.warn("Erro ao buscar rota compartilhada:", e);
    }
    return null;
}

// Save a newly calculated route to the shared pool
async function saveSharedRoute(cacheKey, routeData) {
    if (!navigator.onLine) return;
    try {
        await fetch(`${DB_URL}/shared_routes/${cacheKey}.json`, {
            method: 'PUT',
            body: JSON.stringify(routeData),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.warn("Erro ao salvar rota compartilhada:", e);
    }
}

// --- LIVE USER TRACKING API ---
// Real-time, no persistence needed usually, but we skip error throwing

async function updateUserLocation(userId, userData) {
    if (!navigator.onLine) return; 
    try {
        await fetch(`${DB_URL}/active_users/${userId}.json`, {
            method: 'PUT',
            body: JSON.stringify({
                ...userData,
                lastUpdated: Date.now()
            }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {}
}

async function fetchActiveUsers() {
    if (!navigator.onLine) return [];
    try {
        const response = await fetch(`${DB_URL}/active_users.json`);
        if (!response.ok) return [];
        const data = await response.json();
        
        if (!data) return [];
        
        const now = Date.now();
        return Object.entries(data)
            .map(([key, val]) => ({ id: key, ...val }))
            .filter(user => (now - user.lastUpdated) < 120000); 
            
    } catch (error) {
        return [];
    }
}