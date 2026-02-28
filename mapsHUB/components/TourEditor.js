function TourEditor({ currentUser }) {
    // State for Map & Points
    const [startCoords, setStartCoords] = React.useState({ lat: -23.5505, lon: -46.6333 });
    const [isMapReady, setIsMapReady] = React.useState(false);
    const [points, setPoints] = React.useState([]); 
    const [selectedPointId, setSelectedPointId] = React.useState(null);
    
    // Video Processing State
    const [isVideoMode, setIsVideoMode] = React.useState(false);
    const [extractedFrames, setExtractedFrames] = React.useState([]);
    const [isProcessingVideo, setIsProcessingVideo] = React.useState(false);
    const [framesToExtract, setFramesToExtract] = React.useState(0); // 0 = Auto
    const [placingFrameIndex, setPlacingFrameIndex] = React.useState(null); // Which frame we are currently placing
    const isStudio = window.location.pathname.includes('studio.html');
    
    // State for Editor
    const [editorMode, setEditorMode] = React.useState('view'); // 'view', 'blur', 'link'
    const [isDrawing, setIsDrawing] = React.useState(false);
    
    // Drawing States
    const [drawStart, setDrawStart] = React.useState(null); // For legacy Rect or click detection
    const [tempRect, setTempRect] = React.useState(null); // Legacy Rect
    const [currentPath, setCurrentPath] = React.useState([]); // New Brush Path
    const [tempLinkLoc, setTempLinkLoc] = React.useState(null); 
    
    // Refs
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);
    const markersRef = React.useRef({}); 
    const linesLayerRef = React.useRef(null);
    const imageCanvasRef = React.useRef(null);

    // --- MAP LOGIC ---

    React.useEffect(() => {
        loadTourData();
    }, []);

    const loadTourData = async () => {
        try {
            const existingPoints = await fetchTourPoints();
            if (existingPoints && existingPoints.length > 0) {
                setPoints(existingPoints);
                if (existingPoints[0].lat) {
                    setStartCoords({ lat: existingPoints[0].lat, lon: existingPoints[0].lon });
                }
            }
        } catch (error) {
            console.error("Error loading tour data", error);
        }
    };

    // Initialize Map
    React.useEffect(() => {
        if (!isMapReady) {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markersRef.current = {};
                linesLayerRef.current = null;
            }
            return;
        }

        if (!mapRef.current) return;
        
        let resizeObserver;

        try {
            // Validate coordinates to prevent map crash
            const safeLat = (startCoords.lat && !isNaN(startCoords.lat)) ? startCoords.lat : -23.5505;
            const safeLon = (startCoords.lon && !isNaN(startCoords.lon)) ? startCoords.lon : -46.6333;

            const map = L.map(mapRef.current, {
                maxZoom: 23 // Allow digital zoom deep into the map
            }).setView([safeLat, safeLon], 19);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxNativeZoom: 19, // Tiles exist up to 19
                maxZoom: 23 // We scale them up to 23
            }).addTo(map);

            linesLayerRef.current = L.layerGroup().addTo(map);
            mapInstanceRef.current = map;

            map.on('click', handleMapClick);
            
            resizeObserver = new ResizeObserver(() => {
                if (map) map.invalidateSize();
            });
            resizeObserver.observe(mapRef.current);
            
            updateMapMarkers();
        } catch (e) {
            console.error("Map init error", e);
        }

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markersRef.current = {};
            }
        };
    }, [isMapReady]);
    
    React.useEffect(() => {
        if (isMapReady && mapInstanceRef.current) {
            updateMapMarkers();
        }
    }, [points, selectedPointId]);
    
    const updateMapMarkers = () => {
        if (!mapInstanceRef.current || !linesLayerRef.current) return;

        linesLayerRef.current.clearLayers();
        if (points.length > 1) {
            const sortedPoints = [...points].sort((a, b) => parseInt(a.id) - parseInt(b.id));
            
            for (let i = 0; i < sortedPoints.length - 1; i++) {
                const p1 = sortedPoints[i];
                const p2 = sortedPoints[i+1];
                if (Math.abs(p1.lat - p2.lat) < 0.01) {
                    L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], { 
                        color: '#3b82f6', 
                        weight: 3, 
                        opacity: 0.6,
                        dashArray: '5, 5'
                    }).addTo(linesLayerRef.current);
                }
            }
        }

        const activeIds = new Set(points.map(p => p.id));

        Object.keys(markersRef.current).forEach(id => {
            if (!activeIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        points.forEach((p, index) => {
            const isSelected = p.id === selectedPointId;
            const hasPhoto = !!p.photo;
            
            const iconHtml = `
                <div class="flex items-center justify-center w-8 h-8 ${isSelected ? 'bg-yellow-500 scale-110 z-[1000]' : (hasPhoto ? 'bg-blue-600' : 'bg-gray-500')} text-white rounded-full border-2 border-white shadow-lg font-bold text-sm transition-transform duration-200">
                    ${index + 1}
                </div>
            `;
            
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: iconHtml,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            if (markersRef.current[p.id]) {
                const marker = markersRef.current[p.id];
                marker.setLatLng([p.lat, p.lon]);
                marker.setIcon(icon);
                marker.setZIndexOffset(isSelected ? 1000 : 0);
            } else {
                const marker = L.marker([p.lat, p.lon], { 
                    icon,
                    draggable: true,
                    autoPan: true
                }).addTo(mapInstanceRef.current);

                marker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    setSelectedPointId(p.id);
                });

                marker.on('dragend', (e) => {
                    const newPos = e.target.getLatLng();
                    setPoints(currentPoints => 
                        currentPoints.map(pt => pt.id === p.id ? { ...pt, lat: newPos.lat, lon: newPos.lng } : pt)
                    );
                });

                markersRef.current[p.id] = marker;
            }
        });
    };

    const handleMapClick = (e) => {
        if (placingFrameIndex !== null && extractedFrames[placingFrameIndex]) {
            const frame = extractedFrames[placingFrameIndex];
            const newPoint = {
                id: Date.now().toString(),
                lat: e.latlng.lat,
                lon: e.latlng.lng,
                photo: frame.image, 
                blurs: [],
                links: [],
                status: isStudio ? 'pending' : 'approved', 
                author: currentUser ? currentUser.name : (isStudio ? 'User' : 'Admin')
            };
            
            setPoints(prev => {
                const updatedPrev = [...prev, newPoint];
                return updatedPrev;
            });
            
            setSelectedPointId(newPoint.id);
            
            if (placingFrameIndex < extractedFrames.length - 1) {
                setPlacingFrameIndex(placingFrameIndex + 1);
            } else {
                setPlacingFrameIndex(null); 
            }
            return;
        }

        const newPoint = {
            id: Date.now().toString(),
            lat: e.latlng.lat,
            lon: e.latlng.lng,
            photo: null,
            blurs: [],
            links: [],
            status: isStudio ? 'pending' : 'approved',
            author: currentUser ? currentUser.name : (isStudio ? 'User' : 'Admin')
        };
        setPoints(prev => [...prev, newPoint]);
        setSelectedPointId(newPoint.id);
    };

    // --- VIDEO PROCESSING ---

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsProcessingVideo(true);
        setIsVideoMode(true);
        setExtractedFrames([]);
        
        const videoUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const calculatedFrames = Math.min(Math.max(Math.floor(duration / 2), 5), 50);
            const count = framesToExtract > 0 ? framesToExtract : calculatedFrames;

            const frames = [];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const interval = duration / (count - 1 || 1);
            
            const targetWidth = 1024; 
            const aspect = video.videoWidth / video.videoHeight;
            canvas.width = targetWidth;
            canvas.height = targetWidth / aspect;

            for (let i = 0; i < count; i++) {
                const time = Math.min(i * interval, duration - 0.1);
                
                video.currentTime = time;
                await new Promise(r => {
                    const seekHandler = () => {
                        video.removeEventListener('seeked', seekHandler);
                        r();
                    };
                    video.addEventListener('seeked', seekHandler);
                    // Fallback to avoid hanging
                    setTimeout(() => {
                        video.removeEventListener('seeked', seekHandler);
                        r();
                    }, 500);
                });
                
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                
                frames.push({
                    id: i,
                    time: time.toFixed(1),
                    image: dataUrl
                });
            }
            
            setExtractedFrames(frames);
            setIsProcessingVideo(false);
            setPlacingFrameIndex(0); 
            
            URL.revokeObjectURL(videoUrl);
        };
    };

    const handleFrameClick = (frame, index) => {
        if (selectedPointId) {
            const point = points.find(p => p.id === selectedPointId);
            if (isStudio && point && point.status === 'approved') {
                setPlacingFrameIndex(index);
                setSelectedPointId(null);
                return;
            }

            const confirmUpdate = confirm(`Substituir a foto do ponto selecionado pelo Frame #${index + 1}?`);
            if (confirmUpdate) {
                updatePoint(selectedPointId, { photo: frame.image });
            } else {
                setPlacingFrameIndex(index);
                setSelectedPointId(null); 
            }
        } else {
            setPlacingFrameIndex(index);
        }
    };

    // --- EDITOR LOGIC ---

    const selectedPoint = React.useMemo(() => points.find(p => p.id === selectedPointId), [points, selectedPointId]);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPointId) return;

        const point = points.find(p => p.id === selectedPointId);
        if (isStudio && point && point.status === 'approved') {
            alert("Você não tem permissão para alterar a foto de um ponto já aprovado.");
            return;
        }

        try {
            const base64 = await compressImage(file, 2048, 0.6); 
            updatePoint(selectedPointId, { photo: base64 });
        } catch (err) {
            alert("Erro ao carregar imagem.");
        }
    };

    const updatePoint = (id, data) => {
        setPoints(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    };

    const deletePoint = (id) => {
        const point = points.find(p => p.id === id);
        if (isStudio && point && point.status === 'approved') {
            alert("Você não pode excluir pontos que já foram aprovados pelo administrador.");
            return;
        }

        if (confirm("Tem certeza que deseja remover este ponto?")) {
            setPoints(prev => prev.filter(p => p.id !== id));
            if (selectedPointId === id) setSelectedPointId(null);
        }
    };

    // Canvas Interaction
    const handleCanvasMouseDown = (e) => {
        if (!editorMode || editorMode === 'view' || !selectedPoint?.photo) return;
        
        const rect = imageCanvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; 
        const y = (e.clientY - rect.top) / rect.height; 

        if (editorMode === 'blur') {
            setIsDrawing(true);
            setCurrentPath([{x, y}]); // Start new path
        } else if (editorMode === 'link') {
            setTempLinkLoc({ x, y });
        }
    };

    const confirmLink = (targetId) => {
        if (!tempLinkLoc || !selectedPointId) return;
        
        const targetPoint = points.find(p => p.id === targetId);
        const targetIndex = points.findIndex(p => p.id === targetId);
        
        if (targetPoint) {
            const newLink = {
                id: Date.now(),
                x: tempLinkLoc.x,
                y: tempLinkLoc.y,
                targetId: targetId,
                label: `Ir para Ponto #${targetIndex + 1}`
            };
            const currentLinks = selectedPoint.links || [];
            updatePoint(selectedPointId, { links: [...currentLinks, newLink] });
        }
        setTempLinkLoc(null);
        setEditorMode('view');
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing) return;
        
        const rect = imageCanvasRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        if (editorMode === 'blur') {
            // Add point to current path
            setCurrentPath(prev => [...prev, { x: currentX, y: currentY }]);
        }
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        
        if (editorMode === 'blur') {
             if (currentPath.length > 0) {
                 const currentBlurs = selectedPoint.blurs || [];
                 // Save as a Brush Path
                 updatePoint(selectedPointId, { 
                     blurs: [...currentBlurs, { 
                         id: Date.now(), 
                         type: 'brush', 
                         points: currentPath 
                     }] 
                 });
             }
             setCurrentPath([]);
        }
    };

    const saveAndBlurImage = async () => {
        if (!selectedPoint || !selectedPoint.photo || !selectedPoint.blurs || selectedPoint.blurs.length === 0) return;
        
        const confirmed = confirm("Isso irá aplicar o desfoque permanentemente na imagem. Deseja continuar?");
        if (!confirmed) return;

        try {
            const newImage = await applyBlurToImage(selectedPoint.photo, selectedPoint.blurs);
            updatePoint(selectedPointId, { photo: newImage, blurs: [] });
            alert("Desfoque aplicado com sucesso!");
        } catch (e) {
            console.error(e);
            alert("Erro ao processar imagem.");
        }
    };

    // --- RENDER HELPERS ---

    const renderOverlay = () => {
        if (!selectedPoint) return null;
        const links = selectedPoint.links || [];
        const blurs = selectedPoint.blurs || [];

        return (
            <div className="absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Render Saved Blurs */}
                    {blurs.map(blur => {
                        if (blur.type === 'brush' && blur.points) {
                             // Convert normalized points to percentage for SVG
                             const pathData = blur.points.map((p, i) => 
                                 `${i===0?'M':'L'} ${p.x * 100}% ${p.y * 100}%`
                             ).join(' ');
                             
                             return (
                                 <g key={blur.id} className="pointer-events-auto cursor-pointer group">
                                     <path 
                                         d={pathData} 
                                         stroke="rgba(255, 0, 0, 0.4)" 
                                         strokeWidth="5%" 
                                         strokeLinecap="round"
                                         strokeLinejoin="round"
                                         fill="none"
                                     />
                                     {/* Delete Button for Brush Stroke - Center of path roughly? Or just last point */}
                                     {editorMode === 'blur' && blur.points.length > 0 && (
                                         <foreignObject 
                                             x={`${blur.points[0].x * 100}%`} 
                                             y={`${blur.points[0].y * 100}%`} 
                                             width="20" height="20"
                                             className="overflow-visible"
                                         >
                                             <div 
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     const newBlurs = blurs.filter(b => b.id !== blur.id);
                                                     updatePoint(selectedPointId, { blurs: newBlurs });
                                                 }}
                                                 className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2"
                                             >
                                                 ×
                                             </div>
                                         </foreignObject>
                                     )}
                                 </g>
                             );
                        } else {
                            // Legacy Rect Support
                            return (
                                <rect 
                                    key={blur.id}
                                    x={`${(blur.x || 0) * 100}%`}
                                    y={`${(blur.y || 0) * 100}%`}
                                    width={`${(blur.w || 0) * 100}%`}
                                    height={`${(blur.h || 0) * 100}%`}
                                    fill="rgba(0,0,0,0.5)"
                                    stroke="red"
                                    strokeWidth="2"
                                />
                            );
                        }
                    })}

                    {/* Render Current Drawing Path */}
                    {currentPath.length > 0 && (
                         <path 
                             d={currentPath.map((p, i) => `${i===0?'M':'L'} ${p.x * 100}% ${p.y * 100}%`).join(' ')} 
                             stroke="rgba(255, 0, 0, 0.6)" 
                             strokeWidth="5%" 
                             strokeLinecap="round"
                             strokeLinejoin="round"
                             fill="none"
                         />
                    )}
                </svg>

                {/* Legacy Rect Delete Buttons (Overlay HTML) */}
                {blurs.map(blur => {
                    if (blur.type !== 'brush' && editorMode === 'blur') {
                         return (
                            <div 
                                key={'del-'+blur.id}
                                className="absolute pointer-events-auto cursor-pointer"
                                style={{
                                    left: `${((blur.x||0) + (blur.w||0)) * 100}%`,
                                    top: `${(blur.y||0) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        const newBlurs = blurs.filter(b => b.id !== blur.id);
                                        updatePoint(selectedPointId, { blurs: newBlurs });
                                    }}
                                    className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-50"
                                >
                                    ×
                                </button>
                            </div>
                         );
                    }
                    return null;
                })}

                {/* Hotspots (Arrows) */}
                {links.map(link => (
                    <div 
                        key={link.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-20"
                        style={{ left: `${link.x * 100}%`, top: `${link.y * 100}%` }}
                    >
                        <div 
                            className={`w-12 h-12 ${editorMode === 'view' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600'} rounded-full flex items-center justify-center shadow-xl border-2 border-white pointer-events-auto cursor-pointer relative z-10 hover:scale-110 transition-transform`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (editorMode === 'view') {
                                    const targetExists = points.find(p => p.id === link.targetId);
                                    if (targetExists) {
                                        setSelectedPointId(link.targetId);
                                    } else {
                                        alert("Ponto de destino não encontrado!");
                                    }
                                }
                            }}
                            title={editorMode === 'view' ? "Clique para ir até este ponto" : "Link de navegação"}
                        >
                            <div className="icon-arrow-up text-white text-xl font-bold"></div>
                        </div>

                        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            {link.label}
                        </div>

                        {editorMode === 'link' && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newLinks = links.filter(l => l.id !== link.id);
                                    updatePoint(selectedPointId, { links: newLinks });
                                }}
                                className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md z-30 pointer-events-auto border border-white hover:bg-red-700"
                                title="Remover Link"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {/* Temp Link Creation UI */}
                {tempLinkLoc && (
                    <div 
                        className="absolute z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 pointer-events-auto w-[250px] animate-in fade-in zoom-in duration-200"
                        style={{ 
                            left: `${Math.min(tempLinkLoc.x * 100, 70)}%`, 
                            top: `${Math.min(tempLinkLoc.y * 100, 70)}%` 
                        }}
                    >
                        <h4 className="text-sm font-bold mb-3 text-gray-800 flex items-center gap-2">
                            <div className="icon-link text-blue-500"></div>
                            Criar Link
                        </h4>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-semibold">Destino:</label>
                            <select 
                                className="w-full text-sm border border-gray-300 rounded-lg p-2 bg-gray-50 focus:bg-white outline-blue-500 transition-colors"
                                onChange={(e) => confirmLink(e.target.value)}
                                defaultValue=""
                                autoFocus
                            >
                                <option value="" disabled>Selecione um ponto...</option>
                                {points.filter(p => p.id !== selectedPointId).map((p, idx) => (
                                    <option key={p.id} value={p.id}>
                                        Ponto #{points.findIndex(pt => pt.id === p.id) + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={() => setTempLinkLoc(null)}
                            className="w-full mt-3 text-xs text-gray-500 hover:bg-gray-100 rounded p-2 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleSaveTour = async () => {
        if (points.length === 0) return;
        
        const message = isStudio 
            ? `Enviar ${points.length} pontos para aprovação?` 
            : `Salvar ${points.length} pontos do tour? Isso atualizará o mapa público.`;
            
        const confirmed = confirm(message);
        if (!confirmed) return;

        try {
            const pointsToSave = points.map(p => ({
                ...p,
                status: isStudio ? 'pending' : (p.status || 'approved'),
                author: p.author || (currentUser ? currentUser.name : (isStudio ? 'User' : 'Admin'))
            }));

            const promises = pointsToSave.map(p => saveTourPoint(p));
            await Promise.all(promises);
            
            alert(isStudio ? "Tour enviado para análise do Admin!" : "Tour salvo com sucesso!");
            if(isStudio) {
                setPoints([]);
                setExtractedFrames([]);
                setIsMapReady(false);
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar tour. Verifique o console.");
        }
    };

    if (!isMapReady) {
        return (
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <div className="icon-map-pin text-xl"></div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Editor de Tour 360°</h2>
                </div>
                
                <p className="text-gray-600 mb-6">
                    Use o editor para criar sequências de fotos ou processar vídeos de ruas para criar tours automaticamente.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Latitude Inicial</label>
                        <input 
                            type="number" 
                            value={startCoords.lat}
                            onChange={e => setStartCoords({...startCoords, lat: parseFloat(e.target.value)})}
                            className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Longitude Inicial</label>
                        <input 
                            type="number" 
                            value={startCoords.lon}
                            onChange={e => setStartCoords({...startCoords, lon: parseFloat(e.target.value)})}
                            className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsMapReady(true)}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        <div className="icon-map"></div>
                        Abrir Mapa e Editar
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        title="Recarregar"
                    >
                        <div className="icon-refresh-cw"></div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                <div>
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <div className="icon-edit-3 text-blue-600"></div>
                        Editor de Tour
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {points.length} pontos • {points.filter(p => !!p.photo).length} com foto
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                     <button onClick={() => setIsMapReady(false)} className="flex-1 md:flex-none justify-center border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                        Sair
                     </button>
                     <button onClick={handleSaveTour} className="flex-1 md:flex-none justify-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm">
                        <div className="icon-save"></div> Salvar Tudo
                     </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                {/* Map Column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 h-[300px] md:h-[400px] relative">
                        <div ref={mapRef} className="w-full h-full rounded-lg z-0"></div>
                        <div className="absolute top-2 right-2 z-[400] bg-white bg-opacity-90 p-2 rounded-md shadow text-[10px] text-gray-600 max-w-[150px]">
                            {placingFrameIndex !== null ? (
                                <span className="text-blue-600 font-bold">MODO VÍDEO: Clique na rua para posicionar o Frame #{placingFrameIndex + 1}</span>
                            ) : (
                                "Clique no mapa para criar pontos. Arraste para mover."
                            )}
                        </div>
                    </div>
                    
                    {/* Video Extraction Tool */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <div className="icon-video text-purple-600"></div>
                            Vídeo para Rotas
                        </h3>
                        
                        {isProcessingVideo ? (
                            <div className="text-center py-4">
                                <div className="icon-loader animate-spin text-purple-600 text-2xl mx-auto mb-2"></div>
                                <p className="text-xs text-gray-500">Processando vídeo e extraindo frames...</p>
                            </div>
                        ) : extractedFrames.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{extractedFrames.length} frames extraídos</span>
                                    {placingFrameIndex !== null && (
                                        <span className="text-blue-600 font-bold animate-pulse">
                                            CLIQUE NO MAPA PARA POSICIONAR FRAME {placingFrameIndex + 1}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Filmstrip Preview */}
                                <div className="flex gap-2 overflow-x-auto pb-2 h-20 snap-x">
                                    {extractedFrames.map((frame, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleFrameClick(frame, idx)}
                                            className={`min-w-[80px] h-16 rounded border-2 overflow-hidden relative cursor-pointer snap-start transition-all ${placingFrameIndex === idx ? 'border-blue-600 ring-2 ring-blue-200 scale-105 z-10' : (selectedPoint?.photo === frame.image ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 opacity-70 hover:opacity-100')}`}
                                            title="Clique para usar esta foto"
                                        >
                                            <img src={frame.image} className="w-full h-full object-cover" />
                                            <span className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-[8px] px-1">
                                                {idx + 1}
                                            </span>
                                            {selectedPoint?.photo === frame.image && (
                                                <div className="absolute top-0 right-0 bg-green-500 text-white p-0.5">
                                                    <div className="icon-check w-3 h-3"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 italic">
                                    Dica: Se um ponto estiver selecionado, clicar na foto acima perguntará se deseja trocá-la.
                                </p>

                                {placingFrameIndex === null && (
                                    <button 
                                        onClick={() => setPlacingFrameIndex(0)}
                                        className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        Reiniciar Posicionamento
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Config</span>
                                        <span>Captura:</span>
                                    </div>
                                    <select 
                                        value={framesToExtract} 
                                        onChange={(e) => setFramesToExtract(Number(e.target.value))}
                                        className="text-xs border border-gray-300 rounded p-1 bg-white"
                                    >
                                        <option value="0">Automático (Inteligente)</option>
                                        <option value="5">5 Frames</option>
                                        <option value="10">10 Frames</option>
                                        <option value="20">20 Frames</option>
                                        <option value="30">30 Frames</option>
                                    </select>
                                </div>
                                <label className="block w-full border-2 border-dashed border-purple-200 bg-purple-50 rounded-lg p-4 text-center cursor-pointer hover:bg-purple-100 transition-colors">
                                    <div className="icon-cloud-upload text-purple-400 mb-1 mx-auto"></div>
                                    <span className="text-xs font-bold text-purple-700">Carregar Vídeo da Rua</span>
                                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor Column */}
                <div className="lg:col-span-2">
                    {selectedPoint ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                            {/* Toolbar */}
                            <div className="p-2 border-b border-gray-200 flex flex-wrap gap-2 bg-gray-50 items-center justify-between">
                                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                                    <button 
                                        onClick={() => setEditorMode('view')}
                                        disabled={!selectedPoint.photo}
                                        className={`btn-tool ${editorMode === 'view' ? 'active' : ''} ${!selectedPoint.photo ? 'opacity-50' : ''}`}
                                    >
                                        <div className="icon-mouse-pointer w-4 h-4"></div>
                                        <span>Navegar</span>
                                    </button>
                                    <div className="w-[1px] h-8 bg-gray-300 mx-1"></div>
                                    <button 
                                        onClick={() => setEditorMode('link')}
                                        disabled={!selectedPoint.photo}
                                        className={`btn-tool ${editorMode === 'link' ? 'active' : ''} ${!selectedPoint.photo ? 'opacity-50' : ''}`}
                                    >
                                        <div className="icon-link w-4 h-4"></div>
                                        <span>Criar Link</span>
                                    </button>
                                    <button 
                                        onClick={() => setEditorMode('blur')}
                                        disabled={!selectedPoint.photo}
                                        className={`btn-tool ${editorMode === 'blur' ? 'active' : ''} ${!selectedPoint.photo ? 'opacity-50' : ''}`}
                                    >
                                        <div className="icon-brush w-4 h-4"></div>
                                        <span>Pincel Desfoque</span>
                                    </button>
                                </div>
                                {/* Delete Button with Permission Check */}
                                {(!isStudio || selectedPoint.status !== 'approved') && (
                                    <button 
                                        onClick={() => deletePoint(selectedPoint.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir Ponto"
                                    >
                                        <div className="icon-trash w-4 h-4"></div>
                                    </button>
                                )}
                            </div>

                            {/* Canvas Area */}
                            <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4">
                                {selectedPoint.photo ? (
                                    <div className="relative shadow-2xl inline-block max-w-full">
                                        <img 
                                            ref={imageCanvasRef}
                                            src={selectedPoint.photo} 
                                            className={`max-h-[600px] object-contain select-none ${editorMode !== 'view' ? 'cursor-crosshair' : 'cursor-default'}`}
                                            onMouseDown={handleCanvasMouseDown}
                                            onMouseMove={handleCanvasMouseMove}
                                            onMouseUp={handleCanvasMouseUp}
                                            onMouseLeave={handleCanvasMouseUp}
                                            draggable={false}
                                        />
                                        {renderOverlay()}
                                    </div>
                                ) : (
                                    <div className="text-center max-w-sm mx-auto">
                                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <div className="icon-image text-4xl text-gray-400"></div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-700 mb-2">Adicionar Panorama</h3>
                                        <p className="text-gray-500 mb-6 text-sm">Carregue uma imagem 360° ou use a ferramenta de vídeo ao lado para preencher automaticamente.</p>
                                        {(!isStudio || selectedPoint.status !== 'approved') ? (
                                            <label className="bg-blue-600 text-white px-6 py-3 rounded-full cursor-pointer hover:bg-blue-700 inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                                                <div className="icon-upload"></div>
                                                Carregar Foto
                                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                            </label>
                                        ) : (
                                            <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded border border-yellow-200">
                                                Este ponto já foi aprovado. Você pode criar links, mas não alterar a foto.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Blur Editor Active UI */}
                            {editorMode === 'blur' && (
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full shadow-lg z-30 text-xs font-bold animate-pulse pointer-events-none">
                                    Modo Pincel: Arraste para censurar rostos/placas
                                </div>
                            )}

                            {/* Footer Actions */}
                            {selectedPoint.photo && selectedPoint.blurs && selectedPoint.blurs.length > 0 && (
                                <div className="p-3 bg-yellow-50 border-t border-yellow-100 flex justify-between items-center animate-in slide-in-from-bottom-2">
                                    <p className="text-xs md:text-sm text-yellow-800 flex items-center gap-2">
                                        <div className="icon-triangle-alert text-yellow-600"></div>
                                        {selectedPoint.blurs.length} área(s) para desfocar.
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updatePoint(selectedPointId, { blurs: [] })}
                                            className="text-gray-500 hover:text-gray-700 text-xs underline px-2"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={saveAndBlurImage}
                                            className="bg-yellow-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-600 shadow-sm flex items-center gap-1"
                                        >
                                            <div className="icon-check w-3 h-3"></div>
                                            Salvar Desfoque
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center p-8">
                            <div className="text-center text-gray-400">
                                <div className="icon-map text-4xl mb-3 mx-auto opacity-50"></div>
                                <p>Selecione ou crie um ponto no mapa para começar a editar.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}