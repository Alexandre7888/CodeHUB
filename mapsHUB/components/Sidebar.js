function Sidebar({ isOpen, onClose, currentUser, onLogin, onLogout, osmSession, onOSMLogin, onOSMLogout, onOpenOsmMode, onOpenContributions }) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-[2000] transition-opacity"
                onClick={onClose}
            ></div>

            {/* Sidebar Panel */}
            <div className="fixed top-0 left-0 h-full w-[280px] bg-white z-[2001] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col animate-in slide-in-from-left">
                {/* Header */}
                <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-800 p-6 flex flex-col justify-end text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    >
                        <div className="icon-x text-white"></div>
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg">
                             <div className="icon-map text-2xl font-bold"></div>
                         </div>
                         <div>
                             <h2 className="text-xl font-bold leading-none">mapsHUB</h2>
                             <p className="text-xs text-blue-200 mt-1">Navegação Colaborativa</p>
                         </div>
                    </div>
                </div>

                {/* User Info / Login Section */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
                                <button 
                                    onClick={onLogout}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                                >
                                    <div className="icon-log-out w-3 h-3"></div> Sair
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={onLogin}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                            <div className="icon-log-in"></div>
                            Entrar com CodeHub
                        </button>
                    )}
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</div>
                    
                    <button 
                        onClick={() => { onOpenOsmMode(); onClose(); }}
                        className="w-full text-left px-6 py-3 hover:bg-green-50 flex items-center gap-4 text-gray-700 hover:text-green-600 transition-colors"
                    >
                        <div className="icon-edit text-xl"></div>
                        <div>
                            <span className="font-medium block">Editar OpenStreetMap</span>
                            <span className="text-[10px] text-gray-400 block">Adicionar POIs e Ruas (Global)</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { onOpenContributions(); onClose(); }}
                        className="w-full text-left px-6 py-3 hover:bg-blue-50 flex items-center gap-4 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        <div className="icon-list text-xl"></div>
                        <div>
                            <span className="font-medium block">Minhas Contribuições</span>
                            <span className="text-[10px] text-gray-400 block">Acompanhe seus envios</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { window.location.href = 'studio.html'; }}
                        className="w-full text-left px-6 py-3 hover:bg-purple-50 flex items-center gap-4 text-gray-700 hover:text-purple-600 transition-colors"
                    >
                        <div className="icon-clapperboard text-xl"></div>
                        <div>
                            <span className="font-medium block">Studio (Criadores)</span>
                            <span className="text-[10px] text-gray-400 block">Envie rotas e vídeos</span>
                        </div>
                    </button>

                    <div className="my-4 border-t border-gray-100"></div>
                    <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Integrações</div>

                    <div className="px-6 py-2">
                        {osmSession ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded flex items-center justify-center">
                                        <div className="icon-map text-xs"></div>
                                    </div>
                                    <span className="text-sm font-bold text-green-800">OSM Conectado</span>
                                </div>
                                <p className="text-[10px] text-green-700 mb-2">
                                    Você pode contribuir com dados do mapa.
                                </p>
                                <button 
                                    onClick={onOSMLogout}
                                    className="text-xs text-red-500 hover:text-red-700 underline"
                                >
                                    Desconectar OSM
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="icon-map text-gray-400"></div>
                                    <span className="text-sm font-bold text-gray-700">OpenStreetMap</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-2">
                                    Conecte sua conta para editar o mapa mundial.
                                </p>
                                <button 
                                    onClick={onOSMLogin}
                                    className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-2 transition-colors"
                                >
                                    Entrar no OSM
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="my-4 border-t border-gray-100"></div>
                    <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Conta</div>

                    <button className="w-full text-left px-6 py-3 hover:bg-gray-50 flex items-center gap-4 text-gray-700 transition-colors">
                        <div className="icon-user text-xl"></div>
                        <span className="font-medium">Meu Perfil</span>
                    </button>
                    <button className="w-full text-left px-6 py-3 hover:bg-gray-50 flex items-center gap-4 text-gray-700 transition-colors">
                        <div className="icon-heart text-xl"></div>
                        <span className="font-medium">Favoritos</span>
                    </button>
                    <button className="w-full text-left px-6 py-3 hover:bg-gray-50 flex items-center gap-4 text-gray-700 transition-colors">
                        <div className="icon-clock text-xl"></div>
                        <span className="font-medium">Histórico</span>
                    </button>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-400">
                    <p>© 2026 mapsHUB Inc.</p>
                    <p className="mt-1">Versão 1.2.0</p>
                </div>
            </div>
        </>
    );
}