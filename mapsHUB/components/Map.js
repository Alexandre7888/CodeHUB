function LeafletMap({ center, zoom, markers = [], connections = [], routePath = null, mapStyle = 'standard', showTraffic = false, isNavigating = false, is3DMode = false, heading = 0, onMapLoad, onMarkerClick, onClick }) {
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);
    const tileLayerRef = React.useRef(null);
    const labelLayerRef = React.useRef(null);
    const trafficLayerRef = React.useRef(null);
    const markersLayerRef = React.useRef(null);
    const linesLayerRef = React.useRef(null);
    const routeLayerRef = React.useRef(null); // Layer for Blue Route Line
    const resizeObserverRef = React.useRef(null);

    // Refs for handlers to avoid effect dependency loops
    const onClickRef = React.useRef(onClick);
    const onMarkerClickRef = React.useRef(onMarkerClick);

    React.useEffect(() => {
        onClickRef.current = onClick;
        onMarkerClickRef.current = onMarkerClick;
    }, [onClick, onMarkerClick]);

    // Initialize Map
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
        
        // Layer Groups
        linesLayerRef.current = L.layerGroup().addTo(map); // Connections (360)
        routeLayerRef.current = L.layerGroup().addTo(map); // Navigation Route (Blue)
        markersLayerRef.current = L.layerGroup().addTo(map); // Markers on top
        
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
        };
    }, []);

    // Handle Map Style (Tile Layer) Changes
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Cleanup old layers
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

        if (mapStyle === 'satellite' || mapStyle === 'hybrid') {
            tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            options = {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
                crossOrigin: true
            };
        }

        tileLayerRef.current = L.tileLayer(tileUrl, options).addTo(mapInstanceRef.current);
        tileLayerRef.current.bringToBack();

        // If Hybrid, add Label Overlay
        if (mapStyle === 'hybrid') {
            const labelUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
            labelLayerRef.current = L.tileLayer(labelUrl, {
                maxZoom: 19,
                zIndex: 400 
            }).addTo(mapInstanceRef.current);
        }

    }, [mapStyle]);

    // Handle Traffic Layer
    React.useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (showTraffic) {
             if (!trafficLayerRef.current) {
                 // Google Traffic Tiles: Shows Red/Yellow/Green lines overlay
                 trafficLayerRef.current = L.tileLayer('https://mt0.google.com/vt?lyrs=h,traffic&x={x}&y={y}&z={z}', {
                     maxZoom: 20,
                     opacity: 1, 
                     crossOrigin: true,
                     zIndex: 450, // Between tiles and markers
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
    }, [center[0], center[1], zoom]);

    // Render Markers
    React.useEffect(() => {
        if (!markersLayerRef.current || !mapInstanceRef.current) return;
        markersLayerRef.current.clearLayers();

        markers.forEach(marker => {
            const isUserInNav = isNavigating && marker.type === 'user';
            
            let iconHtml;
            let iconSize = [40, 40];
            let iconAnchor = [20, 40];

            if (isUserInNav) {
                // 3D Car Marker
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
    }, [markers, isNavigating, heading]);

    // Render Route Line (Blue)
    React.useEffect(() => {
        if (!routeLayerRef.current || !mapInstanceRef.current) return;
        routeLayerRef.current.clearLayers();

        if (routePath && routePath.length > 0) {
            // "Normal Blue Line" for Route
            
            // White outline for contrast
            L.polyline(routePath, {
                color: 'white',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(routeLayerRef.current);

            // Blue inner line
            L.polyline(routePath, {
                color: '#2563eb', // Blue 600
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(routeLayerRef.current);
        }
    }, [routePath]);

    // Render Connections (360)
    React.useEffect(() => {
        if (!linesLayerRef.current || !mapInstanceRef.current) return;
        linesLayerRef.current.clearLayers();

        connections.forEach(conn => {
            if (conn.from && conn.to) {
                L.polyline([conn.from, conn.to], {
                    color: '#93c5fd', 
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '5, 10'
                }).addTo(linesLayerRef.current);
            }
        });
    }, [connections]);

    return (
        <div className="map-container-3d relative w-full h-full">
            <div 
                ref={mapRef} 
                className={`absolute inset-0 z-0 bg-gray-200 transition-all duration-1000 ease-in-out ${isNavigating && is3DMode ? 'map-3d-mode' : ''}`} 
                data-name="leaflet-map-container" 
            />
            {isNavigating && is3DMode && (
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-200 to-transparent pointer-events-none z-[400] opacity-50"></div>
            )}
        </div>
    );
}