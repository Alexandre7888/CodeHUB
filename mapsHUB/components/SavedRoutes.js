function SavedRoutes({ isOpen, onClose, onNavigate }) {
    const [routes, setRoutes] = React.useState([]);

    const loadRoutes = async () => {
        if (window.getAllSavedRoutesMeta) {
            const saved = await window.getAllSavedRoutesMeta();
            saved.sort((a, b) => b.timestamp - a.timestamp);
            setRoutes(saved);
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            loadRoutes();
        }
    }, [isOpen]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (confirm("Remover esta rota salva?")) {
            if (window.deleteSavedRoute) {
                await window.deleteSavedRoute(id);
                loadRoutes();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-black bg-opacity-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <div className="icon-download-cloud text-blue-600"></div>
                        Rotas Salvas (Offline)
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                        <div className="icon-x"></div>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {routes.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <div className="icon-map text-4xl mb-3 mx-auto opacity-30"></div>
                            <p className="text-sm font-medium text-gray-600">Nenhuma rota salva.</p>
                            <p className="text-xs mt-1">Busque um local e clique em "Salvar Rota" para usá-lo sem internet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {routes.map(r => (
                                <div key={r.id} className="border border-gray-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all bg-white flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-1">
                                                <div className="icon-map-pin text-blue-500 w-3 h-3"></div>
                                                {r.destinationName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                <div className="icon-clock w-3 h-3"></div>
                                                Salvo em: {new Date(r.timestamp).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(r.id, e)}
                                            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                                            title="Excluir Rota"
                                        >
                                            <div className="icon-trash w-4 h-4"></div>
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => onNavigate({
                                            id: r.id,
                                            lat: r.destinationCoords.lat,
                                            lon: r.destinationCoords.lon,
                                            title: r.destinationName,
                                            type: 'saved_route'
                                        })}
                                        className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <div className="icon-navigation w-4 h-4"></div>
                                        Navegar Agora
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 flex items-start gap-2 shrink-0">
                    <div className="icon-info w-4 h-4 mt-0.5 shrink-0"></div>
                    <p>Estas rotas estão guardadas no cache do seu dispositivo e funcionarão perfeitamente mesmo sem conexão com a internet.</p>
                </div>
            </div>
        </div>
    );
}