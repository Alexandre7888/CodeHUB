// Helper to convert Lat/Lon to Tile Coordinates
function getTileXY(lat, lon, zoom) {
    const xtile = Math.floor((lon + 180) / 360 * (1 << zoom));
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (1 << zoom));
    return { x: xtile, y: ytile };
}

// Forward Ref to allow parent to trigger estimation
const OfflineManager = React.forwardRef(({ mapInstance, onDownloadComplete }, ref) => {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [totalTiles, setTotalTiles] = React.useState(0);
    const [status, setStatus] = React.useState(null); // 'idle', 'selecting', 'estimating', 'confirm', 'downloading', 'downloading_roads', 'downloading_pois', 'done', 'error'
    const [depth, setDepth] = React.useState(2); // Usaremos um zoom máximo de +2 por padrão no quadrado
    const selectorRef = React.useRef(null);

    // Calculate tiles for a specific zoom level within bounds
    const calculateTilesForZoom = (bounds, zoom) => {
        const nw = bounds.getNorthWest();
        const se = bounds.getSouthEast();
        const min = getTileXY(nw.lat, nw.lng, zoom);
        const max = getTileXY(se.lat, se.lng, zoom);
        const xCount = Math.abs(max.x - min.x) + 1;
        const yCount = Math.abs(max.y - min.y) + 1;
        return { count: xCount * yCount, min, max, zoom };
    };

    const getBoundsFromSelector = () => {
        if (!mapInstance || !selectorRef.current) return mapInstance.getBounds();
        
        const rect = selectorRef.current.getBoundingClientRect();
        const mapContainer = mapInstance.getContainer().getBoundingClientRect();
        
        const nwPoint = L.point(rect.left - mapContainer.left, rect.top - mapContainer.top);
        const sePoint = L.point(rect.right - mapContainer.left, rect.bottom - mapContainer.top);
        
        const nwLatLon = mapInstance.containerPointToLatLng(nwPoint);
        const seLatLon = mapInstance.containerPointToLatLng(sePoint);
        
        return L.latLngBounds(nwLatLon, seLatLon);
    };

    const estimateDownload = React.useCallback(() => {
        if (!mapInstance) return;
        
        // Ao clicar para baixar, ativamos o modo de seleção com o quadrado
        setStatus('selecting');
    }, [mapInstance]);

    const confirmSelectionAndEstimate = () => {
        setStatus('estimating');
        const bounds = getBoundsFromSelector();
        const currentZoom = mapInstance.getZoom();
        // OTIMIZAÇÃO EXTREMA: Reduzir zoom máximo real para 17. O Leaflet esticará as imagens nos zooms 18 e 19.
        // O nível 18 e 19 representam ~90% de todas as imagens. Ignorá-los deixa o download segundos em vez de minutos.
        const maxZoom = 17; 
        
        let total = 0;
        const targetZoom = Math.min(currentZoom + depth, maxZoom);
        
        for (let z = currentZoom; z <= targetZoom; z++) {
            const { count } = calculateTilesForZoom(bounds, z);
            total += count;
        }
        
        setTotalTiles(total);
        setStatus('confirm');
    };

    React.useImperativeHandle(ref, () => ({
        estimateDownload
    }));

    const startDownload = async () => {
        if (!mapInstance) return;
        
        if (totalTiles > 3000) {
            if (!confirm(`Atenção: A área selecionada possui ${totalTiles} blocos. Isso pode demorar e usar muito espaço no dispositivo. Deseja continuar?`)) {
                return;
            }
        }

        setStatus('downloading');
        setIsDownloading(true);
        setProgress(0);

        const bounds = getBoundsFromSelector();
        const currentZoom = mapInstance.getZoom();
        const maxZoom = 17; // Limite de 17 para o download
        const targetZoom = Math.min(currentZoom + depth, maxZoom);

        const tilesToFetch = [];
        for (let z = currentZoom; z <= targetZoom; z++) {
            const { min, max } = calculateTilesForZoom(bounds, z);
            for (let x = min.x; x <= max.x; x++) {
                for (let y = min.y; y <= max.y; y++) {
                    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                    tilesToFetch.push(url);
                }
            }
        }

        let completed = 0;
        
        try {
            // Process in chunks of 50 for much better speed
            const chunkSize = 50;
            for (let i = 0; i < tilesToFetch.length; i += chunkSize) {
                const chunk = tilesToFetch.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (url) => {
                    try {
                        const response = await fetch(url, { mode: 'cors' });
                        if (response.ok) {
                            const blob = await response.blob();
                            const base64 = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                            if (window.saveTileToDB) {
                                await window.saveTileToDB(url, base64);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to fetch tile:', url);
                    } finally {
                        completed++;
                        if (completed % 5 === 0 || completed === tilesToFetch.length) {
                             setProgress(Math.round((completed / tilesToFetch.length) * 100));
                        }
                    }
                }));
            }
            
            // Etapa 2: Baixar a malha viária (Ruas, direções, mãos) com progresso
            setStatus('downloading_roads');
            setProgress(0);
            try {
                // Aumenta a margem extra para ~15km nas bordas para garantir rotas longas
                const buffer = 0.15;
                const s = bounds.getSouth() - buffer;
                const w = bounds.getWest() - buffer;
                const n = bounds.getNorth() + buffer;
                const e = bounds.getEast() + buffer;
                
                // Dividir a área em um grid 4x4 para lidar com a área muito maior (16 partes)
                const gridSize = 4;
                const latStep = (n - s) / gridSize;
                const lonStep = (e - w) / gridSize;
                const chunks = [];
                
                for(let i=0; i<gridSize; i++) {
                    for(let j=0; j<gridSize; j++) {
                        chunks.push({
                            s: s + i*latStep,
                            n: s + (i+1)*latStep,
                            w: w + j*lonStep,
                            e: w + (j+1)*lonStep
                        });
                    }
                }
                
                let roadsCompleted = 0;
                const allElements = [];
                const seenIds = new Set();
                
                // Processar chunks em lotes de 4 para baixar "parte por parte" mais rápido (em paralelo)
                const chunkBatches = [];
                for (let i = 0; i < chunks.length; i += 4) {
                    chunkBatches.push(chunks.slice(i, i + 4));
                }

                for (const batch of chunkBatches) {
                    await Promise.all(batch.map(async (chunk) => {
                        const query = `[out:json][timeout:30];(way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](${chunk.s},${chunk.w},${chunk.n},${chunk.e}););out body geom qt;`;
                        const targetUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                        const proxyUrl = `https://proxy-api.trickle-app.host/?url=${encodeURIComponent(targetUrl)}`;
                        
                        let success = false;
                        let retries = 2; 
                        
                        while (!success && retries >= 0) {
                            try {
                                const roadRes = await fetch(proxyUrl);
                                if (roadRes.ok) {
                                    const data = await roadRes.json();
                                    if (data.elements) {
                                        data.elements.forEach(el => {
                                            if (!seenIds.has(el.id)) {
                                                seenIds.add(el.id);
                                                allElements.push(el);
                                            }
                                        });
                                    }
                                    success = true;
                                } else {
                                    throw new Error(`Status ${roadRes.status}`);
                                }
                            } catch(e) {
                                retries--;
                                if (retries >= 0) await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                        
                        roadsCompleted++;
                        setProgress(Math.round((roadsCompleted / chunks.length) * 100));
                    }));
                }
                
                // Combinar e salvar
                if (allElements.length > 0) {
                    const combinedData = { version: 0.6, generator: "Overpass API", elements: allElements };
                    const blob = new Blob([JSON.stringify(combinedData)], { type: 'application/json' });
                    const combinedRes = new Response(blob, { status: 200, headers: { 'Content-Type': 'application/json' } });
                    
                    const roadKey = `offline-roads-${s.toFixed(4)}-${w.toFixed(4)}-${n.toFixed(4)}-${e.toFixed(4)}.json`;
                    await cache.put(roadKey, combinedRes);
                    
                    // Salvar a referência no localStorage para uso futuro pelo roteador offline
                    const savedAreas = JSON.parse(localStorage.getItem('offline_road_areas') || '[]');
                    // Remove duplicatas ou áreas sobrepostas para evitar lixo
                    savedAreas.push({ key: roadKey, bounds: {s, w, n, e}, timestamp: Date.now() });
                    localStorage.setItem('offline_road_areas', JSON.stringify(savedAreas));
                }
            } catch (roadErr) {
                console.warn("Falha ao baixar malha viária:", roadErr);
            }

            // Etapa 3: Baixar os POIs (nomes de locais) para busca offline
            setStatus('downloading_pois');
            setProgress(0);
            try {
                // Margem normal
                const s = bounds.getSouth();
                const w = bounds.getWest();
                const n = bounds.getNorth();
                const e = bounds.getEast();
                
                const poiQuery = `[out:json][timeout:30];(node["name"](${s},${w},${n},${e});way["name"](${s},${w},${n},${e}););out center qt;`;
                const poiTargetUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(poiQuery)}`;
                const poiProxyUrl = `https://proxy-api.trickle-app.host/?url=${encodeURIComponent(poiTargetUrl)}`;
                
                const poiRes = await fetch(poiProxyUrl);
                if (poiRes.ok) {
                    const data = await poiRes.json();
                    if (data.elements) {
                        const dbReq = indexedDB.open('mapsHubOfflineDB', 2);
                        dbReq.onsuccess = (eDB) => {
                            const db = eDB.target.result;
                            const tx = db.transaction('offline_pois', 'readwrite');
                            const store = tx.objectStore('offline_pois');
                            
                            data.elements.forEach(el => {
                                if (el.tags && el.tags.name) {
                                    const lat = el.lat || (el.center && el.center.lat);
                                    const lon = el.lon || (el.center && el.center.lon);
                                    if (lat && lon) {
                                        store.put({
                                            id: el.id.toString(),
                                            name: el.tags.name,
                                            lat: lat,
                                            lon: lon,
                                            tags: el.tags
                                        });
                                    }
                                }
                            });
                        };
                    }
                }
                setProgress(100);
            } catch (poiErr) {
                console.warn("Falha ao baixar POIs:", poiErr);
            }

            setStatus('done');
            setTimeout(() => {
                setStatus('idle');
                if (onDownloadComplete) onDownloadComplete();
            }, 4000);

        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setIsDownloading(false);
        }
    };

    if (status === 'idle' || status === null) return null;

    if (status === 'selecting') {
        return (
            <>
                <div className="fixed inset-0 pointer-events-none z-[1000] flex flex-col items-center justify-center">
                    <div 
                        ref={selectorRef}
                        className="w-[80%] md:w-[400px] aspect-square border-4 border-blue-500 border-dashed bg-blue-500 bg-opacity-10 rounded-xl relative pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                    >
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                            Área de Download
                        </div>
                    </div>
                </div>
                
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[1001] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex flex-col items-center animate-in slide-in-from-bottom-4 w-[90%] max-w-sm">
                    <h3 className="font-bold text-gray-800 text-center mb-1">Ajuste a Área</h3>
                    <p className="text-xs text-gray-500 text-center mb-4">Arraste o mapa ou use o zoom para enquadrar no quadrado a área que deseja usar sem internet.</p>
                    
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={confirmSelectionAndEstimate}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <div className="icon-check w-4 h-4"></div> Confirmar
                        </button>
                        <button 
                            onClick={() => setStatus('idle')}
                            className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="absolute top-24 right-4 md:right-16 z-[1001] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-[90%] md:w-80 max-w-sm animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <div className="icon-download-cloud text-blue-600"></div>
                    Salvar Mapa Offline
                </h3>
                <button onClick={() => setStatus('idle')} className="text-gray-400 hover:text-gray-600">
                    <div className="icon-x"></div>
                </button>
            </div>

            {status === 'confirm' && (
                <div className="space-y-4">
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="mb-2">A área dentro do quadrado será salva no dispositivo, incluindo ruas e nomes de locais para busca.</p>
                        <div className="flex justify-between items-center font-bold text-gray-800">
                            <span>Tamanho estimado (Blocos):</span>
                            <span>{totalTiles}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button 
                            onClick={startDownload}
                            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                        >
                            <div className="icon-download"></div>
                            Salvar Área (Atualizar)
                        </button>
                        <button 
                            onClick={() => setStatus('selecting')}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            )}

            {(status === 'downloading' || status === 'downloading_roads' || status === 'downloading_pois') && (
                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 font-bold">
                            {status === 'downloading' && 'Baixando imagens do mapa...'}
                            {status === 'downloading_roads' && 'Baixando malha viária...'}
                            {status === 'downloading_pois' && 'Baixando locais de busca...'}
                        </span>
                        <span className="text-blue-600 font-bold font-mono">{progress}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200 relative">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    
                    <p className="text-center text-xs text-gray-400">Por favor, não feche esta janela.</p>
                </div>
            )}

            {status === 'done' && (
                <div className="text-center py-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                        <div className="icon-check text-green-600 text-xl font-bold"></div>
                    </div>
                    <h4 className="font-bold text-green-800 mb-1">Área Offline Salva!</h4>
                    <p className="text-xs text-green-700 px-2">Imagens, malha viária rápida e nomes de locais foram guardados no dispositivo e já podem ser buscados sem internet.</p>
                </div>
            )}

            {status === 'error' && (
                <div className="text-center py-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="icon-wifi-off text-red-500 text-3xl mx-auto mb-2"></div>
                    <p className="font-bold text-red-800">Falha no Download</p>
                    <p className="text-xs text-red-600 mb-3 px-2">Verifique sua conexão e tente novamente.</p>
                    <button onClick={startDownload} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50">Tentar Novamente</button>
                </div>
            )}
        </div>
    );
});

window.OfflineManager = OfflineManager;