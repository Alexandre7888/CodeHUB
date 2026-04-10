function PanoramaViewer({ imageSrc, tourData, initialPointId, onClose }) {
    const viewerRef = React.useRef(null);
    const pannellumRef = React.useRef(null);
    const [currentScene, setCurrentScene] = React.useState(initialPointId || 'default');
    const [isAILoading, setIsAILoading] = React.useState(false);
    const [isAIAligning, setIsAIAligning] = React.useState(false);
    const [scenePois, setScenePois] = React.useState([]);
    const [movingPoi, setMovingPoi] = React.useState(null);
    const [showAddMenu, setShowAddMenu] = React.useState(false);
    const [nearbyList, setNearbyList] = React.useState([]);
    const [isFetchingNearby, setIsFetchingNearby] = React.useState(false);
    const [placingNewPoi, setPlacingNewPoi] = React.useState(null);

    // Sync URL Helper
    const updateViewerURL = (id, pitch, yaw, geo) => {
        const url = new URL(window.location);
        if (id !== 'default') url.searchParams.set('id', id);
        if (geo) url.searchParams.set('geo', `${geo.lat.toFixed(5)},${geo.lon.toFixed(5)}`);
        url.searchParams.set('position', `${Math.round(pitch)},${Math.round(yaw)}`);
        window.history.replaceState({}, '', url);
    };

    // Helper to create the hotspot DOM element manually
    // This is more robust than relying on CSS classes alone
    const hotspotNode = (text) => {
        const div = document.createElement('div');
        div.className = "custom-hotspot";
        
        const iconDiv = document.createElement('div');
        iconDiv.className = "hotspot-icon";
        // Arrow Icon SVG
        iconDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5"></path>
                <path d="M5 12l7-7 7 7"></path>
            </svg>
        `;
        
        const tooltip = document.createElement('span');
        tooltip.className = "hotspot-tooltip";
        tooltip.innerText = text;
        
        div.appendChild(iconDiv);
        div.appendChild(tooltip);
        return div;
    };

    const aiHotspotNode = (text, type = 'poi', canDelete = false) => {
        const div = document.createElement('div');
        div.className = `ai-hotspot type-${type}`;
        div.title = "Duplo clique para mover";
        div.style.pointerEvents = 'auto';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div class="ai-marker relative flex items-center justify-center">
                ${type === 'street' ? '<div class="icon-map-pin text-2xl drop-shadow-md"></div>' : '<div class="icon-info text-2xl drop-shadow-md"></div>'}
                ${canDelete ? '<div class="delete-poi-btn absolute -top-2 -right-4 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg hover:bg-red-700 hover:scale-110 transition-transform pointer-events-auto" title="Remover local"><div class="icon-trash text-[12px]"></div></div>' : ''}
            </div>
            <div class="ai-label mt-1">${text}</div>
            <div class="text-[9px] bg-black bg-opacity-70 text-white px-2 py-0.5 mt-1 rounded opacity-0 transition-opacity hover-hint whitespace-nowrap pointer-events-none">Duplo clique p/ mover</div>
        `;
        return div;
    };

    React.useEffect(() => {
        if (!viewerRef.current) return;
        
        let scenes = {};
        let firstSceneId = currentScene;

        if (tourData && tourData.length > 0) {
            tourData.forEach(point => {
                if (!point.photo) return;
                
                // Convert links to Pannellum hotSpots
                const hotSpots = (point.links || []).map(link => {
                    const yaw = (link.x - 0.5) * 360;
                    const pitch = (0.5 - link.y) * 180;
                    
                    return {
                        pitch: pitch,
                        yaw: yaw,
                        type: "info", // Changed to info to handle click manually
                        text: link.label || "Ir para próximo ponto",
                        // sceneId removed to prevent default auto-transition
                        
                        // Custom handler para transição rápida mantendo o ângulo da tela
                        clickHandlerFunc: (evt, args) => {
                            if (!pannellumRef.current) return;
                            
                            // Pegamos o pitch e yaw EXATOS do momento do clique, independente de onde a seta está
                            const currentPitch = pannellumRef.current.getPitch();
                            const currentYaw = pannellumRef.current.getYaw();
                            const currentHfov = pannellumRef.current.getHfov();
                            
                            setIsAIAligning(true);
                            
                            // Pequeno delay apenas para a animação visual, sem girar a câmera
                            setTimeout(() => {
                                if (pannellumRef.current) {
                                    // Carrega a próxima cena aplicando os mesmos ângulos de visão
                                    pannellumRef.current.loadScene(args.targetId, currentPitch, currentYaw, currentHfov);
                                    setTimeout(() => setIsAIAligning(false), 300);
                                }
                            }, 200);
                        },
                        clickHandlerArgs: { targetId: link.targetId },

                        // Use createTooltipFunc to fully control rendering
                        createTooltipFunc: (hotSpotDiv, args) => {
                            // LIMPEZA IMPORTANTE: Evita que hotspots antigos fiquem "presos" flutuando na tela entre as cenas
                            hotSpotDiv.innerHTML = '';
                            
                            const node = hotspotNode(args.text);
                            hotSpotDiv.appendChild(node);
                            // Pannellum overrides styles, so we force some here or via CSS
                            hotSpotDiv.style.width = '0px'; // Prevent default box
                            hotSpotDiv.style.height = '0px';
                            hotSpotDiv.style.marginTop = '-30px'; // Center fix
                            hotSpotDiv.style.marginLeft = '-30px';
                            
                            // Adicionar identificador para ajudar na limpeza global
                            hotSpotDiv.classList.add('custom-hotspot-container');
                        },
                        createTooltipArgs: { text: link.label || "Ir para próximo ponto" }
                    };
                });

                scenes[point.id] = {
                    title: `Ponto 360°`,
                    lat: point.lat,
                    lon: point.lon,
                    type: 'equirectangular',
                    panorama: point.photo,
                    hotSpots: hotSpots
                };
            });

            // Ensure firstSceneId exists
            if (!scenes[firstSceneId] && Object.keys(scenes).length > 0) {
                firstSceneId = Object.keys(scenes)[0];
            }
        } else if (imageSrc) {
            scenes['default'] = {
                type: 'equirectangular',
                panorama: imageSrc,
                autoLoad: true
            };
            firstSceneId = 'default';
        }

        if (Object.keys(scenes).length === 0) return;

        try {
            if (pannellumRef.current && typeof pannellumRef.current.destroy === 'function') {
                pannellumRef.current.destroy();
            }
            
            viewerRef.current.innerHTML = '';

            const config = {
                default: {
                    firstScene: firstSceneId,
                    sceneFadeDuration: 1000,
                    autoLoad: true,
                    compass: false,
                    showControls: true
                },
                scenes: scenes
            };

            pannellumRef.current = pannellum.viewer(viewerRef.current, config);
            
            // Read initial URL position if available
            const urlParams = new URLSearchParams(window.location.search);
            const posParam = urlParams.get('position');
            if (posParam) {
                const [p, y] = posParam.split(',').map(Number);
                if (!isNaN(p) && !isNaN(y)) {
                    config.default.pitch = p;
                    config.default.yaw = y;
                }
            }

            pannellumRef.current = pannellum.viewer(viewerRef.current, config);
            
            // Sync URL on movement
            const handleViewChange = () => {
                if (!pannellumRef.current) return;
                const p = pannellumRef.current.getPitch();
                const y = pannellumRef.current.getYaw();
                const sId = pannellumRef.current.getScene();
                const sData = scenes[sId];
                updateViewerURL(sId, p, y, sData ? {lat: sData.lat, lon: sData.lon} : null);
            };

            // Pannellum viewchange/mouseup polling
            const viewInterval = setInterval(handleViewChange, 1000);

            // Processador de IA Geospacial Automático
            pannellumRef.current.on('scenechange', async (id) => {
                setCurrentScene(id);
                handleViewChange();
                setMovingPoi(null);

                // Forçar a limpeza das setas/hotspots flutuantes presos de cenas anteriores
                document.querySelectorAll('.custom-hotspot-container').forEach(el => {
                    if (el && !el.closest('.pnlm-panorama-info')) {
                        el.innerHTML = ''; 
                    }
                });

                // IA: Mapear Rua e POIs via Banco de Dados ou Gerar Novo
                if (tourData) {
                    const pointInfo = tourData.find(p => p.id === id);
                    if (pointInfo && pointInfo.lat && pannellumRef.current) {
                        if (pointInfo.aiPois) {
                            setScenePois(pointInfo.aiPois);
                        } else {
                            setIsAILoading(true);
                            try {
                                const [geo, pois] = await Promise.all([
                                    reverseGeocode(pointInfo.lat, pointInfo.lon),
                                    getNearbyOSMPlaces(pointInfo.lat, pointInfo.lon)
                                ]);
                                
                                const finalPois = [...(pois || [])];
                                
                                if (geo && geo.address && geo.address.road) {
                                    // Adiciona a rua no chão (-75 de pitch) em duas direções
                                    finalPois.push({ name: geo.address.road, type: 'street', pitch: -75, yaw: 0 });
                                    finalPois.push({ name: geo.address.road, type: 'street', pitch: -75, yaw: 180 });
                                }
                                
                                if (finalPois.length > 0) {
                                    finalPois.forEach((p, idx) => {
                                        // Preserva o pitch/yaw se já foi definido (ex: ruas)
                                        if (p.pitch === undefined) p.pitch = -5;
                                        if (p.yaw === undefined) p.yaw = (idx * 45) % 360;
                                    });
                                    setScenePois(finalPois);
                                    if (typeof updateTourPoint === 'function') {
                                        updateTourPoint(id, { aiPois: finalPois });
                                        pointInfo.aiPois = finalPois; // Keep local sync
                                    }
                                } else {
                                    setScenePois([]);
                                }
                            } catch (err) {
                                setScenePois([]);
                            }
                            setIsAILoading(false);
                        }
                    } else {
                        setScenePois([]);
                    }
                }
            });

            // Trigger manual scenechange logic for the first scene
            setTimeout(() => {
                if (pannellumRef.current) pannellumRef.current.fire('scenechange', firstSceneId);
            }, 500);

        } catch (e) {
            console.error("Pannellum init error:", e);
        }

    }, [imageSrc, tourData]);

    // Efeito separado para renderizar os POIs dinamicamente e permitir atualização
    React.useEffect(() => {
        if (!pannellumRef.current || !currentScene || currentScene === 'default') return;

        // Limpar hotspots de IA antigos para não duplicar ao atualizar a posição
        for (let i = 0; i < 30; i++) {
            try { pannellumRef.current.removeHotSpot(`ai_poi_${i}`, currentScene); } catch(e) {}
        }

        scenePois.forEach((poi, idx) => {
            if (poi.pendingDelete) return; // Não renderiza os que estão aguardando aprovação de exclusão

            const duplicateCount = scenePois.filter(p => p.name === poi.name && !p.pendingDelete).length;
            const canDelete = true; // Permite excluir qualquer local, sujeito à aprovação
            const isPendingAdd = !!poi.pendingAdd;

            try {
                pannellumRef.current.addHotSpot({
                    id: `ai_poi_${idx}`,
                    pitch: poi.pitch !== undefined ? poi.pitch : -5,
                    yaw: poi.yaw !== undefined ? poi.yaw : (idx * 45) % 360,
                    type: 'info',
                    createTooltipFunc: (hotSpotDiv, args) => {
                        hotSpotDiv.innerHTML = '';
                        const node = aiHotspotNode(args.text, args.poiType, args.canDelete);
                        
                        node.ondblclick = (e) => {
                            e.stopPropagation();
                            setMovingPoi({ idx: args.idx, name: args.text });
                        };

                        const deleteBtn = node.querySelector('.delete-poi-btn');
                        if (deleteBtn) {
                            deleteBtn.onclick = (e) => {
                                e.stopPropagation();
                                if (args.onDelete) args.onDelete(args.idx);
                            };
                        }
                        
                        hotSpotDiv.appendChild(node);
                        hotSpotDiv.classList.add('custom-hotspot-container');
                    },
                    createTooltipArgs: { 
                        text: poi.name, 
                        poiType: poi.type, 
                        idx,
                        canDelete,
                        isPendingAdd,
                        onDelete: (idxToDelete) => {
                            const updatedPois = [...scenePois];
                            updatedPois[idxToDelete] = { ...updatedPois[idxToDelete], pendingDelete: true };
                            setScenePois(updatedPois);
                            
                            if (typeof updateTourPoint === 'function') {
                                updateTourPoint(currentScene, { aiPois: updatedPois });
                                const pointInfo = tourData?.find(p => p.id === currentScene);
                                if (pointInfo) pointInfo.aiPois = updatedPois;
                            }
                            
                            // Mostra um aviso rápido para o usuário
                            const toast = document.createElement('div');
                            toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-xs font-bold z-[3000] animate-in fade-in slide-in-from-bottom-4';
                            toast.innerText = 'Local removido da visualização.';
                            document.body.appendChild(toast);
                            setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
                        }
                    }
                }, currentScene);
            } catch(e) {}
        });
    }, [scenePois, currentScene]);

    const loadNearbyForAdd = async () => {
        setShowAddMenu(!showAddMenu);
        if (showAddMenu) return; // se está fechando, não busca
        
        setIsFetchingNearby(true);
        const pointInfo = tourData?.find(p => p.id === currentScene);
        if (pointInfo && pointInfo.lat) {
            try {
                const pois = await getNearbyOSMPlaces(pointInfo.lat, pointInfo.lon, 400); // Raio maior
                const existingNames = new Set(scenePois.map(p => p.name));
                // Filtra os que já estão na cena atual
                setNearbyList(pois.filter(p => !existingNames.has(p.name)));
            } catch(e) {}
        }
        setIsFetchingNearby(false);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Styles for the custom hotspot created via JS */}
            <style>
                {`
                .custom-hotspot {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    pointer-events: auto; /* Ensure clicks pass through */
                }
                
                .hotspot-icon {
                    width: 50px;
                    height: 50px;
                    background-color: rgba(37, 99, 235, 0.85); /* Blue 600 */
                    border: 3px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    transition: transform 0.2s, background-color 0.2s;
                }
                
                .hotspot-icon svg {
                    width: 24px;
                    height: 24px;
                    display: block;
                }
                
                .custom-hotspot:hover .hotspot-icon {
                    transform: scale(1.15);
                    background-color: rgba(29, 78, 216, 1); /* Blue 700 */
                    border-color: #fbbf24; /* Amber */
                }
                
                .hotspot-tooltip {
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 14px;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                    font-weight: 500;
                }
                
                .custom-hotspot:hover .hotspot-tooltip {
                    opacity: 1;
                }

                /* Ensure Pannellum hotspot container doesn't block */
                .pnlm-hotspot-base {
                    visibility: visible !important;
                    z-index: 1000 !important;
                }

                /* AI Hotspots */
                .ai-hotspot {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    pointer-events: none;
                }
                .ai-hotspot.type-street {
                    transform: rotateX(40deg); /* Perspective to lay on floor */
                    opacity: 0.8;
                }
                .ai-hotspot.type-street .ai-label {
                    background: rgba(0,0,0,0.6);
                    color: white;
                    padding: 8px 24px;
                    border-radius: 20px;
                    font-size: 18px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    border: 2px solid rgba(255,255,255,0.4);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                }
                
                .ai-hotspot:hover .hover-hint {
                    opacity: 1;
                }
                `}
            </style>

            {movingPoi && (
                <div 
                    className="absolute inset-0 z-[2050] cursor-crosshair"
                    onClick={(e) => {
                        if (!pannellumRef.current) return;
                        const coords = pannellumRef.current.mouseEventToCoords(e.nativeEvent || e);
                        if (coords) {
                            const [pitch, yaw] = coords;
                            const poiName = movingPoi.name;
                            
                            setMovingPoi(null);

                            // Atualizar em TODAS as fotos 360 que possuem esse mesmo POI
                            if (tourData) {
                                tourData.forEach(pt => {
                                    if (pt.aiPois) {
                                        let changed = false;
                                        const newPois = pt.aiPois.map(p => {
                                            if (p.name === poiName) {
                                                changed = true;
                                                return { ...p, pitch, yaw };
                                            }
                                            return p;
                                        });

                                        if (changed) {
                                            // Atualiza estado local da cena atual
                                            if (pt.id === currentScene) {
                                                setScenePois(newPois);
                                            }
                                            // Sincroniza cache local e Firebase
                                            pt.aiPois = newPois;
                                            if (typeof updateTourPoint === 'function') {
                                                updateTourPoint(pt.id, { aiPois: newPois });
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }}
                >
                    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse pointer-events-none flex flex-col items-center text-center border border-blue-400">
                        <span>Clique no novo local para posicionar:</span>
                        <span className="text-yellow-300 text-lg">"{movingPoi.name}"</span>
                        <span className="text-xs font-normal mt-1 opacity-80">(Clique no 'X' para cancelar)</span>
                    </div>
                    
                    <button 
                        className="absolute top-32 right-8 bg-red-600 text-white p-3 rounded-full shadow-lg pointer-events-auto hover:bg-red-700 transition-colors border border-red-400"
                        onClick={(e) => { e.stopPropagation(); setMovingPoi(null); }}
                        title="Cancelar"
                    >
                        <div className="icon-x text-xl"></div>
                    </button>
                </div>
            )}

            {placingNewPoi && (
                <div 
                    className="absolute inset-0 z-[2050] cursor-crosshair"
                    onClick={(e) => {
                        if (!pannellumRef.current) return;
                        const coords = pannellumRef.current.mouseEventToCoords(e.nativeEvent || e);
                        if (coords) {
                            const [pitch, yaw] = coords;
                            
                            const newPoi = { 
                                name: placingNewPoi.name, 
                                type: placingNewPoi.type || 'poi', 
                                pitch, 
                                yaw, 
                                pendingAdd: true, 
                                id: Date.now().toString() 
                            };
                            
                            const newPois = [...scenePois, newPoi];
                            setScenePois(newPois);
                            
                            if (tourData) {
                                const pt = tourData.find(p => p.id === currentScene);
                                if (pt) {
                                    pt.aiPois = newPois;
                                    if (typeof updateTourPoint === 'function') {
                                        updateTourPoint(pt.id, { aiPois: newPois });
                                    }
                                }
                            }
                            setPlacingNewPoi(null);
                            
                            const toast = document.createElement('div');
                            toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-xs font-bold z-[3000] animate-in fade-in slide-in-from-bottom-4';
                            toast.innerText = 'Local adicionado à foto 360°!';
                            document.body.appendChild(toast);
                            setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
                        }
                    }}
                >
                    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse pointer-events-none flex flex-col items-center text-center border border-green-400">
                        <span>Onde fica este local? Clique para posicionar:</span>
                        <span className="text-yellow-300 text-lg">"{placingNewPoi.name}"</span>
                        <span className="text-xs font-normal mt-1 opacity-80">(Clique no 'X' para cancelar)</span>
                    </div>
                    
                    <button 
                        className="absolute top-32 right-8 bg-red-600 text-white p-3 rounded-full shadow-lg pointer-events-auto hover:bg-red-700 transition-colors border border-red-400"
                        onClick={(e) => { e.stopPropagation(); setPlacingNewPoi(null); }}
                        title="Cancelar"
                    >
                        <div className="icon-x text-xl"></div>
                    </button>
                </div>
            )}

            {isAILoading && !isAIAligning && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[2010] bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-pulse">
                    <div className="icon-cpu"></div>
                    IA Mapeando Rua e Ambientes...
                </div>
            )}
            
            {isAIAligning && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2020] flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-200">
                    <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
                    <div className="bg-black bg-opacity-80 text-green-400 px-6 py-2 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 border border-green-500 backdrop-blur-md">
                        <div className="icon-scan-line"></div>
                        IA: Sincronizando perspectiva visual...
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 z-[2010] flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={loadNearbyForAdd}
                        className={`bg-black ${showAddMenu ? 'bg-opacity-80 border-blue-500 text-blue-400' : 'bg-opacity-50 text-white border-gray-700'} px-3 py-2 rounded-full hover:bg-opacity-80 transition-all border flex items-center gap-2 text-sm font-bold shadow-lg`}
                    >
                        <div className="icon-map-pin"></div>
                        + Local na Foto
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-80 transition-all border border-gray-700 shadow-lg"
                    >
                        <div className="icon-x text-2xl"></div>
                    </button>
                </div>

                {showAddMenu && (
                    <div className="bg-white rounded-xl shadow-2xl w-[300px] border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col max-h-[60vh]">
                        <div className="bg-gray-50 p-3 border-b border-gray-200">
                            <h3 className="font-bold text-gray-800 text-sm">Adicionar Local Próximo</h3>
                            <p className="text-[10px] text-gray-500">Selecione um lugar para marcá-lo nesta foto 360°</p>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-2">
                            {isFetchingNearby ? (
                                <div className="py-8 text-center text-gray-400">
                                    <div className="icon-loader animate-spin text-2xl mx-auto mb-2"></div>
                                    <p className="text-xs">Buscando locais no OpenMaps...</p>
                                </div>
                            ) : nearbyList.length === 0 ? (
                                <div className="py-8 text-center text-gray-400">
                                    <div className="icon-map text-2xl mx-auto mb-2 opacity-50"></div>
                                    <p className="text-xs">Nenhum local novo encontrado perto daqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {nearbyList.map((place, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => {
                                                setPlacingNewPoi(place);
                                                setShowAddMenu(false);
                                            }}
                                            className="w-full text-left p-2 rounded hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                                        >
                                            <div className={`p-2 rounded-full ${place.type === 'shop' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <div className={`text-sm ${place.type === 'shop' ? 'icon-shopping-bag' : 'icon-utensils'}`}></div>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="font-bold text-gray-700 text-sm truncate group-hover:text-blue-700">{place.name}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">{place.type === 'shop' ? 'Comércio' : 'Restaurante / Útil'}</div>
                                            </div>
                                            <div className="icon-plus text-gray-300 group-hover:text-blue-500"></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div ref={viewerRef} className="w-full h-full bg-gray-900"></div>
            
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-60 backdrop-blur-sm px-6 py-2 rounded-full pointer-events-none flex items-center gap-3 z-[2010] shadow-lg border border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="icon-move text-gray-300"></div>
                    <span>Arraste para girar</span>
                </div>
                <div className="w-[1px] h-4 bg-gray-500"></div>
                <div className="flex items-center gap-2">
                    <div className="icon-mouse-pointer text-gray-300"></div>
                    <span>Clique nas setas para navegar</span>
                </div>
            </div>
        </div>
    );
}