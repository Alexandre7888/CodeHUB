function PanoramaViewer({ imageSrc, tourData, initialPointId, onClose }) {
    const viewerRef = React.useRef(null);
    const pannellumRef = React.useRef(null);
    const [currentScene, setCurrentScene] = React.useState(initialPointId || 'default');

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
                        
                        // Custom handler for "Zoom -> Wait -> Switch" effect
                        clickHandlerFunc: (evt, args) => {
                            if (!pannellumRef.current) return;
                            
                            // 1. Zoom In Effect
                            // lookAt(pitch, yaw, hfov, duration)
                            // We zoom in to FOV 40 (very close) over 1000ms
                            pannellumRef.current.lookAt(pitch, yaw, 40, 1000);
                            
                            // 2. Wait 1s then switch scene
                            setTimeout(() => {
                                if (pannellumRef.current) {
                                    pannellumRef.current.loadScene(args.targetId);
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
                    title: `Ponto #${tourData.findIndex(p => p.id === point.id) + 1}`,
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
                    compass: true,
                    showControls: true
                },
                scenes: scenes
            };

            pannellumRef.current = pannellum.viewer(viewerRef.current, config);
            
            pannellumRef.current.on('scenechange', (id) => {
                setCurrentScene(id);
            });

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
                `}
            </style>

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