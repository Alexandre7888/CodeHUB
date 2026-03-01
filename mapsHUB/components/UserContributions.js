function UserContributions({ onClose }) {
    const [contributions, setContributions] = React.useState([]);
    const [checkingId, setCheckingId] = React.useState(null);

    React.useEffect(() => {
        loadContributions();
    }, []);

    const loadContributions = () => {
        const history = JSON.parse(localStorage.getItem('my_osm_contributions') || '[]');
        setContributions(history);
    };

    const checkStatus = async (item) => {
        setCheckingId(item.id);
        
        try {
            const result = await fetchOsmObject(item.type, item.id);
            
            // Update item status in local state
            const newStatus = result.exists ? 'verified' : (result.status === 'deleted' ? 'deleted' : 'unknown');
            
            const updatedHistory = contributions.map(c => 
                c.id === item.id ? { ...c, status: newStatus, lastChecked: Date.now() } : c
            );
            
            setContributions(updatedHistory);
            localStorage.setItem('my_osm_contributions', JSON.stringify(updatedHistory));
            
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingId(null);
        }
    };

    const checkAll = async () => {
        // Sequentially check all to avoid rate limits
        for (const item of contributions) {
            await checkStatus(item);
            await new Promise(r => setTimeout(r, 500)); // 500ms delay between checks
        }
    };

    return (
        <div className="absolute top-20 left-4 z-[1100] bg-white rounded-xl shadow-2xl border border-gray-200 w-[350px] overflow-hidden animate-in fade-in flex flex-col max-h-[80vh]">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-white bg-opacity-20 p-1.5 rounded">
                        <div className="icon-list"></div>
                    </div>
                    <div>
                        <span className="font-bold block text-sm">Minhas Contribuições</span>
                        <span className="text-[10px] text-blue-100 opacity-80 block leading-none">Histórico OSM Local</span>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors">
                    <div className="icon-x"></div>
                </button>
            </div>

            <div className="p-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium px-2">
                    {contributions.length} itens registrados
                </span>
                <button 
                    onClick={checkAll}
                    disabled={checkingId !== null}
                    className="text-xs bg-white border border-gray-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"
                >
                    <div className={`icon-refresh-cw w-3 h-3 ${checkingId ? 'animate-spin' : ''}`}></div>
                    Verificar Todos
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {contributions.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <div className="icon-inbox text-4xl mb-2 opacity-30 mx-auto"></div>
                        <p>Nenhuma contribuição encontrada neste dispositivo.</p>
                    </div>
                ) : (
                    contributions.map((item, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-gray-800 text-sm">{item.name}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    item.status === 'verified' ? 'bg-green-100 text-green-700' :
                                    item.status === 'deleted' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {item.status === 'verified' ? 'Aprovado' : 
                                     item.status === 'deleted' ? 'Removido' : 'Enviado'}
                                </span>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                <span className="capitalize">{item.type}</span>
                                <span>•</span>
                                <span className="font-mono bg-gray-100 px-1 rounded">{item.category}</span>
                            </div>

                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                <div className="text-[10px] text-gray-400">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                    <a 
                                        href={`https://www.openstreetmap.org/${item.type}/${item.id}`} 
                                        target="_blank" 
                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                    >
                                        Ver no OSM <div className="icon-external-link w-3 h-3"></div>
                                    </a>
                                    <button 
                                        onClick={() => checkStatus(item)}
                                        disabled={checkingId === item.id}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                        title="Verificar Status Agora"
                                    >
                                        <div className={`icon-refresh-cw w-3 h-3 ${checkingId === item.id ? 'animate-spin' : ''}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="p-2 bg-yellow-50 text-[10px] text-yellow-800 border-t border-yellow-100 text-center">
                <p>"Aprovado" significa que o item existe no banco de dados oficial do OSM.</p>
            </div>
        </div>
    );
}