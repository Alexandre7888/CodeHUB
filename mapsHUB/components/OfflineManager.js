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
    const [status, setStatus] = React.useState(null); // 'idle', 'estimating', 'confirm', 'downloading', 'downloading_roads', 'done', 'error'
    const [depth, setDepth] = React.useState(1); // Default depth lowered to 1 for storage optimization

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

    const estimateDownload = React.useCallback(() => {
        if (!mapInstance) return;
        
        setStatus('estimating');
        const bounds = mapInstance.getBounds();
        const currentZoom = mapInstance.getZoom();
        const maxZoom = 19; // Leaflet/OSM max
        
        let total = 0;
        // Calculate total for current zoom up to limit
        // We limit depth to avoid massive downloads
        const targetZoom = Math.min(currentZoom + depth, maxZoom);
        
        for (let z = currentZoom; z <= targetZoom; z++) {
            const { count } = calculateTilesForZoom(bounds, z);
            total += count;
        }
        
        setTotalTiles(total);
        setStatus('confirm');
    }, [mapInstance, depth]);

    React.useImperativeHandle(ref, () => ({
        estimateDownload
    }));

    // Re-estimate when depth changes if we are in confirm state
    React.useEffect(() => {
        if (status === 'confirm') {
            estimateDownload();
        }
    }, [depth, estimateDownload]);

    const startDownload = async () => {
        if (!mapInstance) return;
        
        // Hard limit warning
        if (totalTiles > 2000) {
            if (!confirm(`Atenção: Você selecionou ${totalTiles} blocos. Isso pode demorar vários minutos e ocupar espaço. Deseja continuar?`)) {
                return;
            }
        }

        setStatus('downloading');
        setIsDownloading(true);
        setProgress(0);

        const bounds = mapInstance.getBounds();
        const currentZoom = mapInstance.getZoom();
        const maxZoom = 19;
        const targetZoom = Math.min(currentZoom + depth, maxZoom);

        // Generate list of all tiles to fetch
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
        const cacheName = 'mapshub-offline-tiles-v1';
        
        try {
            const cache = await caches.open(cacheName);
            
            // Process in chunks of 20 for better speed/stability
            const chunkSize = 20;
            for (let i = 0; i < tilesToFetch.length; i += chunkSize) {
                const chunk = tilesToFetch.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (url) => {
                    try {
                        // Attempt fetch with cors mode
                        const response = await fetch(url, { mode: 'cors' });
                        if (response.ok) {
                            await cache.put(url, response);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch tile:', url);
                    } finally {
                        completed++;
                        // Update progress less frequently to save renders
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
                // Adiciona uma margem extra de ~2km nas bordas para garantir rotas que começam fora da tela exata
                const buffer = 0.02;
                const s = bounds.getSouth() - buffer;
                const w = bounds.getWest() - buffer;
                const n = bounds.getNorth() + buffer;
                const e = bounds.getEast() + buffer;
                
                // Dividir a área em um grid 2x2 para processamento seguro (4 partes)
                const gridSize = 2;
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
                
                for (const chunk of chunks) {
                    const query = `[out:json][timeout:60];(way["highway"](${chunk.s},${chunk.w},${chunk.n},${chunk.e}););out body geom;`;
                    const targetUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                    const proxyUrl = `https://proxy-api.trickle-app.host/?url=${encodeURIComponent(targetUrl)}`;
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
                        }
                    } catch(e) {
                        console.warn("Falha ao baixar chunk viário:", e);
                    }
                    roadsCompleted++;
                    setProgress(Math.round((roadsCompleted / chunks.length) * 100));
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
                    savedAreas.push({ key: roadKey, bounds: {s, w, n, e}, timestamp: Date.now() });
                    localStorage.setItem('offline_road_areas', JSON.stringify(savedAreas));
                }
            } catch (roadErr) {
                console.warn("Falha ao baixar malha viária:", roadErr);
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

    return (
        <div className="absolute top-24 right-16 z-[1000] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80 animate-in fade-in slide-in-from-right-4">
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
                        <p className="mb-2">A área visível será salva no seu dispositivo.</p>
                        <div className="flex justify-between items-center font-bold text-gray-800">
                            <span>Total de Blocos:</span>
                            <span>{totalTiles}</span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Detalhe do Zoom (Profundidade)</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setDepth(0)}
                                className={`flex-1 py-1 text-xs border rounded transition-colors ${depth === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                            >
                                Só Atual
                            </button>
                            <button 
                                onClick={() => setDepth(2)}
                                className={`flex-1 py-1 text-xs border rounded transition-colors ${depth === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                            >
                                +2 Níveis
                            </button>
                            <button 
                                onClick={() => setDepth(4)}
                                className={`flex-1 py-1 text-xs border rounded transition-colors ${depth === 4 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                            >
                                +4 Níveis
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Quanto maior o nível, mais detalhes ao aproximar (e maior o download).</p>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button 
                            onClick={startDownload}
                            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                        >
                            <div className="icon-download"></div>
                            Baixar
                        </button>
                        <button 
                            onClick={() => setStatus('idle')}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {(status === 'downloading' || status === 'downloading_roads') && (
                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">
                            {status === 'downloading_roads' ? 'Baixando dados de ruas e direções...' : 'Baixando mapa (imagens)...'}
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
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="icon-check text-green-600 text-xl font-bold"></div>
                    </div>
                    <h4 className="font-bold text-green-800 mb-1">Mapa Salvo!</h4>
                    <p className="text-xs text-green-700 px-4">Imagens do mapa e dados de ruas (coordenadas e sentidos) salvos para uso offline.</p>
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