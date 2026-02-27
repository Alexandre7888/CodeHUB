function Navigation({ startPoint, endPoint, onStop, onUpdateStats, onRouteCalculated }) {
    const [route, setRoute] = React.useState(null);
    const [steps, setSteps] = React.useState([]);
    const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
    const [isCalculating, setIsCalculating] = React.useState(false);
    const [isDirectMode, setIsDirectMode] = React.useState(false); // New mode for offline line-of-sight
    
    const [distanceTraveled, setDistanceTraveled] = React.useState(0);
    const [pipWindow, setPipWindow] = React.useState(null);
    const [isMiniMode, setIsMiniMode] = React.useState(false); 
    
    // Refs
    const routeDestRef = React.useRef(null);
    const lastPosRef = React.useRef(startPoint);
    const hasStartedRef = React.useRef(false);
    const spokenStepsRef = React.useRef(new Set()); 

    // 1. Route Calculation Effect
    React.useEffect(() => {
        if (!endPoint || !startPoint) return;
        
        const destKey = endPoint.id || `${endPoint.lat},${endPoint.lon}`;
        if (route && routeDestRef.current === destKey) return;
        if (isCalculating) return;

        const calculate = async () => {
            setIsCalculating(true);
            routeDestRef.current = destKey;
            
            if (!hasStartedRef.current) {
                // Initial feedback
                if (navigator.onLine) {
                    speak(`Calculando rota para ${endPoint.title || 'destino'}...`);
                } else {
                    speak(`Modo offline. Traçando rota direta para ${endPoint.title || 'destino'}...`);
                }
                hasStartedRef.current = true;
            }
            
            // This function now handles fallback to Direct Route internally
            const routeData = await getRoute(startPoint, endPoint);
            
            if (routeData) {
                setRoute(routeData);
                setSteps(routeData.legs[0].steps);
                
                // Check if it's our "Direct Mode" shim
                const isDirect = routeData.isDirect || false;
                setIsDirectMode(isDirect);

                if (routeData.geometry && routeData.geometry.coordinates) {
                    const latLonPath = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
                    if (onRouteCalculated) onRouteCalculated(latLonPath);
                }

                // Initial Announce
                if (isDirect) {
                    const distKm = (routeData.distance / 1000).toFixed(1);
                    speak(`Rota direta offline ativada. O destino está a ${distKm} quilômetros. Siga a linha no mapa.`);
                } else {
                    const firstStep = routeData.legs[0].steps[0];
                    const streetName = firstStep?.name ? `na ${firstStep.name}` : '';
                    const instruction = translateInstruction(firstStep?.maneuver?.type, firstStep?.maneuver?.modifier, streetName);
                    speak(`Rota iniciada. ${instruction}`);
                }
            } else {
                speak("Não foi possível traçar a rota.");
            }
            setIsCalculating(false);
        };
        
        calculate();
        
    }, [endPoint]); 

    // Helper to translate and format instructions
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
            case 'new name':
                return `Siga em frente ${street}`;
            case 'depart':
                return `Saia em direção ${street}`;
            case 'arrive':
                return `Você chegou ao seu destino`;
            case 'merge':
                return `Entre na via ${street}`;
            case 'roundabout':
                return `Na rotatória, pegue a saída ${street}`;
            default:
                return `Siga em frente ${street}`;
        }
    };

    // 2. Position Tracking Effect
    React.useEffect(() => {
        if (!route || !startPoint) return;

        // In Direct Mode, we recalculate distance/bearing constantly
        if (isDirectMode) {
            const dist = calculateDistance(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
            
            // Only speak updates occasionally or when very close?
            // For now, just update UI
            if (onUpdateStats) onUpdateStats({ distance: distanceTraveled }); // Keep simplified stats for now

            // Check arrival (Direct Mode has larger radius)
            if (dist < 0.05 && !spokenStepsRef.current.has('arrival')) {
                speak("Você está chegando próximo ao destino.");
                spokenStepsRef.current.add('arrival');
            }
            if (dist < 0.02) {
                 speak("Você chegou ao destino.");
                 onStop();
            }
            return;
        }

        // Standard Turn-by-Turn Logic
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
                
                speak(`Em 50 metros, ${instruction}`);
                spokenStepsRef.current.add(currentStepIndex);
                
                if (distToTurn < 0.02) {
                    setCurrentStepIndex(prev => prev + 1);
                }
            } else {
                const destName = endPoint.title || 'destino';
                speak(`Você chegou em ${destName}.`);
                onStop();
            }
        }
    };

    const togglePiP = async () => {
        try {
            if ('documentPictureInPicture' in window) {
                const pipWin = await window.documentPictureInPicture.requestWindow({ width: 300, height: 400 });
                // ... logic same as before ...
                setPipWindow(pipWin);
                pipWin.addEventListener('pagehide', () => setPipWindow(null));
            } else {
                setIsMiniMode(!isMiniMode); 
            }
        } catch (err) {
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
        // Direct Mode Display
        const distKm = calculateDistance(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
        const bearing = calculateBearing(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
        
        // Convert bearing to cardinal direction roughly
        const cardinals = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
        const cardinalIndex = Math.round(bearing / 45) % 8;
        const direction = cardinals[cardinalIndex];

        currentInstruction = `Siga sentido ${direction}`;
        nextInstruction = "Linha reta até o destino";
        distanceDisplay = distKm.toFixed(1);
        timeDisplay = (distKm / 40 * 60).toFixed(0); // Estimate based on 40km/h
    } else {
        // Normal Mode Display
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
                        {isDirectMode ? 'Modo Bússola (Offline)' : 'Navegação Ativa'}
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

    return (
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 md:w-[400px] z-[1000] flex flex-col gap-2">
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
                    
                    <button 
                        onClick={onStop} 
                        className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-50"
                    >
                        Sair
                    </button>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <button onClick={togglePiP} className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700">
                    <div className={pipWindow ? "icon-monitor" : "icon-picture-in-picture-2"}></div>
                </button>
            </div>
        </div>
    );
}