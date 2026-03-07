function LeafletMap({ center, zoom, markers = [], connections = [], routePath = null, mapStyle = 'standard', showTraffic = false, showCrossData = false, isNavigating = false, is3DMode = false, heading = 0, onMapLoad, onMarkerClick, onClick }) {
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);
    const tileLayerRef = React.useRef(null);
    const labelLayerRef = React.useRef(null);
    const trafficLayerRef = React.useRef(null);
    const crossDataLayerRef = React.useRef(null);
    const markersLayerRef = React.useRef(null);
    const linesLayerRef = React.useRef(null);
    const routeLayerRef = React.useRef(null); 
    const osmBuildingsRef = React.useRef(null); 
    const resizeObserverRef = React.useRef(null);

    // Refs for handlers
    const onClickRef = React.useRef(onClick);
    const onMarkerClickRef = React.useRef(onMarkerClick);

    React.useEffect(() => {
        onClickRef.current = onClick;
        onMarkerClickRef.current = onMarkerClick;
    }, [onClick, onMarkerClick]);

    // Initialize Leaflet Map
    React.useEffect(() => {
        if (!mapRef.current) return;
        if (mapInstanceRef.current) return; 

        const map = L.map(mapRef.current, {
            zoomControl: false, 
            attributionControl: false,
            fadeAnimation: true,
            markerZoomAnimation: true,
            preferCanvas: true,
            zoomAnimation: true
        }).setView(center, zoom);

        L.control.attribution({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;
        window.mapInstanceGlobal = map; 
        
        // Layer Groups
        linesLayerRef.current = L.layerGroup().addTo(map); 
        routeLayerRef.current = L.layerGroup().addTo(map); 
        markersLayerRef.current = L.layerGroup().addTo(map); 
        
        map.on('click', (e) => {
            if (onClickRef.current) onClickRef.current(e);
        });

        if (onMapLoad) onMapLoad(map);

        resizeObserverRef.current = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        });
        resizeObserverRef.current.observe(mapRef.current);
        
        return () => {
            if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
            if (mapInstanceRef.current) {
                mapInstanceRef.current.off();
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (osmBuildingsRef.current) {
                osmBuildingsRef.current.destroy();
                osmBuildingsRef.current = null;
            }
        };
    }, []);

    // Handle Map Style (Tile Layer) Changes
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (tileLayerRef.current) mapInstanceRef.current.removeLayer(tileLayerRef.current);
        if (labelLayerRef.current) {
            mapInstanceRef.current.removeLayer(labelLayerRef.current);
            labelLayerRef.current = null;
        }

        let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        let options = {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
            crossOrigin: true
        };

        if (mapStyle === 'google-streets') {
            tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
            options = { maxZoom: 20, attribution: '&copy; Google Maps', crossOrigin: true };
        } else if (mapStyle === 'google-hybrid') {
            tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
            options = { maxZoom: 20, attribution: '&copy; Google Maps', crossOrigin: true };
        } else if (mapStyle === 'satellite') {
            // Using Esri World Imagery as "OSM Satellite" alternative
            tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            options = { maxZoom: 19, attribution: '&copy; Esri World Imagery', crossOrigin: true };
        }

        tileLayerRef.current = L.tileLayer(tileUrl, options).addTo(mapInstanceRef.current);
        tileLayerRef.current.bringToBack();

        if (labelLayerRef.current) {
            mapInstanceRef.current.removeLayer(labelLayerRef.current);
            labelLayerRef.current = null;
        }

    }, [mapStyle]);

    // Handle Traffic Layer
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (showTraffic) {
             if (!trafficLayerRef.current) {
                 trafficLayerRef.current = L.tileLayer('https://mt0.google.com/vt?lyrs=h,traffic&x={x}&y={y}&z={z}', {
                     maxZoom: 20,
                     opacity: 1, 
                     crossOrigin: true,
                     zIndex: 100,
                     attribution: 'Traffic Data &copy; Google'
                 }).addTo(mapInstanceRef.current);
             }
        } else {
             if (trafficLayerRef.current) {
                 mapInstanceRef.current.removeLayer(trafficLayerRef.current);
                 trafficLayerRef.current = null;
             }
        }
    }, [showTraffic]);

    // Handle Cross Data Layer
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (crossDataLayerRef.current) {
            mapInstanceRef.current.removeLayer(crossDataLayerRef.current);
            crossDataLayerRef.current = null;
        }

        if (showCrossData) {
            let overlayUrl = '';
            let options = {
                maxZoom: 20,
                opacity: 0.9,
                crossOrigin: true,
                zIndex: 90
            };

            if (mapStyle === 'standard') {
                overlayUrl = 'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}';
                options.attribution = '&copy; Google Maps (Overlay)';
            } else if (mapStyle.includes('google')) {
                overlayUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';
                options.attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
                options.subdomains = 'abcd';
            } else if (mapStyle === 'satellite') {
                // Use a light label overlay for satellite
                overlayUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';
                options.attribution = '&copy; OpenStreetMap &copy; CARTO';
                options.subdomains = 'abcd';
            }

            if (overlayUrl) {
                crossDataLayerRef.current = L.tileLayer(overlayUrl, options).addTo(mapInstanceRef.current);
            }
        }
    }, [showCrossData, mapStyle]);

    // Update View & 3D Tilt Logic
    React.useEffect(() => {
        if (mapInstanceRef.current) {
            const currentCenter = mapInstanceRef.current.getCenter();
            const currentZoom = mapInstanceRef.current.getZoom();
            
            const dist = Math.sqrt(
                Math.pow(currentCenter.lat - center[0], 2) + 
                Math.pow(currentCenter.lng - center[1], 2)
            );

            if (dist > 0.0001 || currentZoom !== zoom) {
                if (dist > 0.1) {
                    mapInstanceRef.current.flyTo(center, zoom, { duration: 2 });
                } else {
                    mapInstanceRef.current.setView(center, zoom, { animate: true, duration: 1.5 });
                }
            }
        }
        
        // Sync OSMBuildings position if active
        if (is3DMode && osmBuildingsRef.current) {
             osmBuildingsRef.current.setPosition({ latitude: center[0], longitude: center[1] });
             osmBuildingsRef.current.setZoom(zoom);
        }
    }, [center[0], center[1], zoom]);

    // --- RENDER MARKERS & LINES (Leaflet) ---
    React.useEffect(() => {
        if (!markersLayerRef.current || !linesLayerRef.current || !mapInstanceRef.current) return;
        markersLayerRef.current.clearLayers();
        linesLayerRef.current.clearLayers();

        const tourMarkers = markers.filter(m => m.type === 'tour-point');
        const standardMarkers = markers.filter(m => m.type !== 'tour-point');

        connections.forEach(conn => {
            if (conn.from && conn.to) {
                const line = L.polyline([conn.from, conn.to], {
                    color: '#3b82f6', 
                    weight: 6,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'tour-line-path'
                }).addTo(linesLayerRef.current);

                line.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    let nearest = null;
                    let minDist = Infinity;
                    tourMarkers.forEach(p => {
                        const dist = L.latLng(p.lat, p.lon).distanceTo(e.latlng);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = p;
                        }
                    });
                    if (nearest && minDist < 50) {
                         if (onMarkerClickRef.current) onMarkerClickRef.current(nearest);
                    }
                });
                
                L.polyline([conn.from, conn.to], {
                    color: 'transparent',
                    weight: 20,
                    opacity: 0
                }).addTo(linesLayerRef.current).on('click', (e) => {
                     L.DomEvent.stopPropagation(e);
                     let nearest = null;
                     let minDist = Infinity;
                     tourMarkers.forEach(p => {
                        const dist = L.latLng(p.lat, p.lon).distanceTo(e.latlng);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = p;
                        }
                    });
                    if (nearest && minDist < 50) {
                         if (onMarkerClickRef.current) onMarkerClickRef.current(nearest);
                    }
                });
            }
        });

        standardMarkers.forEach(marker => {
            const isUserInNav = isNavigating && marker.type === 'user';
            
            let iconHtml;
            let iconSize = [40, 40];
            let iconAnchor = [20, 40];

            if (isUserInNav) {
                iconHtml = `
                    <div class="relative w-20 h-20 flex items-center justify-center" style="transform: rotate(${heading}deg); transition: transform 0.5s linear;">
                        <div class="relative z-10 w-14 h-24 bg-gradient-to-b from-blue-500 to-blue-700 rounded-2xl border-2 border-white shadow-2xl flex flex-col items-center justify-center transform hover:scale-105 transition-transform">
                             <div class="w-12 h-8 bg-blue-900 rounded-sm mb-1 opacity-60 border border-blue-400"></div>
                             <div class="w-12 h-8 bg-blue-600 rounded-sm"></div>
                             <div class="w-12 h-5 bg-blue-900 rounded-sm mt-1 opacity-60 border border-blue-400"></div>
                        </div>
                    </div>
                `;
                iconSize = [80, 80];
                iconAnchor = [40, 40];
            } else {
                iconHtml = createMarkerHtml(marker.type || 'default', marker.color || 'red-500');
            }

            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: iconHtml,
                iconSize: iconSize,
                iconAnchor: iconAnchor
            });

            const leafletMarker = L.marker([marker.lat, marker.lon], { icon: customIcon });
            
            if (marker.title && !isUserInNav) {
                leafletMarker.bindTooltip(marker.title, { direction: 'top', offset: [0, -30] });
            }

            leafletMarker.on('click', (e) => {
                L.DomEvent.stopPropagation(e); 
                if (onMarkerClickRef.current) onMarkerClickRef.current(marker);
            });

            markersLayerRef.current.addLayer(leafletMarker);
        });
    }, [markers, connections, isNavigating, heading]);

    // Render Route Line (Leaflet)
    React.useEffect(() => {
        if (!routeLayerRef.current || !mapInstanceRef.current) return;
        routeLayerRef.current.clearLayers();

        if (routePath && routePath.length > 0) {
            L.polyline(routePath, {
                color: 'white',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(routeLayerRef.current);

            L.polyline(routePath, {
                color: '#2563eb', // Blue 600
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(routeLayerRef.current);
        }
    }, [routePath]);

    // --- OSM BUILDINGS 3D INTEGRATION ---
    React.useEffect(() => {
        const osmContainer = document.getElementById('osm-buildings-container');
        
        if (is3DMode) {
            if (!osmBuildingsRef.current && osmContainer && window.OSMBuildings) {
                try {
                    // Initialize OSMBuildings
                    const map = new OSMBuildings({
                        container: 'osm-buildings-container',
                        position: { latitude: center[0], longitude: center[1] },
                        zoom: zoom,
                        minZoom: 15,
                        maxZoom: 20,
                        tilt: 45, // Enhanced tilt for better 3D effect
                        rotation: 0
                    });

                    // Select Tile Source based on mapStyle
                    let tileSource = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
                    if (mapStyle === 'satellite') {
                        tileSource = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
                    }

                    map.addMapTiles(tileSource);
                    map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json');
                    
                    osmBuildingsRef.current = map;
                } catch (e) {
                    console.error("OSMBuildings Init Failed:", e);
                }
            } 
            
            // Inject Route into 3D Map
            if (osmBuildingsRef.current && routePath && routePath.length > 0) {
                // Convert Leaflet [[lat, lon], ...] to GeoJSON [[lon, lat], ...]
                const coordinates = routePath.map(p => [p[1], p[0]]);
                
                const geoJson = {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {
                            color: '#2563eb',
                            width: 6,
                            height: 2 // Lift it slightly off ground to avoid z-fighting
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    }]
                };
                
                // Add the route line
                osmBuildingsRef.current.addGeoJSON(geoJson);
            }

        } else {
            // Destroy if not 3D mode
            if (osmBuildingsRef.current) {
                osmBuildingsRef.current.destroy();
                osmBuildingsRef.current = null;
                // Ensure container is clean
                if (osmContainer) osmContainer.innerHTML = '';
            }
        }
    }, [is3DMode, routePath, mapStyle]); // Re-run when mapStyle changes to update tiles

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Standard Leaflet Map */}
            <div 
                ref={mapRef} 
                className={`absolute inset-0 z-0 bg-gray-200 transition-opacity duration-500 ${is3DMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                data-name="leaflet-map-container" 
            />
            
            {/* OSMBuildings 3D Overlay */}
            <div 
                id="osm-buildings-container"
                className={`absolute inset-0 z-10 bg-gray-200 transition-opacity duration-500 ${is3DMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            ></div>
            
            {isNavigating && is3DMode && (
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-200 to-transparent pointer-events-none z-[400] opacity-50"></div>
            )}
        </div>
    );
}