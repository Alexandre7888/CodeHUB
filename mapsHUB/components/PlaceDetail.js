function PlaceDetail({ place, onClose, onDirections }) {
    const [photos, setPhotos] = React.useState([]);
    const [showPano, setShowPano] = React.useState(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);

    React.useEffect(() => {
        if (place && place.id) {
            loadPhotos();
            setIsExpanded(false); // Reset to collapsed view initially
        }
    }, [place]);

    const loadPhotos = async () => {
        if (!place.id) return;
        // Mock checking if it's a real backend ID or temp
        if (place.id.toString().startsWith('temp_')) {
            setPhotos([]); // Temp places usually don't have photos yet unless from API
            return;
        }
        
        const photosData = await fetchPlacePhotos(place.id);
        const photosList = photosData ? Object.values(photosData) : [];
        setPhotos(photosList);
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadPromises = files.map(async (file) => {
                const base64 = await compressImage(file, 800, 0.6);
                return addPhotoToPlace(place.id, {
                    image: base64,
                    type: 'normal',
                    date: new Date().toISOString(),
                    author: 'User'
                });
            });

            await Promise.all(uploadPromises);
            await loadPhotos();
            alert(`${files.length} foto(s) adicionada(s) com sucesso!`);
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar fotos.");
        } finally {
            setIsUploading(false);
        }
    };

    if (!place) return null;

    const formattedAddress = place.address ? formatAddress(place) : (place.subtitle || '');
    const type = place.type || 'Local';
    const title = place.title || (place.display_name ? place.display_name.split(',')[0] : 'Local Selecionado');
    
    const panoramas = photos.filter(p => p.type === '360');
    const normalPhotos = photos.filter(p => p.type !== '360');

    // Drag / Click handler to expand
    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <>
            {showPano && (
                <PanoramaViewer 
                    imageSrc={showPano} 
                    onClose={() => setShowPano(null)} 
                />
            )}

            {/* Bottom Sheet Container */}
            <div 
                className={`absolute left-0 right-0 bottom-0 z-[1100] bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'h-[80vh] rounded-t-2xl' : 'h-[250px] md:h-[200px] rounded-t-2xl'}`}
            >
                {/* Drag Handle */}
                <div 
                    className="w-full h-8 flex items-center justify-center cursor-pointer shrink-0"
                    onClick={toggleExpand}
                >
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
                            <p className="text-sm text-gray-500 capitalize">{type} • {formattedAddress}</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                            <div className="icon-x text-gray-600"></div>
                        </button>
                    </div>

                    <div className="flex gap-3 my-4">
                        <button 
                            onClick={onDirections}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-full flex items-center justify-center gap-2 font-bold shadow-md transform active:scale-95 transition-all"
                        >
                            <div className="icon-navigation text-xl"></div>
                            <span>Iniciar Rota</span>
                        </button>
                        
                        <button 
                            className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50"
                            title="Compartilhar"
                        >
                            <div className="icon-share-2"></div>
                        </button>
                         <label className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 cursor-pointer">
                             {isUploading ? <div className="icon-loader animate-spin"></div> : <div className="icon-camera"></div>}
                             <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} disabled={isUploading} />
                        </label>
                    </div>

                    {/* Photos Section */}
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                             <div className="icon-image"></div>
                             Fotos do Local
                        </h3>
                        
                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                            {/* 360 Preview Card */}
                            {panoramas.length > 0 ? (
                                panoramas.map((pano, idx) => (
                                    <div 
                                        key={'pano'+idx}
                                        className="min-w-[140px] h-24 rounded-lg overflow-hidden relative cursor-pointer snap-start border border-gray-200"
                                        onClick={() => setShowPano(pano.image)}
                                    >
                                        <img src={pano.image} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                            <div className="icon-rotate-3d text-white text-2xl"></div>
                                        </div>
                                        <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 rounded">360°</div>
                                    </div>
                                ))
                            ) : null}

                            {/* Normal Photos */}
                            {normalPhotos.map((photo, idx) => (
                                <div 
                                    key={'norm'+idx}
                                    className="min-w-[140px] h-24 rounded-lg overflow-hidden relative cursor-pointer snap-start border border-gray-200"
                                >
                                    <img src={photo.image} className="w-full h-full object-cover" />
                                </div>
                            ))}

                            {/* Placeholder / Add more */}
                            <div className="min-w-[100px] h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50 snap-start">
                                <div className="icon-plus mb-1"></div>
                                <span className="text-xs">Adicionar</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info Section (Only visible when expanded) */}
                    {isExpanded && (
                        <div className="mt-6 space-y-4 border-t pt-4 border-gray-100">
                             <div className="flex items-center gap-3 text-gray-600">
                                <div className="icon-clock text-gray-400"></div>
                                <span>Aberto 24 horas (Previsão)</span>
                             </div>
                             <div className="flex items-center gap-3 text-gray-600">
                                <div className="icon-phone text-gray-400"></div>
                                <span>(11) 99999-9999</span>
                             </div>
                             <div className="flex items-center gap-3 text-gray-600">
                                <div className="icon-globe text-gray-400"></div>
                                <span>www.website.com</span>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}