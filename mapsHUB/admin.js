function AdminApp() {
    const [places, setPlaces] = React.useState([]);
    const [tourPoints, setTourPoints] = React.useState([]);
    const [connections, setConnections] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('dashboard'); // 'dashboard', 'upload', 'approval', 'lines', 'tour', 'live'
    const [selectedPlaceId, setSelectedPlaceId] = React.useState('');
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadStatus, setUploadStatus] = React.useState('');
    const [currentPlacePhotos, setCurrentPlacePhotos] = React.useState([]);
    
    // Live Users State
    const [liveUsers, setLiveUsers] = React.useState([]);
    const [liveMap, setLiveMap] = React.useState(null);
    const liveMapRef = React.useRef(null);
    const liveMarkersRef = React.useRef({});
    
    // For Lines (Connections)
    const [lineStart, setLineStart] = React.useState('');
    const [lineEnd, setLineEnd] = React.useState('');
    
    // Mobile Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    React.useEffect(() => {
        loadData();
    }, []);

    React.useEffect(() => {
        if (selectedPlaceId) {
            loadPlacePhotos(selectedPlaceId);
        } else {
            setCurrentPlacePhotos([]);
        }
    }, [selectedPlaceId]);

    // Live Users Polling
    React.useEffect(() => {
        let interval;
        if (activeTab === 'live' || activeTab === 'dashboard') {
            const fetchUsers = async () => {
                const users = await fetchActiveUsers();
                setLiveUsers(users);
            };

            fetchUsers(); // Initial fetch
            interval = setInterval(fetchUsers, 5000); // Poll every 5s
            
            // Init Map if needed and we are in live tab
            if (activeTab === 'live') {
                setTimeout(() => {
                     if (!liveMapRef.current && document.getElementById('live-map')) {
                         const map = L.map('live-map').setView([-23.5505, -46.6333], 13);
                         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                         liveMapRef.current = map;
                         setLiveMap(map);
                     }
                }, 100);
            }
        }

        return () => clearInterval(interval);
    }, [activeTab]);
    
    // Update Live Markers
    React.useEffect(() => {
        if (!liveMapRef.current || activeTab !== 'live') return;

        // Cleanup old markers
        const currentUserIds = new Set(liveUsers.map(u => u.id));
        Object.keys(liveMarkersRef.current).forEach(id => {
            if (!currentUserIds.has(id)) {
                liveMarkersRef.current[id].remove();
                delete liveMarkersRef.current[id];
            }
        });

        liveUsers.forEach(user => {
            if (liveMarkersRef.current[user.id]) {
                liveMarkersRef.current[user.id].setLatLng([user.lat, user.lon]);
                liveMarkersRef.current[user.id].setTooltipContent(`${user.name} (${Math.round(user.speed || 0)} km/h)`);
            } else {
                const marker = L.marker([user.lat, user.lon], {
                    icon: L.divIcon({
                        className: 'bg-transparent',
                        html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold relative">
                                  ${user.name.charAt(0)}
                                  <div class="absolute -bottom-1 w-2 h-2 bg-green-400 rounded-full border border-white right-0"></div>
                               </div>`
                    })
                })
                .bindTooltip(`${user.name} (${Math.round(user.speed || 0)} km/h)`)
                .addTo(liveMapRef.current);
                
                liveMarkersRef.current[user.id] = marker;
            }
        });
        
        // Fit bounds if users exist
        if (liveUsers.length > 0) {
            const group = new L.featureGroup(Object.values(liveMarkersRef.current));
            liveMapRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
        }
        
    }, [liveUsers, activeTab]);

    const loadData = async () => {
        const [placesData, connectionsData, toursData] = await Promise.all([
            fetchPlaces(),
            fetchConnections(),
            fetchTourPoints()
        ]);
        
        if (placesData) setPlaces(Object.values(placesData));
        if (connectionsData) setConnections(connectionsData); 
        if (toursData) setTourPoints(toursData);
    };

    const loadPlacePhotos = async (id) => {
        const photos = await fetchPlacePhotos(id);
        const photosArray = photos ? Object.entries(photos).map(([key, val]) => ({ id: key, ...val })) : [];
        setCurrentPlacePhotos(photosArray);
    };

    const handleApproval = async (place, status) => {
        if (!confirm(`Deseja ${status === 'approved' ? 'aprovar' : 'rejeitar'} "${place.title}"?`)) return;
        
        try {
            await savePlace({ ...place, status });
            await loadData();
            alert(`Local ${status === 'approved' ? 'aprovado' : 'rejeitado'}!`);
        } catch (e) {
            alert("Erro ao atualizar status.");
        }
    };

    const handleTourPointApproval = async (point, status) => {
         if (!confirm(`Deseja ${status === 'approved' ? 'aprovar' : 'rejeitar'} este ponto 360?`)) return;
         try {
             await saveTourPoint({ ...point, status });
             await loadData();
         } catch(e) {
             alert("Erro ao atualizar ponto.");
         }
    };

    const handleDeletePlace = async (place) => {
        if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o local "${place.title}" e todas as suas fotos?`)) return;
        
        try {
            await deletePlace(place.id);
            await loadData();
            if (selectedPlaceId === place.id) setSelectedPlaceId('');
            alert("Local excluído.");
        } catch (e) {
            alert("Erro ao excluir local.");
        }
    };

    const handlePhotoDelete = async (photoId) => {
        if (!confirm("Excluir esta foto?")) return;
        try {
            await deletePhoto(selectedPlaceId, photoId);
            await loadPlacePhotos(selectedPlaceId);
        } catch (e) {
            alert("Erro ao excluir foto.");
        }
    };

    const handleConnectionDelete = async (connId) => {
        if (!confirm("Remover esta conexão?")) return;
        try {
            await deleteConnection(connId);
            await loadData();
        } catch (e) {
            alert("Erro ao excluir conexão.");
        }
    };

    const handle360Upload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPlaceId) {
            alert("Selecione um local e um arquivo.");
            return;
        }
        processUpload(file, '360');
    };

    const handleCameraCapture = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPlaceId) {
            return; 
        }
        processUpload(file, 'normal'); 
    };

    const processUpload = async (file, type) => {
        setIsUploading(true);
        setUploadStatus('Processando...');

        try {
            const width = type === '360' ? 3000 : 1024;
            const quality = type === '360' ? 0.6 : 0.6;
            
            const base64 = await compressImage(file, width, quality);
            
            setUploadStatus('Enviando...');
            
            await addPhotoToPlace(selectedPlaceId, {
                image: base64,
                type: type,
                date: new Date().toISOString(),
                author: 'Admin'
            });

            await loadPlacePhotos(selectedPlaceId);
            setUploadStatus('Sucesso!');
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            console.error(error);
            setUploadStatus('Erro no upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateConnection = async () => {
        if (!lineStart || !lineEnd || lineStart === lineEnd) {
            alert("Selecione dois locais diferentes para conectar.");
            return;
        }

        const startPlace = places.find(p => p.id === lineStart);
        const endPlace = places.find(p => p.id === lineEnd);

        if (!startPlace || !endPlace) return;

        try {
            await saveConnection({
                from: [parseFloat(startPlace.lat), parseFloat(startPlace.lon)],
                to: [parseFloat(endPlace.lat), parseFloat(endPlace.lon)],
                fromId: startPlace.id,
                toId: endPlace.id,
                createdAt: new Date().toISOString()
            });
            await loadData();
            alert("Conexão criada! A linha aparecerá no mapa.");
            setLineStart('');
            setLineEnd('');
        } catch (e) {
            alert("Erro ao criar conexão.");
        }
    };

    const pendingPlaces = places.filter(p => p.status === 'pending');
    const pendingTourPoints = tourPoints.filter(p => p.status === 'pending');
    const totalPending = pendingPlaces.length + pendingTourPoints.length;

    // --- Components ---

    const SidebarItem = ({ id, icon, label, count, badgeColor = "bg-red-500" }) => (
        <button 
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all mb-1 ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`icon-${icon} w-5 h-5`}></div>
                <span className="font-medium text-sm">{label}</span>
            </div>
            {count > 0 && (
                <span className={`${badgeColor} text-white text-[10px] px-2 py-0.5 rounded-full font-bold`}>{count}</span>
            )}
        </button>
    );

    const StatCard = ({ title, value, icon, color, subtext }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} text-white shadow-md`}>
                <div className={`icon-${icon} w-6 h-6`}></div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-gray-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2 font-bold">
                    <div className="icon-shield text-blue-500"></div> mapsHUB Admin
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <div className="icon-menu w-6 h-6"></div>
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-gray-900 text-gray-300 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-gray-800 hidden md:block">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="icon-shield text-blue-500"></div>
                        Admin Panel
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Gerenciamento mapsHUB v2.0</p>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto pt-20 md:pt-4">
                    <div className="text-xs font-bold text-gray-500 uppercase px-4 mb-2">Geral</div>
                    <SidebarItem id="dashboard" icon="layout-dashboard" label="Visão Geral" />
                    <SidebarItem id="live" icon="radio" label="Ao Vivo" count={liveUsers.length} badgeColor="bg-green-500" />
                    
                    <div className="mt-6 text-xs font-bold text-gray-500 uppercase px-4 mb-2">Gerenciamento</div>
                    <SidebarItem id="approval" icon="check-square" label="Aprovações" count={totalPending} badgeColor="bg-orange-500" />
                    <SidebarItem id="upload" icon="upload-cloud" label="Uploads & Fotos" />
                    <SidebarItem id="tour" icon="rotate-3d" label="Editor Tour 360" />
                    <SidebarItem id="lines" icon="git-commit-horizontal" label="Rotas & Conexões" />
                </div>

                <div className="p-4 border-t border-gray-800">
                    <a href="index.html" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <div className="icon-log-out w-4 h-4"></div>
                        Voltar ao Site
                    </a>
                </div>
            </aside>

            {/* Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
                
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
                            <p className="text-gray-500 text-sm">Bem-vindo de volta, Administrador.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title="Total de Locais" 
                                value={places.length} 
                                icon="map-pin" 
                                color="bg-blue-500"
                                subtext={`${places.filter(p => p.status === 'pending').length} pendentes`}
                            />
                            <StatCard 
                                title="Pontos 360°" 
                                value={tourPoints.length} 
                                icon="rotate-3d" 
                                color="bg-purple-500"
                                subtext="Imagens panorâmicas"
                            />
                            <StatCard 
                                title="Usuários Online" 
                                value={liveUsers.length} 
                                icon="users" 
                                color="bg-green-500"
                                subtext="Ativos agora"
                            />
                            <StatCard 
                                title="Conexões" 
                                value={connections.length} 
                                icon="share-2" 
                                color="bg-orange-500"
                                subtext="Rotas traçadas"
                            />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Quick Actions */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4">Ações Rápidas</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setActiveTab('tour')} className="p-4 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors flex flex-col items-center gap-2">
                                        <div className="icon-plus-circle text-2xl"></div>
                                        <span className="text-sm font-bold">Novo Tour</span>
                                    </button>
                                    <button onClick={() => setActiveTab('upload')} className="p-4 bg-purple-50 rounded-xl text-purple-700 hover:bg-purple-100 transition-colors flex flex-col items-center gap-2">
                                        <div className="icon-image text-2xl"></div>
                                        <span className="text-sm font-bold">Gerenciar Fotos</span>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Activity (Mock) */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4">Atividade Recente</h3>
                                <div className="space-y-3">
                                    {pendingPlaces.slice(0, 3).map(p => (
                                        <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                <span className="text-gray-600">Novo local sugerido: <strong>{p.title}</strong></span>
                                            </div>
                                            <span className="text-gray-400 text-xs">Pendente</span>
                                        </div>
                                    ))}
                                    {liveUsers.length > 0 && (
                                        <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-gray-600">Usuário conectado: <strong>{liveUsers[0].name}</strong></span>
                                            </div>
                                            <span className="text-gray-400 text-xs">Agora</span>
                                        </div>
                                    )}
                                    {pendingPlaces.length === 0 && liveUsers.length === 0 && (
                                        <p className="text-gray-400 text-sm italic">Nenhuma atividade recente.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* LIVE MAP TAB */}
                {activeTab === 'live' && (
                    <div className="h-full flex flex-col animate-in fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Monitoramento Ao Vivo</h2>
                            <div className="bg-white px-3 py-1 rounded-full text-sm font-medium shadow-sm border border-gray-200 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                {liveUsers.length} online
                            </div>
                        </div>
                        
                        <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                                <div id="live-map" className="w-full h-full bg-gray-100"></div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 overflow-y-auto">
                                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase">Lista de Usuários</h3>
                                {liveUsers.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <div className="icon-users text-4xl mb-2 opacity-20 mx-auto"></div>
                                        <p>Nenhum usuário ativo.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {liveUsers.map(user => (
                                            <div key={user.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between hover:bg-blue-50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{user.name}</div>
                                                        <div className="text-[10px] text-gray-500">ID: {user.id.substr(0,8)}...</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-blue-600 text-sm">{Math.round(user.speed || 0)} km/h</div>
                                                    <div className="text-[10px] text-gray-400">Lat: {user.lat.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TOUR EDITOR TAB */}
                {activeTab === 'tour' && (
                    <div className="animate-in fade-in">
                        <TourEditor />
                    </div>
                )}
                
                {/* UPLOAD & MANAGE TAB */}
                {activeTab === 'upload' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Conteúdo</h2>
                        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex flex-col md:flex-row gap-4 mb-8">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Local</label>
                                    <select 
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                        value={selectedPlaceId}
                                        onChange={(e) => setSelectedPlaceId(e.target.value)}
                                    >
                                        <option value="">-- Escolha um local para editar --</option>
                                        {places.map((place, idx) => (
                                            <option key={place.id || idx} value={place.id}>
                                                {place.title} {place.status === 'pending' ? '(Pendente)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedPlaceId && (
                                    <div className="flex items-end">
                                        <button 
                                            onClick={() => handleDeletePlace(places.find(p => p.id === selectedPlaceId))}
                                            className="bg-red-50 text-red-600 px-6 py-3 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2 h-[46px]"
                                        >
                                            <div className="icon-trash"></div> Excluir
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                {/* 360 Upload */}
                                <div className={`border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-all ${!selectedPlaceId ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400 hover:bg-blue-50'}`}>
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <div className="icon-rotate-3d text-2xl"></div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-2">Panorama 360°</h3>
                                    <p className="text-sm text-gray-500 mb-4">Carregue imagens equiretangulares para visualização imersiva.</p>
                                    <label className="inline-block">
                                        <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                            Escolher Arquivo
                                        </span>
                                        <input type="file" accept="image/*" onChange={handle360Upload} disabled={isUploading} className="hidden"/>
                                    </label>
                                </div>

                                {/* Camera / Normal Photo */}
                                <div className={`border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-all ${!selectedPlaceId ? 'opacity-50 pointer-events-none' : 'hover:border-green-400 hover:bg-green-50'}`}>
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <div className="icon-camera text-2xl"></div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-2">Foto Convencional</h3>
                                    <p className="text-sm text-gray-500 mb-4">Fotos de fachada, interior ou detalhes do local.</p>
                                    <label className="inline-block">
                                        <span className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-bold cursor-pointer hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                                            Abrir Câmera
                                        </span>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} disabled={isUploading} className="hidden"/>
                                    </label>
                                </div>
                            </div>

                            {uploadStatus && (
                                <div className={`mb-6 p-4 rounded-lg text-center font-bold animate-in fade-in ${uploadStatus.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {uploadStatus}
                                </div>
                            )}

                            {/* Photos List */}
                            {selectedPlaceId && (
                                <div className="border-t border-gray-100 pt-8">
                                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <div className="icon-image text-gray-500"></div>
                                        Galeria do Local <span className="text-gray-400 font-normal">({currentPlacePhotos.length})</span>
                                    </h3>
                                    
                                    {currentPlacePhotos.length === 0 ? (
                                        <div className="text-center py-10 bg-gray-50 rounded-xl">
                                            <p className="text-gray-400 text-sm">Nenhuma foto encontrada.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {currentPlacePhotos.map((photo) => (
                                                <div key={photo.id} className="relative group rounded-xl overflow-hidden shadow-sm aspect-video bg-gray-100">
                                                    <img src={photo.image} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                        <button 
                                                            onClick={() => handlePhotoDelete(photo.id)}
                                                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transform scale-90 hover:scale-100 transition-all shadow-lg"
                                                            title="Excluir"
                                                        >
                                                            <div className="icon-trash w-4 h-4"></div>
                                                        </button>
                                                    </div>
                                                    <div className="absolute top-2 left-2">
                                                        {photo.type === '360' && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">360°</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* APPROVAL TAB */}
                {activeTab === 'approval' && (
                    <div className="space-y-8 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-gray-800">Aprovações Pendentes</h2>
                        
                        {/* Places Section */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                                <div className="icon-map-pin"></div> Locais Sugeridos ({pendingPlaces.length})
                            </h3>
                            
                            {pendingPlaces.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl text-center border border-dashed border-gray-200">
                                    <p className="text-gray-400">Nenhum local aguardando aprovação.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {pendingPlaces.map(place => (
                                        <div key={place.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-lg text-gray-800">{place.title}</h4>
                                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded capitalize">{place.type}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">{place.subtitle || place.address?.road || 'Sem endereço'}</p>
                                                <div className="text-xs text-gray-400 mt-2 font-mono">{place.lat.toFixed(5)}, {place.lon.toFixed(5)}</div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleApproval(place, 'rejected')} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">Rejeitar</button>
                                                <button onClick={() => handleApproval(place, 'approved')} className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-100 transition-colors">Aprovar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tour Points Section */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                                <div className="icon-rotate-3d"></div> Pontos 360° ({pendingTourPoints.length})
                            </h3>
                            
                             {pendingTourPoints.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl text-center border border-dashed border-gray-200">
                                    <p className="text-gray-400">Nenhum ponto 360 aguardando aprovação.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingTourPoints.map(point => (
                                        <div key={point.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                                            <div className="h-40 bg-gray-200 relative">
                                                {point.photo ? (
                                                    <img src={point.photo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">Sem Imagem</div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                                    Por: {point.author || 'User'}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="text-xs text-gray-500 font-mono">
                                                        Lat: {point.lat.toFixed(4)}<br/>Lon: {point.lon.toFixed(4)}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => handleTourPointApproval(point, 'rejected')} className="py-2 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors">Recusar</button>
                                                    <button onClick={() => handleTourPointApproval(point, 'approved')} className="py-2 rounded-lg bg-green-50 text-green-600 font-bold text-xs hover:bg-green-100 transition-colors">Aceitar</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LINES TAB */}
                {activeTab === 'lines' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Rotas</h2>
                        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-500 mb-6 bg-purple-50 p-4 rounded-lg border border-purple-100">
                                Conecte dois locais para criar uma linha visual no mapa. Isso ajuda a indicar caminhos ou relações entre pontos.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 items-end mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ponto de Partida (A)</label>
                                    <select value={lineStart} onChange={e => setLineStart(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">Selecione...</option>
                                        {places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ponto de Chegada (B)</label>
                                    <select value={lineEnd} onChange={e => setLineEnd(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">Selecione...</option>
                                        {places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateConnection}
                                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                            >
                                <div className="icon-git-branch-plus"></div>
                                Criar Conexão
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">Conexões Ativas ({connections.length})</h3>
                            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                                {connections.length === 0 ? (
                                    <p className="text-gray-400 text-sm italic">Nenhuma rota criada.</p>
                                ) : (
                                    connections.map((conn, idx) => {
                                        const fromName = places.find(p => p.id === conn.fromId)?.title || 'Desconhecido';
                                        const toName = places.find(p => p.id === conn.toId)?.title || 'Desconhecido';
                                        
                                        return (
                                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                                    <span className="text-gray-700 text-sm font-medium">{fromName} <span className="text-gray-400 mx-2">→</span> {toName}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleConnectionDelete(conn.id)} 
                                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                    title="Remover"
                                                >
                                                    <div className="icon-trash w-4 h-4"></div>
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);