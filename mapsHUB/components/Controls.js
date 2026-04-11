function Controls({ onZoomIn, onZoomOut, onLocateMe, onDownloadMap, isNavigating, is3DMode, onToggle3D }) {
    
    return (
        <div className="absolute bottom-8 right-4 z-[999] flex flex-col gap-2" data-file="Controls.js">
            <div className="glass-panel rounded-lg p-1 flex flex-col shadow-md">
                {isNavigating && (
                    <>
                        <button 
                            onClick={onToggle3D}
                            className={`p-2 rounded transition-colors ${is3DMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                            title={is3DMode ? "Mudar para 2D" : "Mudar para 3D"}
                        >
                            <div className={`text-xs font-bold ${is3DMode ? 'icon-box' : 'icon-square'}`}>
                                {is3DMode ? '2D' : '3D'}
                            </div>
                        </button>
                        <div className="h-[1px] bg-gray-200 mx-1"></div>
                    </>
                )}
                <button 
                    onClick={onLocateMe}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    title="Minha localização"
                >
                    <div className="icon-crosshair text-xl"></div>
                </button>
                <div className="h-[1px] bg-gray-200 mx-1"></div>
                <button 
                    onClick={onDownloadMap}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    title="Baixar Mapa Offline"
                >
                    <div className="icon-download text-xl"></div>
                </button>
            </div>
            
            <div className="glass-panel rounded-lg p-1 flex flex-col shadow-md">
                <button 
                    onClick={onZoomIn}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    title="Aumentar zoom"
                >
                    <div className="icon-plus text-xl"></div>
                </button>
                <div className="h-[1px] bg-gray-200 mx-1"></div>
                <button 
                    onClick={onZoomOut}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    title="Diminuir zoom"
                >
                    <div className="icon-minus text-xl"></div>
                </button>
            </div>
        </div>
    );
}