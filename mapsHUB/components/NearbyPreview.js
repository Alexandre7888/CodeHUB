function NearbyPreview({ point, onEnter, onClose }) {
    if (!point) return null;

    return (
        <div className="absolute bottom-24 left-4 z-[999] animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-64 md:w-72">
                <div className="relative h-32 bg-gray-200 group cursor-pointer" onClick={onEnter}>
                    <img 
                        src={point.photo || "https://images.unsplash.com/photo-1557971370-e7298ed473ab?q=80&w=600&auto=format&fit=crop"} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-20 transition-all">
                        <div className="w-12 h-12 rounded-full bg-white bg-opacity-90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <div className="icon-rotate-3d text-2xl text-blue-600"></div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-80"
                    >
                        <div className="icon-x text-xs"></div>
                    </button>
                </div>
                <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">360° Próximo</span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-2">
                        {point.title || "Ponto Panorâmico"}
                    </h4>
                    <button 
                        onClick={onEnter}
                        className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                        Entrar na Visão
                        <div className="icon-arrow-right w-3 h-3"></div>
                    </button>
                </div>
            </div>
        </div>
    );
}