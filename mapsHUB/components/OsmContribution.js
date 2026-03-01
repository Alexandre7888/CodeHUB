function OsmContribution({ 
    isActive, 
    onClose, 
    userLocation, 
    osmSession, 
    onLoginReq 
}) {
    const [mode, setMode] = React.useState('node'); // 'node' or 'way'
    const [step, setStep] = React.useState('select'); // 'select', 'details', 'submitting', 'success'
    
    // Core Data
    const [nodeCoords, setNodeCoords] = React.useState(null);
    const [wayPoints, setWayPoints] = React.useState([]); 
    
    // Common Fields
    const [elementType, setElementType] = React.useState('amenity=cafe');
    const [customType, setCustomType] = React.useState(''); 
    const [elementName, setElementName] = React.useState('');
    
    // Extra Fields
    const [phone, setPhone] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [openingHours, setOpeningHours] = React.useState('');
    const [instagram, setInstagram] = React.useState('');

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
                    Contribua diretamente para o mapa mundial.
                </p>
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
            
            // 1. Prepare Tags
            let finalType = elementType;
            if (elementType === 'other') {
                if (!customType.includes('=')) throw new Error('Formato inválido para tag. Use "chave=valor".');
                finalType = customType;
            }

            const [k, v] = finalType.split('=');
            const tags = { [k]: v };
            
            if (elementName) tags.name = elementName;
            if (phone) tags.phone = phone;
            if (website) tags.website = website;
            if (openingHours) tags.opening_hours = openingHours;
            if (instagram) tags['contact:instagram'] = instagram; // OSM standard

            let newId = null;
            let type = mode;

            // 2. Submit based on mode
            if (mode === 'node') {
                const comment = `Added ${elementName || 'POI'} via mapsHUB`;
                const changesetId = await createChangeset(comment, token);
                newId = await createOsmNode(changesetId, nodeCoords.lat, nodeCoords.lng, tags, token);
                await closeChangeset(changesetId, token);
            } 
            else if (mode === 'way') {
                const comment = `Created ${elementName || 'way'} via mapsHUB`;
                const changesetId = await createChangeset(comment, token);
                newId = await createOsmWay(changesetId, wayPoints, tags, token);
                await closeChangeset(changesetId, token);
            }

            // 3. Save to Local History
            const contribution = {
                id: newId,
                type: mode, // 'node' or 'way'
                name: elementName || 'Sem Nome',
                category: finalType,
                lat: mode === 'node' ? nodeCoords.lat : wayPoints[0].lat,
                lon: mode === 'node' ? nodeCoords.lng : wayPoints[0].lon,
                timestamp: Date.now(),
                status: 'published' // We assume published if no error
            };
            
            const history = JSON.parse(localStorage.getItem('my_osm_contributions') || '[]');
            history.unshift(contribution);
            localStorage.setItem('my_osm_contributions', JSON.stringify(history));

            setStep('success');
            setTimeout(() => {
                onClose();
                resetForm();
            }, 3000);

        } catch (error) {
            console.error(error);
            alert("Erro ao enviar: " + error.message);
            setStep('details');
        }
    };

    const resetForm = () => {
        setStep('select');
        setNodeCoords(null);
        setWayPoints([]);
        setCustomType('');
        setElementName('');
        setPhone('');
        setWebsite('');
        setOpeningHours('');
        setInstagram('');
    };

    return (
        <div className="absolute top-20 left-4 z-[1100] bg-white rounded-xl shadow-2xl border border-gray-200 w-[350px] overflow-hidden animate-in fade-in flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
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

            <div className="p-4 overflow-y-auto">
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
                                    Selecione o local exato onde deseja adicionar um novo estabelecimento.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 flex gap-2">
                                    <div className="icon-info shrink-0 mt-0.5"></div>
                                    <p>Clique sequencialmente no mapa para desenhar o traçado.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-xs text-gray-500 uppercase">Pontos: {wayPoints.length}</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min((wayPoints.length / 5) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setWayPoints(prev => prev.slice(0, -1))}
                                        className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50"
                                        disabled={wayPoints.length === 0}
                                    >
                                        Desfazer
                                    </button>
                                    <button 
                                        onClick={() => wayPoints.length >= 2 ? setStep('details') : alert('Marque pelo menos 2 pontos.')}
                                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ${wayPoints.length >= 2 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                            <div className="relative">
                                <select 
                                    value={elementType}
                                    onChange={(e) => setElementType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                                >
                                    <option value="other">✏️ Outro (Personalizado)</option>
                                    <optgroup label="Comum">
                                        <option value="amenity=cafe">☕ Café</option>
                                        <option value="amenity=restaurant">🍽️ Restaurante</option>
                                        <option value="shop=supermarket">🛒 Supermercado</option>
                                        <option value="highway=residential">🏠 Rua Residencial</option>
                                    </optgroup>
                                    {/* Add more options as needed, keeping it concise for brevity */}
                                </select>
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                    <div className="icon-chevron-down w-4 h-4"></div>
                                </div>
                            </div>
                        </div>

                        {elementType === 'other' && (
                            <div>
                                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Tag (Chave=Valor)</label>
                                <input 
                                    type="text" 
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value)}
                                    placeholder="Ex: amenity=cinema"
                                    className="w-full border border-blue-300 rounded-lg p-3 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                            <input 
                                type="text" 
                                value={elementName}
                                onChange={(e) => setElementName(e.target.value)}
                                placeholder="Nome do local"
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>

                        {/* Extra Fields Collapsible or Always Visible */}
                        <div className="pt-2 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Informações Adicionais</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input 
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Telefone"
                                        className="w-full border border-gray-200 rounded p-2 text-xs focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="Website (https://...)"
                                        className="w-full border border-gray-200 rounded p-2 text-xs focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        value={instagram}
                                        onChange={(e) => setInstagram(e.target.value)}
                                        placeholder="Instagram (user)"
                                        className="w-full border border-gray-200 rounded p-2 text-xs focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        value={openingHours}
                                        onChange={(e) => setOpeningHours(e.target.value)}
                                        placeholder="Horário (Ex: Mo-Fr 09:00-18:00)"
                                        className="w-full border border-gray-200 rounded p-2 text-xs focus:border-green-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button onClick={() => setStep('select')} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50">
                                Voltar
                            </button>
                            <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                                <div className="icon-cloud-upload w-4 h-4"></div>
                                Publicar
                            </button>
                        </div>
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="text-center py-10">
                        <div className="icon-loader animate-spin text-green-600 text-3xl mx-auto mb-4"></div>
                        <h4 className="font-bold text-gray-800">Publicando...</h4>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8 bg-green-50 rounded-xl border border-green-100">
                        <div className="icon-check text-green-600 text-3xl mx-auto mb-3"></div>
                        <h4 className="font-bold text-green-800">Sucesso!</h4>
                        <p className="text-xs text-green-700 mt-1">Salvo no histórico e enviado ao OSM.</p>
                    </div>
                )}
            </div>
        </div>
    );
}