function OsmContribution({ 
    isActive, 
    onClose, 
    userLocation, 
    osmSession, 
    onLoginReq 
}) {
    const [mode, setMode] = React.useState('node'); // 'node' or 'way'
    const [step, setStep] = React.useState('select'); // 'select', 'details', 'submitting', 'success'
    
    // Data for Node
    const [nodeCoords, setNodeCoords] = React.useState(null);
    const [nodeType, setNodeType] = React.useState('amenity=cafe'); // Default key=value
    const [nodeName, setNodeName] = React.useState('');
    
    // Data for Way
    const [wayPoints, setWayPoints] = React.useState([]); // Array of {lat, lon}
    const [wayType, setWayType] = React.useState('highway=residential');
    const [wayName, setWayName] = React.useState('');
    
    // Global Map Click Listener
    React.useEffect(() => {
        if (!isActive || step !== 'select') return;

        const onGlobalMapClick = (e) => {
            if (mode === 'node') {
                setNodeCoords(e.detail);
                setStep('details');
            } else if (mode === 'way') {
                setWayPoints(prev => [...prev, e.detail]);
            }
        };

        window.addEventListener('map-click', onGlobalMapClick);
        return () => window.removeEventListener('map-click', onGlobalMapClick);
    }, [isActive, step, mode]);

    if (!isActive) return null;

    if (!osmSession) {
        return (
            <div className="absolute top-24 left-4 z-[1100] bg-white p-6 rounded-xl shadow-2xl border-l-4 border-blue-600 max-w-sm animate-in slide-in-from-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <div className="icon-globe text-xl"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">Editor Oficial OSM</h3>
                        <p className="text-[10px] text-blue-600 font-bold uppercase">OpenStreetMap Live</p>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Contribua diretamente para o mapa mundial. Crie ruas, lojas e pontos de interesse reais que aparecerão para todos os usuários do mundo.
                </p>
                <div className="bg-yellow-50 border border-yellow-100 p-2 rounded text-xs text-yellow-800 mb-4 flex gap-2">
                    <div className="icon-triangle-alert shrink-0 mt-0.5"></div>
                    <span>Suas edições afetam o mapa global oficial. Use com responsabilidade.</span>
                </div>
                <button 
                    onClick={onLoginReq}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                    <div className="icon-log-in"></div>
                    Conectar Conta OSM
                </button>
                <button onClick={onClose} className="w-full mt-3 text-gray-500 text-xs hover:underline">Cancelar</button>
            </div>
        );
    }

    const handleSubmit = async () => {
        setStep('submitting');
        try {
            const token = osmSession.token.access_token;
            
            if (mode === 'node') {
                const comment = `Added ${nodeName || 'POI'} via mapsHUB`;
                const changesetId = await createChangeset(comment, token);
                
                const [k, v] = nodeType.split('=');
                const tags = { [k]: v };
                if (nodeName) tags.name = nodeName;
                
                await createOsmNode(changesetId, nodeCoords.lat, nodeCoords.lng, tags, token);
                await closeChangeset(changesetId, token);
            } 
            else if (mode === 'way') {
                const comment = `Created ${wayName || 'way'} via mapsHUB`;
                const changesetId = await createChangeset(comment, token);
                
                const [k, v] = wayType.split('=');
                const tags = { [k]: v };
                if (wayName) tags.name = wayName;
                
                await createOsmWay(changesetId, wayPoints, tags, token);
                await closeChangeset(changesetId, token);
            }

            setStep('success');
            setTimeout(() => {
                onClose();
                setStep('select');
                setNodeCoords(null);
                setWayPoints([]);
            }, 3000);

        } catch (error) {
            console.error(error);
            alert("Erro ao enviar para o OSM: " + error.message);
            setStep('details');
        }
    };

    return (
        <div className="absolute top-20 left-4 z-[1100] bg-white rounded-xl shadow-2xl border border-gray-200 w-[350px] overflow-hidden animate-in fade-in">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <div className="bg-white bg-opacity-20 p-1.5 rounded">
                        <div className="icon-edit-3"></div>
                    </div>
                    <div>
                        <span className="font-bold block text-sm">Editor OSM Global</span>
                        <span className="text-[10px] text-green-100 opacity-80 block leading-none">Modificações em Tempo Real</span>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors">
                    <div className="icon-x"></div>
                </button>
            </div>

            <div className="p-4">
                {step === 'select' && (
                    <>
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button 
                                onClick={() => { setMode('node'); setWayPoints([]); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'node' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                <div className="icon-map-pin w-3 h-3"></div>
                                Novo Local
                            </button>
                            <button 
                                onClick={() => { setMode('way'); setNodeCoords(null); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'way' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                <div className="icon-activity w-3 h-3"></div>
                                Nova Rua
                            </button>
                        </div>

                        {mode === 'node' ? (
                            <div className="text-center py-6 bg-green-50 rounded-xl border-2 border-dashed border-green-200 group hover:border-green-400 transition-colors cursor-pointer">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <div className="icon-crosshair text-green-600 text-xl"></div>
                                </div>
                                <p className="text-sm font-bold text-green-800">Toque no mapa</p>
                                <p className="text-xs text-green-600 px-4">
                                    Selecione o local exato onde deseja adicionar um novo estabelecimento ou ponto de interesse.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 flex gap-2">
                                    <div className="icon-info shrink-0 mt-0.5"></div>
                                    <p>Clique sequencialmente no mapa para desenhar o traçado da nova via.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-xs text-gray-500 uppercase">Pontos Marcados</span>
                                        <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{wayPoints.length}</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min((wayPoints.length / 5) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {wayPoints.length > 0 && (
                                        <button 
                                            onClick={() => setWayPoints(prev => prev.slice(0, -1))}
                                            className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50"
                                        >
                                            Desfazer
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => wayPoints.length >= 2 ? setStep('details') : alert('Marque pelo menos 2 pontos.')}
                                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ${wayPoints.length >= 2 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {step === 'details' && (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria do Elemento</label>
                            <div className="relative">
                                <select 
                                    value={mode === 'node' ? nodeType : wayType}
                                    onChange={(e) => mode === 'node' ? setNodeType(e.target.value) : setWayType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                                >
                                    {mode === 'node' ? (
                                        <>
                                            <optgroup label="Alimentação">
                                                <option value="amenity=cafe">☕ Café / Cafeteria</option>
                                                <option value="amenity=restaurant">🍽️ Restaurante</option>
                                                <option value="amenity=fast_food">🍔 Fast Food</option>
                                                <option value="amenity=bar">🍺 Bar</option>
                                            </optgroup>
                                            <optgroup label="Comércio">
                                                <option value="shop=convenience">🏪 Loja de Conveniência</option>
                                                <option value="shop=supermarket">🛒 Supermercado</option>
                                                <option value="shop=clothes">👕 Loja de Roupas</option>
                                            </optgroup>
                                            <optgroup label="Serviços & Lazer">
                                                <option value="leisure=park">🌳 Parque</option>
                                                <option value="tourism=hotel">🏨 Hotel</option>
                                                <option value="amenity=bench">🪑 Banco (Assento)</option>
                                                <option value="amenity=toilets">wc Banheiro Público</option>
                                            </optgroup>
                                        </>
                                    ) : (
                                        <>
                                            <optgroup label="Vias Públicas">
                                                <option value="highway=residential">🏠 Rua Residencial</option>
                                                <option value="highway=service">🚚 Via de Serviço / Acesso</option>
                                                <option value="highway=tertiary">🛣️ Via Coletora (Bairro)</option>
                                            </optgroup>
                                            <optgroup label="Caminhos">
                                                <option value="highway=footway">🚶 Calçada / Pedestres</option>
                                                <option value="highway=cycleway">🚲 Ciclovia</option>
                                                <option value="highway=path">🌲 Trilha</option>
                                            </optgroup>
                                        </>
                                    )}
                                </select>
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                    <div className="icon-chevron-down w-4 h-4"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Oficial</label>
                            <input 
                                type="text" 
                                value={mode === 'node' ? nodeName : wayName}
                                onChange={(e) => mode === 'node' ? setNodeName(e.target.value) : setWayName(e.target.value)}
                                placeholder="Ex: Padaria Central ou Rua das Flores"
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Deixe em branco se não souber o nome.</p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button 
                                onClick={() => setStep('select')}
                                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50"
                            >
                                Voltar
                            </button>
                            <button 
                                onClick={handleSubmit}
                                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                            >
                                <div className="icon-cloud-upload w-4 h-4"></div>
                                Publicar no OSM
                            </button>
                        </div>
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="text-center py-10">
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="icon-globe text-green-600"></div>
                            </div>
                        </div>
                        <h4 className="font-bold text-gray-800 text-lg">Publicando...</h4>
                        <p className="text-sm text-gray-500 mt-1 px-4">
                            Conectando aos servidores oficiais do OpenStreetMap e registrando sua contribuição.
                        </p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8 bg-green-50 rounded-xl border border-green-100 animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <div className="icon-check text-green-600 text-3xl font-bold"></div>
                        </div>
                        <h4 className="font-bold text-green-800 text-lg">Mapa Atualizado!</h4>
                        <p className="text-sm text-green-700 px-6 mt-2 leading-relaxed">
                            Sua contribuição foi enviada com sucesso para o banco de dados global.
                        </p>
                        <div className="mt-4 text-xs text-green-600 opacity-70">
                            Pode levar alguns minutos para aparecer na renderização padrão.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}