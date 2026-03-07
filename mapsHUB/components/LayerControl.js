function LayerControl({ 
    mapStyle, 
    setMapStyle, 
    showPlaces, 
    setShowPlaces, 
    showTourPoints, 
    setShowTourPoints,
    showTraffic,
    setShowTraffic,
    showCrossData,
    setShowCrossData,
    is3DMode,
    onToggle3D
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="absolute top-20 right-4 z-[999] flex flex-col items-end" data-file="LayerControl.js">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors mb-2 ${isOpen ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Camadas e Filtros"
            >
                <div className="icon-layers text-xl"></div>
            </button>

            {isOpen && (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64 animate-in fade-in slide-in-from-right-4 duration-200">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Perspectiva</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button 
                            onClick={() => is3DMode ? onToggle3D() : null}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${!is3DMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="icon-map"></div>
                            2D Plano
                        </button>
                        <button 
                            onClick={() => !is3DMode ? onToggle3D() : null}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${is3DMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="icon-box"></div>
                            3D Edifícios
                        </button>
                    </div>

                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Tipo de Mapa</h3>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        <button 
                            onClick={() => setMapStyle('standard')}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${mapStyle === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="icon-map"></div>
                            OSM Padrão
                        </button>
                        <button 
                            onClick={() => setMapStyle('satellite')}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${mapStyle === 'satellite' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="icon-globe"></div>
                            Satélite OSM
                        </button>
                    </div>

                    <div className="text-[10px] text-gray-500 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="font-bold">Nota:</span> O modo 3D usa dados do OSMBuildings e pode consumir mais dados.
                    </div>

                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Filtros de Exibição</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-2 text-gray-700">
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                    <div className="icon-rotate-3d w-4 h-4"></div>
                                </div>
                                <span className="text-sm font-medium">Rotas 360°</span>
                            </div>
                            <div className="relative">
                                <input type="checkbox" checked={showTourPoints} onChange={(e) => setShowTourPoints(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-2 text-gray-700">
                                <div className="p-1.5 bg-orange-100 text-orange-600 rounded">
                                    <div className="icon-store w-4 h-4"></div>
                                </div>
                                <span className="text-sm font-medium">Locais</span>
                            </div>
                            <div className="relative">
                                <input type="checkbox" checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </div>
                        </label>
                        
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-2 text-gray-700">
                                <div className="p-1.5 bg-red-100 text-red-600 rounded">
                                    <div className="icon-car w-4 h-4"></div>
                                </div>
                                <span className="text-sm font-medium">Tráfego</span>
                            </div>
                            <div className="relative">
                                <input type="checkbox" checked={showTraffic} onChange={(e) => setShowTraffic && setShowTraffic(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                            </div>
                        </label>


                    </div>
                </div>
            )}
        </div>
    );
}