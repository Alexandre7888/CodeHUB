function Sidebar({ isOpen, onClose, onOpenStudio, onAddPlace, onOpenSavedRoutes, onOpenAdmin }) {
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

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</div>
                    
                    <button 
                        onClick={() => { onAddPlace(); onClose(); }}
                        className="w-full text-left px-6 py-3 hover:bg-blue-50 flex items-center gap-4 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        <div className="icon-map-pin text-xl"></div>
                        <span className="font-medium">Adicionar Local</span>
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
                    <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Conta / Offline</div>

                    <button 
                        onClick={() => { onClose(); onOpenSavedRoutes(); }}
                        className="w-full text-left px-6 py-3 hover:bg-gray-50 flex items-center gap-4 text-gray-700 transition-colors"
                    >
                        <div className="icon-download-cloud text-xl text-green-600"></div>
                        <span className="font-medium">Rotas Salvas (Offline)</span>
                    </button>

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