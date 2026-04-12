function Navigation({ startPoint, endPoint, heading = 0, onStop, onUpdateStats, onRouteCalculated }) {
    const [route, setRoute] = React.useState(null);
    const [steps, setSteps] = React.useState([]);
    const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
    const [isCalculating, setIsCalculating] = React.useState(false);
    const [distanceTraveled, setDistanceTraveled] = React.useState(0);
    const [isCanvasPipActive, setIsCanvasPipActive] = React.useState(false);
    const [isMiniMode, setIsMiniMode] = React.useState(false); 
    
    // Refs
    const routeDestRef = React.useRef(null);
    const lastPosRef = React.useRef(startPoint);
    const hasStartedRef = React.useRef(false);
    const spokenStepsRef = React.useRef(new Set()); 
    const instructionRef = React.useRef("Calculando...");
    const distanceDisplayRef = React.useRef("0.0");
    
    // Refs para o Canvas PiP
    const latestPosRef = React.useRef(startPoint);
    const latestRouteRef = React.useRef(null);
    const latestHeadingRef = React.useRef(0);

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
                latestRouteRef.current = routeData;
                setSteps(routeData.legs[0].steps);
                
                const isOfflineGraph = routeData.isOfflineGraph || false;

                if (routeData.geometry && routeData.geometry.coordinates) {
                    const latLonPath = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
                    if (onRouteCalculated) {
                        onRouteCalculated(latLonPath);
                    }
                }

                if (isOfflineGraph) {
                    speak(`Rota offline calculada pelas ruas. Siga a linha azul no mapa.`);
                } else {
                    const firstStep = routeData.legs[0].steps[0];
                    const streetName = firstStep?.name ? `na ${firstStep.name}` : '';
                    const instruction = translateInstruction(firstStep?.maneuver?.type, firstStep?.maneuver?.modifier, streetName);
                    
                    const secondStep = routeData.legs[0].steps[1];
                    let afterInstructionText = '';
                    if (secondStep) {
                        const secondStreetName = secondStep.name ? `na ${secondStep.name}` : '';
                        afterInstructionText = ` Depois, ${translateInstruction(secondStep.maneuver.type, secondStep.maneuver.modifier, secondStreetName)}.`;
                    }
                    
                    speak(`Rota iniciada. ${instruction}.${afterInstructionText}`);
                }
            } else {
                alert("Não foi possível calcular a rota real (pelas ruas). Se você estiver offline, verifique se baixou a malha de ruas desta área completamente.");
                speak("Erro ao traçar rota. Baixe os mapas da região.");
                onStop();
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
        if (startPoint) {
            latestPosRef.current = startPoint;
        }
        if (heading !== undefined) {
            latestHeadingRef.current = heading;
        }
        
        if (!route || !startPoint) return;

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
                
                const afterNextStep = steps[currentStepIndex + 2];
                let afterInstructionText = '';
                if (afterNextStep) {
                    const afterStreetName = afterNextStep.name ? `na ${afterNextStep.name}` : '';
                    afterInstructionText = ` Depois, ${translateInstruction(afterNextStep.maneuver.type, afterNextStep.maneuver.modifier, afterStreetName)}.`;
                }
                
                speak(`Em 50 metros, ${instruction}.${afterInstructionText}`);
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

    const videoStreamRef = React.useRef(null);
    const workerRef = React.useRef(null);
    const audioCtxRef = React.useRef(null);
    const pipKeepAliveRef = React.useRef(null);

    const cleanupPiP = () => {
        setIsCanvasPipActive(false);
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            try { audioCtxRef.current.close(); } catch(e) {}
            audioCtxRef.current = null;
        }
        if (pipKeepAliveRef.current) {
            clearInterval(pipKeepAliveRef.current);
            pipKeepAliveRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(t => t.stop());
            videoStreamRef.current = null;
        }
        const video = document.getElementById("pip-video");
        if (video) {
            video.srcObject = null;
        }
    };

    React.useEffect(() => {
        return () => {
            cleanupPiP();
        };
    }, []);

    const togglePiP = async () => {
        if (isCanvasPipActive) {
            if (document.pictureInPictureElement) {
                try { await document.exitPictureInPicture(); } catch(e) {}
            }
            cleanupPiP();
            return;
        }

        // Limpeza de segurança antes de abrir um novo
        cleanupPiP();

        try {
            const mapDiv = document.querySelector('.leaflet-container') || document.getElementById('map') || document.body;
            const canvas = document.getElementById("pip-canvas");
            const video = document.getElementById("pip-video");
            
            if (!mapDiv || !canvas || !video || !window.html2canvas) {
                alert("Recursos para PiP não encontrados.");
                setIsMiniMode(!isMiniMode);
                return;
            }

            setIsCanvasPipActive(true);
            const ctx = canvas.getContext("2d");
            
            const tileCache = {};
            const getTile = (z, x, y) => {
                const key = `${z}/${x}/${y}`;
                if (tileCache[key]) return tileCache[key];
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                tileCache[key] = img;
                return img;
            };

            const latLonToTile = (lat, lon, zoom) => {
                const x = (lon + 180) / 360 * Math.pow(2, zoom);
                const y = (1 - Math.log(Math.tan(lat * Math.PI/180) + 1 / Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom);
                return { x, y };
            };

            const updateFrame = () => {
                if (!document.pictureInPictureElement && videoStreamRef.current) return;
                
                // Dimensões fixas para o PiP
                canvas.width = 400;
                canvas.height = 600;
                
                // Fundo padrão
                ctx.fillStyle = "#e5e7eb";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (!latestPosRef.current) return;

                const lat = latestPosRef.current.lat;
                const lon = latestPosRef.current.lon;
                const zoomLvl = 16;
                const tileSize = 256;

                const center = latLonToTile(lat, lon, zoomLvl);
                const startX = Math.floor(center.x);
                const startY = Math.floor(center.y);
                const offsetX = (center.x - startX) * tileSize;
                
                // Desloca o mapa um pouco para cima para o cursor ficar mais embaixo (como num GPS normal)
                const offsetY = (center.y - startY) * tileSize - 100;

                // 1. Desenhar Tiles
                for (let x = -1; x <= 1; x++) {
                    for (let y = -2; y <= 2; y++) {
                        const tileX = startX + x;
                        const tileY = startY + y;
                        const img = getTile(zoomLvl, tileX, tileY);

                        if (img.complete && img.naturalWidth > 0) {
                            ctx.drawImage(
                                img,
                                canvas.width/2 + x*tileSize - offsetX,
                                canvas.height/2 + y*tileSize - offsetY,
                                tileSize,
                                tileSize
                            );
                        }
                    }
                }

                // 2. Desenhar Rota
                if (latestRouteRef.current && latestRouteRef.current.geometry) {
                    const coords = latestRouteRef.current.geometry.coordinates;
                    
                    ctx.beginPath();
                    ctx.strokeStyle = "#3b82f6"; // blue-600
                    ctx.lineWidth = 8;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    
                    let first = true;
                    for (const coord of coords) {
                        // coord[0] = lon, coord[1] = lat
                        const pt = latLonToTile(coord[1], coord[0], zoomLvl);
                        const px = canvas.width/2 + (pt.x - center.x) * tileSize;
                        const py = canvas.height/2 + (pt.y - center.y) * tileSize + 100;
                        
                        if (first) {
                            ctx.moveTo(px, py);
                            first = false;
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.stroke();
                    
                    // Linha interna mais clara
                    ctx.beginPath();
                    ctx.strokeStyle = "#60a5fa"; // blue-400
                    ctx.lineWidth = 4;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    first = true;
                    for (const coord of coords) {
                        const pt = latLonToTile(coord[1], coord[0], zoomLvl);
                        const px = canvas.width/2 + (pt.x - center.x) * tileSize;
                        const py = canvas.height/2 + (pt.y - center.y) * tileSize + 100;
                        if (first) { ctx.moveTo(px, py); first = false; }
                        else { ctx.lineTo(px, py); }
                    }
                    ctx.stroke();
                }

                // 3. Desenhar Marcador do Usuário
                const markerX = canvas.width/2;
                const markerY = canvas.height/2 + 100;

                // Círculo de direção/precisão
                ctx.fillStyle = "rgba(37, 99, 235, 0.2)";
                ctx.beginPath();
                ctx.arc(markerX, markerY, 24, 0, Math.PI*2);
                ctx.fill();

                // Ponto central
                ctx.fillStyle = "#1d4ed8"; // blue-700
                ctx.beginPath();
                ctx.arc(markerX, markerY, 8, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.stroke();

                // 4. Desenhar HUD (Instruções e Distância)
                // Fundo do HUD superior
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.fillRect(10, 10, canvas.width - 20, 80);
                
                ctx.fillStyle = "white";
                ctx.font = "bold 20px sans-serif";
                ctx.fillText(instructionRef.current || "Siga a rota", 24, 40, canvas.width - 48);
                
                ctx.font = "16px sans-serif";
                ctx.fillStyle = "#4ade80"; // green-400
                ctx.fillText(`${distanceDisplayRef.current} km restantes`, 24, 70);
            };

            updateFrame(); // Frame inicial

            // Criar áudio silencioso para enganar o navegador e manter a aba ativa em segundo plano
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            const oscillator = audioCtxRef.current.createOscillator();
            const gainNode = audioCtxRef.current.createGain();
            gainNode.gain.value = 0; // Totalmente mudo
            oscillator.connect(gainNode);
            const audioDest = audioCtxRef.current.createMediaStreamDestination();
            gainNode.connect(audioDest);
            oscillator.start();
            const audioTrack = audioDest.stream.getAudioTracks()[0];

            const stream = canvas.captureStream(60); 
            stream.addTrack(audioTrack); // Adiciona o áudio silencioso ao vídeo PiP

            videoStreamRef.current = stream;
            video.srcObject = stream;

            await video.play();
            await video.requestPictureInPicture();

            // Web Worker para criar um "setInterval" imune à limitação de abas inativas do navegador
            const workerCode = `
                let interval;
                self.onmessage = function(e) {
                    if (e.data === 'start') {
                        // 100ms é o suficiente para renderizar o GPS suavemente e economizar bateria em segundo plano
                        interval = setInterval(() => { self.postMessage('tick'); }, 100);
                    } else if (e.data === 'stop') {
                        clearInterval(interval);
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            workerRef.current = new Worker(URL.createObjectURL(blob));
            workerRef.current.onmessage = () => { updateFrame(); };
            workerRef.current.postMessage('start');

            // 🔥 mantém vídeo ativo
            pipKeepAliveRef.current = setInterval(() => {
                if (video.paused) video.play();
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume();
                }
            }, 1000);

            video.addEventListener('leavepictureinpicture', () => {
                cleanupPiP();
            }, { once: true });

        } catch (err) {
            console.error("PiP error:", err);
            alert("PiP via vídeo não suportado neste dispositivo/navegador.");
            setIsCanvasPipActive(false);
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
    
    // Atualiza as refs para o canvas ler
    instructionRef.current = currentInstruction;
    distanceDisplayRef.current = distanceDisplay;

    if (isMiniMode) {
        return (
            <div className="fixed bottom-24 right-4 z-[1200] bg-white rounded-xl shadow-2xl border-2 border-green-500 p-4 w-64 animate-in slide-in-from-bottom-4">
                 <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-green-700 text-xs uppercase">
                        Navegação Ativa
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
            <div className="bg-green-600 text-white p-4 rounded-xl shadow-xl animate-in slide-in-from-top-4 transition-colors">
                <div className="flex items-start gap-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                        <div className="icon-navigation text-3xl"></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <h2 className="text-xl font-bold leading-tight mb-1">{currentInstruction}</h2>
                        </div>
                        {nextInstruction && (
                            <p className="text-green-100 border-green-500 text-sm flex items-center gap-1 mt-1 border-t pt-1">
                                <span className="opacity-75">Depois:</span> {nextInstruction}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between border-t border-green-500 pt-3">
                    <div className="flex gap-4">
                        <div className="text-center">
                            <span className="block text-xl font-mono font-bold">{distanceDisplay}</span>
                            <span className="text-xs text-green-200">km restantes</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-xl font-mono font-bold">{timeDisplay}</span>
                            <span className="text-xs text-green-200">min est.</span>
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

            <div className="flex gap-2 justify-end mt-2">
                <button 
                    onClick={togglePiP} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform font-bold text-sm ${isCanvasPipActive ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    title="Modo Flutuante (PiP)"
                >
                    <div className={isCanvasPipActive ? "icon-monitor-x" : "icon-picture-in-picture-2"}></div>
                    {isCanvasPipActive ? "Fechar Janela Flutuante" : "Navegar Fora do App (PiP)"}
                </button>
            </div>

            {/* Elementos ocultos para captura do mapa em vídeo/PiP */}
            <canvas id="pip-canvas" className="hidden"></canvas>
            <video id="pip-video" autoPlay muted playsInline className="hidden"></video>
        </div>
    );
}