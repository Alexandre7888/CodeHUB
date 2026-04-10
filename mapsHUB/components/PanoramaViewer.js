function PanoramaViewer({ imageSrc, tourData, initialPointId, onClose }) {
    const viewerRef = React.useRef(null);
    const pannellumRef = React.useRef(null);
    const [currentScene, setCurrentScene] = React.useState(initialPointId || 'default');
    const [isAILoading, setIsAILoading] = React.useState(false);
    const [isAIAligning, setIsAIAligning] = React.useState(false);

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

    const aiHotspotNode = (text, type = 'poi') => {
        const div = document.createElement('div');
        div.className = `ai-hotspot type-${type}`;
        div.innerHTML = `
            <div class="ai-marker">
                ${type === 'street' ? '<div class="icon-map-pin"></div>' : '<div class="icon-info"></div>'}
            </div>
            <div class="ai-label">${text}</div>
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
                        
                        // Custom handler for "Zoom -> Wait -> Switch" effect with AI Visual Matching
                        clickHandlerFunc: (evt, args) => {
                            if (!pannellumRef.current) return;
                            
                            // 1. Zoom In Effect
                            pannellumRef.current.lookAt(pitch, yaw, 40, 800);
                            
                            // 2. Ativar feedback visual da IA analisando a imagem
                            setTimeout(() => {
                                setIsAIAligning(true);
                            }, 400);
                            
                            // 3. Trocar a cena mantendo a MESMA posição exata calculada pela IA (ignorando bússola)
                            setTimeout(() => {
                                if (pannellumRef.current) {
                                    const currentPitch = pannellumRef.current.getPitch();
                                    const currentYaw = pannellumRef.current.getYaw();
                                    const currentHfov = 100; // Voltar o zoom para o normal após a transição
                                    
                                    // loadScene(sceneId, pitch, yaw, hfov)
                                    pannellumRef.current.loadScene(args.targetId, currentPitch, currentYaw, currentHfov);
                                    
                                    setTimeout(() => setIsAIAligning(false), 500);
                                }
                            }, 1000);
                        },
                        clickHandlerArgs: { targetId: link.targetId },

                        // Use createTooltipFunc to fully control rendering
                        createTooltipFunc: (hotSpotDiv, args) => {
                            const node = hotspotNode(args.text);
                            hotSpotDiv.appendChild(node);
                            // Pannellum overrides styles, so we force some here or via CSS
                            hotSpotDiv.style.width = '0px'; // Prevent default box
                            hotSpotDiv.style.height = '0px';
                            hotSpotDiv.style.marginTop = '-30px'; // Center fix
                            hotSpotDiv.style.marginLeft = '-30px';
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

                // IA: Mapear Rua e POIs automaticamente
                if (scenes[id] && scenes[id].lat) {
                    setIsAILoading(true);
                    try {
                        const geo = await reverseGeocode(scenes[id].lat, scenes[id].lon);
                        if (geo && geo.address && geo.address.road && pannellumRef.current) {
                            // Coloca o nome da rua no "chão" da imagem (pitch -70)
                            pannellumRef.current.addHotSpot({
                                pitch: -75,
                                yaw: 0,
                                type: 'info',
                                createTooltipFunc: (hotSpotDiv, args) => {
                                    hotSpotDiv.appendChild(aiHotspotNode(args.text, 'street'));
                                },
                                createTooltipArgs: { text: geo.address.road }
                            }, id);
                            
                            // Adicionar outro no sentido oposto da rua para visualização em ambos os lados
                            pannellumRef.current.addHotSpot({
                                pitch: -75,
                                yaw: 180,
                                type: 'info',
                                createTooltipFunc: (hotSpotDiv, args) => {
                                    hotSpotDiv.appendChild(aiHotspotNode(args.text, 'street'));
                                },
                                createTooltipArgs: { text: geo.address.road }
                            }, id);
                        }
                        
                    } catch (err) {}
                    setIsAILoading(false);
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
                `}
            </style>

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

            <div className="absolute top-4 right-4 z-[2010]">
                <button 
                    onClick={onClose}
                    className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-80 transition-all border border-gray-700"
                >
                    <div className="icon-x text-2xl"></div>
                </button>
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