// Important: DO NOT remove this `ErrorBoundary` component.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ops! Algo deu errado.</h1>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-black text-white rounded">Recarregar Página</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CODEHUB_APP_TOKEN = "KytjBryAR2zS8sVaj3vd";

function App() {
    // --- STATE ---
    const [currentUser, setCurrentUser] = React.useState(null);
    const [osmSession, setOsmSession] = React.useState(null);
    const savedMapState = JSON.parse(localStorage.getItem('mapState')) || {
        center: [-23.5505, -46.6333],
        zoom: 13
    };

    const [mapState, setMapState] = React.useState(savedMapState);
    const [userLocation, setUserLocation] = React.useState(null);
    const [userHeading, setUserHeading] = React.useState(0);
    const [userId] = React.useState(() => {
        let stored = localStorage.getItem('mapsHUB_userId');
        if (!stored) {
            stored = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mapsHUB_userId', stored);
        }
        return stored;
    });
    
    // Data
    const [selectedPlace, setSelectedPlace] = React.useState(null);
    const [markers, setMarkers] = React.useState([]);
    const [tourPoints, setTourPoints] = React.useState([]);
    const [connections, setConnections] = React.useState([]);
    const [mapInstance, setMapInstance] = React.useState(null);
    
    // UI Modes
    const [manualLocMode, setManualLocMode] = React.useState(false);
    const [activeTour, setActiveTour] = React.useState(null); 
    
    // Layer & View States
    const [mapStyle, setMapStyle] = React.useState('standard'); // Default to OSM Standard
    const [showPlaces, setShowPlaces] = React.useState(true);
    const [showTourPoints, setShowTourPoints] = React.useState(true);
    const [showTraffic, setShowTraffic] = React.useState(false);
    const [showCrossData, setShowCrossData] = React.useState(true); // Always ON as requested
    const [nearbyPreview, setNearbyPreview] = React.useState(null);
    const [is3DMode, setIs3DMode] = React.useState(false); 
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    
    // OSM Contribution State
    const [isOsmMode, setIsOsmMode] = React.useState(false);
    const [showUserContributions, setShowUserContributions] = React.useState(false);

    // Navigation State
    const [isNavigating, setIsNavigating] = React.useState(false);
    const [navDestination, setNavDestination] = React.useState(null);
    const [navStats, setNavStats] = React.useState({ distance: 0, speed: 0 });
    const [currentRoutePath, setCurrentRoutePath] = React.useState(null);
    
    // Offline UI
    const offlineManagerRef = React.useRef(null);
    
    // Error UI
    const [errorMessage, setErrorMessage] = React.useState(null);
    
    // Network Status
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    // --- EFFECTS ---

    React.useEffect(() => {
        loadData();
        checkAuth();
        
        // OSM Auth Check
        const checkOSM = async () => {
            // 1. Check if returning from redirect
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            
            if (code) {
                // We are coming back from OSM
                const session = await processOSMCode(code);
                if (session) {
                    setOsmSession(session);
                    alert("Conectado ao OpenStreetMap com sucesso!");
                }
            } else {
                // 2. Check local storage
                const session = getOSMSession();
                if (session) setOsmSession(session);
            }
        };
        checkOSM();

        const handleAuthEvent = (e) => {
            console.log('Auth Event:', e.detail);
            checkAuth();
        };

        window.addEventListener('auth-completed', handleAuthEvent);

        // Listen for open-osm-mode (from edit button)
        const handleOpenOsm = () => {
             setIsOsmMode(true);
             setIsSidebarOpen(false);
        };
        window.addEventListener('open-osm-mode', handleOpenOsm);
        
        // Network Listeners
        const handleOnline = () => { setIsOnline(true); loadData(); };
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                     // console.log('SW Registered', reg);
                })
                .catch(err => console.log('SW Failed', err));
        }

        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    setUserLocation(newLoc);
                    if (pos.coords.heading) {
                        setUserHeading(pos.coords.heading);
                    }
                    updateUserLocation(userId, {
                        lat: newLoc.lat,
                        lon: newLoc.lon,
                        heading: pos.coords.heading || 0,
                        speed: pos.coords.speed || 0,
                        name: currentUser ? currentUser.name : "Usuário App"
                    });
                    setErrorMessage(null);
                }, 
                err => console.warn("GPS Watch Warning:", err.message),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    React.useEffect(() => {
        if (isNavigating && userLocation) {
            setMapState({ 
                center: [userLocation.lat, userLocation.lon], 
                zoom: is3DMode ? 19 : 18 
            });
        }
    }, [userLocation, isNavigating, is3DMode]);

    React.useEffect(() => {
        if (isNavigating) return;
        const timeout = setTimeout(() => {
            localStorage.setItem('mapState', JSON.stringify(mapState));
        }, 1000); 
        return () => clearTimeout(timeout);
    }, [mapState, isNavigating]);

    const checkAuth = () => {
        if (window.limparURL && typeof window.limparURL.getDados === 'function') {
            const data = window.limparURL.getDados();
            if (data.temDados) {
                setCurrentUser({ name: data.userName, token: data.userToken });
            } else {
                setCurrentUser(null);
            }
        }
    };

    const handleLogin = () => {
        window.location.href = "https://code.codehub.ct.ws/API/continuar-conta?token=" + CODEHUB_APP_TOKEN;
    };

    const handleLogout = () => {
        if (window.limparURL && typeof window.limparURL.limparDados === 'function') {
            window.limparURL.limparDados();
            setCurrentUser(null);
        }
    };

    const loadData = async () => {
        const [placesData, connectionsData, tourData] = await Promise.all([
            fetchPlaces(),
            fetchConnections(),
            fetchTourPoints(),
            fetchAdminRoutes() // Fetch and cache admin routes automatically
        ]);

        // Filter logic moved to displayMarkers to handle currentUser changes dynamically
        if (placesData) {
            // We keep all data in state, and filter in render
            const allMarkers = Object.values(placesData).map(place => ({
                ...place,
                lat: parseFloat(place.lat),
                lon: parseFloat(place.lon),
                color: place.type === 'shop' ? 'green-500' : 'blue-500'
            }));
            setMarkers(allMarkers);
        }

        if (connectionsData) {
            setConnections(Object.values(connectionsData));
        }

        if (tourData) {
            const tPoints = tourData.map(p => ({
                ...p,
                type: 'tour-point',
                title: 'Tour 360°',
                color: 'blue-400'
            }));
            setTourPoints(tPoints);
        }
    };

    // --- HANDLERS ---

    const handleSearchResult = (result) => {
        if (!result) return;
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        setMapState({ center: [lat, lon], zoom: 16 });
        
        const placeData = {
            id: 'temp_' + Date.now(),
            lat,
            lon,
            title: result.display_name.split(',')[0],
            subtitle: formatAddress(result),
            type: result.type || 'place',
            display_name: result.display_name,
            address: result.address,
            status: 'approved'
        };
        setSelectedPlace(placeData);
    };

    // Dynamic Connections for Tours (including pending for author)
    const displayConnections = React.useMemo(() => {
        if (!showTourPoints) return [];
        
        let activeConns = [...connections];
        
        // Generate implicit connections from Tour Points logic (if they have links or sequences)
        // For simplicity, we can just connect sequential points if they look like a sequence
        // Or if we have explicit links in the point data (Editor saves links)
        
        const isAuthor = (item) => currentUser && (item.author === currentUser.name || item.author === 'User');

        const visiblePoints = tourPoints.filter(t => 
            t.status === 'approved' || (t.status === 'pending' && isAuthor(t))
        );

        // Sort by ID is a rough approximation of sequence if created sequentially
        // Better: look for 'links' array in point data
        visiblePoints.forEach(p => {
             if (p.links && p.links.length > 0) {
                 p.links.forEach(link => {
                     const target = visiblePoints.find(vp => vp.id === link.targetId);
                     if (target) {
                         activeConns.push({
                             from: [p.lat, p.lon],
                             to: [target.lat, target.lon],
                             color: p.status === 'pending' ? '#eab308' : '#93c5fd', // Yellow for pending lines
                             dashArray: p.status === 'pending' ? '5, 5' : null
                         });
                     }
                 });
             }
        });

        return activeConns;

    }, [connections, tourPoints, showTourPoints, currentUser]);

    const handleMenuClick = () => {
        setIsSidebarOpen(true);
    };
    
    const toggleOsmMode = () => {
        setIsOsmMode(!isOsmMode);
        setIsSidebarOpen(false);
    };

    const toggleContributions = () => {
        setShowUserContributions(!showUserContributions);
        setIsSidebarOpen(false);
    };

    const handleLocateMe = () => {
        setErrorMessage(null);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setMapState({ center: [latitude, longitude], zoom: 16 });
                setUserLocation({ lat: latitude, lon: longitude });
            }, (error) => {
                setErrorMessage(getGeoErrorMessage(error));
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    };

    const activateManualLocationMode = () => {
        setManualLocMode(true);
        setErrorMessage(null);
        alert("Toque no mapa para definir sua localização atual.");
    };

    const handleMapClick = async (e) => {
        // Dispatch global event for OSM Editor (Decoupled logic)
        if (isOsmMode) {
            const event = new CustomEvent('map-click', { detail: e.latlng });
            window.dispatchEvent(event);
            return;
        }

        if (isNavigating) return; 

        if (manualLocMode) {
            const newLoc = { lat: e.latlng.lat, lon: e.latlng.lng };
            setUserLocation(newLoc);
            setManualLocMode(false);
            return;
        }

        setSelectedPlace(null);
        setNearbyPreview(null);

        // Check for nearby tour points first (priority)
        if (tourPoints && tourPoints.length > 0) {
            let nearest = null;
            let minDist = Infinity;
            tourPoints.forEach(p => {
                const dist = L.latLng(p.lat, p.lon).distanceTo(e.latlng);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = p;
                }
            });
            if (nearest && minDist < 30) {
                setNearbyPreview(nearest);
                return; 
            }
        }

        const geoResult = await reverseGeocode(e.latlng.lat, e.latlng.lng);
        if (geoResult) {
            const placeData = {
                id: 'temp_' + Date.now(),
                lat: e.latlng.lat,
                lon: e.latlng.lng,
                title: geoResult.display_name.split(',')[0] || "Local Selecionado",
                subtitle: formatAddress(geoResult),
                type: 'location',
                display_name: geoResult.display_name,
                address: geoResult.address,
                status: 'temp'
            };
            setSelectedPlace(placeData);
        }
    };

    const handleMarkerClick = (marker) => {
        if (isNavigating) return;
        
        if (marker.type === 'tour-point') {
            setActiveTour({
                startPointId: marker.id,
                data: tourPoints
            });
        } else {
            setSelectedPlace(marker);
            setNearbyPreview(null);
        }
    };

    const handleSaveRoute = async (place) => {
        if (!userLocation) {
            alert("Precisamos da sua localização para traçar a rota.");
            handleLocateMe();
            return;
        }
        
        if (!navigator.onLine) {
            alert("Você precisa estar online para baixar uma nova rota.");
            return;
        }

        const confirmSave = confirm(`Deseja baixar a rota até "${place.title}"? \nIsso permitirá navegação detalhada mesmo sem internet.`);
        if (!confirmSave) return;

        try {
            // Fetch route data
            const route = await getRoute(userLocation, place);
            if (route) {
                const success = await saveRouteForOffline(route, userLocation, place);
                if (success) {
                    alert("Rota salva com sucesso! \nAgora você pode navegar para este local mesmo offline.");
                } else {
                    alert("Erro ao salvar rota (Armazenamento cheio?).");
                }
            } else {
                alert("Não foi possível calcular a rota para salvar.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao baixar rota.");
        }
    };

    const startNavigation = (destination) => {
        const dest = destination || selectedPlace;
        if (!dest) return;

        if (!userLocation) {
            handleLocateMe();
            setTimeout(() => {
                if (!userLocation && !manualLocMode) {
                     setErrorMessage("Localização não encontrada. Use o modo manual se o GPS falhar.");
                }
            }, 2000);
        } else {
            setIsNavigating(true);
            setIs3DMode(false);
            setNavDestination(dest);
            setSelectedPlace(null);
            
            // Auto hide tour points, show places
            setShowTourPoints(false);
            setShowPlaces(true);
            
            setMapState({ center: [userLocation.lat, userLocation.lon], zoom: 18 });
        }
    };

    const stopNavigation = () => {
        setIsNavigating(false);
        setIs3DMode(false);
        setNavDestination(null);
        setCurrentRoutePath(null); 
        setShowTourPoints(true); 
        setMapState(prev => ({ ...prev, zoom: 16 }));
    };

    const handleDownloadClick = () => {
        if (offlineManagerRef.current) {
            offlineManagerRef.current.estimateDownload();
        }
    };

    const displayMarkers = React.useMemo(() => {
        let list = [];
        
        const isAuthor = (item) => currentUser && (item.author === currentUser.name || item.author === 'User'); // 'User' is fallback

        // Filter Places
        if (showPlaces) {
            const visiblePlaces = markers.filter(m => 
                m.status === 'approved' || (m.status === 'pending' && isAuthor(m))
            ).map(m => m.status === 'pending' ? { ...m, color: 'yellow-500', title: `${m.title} (Pendente)` } : m);
            
            list = [...list, ...visiblePlaces];
        }

        // Filter Tour Points
        if (showTourPoints) {
            const visibleTours = tourPoints.filter(t => 
                t.status === 'approved' || (t.status === 'pending' && isAuthor(t))
            ).map(t => t.status === 'pending' ? { ...t, color: 'yellow-400', title: 'Tour (Em Análise)' } : t);
            
            list = [...list, ...visibleTours];
        }
        
        if (selectedPlace && selectedPlace.id && selectedPlace.id.toString().startsWith('temp_')) {
             if (!list.find(m => m.id === selectedPlace.id)) {
                 list.push({ ...selectedPlace, color: 'red-600' });
             }
        }
        
        if (userLocation) {
            list.push({
                id: 'user_location',
                lat: userLocation.lat,
                lon: userLocation.lon,
                type: 'user', 
                title: 'Você',
                color: 'blue-600'
            });
        }

        return list;
    }, [markers, tourPoints, selectedPlace, showPlaces, showTourPoints, userLocation]);

    
    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-200">
            {!isOnline && (
                <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-xs py-1 text-center z-[2000] font-medium flex items-center justify-center gap-2">
                    <div className="icon-wifi-off w-3 h-3"></div>
                    Modo Offline Ativo - Usando dados salvos
                </div>
            )}
        
            {isNavigating && userLocation && navDestination && (
                <Navigation 
                    startPoint={userLocation}
                    endPoint={navDestination}
                    userHeading={userHeading}
                    onStop={stopNavigation}
                    onUpdateStats={setNavStats}
                    onRouteCalculated={(geometry) => setCurrentRoutePath(geometry)}
                />
            )}
            
            <OfflineManager 
                ref={offlineManagerRef}
                mapInstance={mapInstance}
                onDownloadComplete={() => alert('Mapa salvo para uso offline!')}
            />

            {errorMessage && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-md animate-in slide-in-from-top-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                            <div className="icon-triangle-alert text-red-500 mt-0.5"></div>
                            <div className="flex-1">
                                <h4 className="text-red-800 font-bold text-sm">Problema de Localização</h4>
                                <p className="text-red-600 text-xs">{errorMessage}</p>
                            </div>
                            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
                                <div className="icon-x w-4 h-4"></div>
                            </button>
                        </div>
                        <button 
                            onClick={activateManualLocationMode}
                            className="w-full bg-red-100 text-red-700 py-2 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                        >
                            Definir Localização Manualmente
                        </button>
                    </div>
                </div>
            )}

            {!isNavigating && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] hidden md:block pointer-events-none">
                    <div className="bg-white px-4 py-1 rounded-full shadow-sm border border-gray-200 flex items-center gap-2">
                        <div className="icon-map text-blue-600"></div>
                        <span className="font-bold text-gray-800">mapsHUB</span>
                    </div>
                </div>
            )}
            
            {manualLocMode && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1500] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-pulse pointer-events-none">
                    Toque no mapa para definir sua posição
                </div>
            )}

            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                currentUser={currentUser}
                onLogin={handleLogin}
                onLogout={handleLogout}
                osmSession={osmSession}
                onOSMLogin={loginOSM}
                onOSMLogout={logoutOSM}
                onOpenOsmMode={toggleOsmMode}
                onOpenContributions={toggleContributions}
            />
            
            {showUserContributions && (
                <UserContributions onClose={() => setShowUserContributions(false)} />
            )}

            <OsmContribution 
                isActive={isOsmMode}
                onClose={() => setIsOsmMode(false)}
                userLocation={userLocation}
                osmSession={osmSession}
                onLoginReq={loginOSM}
            />

            <LeafletMap 
                center={mapState.center} 
                zoom={mapState.zoom} 
                markers={displayMarkers}
                connections={displayConnections}
                routePath={currentRoutePath}
                mapStyle={mapStyle}
                showTraffic={showTraffic}
                showCrossData={showCrossData}
                isNavigating={isNavigating}
                is3DMode={is3DMode} 
                heading={userHeading}
                onMapLoad={setMapInstance}
                onClick={handleMapClick}
                onMarkerClick={handleMarkerClick}
            />

            {!isNavigating && (
                <>
                    <SearchBox 
                        onSelectResult={handleSearchResult} 
                        onMenuClick={handleMenuClick}
                        userLocation={userLocation}
                    />

                    <LayerControl 
                        mapStyle={mapStyle}
                        setMapStyle={setMapStyle}
                        showPlaces={showPlaces}
                        setShowPlaces={setShowPlaces}
                        showTourPoints={showTourPoints}
                        setShowTourPoints={setShowTourPoints}
                        showTraffic={showTraffic}
                        setShowTraffic={setShowTraffic}
                        showCrossData={showCrossData}
                        setShowCrossData={setShowCrossData}
                    />

                    <UserPlaces 
                        currentUserLoc={userLocation}
                        onSelectLocation={(loc) => {
                            setMapState({ center: [loc.lat, loc.lon], zoom: 17 });
                            setSelectedPlace({
                                ...loc,
                                id: 'saved_place_' + Date.now(),
                                title: loc.title || 'Local Salvo',
                                subtitle: 'Localização pessoal'
                            });
                        }}
                    />
                </>
            )}

            {activeTour && (
                <PanoramaViewer 
                    tourData={activeTour.data}
                    initialPointId={activeTour.startPointId}
                    onClose={() => setActiveTour(null)}
                />
            )}

            <PlaceDetail 
                place={selectedPlace ? { ...selectedPlace, onSaveOffline: () => handleSaveRoute(selectedPlace) } : null}
                onClose={() => setSelectedPlace(null)}
                onDirections={() => startNavigation(selectedPlace)}
            />
            
            <NearbyPreview 
                point={nearbyPreview}
                onEnter={() => {
                    setActiveTour({
                        startPointId: nearbyPreview.id,
                        data: tourPoints
                    });
                    setNearbyPreview(null);
                }}
                onClose={() => setNearbyPreview(null)}
            />

            <Controls 
                onZoomIn={() => mapInstance && mapInstance.zoomIn()}
                onZoomOut={() => mapInstance && mapInstance.zoomOut()}
                onLocateMe={handleLocateMe}
                onDownloadMap={handleDownloadClick}
                isNavigating={isNavigating} 
                is3DMode={is3DMode}
                onToggle3D={() => setIs3DMode(!is3DMode)}
            />

            <div className="absolute bottom-1 left-2 z-[500] text-[10px] text-gray-500 bg-white bg-opacity-50 px-2 rounded pointer-events-none">
                © mapsHUB 2026
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);