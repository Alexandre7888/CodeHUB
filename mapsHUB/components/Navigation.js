function Navigation({ startPoint, endPoint, userHeading, onStop, onUpdateStats, onRouteCalculated }) {
    const [route, setRoute] = React.useState(null);
    const [steps, setSteps] = React.useState([]);
    const [wrongWayWarningTimer, setWrongWayWarningTimer] = React.useState(0);
    const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
    const [isCalculating, setIsCalculating] = React.useState(false);
    const [isDirectMode, setIsDirectMode] = React.useState(false); 
    
    const [distanceTraveled, setDistanceTraveled] = React.useState(0);
    const [pipWindow, setPipWindow] = React.useState(null);
    const [isMiniMode, setIsMiniMode] = React.useState(false); // Fallback
    
    // Refs
    const routeDestRef = React.useRef(null);
    const lastPosRef = React.useRef(startPoint);
    const hasStartedRef = React.useRef(false);
    const spokenStepsRef = React.useRef(new Set()); 
    const mapContainerParentRef = React.useRef(null); // To remember where to put the map back

    // 1. Route Calculation
    React.useEffect(() => {
        if (!endPoint || !startPoint) return;
        
        const destKey = endPoint.id || `${endPoint.lat},${endPoint.lon}`;
        if (route && routeDestRef.current === destKey) return;
        if (isCalculating) return;

        const calculate = async () => {
            setIsCalculating(true);
            routeDestRef.current = destKey;
            
            if (!hasStartedRef.current) {
                playAlertSound();
                if (navigator.onLine) {
                    speak(`Calculando rota para ${endPoint.title || 'destino'}...`);
                } else {
                    speak(`Modo offline. Traçando rota direta para ${endPoint.title || 'destino'}...`);
                }
                hasStartedRef.current = true;
            }
            
            const routeData = await getRoute(startPoint, endPoint);
            
            if (routeData) {
                setRoute(routeData);
                setSteps(routeData.legs[0].steps);
                
                const isDirect = routeData.isDirect || false;
                setIsDirectMode(isDirect);

                if (routeData.geometry && routeData.geometry.coordinates) {
                    const latLonPath = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
                    if (onRouteCalculated) onRouteCalculated(latLonPath);
                }

                playAlertSound();
                if (isDirect) {
                    const distKm = (routeData.distance / 1000).toFixed(1);
                    speak(`Rota direta offline ativada. O destino está a ${distKm} quilômetros. Siga a linha no mapa.`);
                } else {
                    const firstStep = routeData.legs[0].steps[0];
                    const streetName = firstStep?.name ? `na ${firstStep.name}` : '';
                    const instruction = translateInstruction(firstStep?.maneuver?.type, firstStep?.maneuver?.modifier, streetName);
                    
                    if (routeData.isAdminRoute) {
                         speak(`Rota manual do administrador iniciada. ${instruction}`);
                    } else {
                         speak(`Rota iniciada. ${instruction}`);
                    }
                }
            } else {
                speak("Não foi possível traçar a rota.");
            }
            setIsCalculating(false);
        };
        
        calculate();
        
    }, [endPoint]); 

    // TTS: Random periodic message "Respeite as leis do trânsito"
    React.useEffect(() => {
        const intervalId = setInterval(() => {
            if (Math.random() > 0.3) {
                speak("Lembre-se, respeite as leis do trânsito.");
            }
        }, 120000); // Every 2 minutes
        return () => clearInterval(intervalId);
    }, []);

    // Wrong Way Detection for Admin Routes
    React.useEffect(() => {
        if (!route || !userHeading || !startPoint) return;
        
        // Only enforce strict direction if it's a known geometry and moving at speed (if available)
        if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 1) {
            // Find bearing of the route segment we are on
            const path = route.geometry.coordinates;
            // Let's just compare user heading with the general direction to the next point
            let targetPt = path[Math.min(currentStepIndex + 1, path.length - 1)];
            if (!targetPt) targetPt = path[path.length - 1];

            const expectedBearing = calculateBearing(startPoint.lat, startPoint.lon, targetPt[1], targetPt[0]);
            
            // Normalize difference
            let diff = Math.abs(userHeading - expectedBearing);
            if (diff > 180) diff = 360 - diff;

            // If diff is > 120 degrees, they are going backwards
            if (diff > 120) {
                if (Date.now() - wrongWayWarningTimer > 15000) { // Warn every 15 seconds max
                    playAlertSound();
                    speak("Atenção! Você está indo na contramão. Desrespeitando as leis de trânsito.");
                    setWrongWayWarningTimer(Date.now());
                }
            }
        }
    }, [userHeading, startPoint, route, currentStepIndex]);

    // 2. Position Tracking
    React.useEffect(() => {
        if (!route || !startPoint) return;

        if (isDirectMode) {
            const dist = calculateDistance(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
            if (onUpdateStats) onUpdateStats({ distance: distanceTraveled }); 

            if (dist < 0.05 && !spokenStepsRef.current.has('arrival')) {
                playAlertSound();
                speak("Você está chegando próximo ao destino.");
                spokenStepsRef.current.add('arrival');
            }
            if (dist < 0.02) {
                 playAlertSound();
                 speak("Você chegou ao destino.");
                 onStop();
            }
            return;
        }

        if (lastPosRef.current && steps.length > 0) {
             const dist = calculateDistance(
                 lastPosRef.current.lat, lastPosRef.current.lon,
                 startPoint.lat, startPoint.lon
             );
             
             if (dist > 0.005) { 
                 setDistanceTraveled(d => {
                     const newDist = d + dist;
                     if (onUpdateStats) onUpdateStats({ distance: newDist });
                     return newDist;
                 });
                 lastPosRef.current = startPoint;
                 checkNextStep(startPoint);
             }
        } else {
            lastPosRef.current = startPoint;
        }

    }, [startPoint]); 

    const checkNextStep = (currentPos) => {
        if (!steps[currentStepIndex]) return;

        const currentStep = steps[currentStepIndex];
        const maneuverLoc = currentStep.maneuver.location; 
        
        const distToTurn = calculateDistance(currentPos.lat, currentPos.lon, maneuverLoc[1], maneuverLoc[0]);
        
        if (distToTurn < 0.05 && !spokenStepsRef.current.has(currentStepIndex)) {
            const nextStep = steps[currentStepIndex + 1];
            
            if (nextStep) {
                const streetName = nextStep.name ? `na ${nextStep.name}` : '';
                const instruction = translateInstruction(nextStep.maneuver.type, nextStep.maneuver.modifier, streetName);
                
                playAlertSound();
                speak(`Em 50 metros, ${instruction}`);
                spokenStepsRef.current.add(currentStepIndex);
                
                if (distToTurn < 0.02) {
                    setCurrentStepIndex(prev => prev + 1);
                }
            } else {
                const destName = endPoint.title || 'destino';
                playAlertSound();
                speak(`Você chegou em ${destName}.`);
                onStop();
            }
        }
    };

    const translateInstruction = (type, modifier, streetName) => {
        const street = streetName || '';
        switch(type) {
            case 'turn':
                if (modifier === 'left') return `Vire à esquerda ${street}`;
                if (modifier === 'right') return `Vire à direita ${street}`;
                if (modifier === 'slight left') return `Mantenha a esquerda ${street}`;
                if (modifier === 'slight right') return `Mantenha a direita ${street}`;
                if (modifier === 'sharp left') return `Curva acentuada à esquerda ${street}`;
                if (modifier === 'sharp right') return `Curva acentuada à direita ${street}`;
                return `Vire ${street}`;
            case 'new name': return `Siga em frente ${street}`;
            case 'depart': return `Saia em direção ${street}`;
            case 'arrive': return `Você chegou ao seu destino`;
            case 'merge': return `Entre na via ${street}`;
            case 'roundabout': return `Na rotatória, pegue a saída ${street}`;
            default: return `Siga em frente ${street}`;
        }
    };

    // --- PiP Logic ---
    const startPiP = async () => {
        // Fallback if API not supported
        if (!('documentPictureInPicture' in window)) {
            setIsMiniMode(!isMiniMode);
            return;
        }

        try {
            // 1. Open PiP Window
            const pipWin = await window.documentPictureInPicture.requestWindow({
                width: 400,
                height: 600,
            });
            
            setPipWindow(pipWin);

            // 2. Copy Styles
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    pipWin.document.head.appendChild(style);
                } catch (e) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.type = styleSheet.type;
                    link.media = styleSheet.media;
                    link.href = styleSheet.href;
                    pipWin.document.head.appendChild(link);
                }
            });

            // 3. Move Elements
            // We need to move the Map and the Navigation Card
            const mapContainer = document.querySelector('.map-container-3d');
            const navCard = document.getElementById('nav-instruction-card');
            
            // Remember parent to put back
            if (mapContainer) {
                mapContainerParentRef.current = mapContainer.parentNode;
                
                // Create a container in PiP
                const pipContainer = pipWin.document.createElement('div');
                pipContainer.className = "w-full h-full relative flex flex-col";
                pipContainer.style.background = "#f3f4f6";
                pipWin.document.body.appendChild(pipContainer);

                // Append Map
                // Map needs to be 100% height
                mapContainer.style.height = "100%";
                mapContainer.style.flex = "1";
                pipContainer.appendChild(mapContainer);

                // Append Nav Card (create a wrapper for it at bottom)
                if (navCard) {
                    // Clone or Move? Moving allows React state updates to reflect live!
                    // React Portal would be cleaner but complex to retrofit. Moving DOM works if event listeners are attached to node.
                    // Leaflet attaches to node, so it works. React events on Nav Card might break if not careful.
                    // Let's try moving NavCard.
                    navCard.classList.remove('absolute', 'top-4', 'left-4', 'right-4', 'md:left-1/2', 'md:right-auto', 'md:transform', 'md:-translate-x-1/2', 'md:w-[400px]');
                    navCard.classList.add('absolute', 'bottom-4', 'left-4', 'right-4'); // Stick to bottom in PiP
                    pipContainer.appendChild(navCard);
                }

                // Force map resize update
                const mapInstance = window.mapInstanceGlobal; // Hack: need access to map instance to invalidateSize
                if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 100);
            }

            // 4. Handle Close
            pipWin.addEventListener('pagehide', () => {
                const mapContainer = pipWin.document.querySelector('.map-container-3d');
                const navCard = pipWin.document.getElementById('nav-instruction-card');
                
                if (mapContainer && mapContainerParentRef.current) {
                    mapContainerParentRef.current.appendChild(mapContainer);
                    // Reset styles
                    mapContainer.style.height = "100%";
                    mapContainer.style.flex = "none";
                }
                
                if (navCard && mapContainerParentRef.current) {
                    // Put Nav Card back in main app root or wherever Navigation.js renders
                    // Navigation.js renders it, but we moved the DOM node. React might be confused.
                    // Actually, if we just move it back to body, React might reconcile or we force reload.
                    // Ideally, we move it back to a known container.
                    const root = document.getElementById('root'); // Or better, Navigation container
                    // Since React controls this node, moving it manually is risky.
                    // Best effort: Append back to body for now or reload page if glitchy.
                    // Correction: Navigation component renders the div. If we move it back, we need to strip the PiP specific classes.
                    navCard.classList.add('absolute', 'top-4', 'left-4', 'right-4', 'md:left-1/2', 'md:right-auto', 'md:transform', 'md:-translate-x-1/2', 'md:w-[400px]');
                    navCard.classList.remove('absolute', 'bottom-4', 'left-4', 'right-4');
                    
                    // We append it to the mapContainerParent temporarily so it's visible
                    document.body.appendChild(navCard); 
                }

                setPipWindow(null);
                if (window.mapInstanceGlobal) setTimeout(() => window.mapInstanceGlobal.invalidateSize(), 100);
            });

        } catch (err) {
            console.error("PiP Error:", err);
            setIsMiniMode(!isMiniMode);
        }
    };

    if (isCalculating) {
        return (
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-[1000]">
                <div className="icon-loader animate-spin text-blue-600"></div>
                <span className="font-bold text-gray-700">Calculando rota...</span>
            </div>
        );
    }

    if (!route) return null;

    // Display Logic
    let currentInstruction = "Siga em frente";
    let nextInstruction = null;
    let distanceDisplay = "0.0";
    let timeDisplay = "0";

    if (isDirectMode) {
        const distKm = calculateDistance(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
        const bearing = calculateBearing(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
        const cardinals = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
        const cardinalIndex = Math.round(bearing / 45) % 8;
        const direction = cardinals[cardinalIndex];

        currentInstruction = `Siga sentido ${direction}`;
        nextInstruction = "Linha reta até o destino";
        distanceDisplay = distKm.toFixed(1);
        timeDisplay = (distKm / 40 * 60).toFixed(0); 
    } else {
        const currentStep = steps[currentStepIndex];
        const streetName = currentStep?.name ? `na ${currentStep.name}` : '';
        currentInstruction = currentStep ? translateInstruction(currentStep.maneuver.type, currentStep.maneuver.modifier, streetName) : "Siga em frente";
        
        const nextStep = steps[currentStepIndex + 1];
        const nextStreetName = nextStep?.name ? `na ${nextStep.name}` : '';
        nextInstruction = nextStep ? translateInstruction(nextStep.maneuver.type, nextStep.maneuver.modifier, nextStreetName) : null;
        
        const distanceLeft = (route.distance / 1000) - distanceTraveled;
        distanceDisplay = Math.max(0, distanceLeft).toFixed(1);
        timeDisplay = (route.duration / 60).toFixed(0);
    }

    if (isMiniMode) {
        return (
            <div className="fixed bottom-24 right-4 z-[1200] bg-white rounded-xl shadow-2xl border-2 border-green-500 p-4 w-64 animate-in slide-in-from-bottom-4">
                 <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-green-700 text-xs uppercase">
                        {isDirectMode ? 'Modo Bússola' : 'Navegação Ativa'}
                     </span>
                     <button onClick={() => setIsMiniMode(false)} className="text-gray-400 hover:text-gray-600"><div className="icon-maximize-2 w-4 h-4"></div></button>
                 </div>
                 <div className="text-lg font-bold leading-tight mb-2">{currentInstruction}</div>
                 <div className="flex gap-3 text-sm font-mono text-gray-600">
                     <span>{distanceDisplay} km</span>
                 </div>
            </div>
        );
    }

    // Normal View (or PiP Content Wrapper)
    return (
        <div id="nav-wrapper">
             {/* The Card that moves to PiP */}
             <div 
                id="nav-instruction-card" 
                className={`${pipWindow ? 'absolute bottom-4 left-4 right-4' : 'absolute top-4 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 md:w-[400px]'} z-[1000] flex flex-col gap-2 transition-all duration-300`}
            >
                <div className={`${isDirectMode ? 'bg-orange-600' : 'bg-green-600'} text-white p-4 rounded-xl shadow-xl animate-in slide-in-from-top-4 transition-colors`}>
                    <div className="flex items-start gap-4">
                        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                            <div className={isDirectMode ? "icon-compass text-3xl" : "icon-navigation text-3xl"}></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold leading-tight mb-1">{currentInstruction}</h2>
                                {isDirectMode && <span className="bg-orange-800 text-[10px] px-2 py-1 rounded font-bold uppercase">Offline</span>}
                            </div>
                            {nextInstruction && (
                                <p className={`${isDirectMode ? 'text-orange-100 border-orange-500' : 'text-green-100 border-green-500'} text-sm flex items-center gap-1 mt-1 border-t pt-1`}>
                                    <span className="opacity-75">Depois:</span> {nextInstruction}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className={`mt-4 flex items-center justify-between border-t ${isDirectMode ? 'border-orange-500' : 'border-green-500'} pt-3`}>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <span className="block text-xl font-mono font-bold">{distanceDisplay}</span>
                                <span className={`text-xs ${isDirectMode ? 'text-orange-200' : 'text-green-200'}`}>km restantes</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-mono font-bold">{timeDisplay}</span>
                                <span className={`text-xs ${isDirectMode ? 'text-orange-200' : 'text-green-200'}`}>min est.</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                             {!pipWindow && (
                                <button onClick={startPiP} className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30" title="Modo PiP (Janela Flutuante)">
                                    <div className="icon-picture-in-picture-2 w-5 h-5"></div>
                                </button>
                             )}
                             <button 
                                onClick={onStop} 
                                className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-50"
                             >
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}