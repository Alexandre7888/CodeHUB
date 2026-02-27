function UserPlaces({ onSelectLocation, currentUserLoc }) {
    const [places, setPlaces] = React.useState({
        home: null,
        car: null
    });

    React.useEffect(() => {
        const saved = localStorage.getItem('userPlaces');
        if (saved) {
            setPlaces(JSON.parse(saved));
        }
    }, []);

    const saveLocation = (type, loc) => {
        const newPlaces = { 
            ...places, 
            [type]: { 
                ...loc, 
                title: type === 'home' ? 'Minha Casa' : 'Meu Carro',
                timestamp: Date.now() 
            } 
        };
        setPlaces(newPlaces);
        localStorage.setItem('userPlaces', JSON.stringify(newPlaces));
        alert(`${type === 'home' ? 'Casa' : 'Carro'} salvo na sua localização atual!`);
    };

    const handleSetHome = () => {
        if (!currentUserLoc) {
            alert("Aguarde o GPS encontrar sua localização.");
            return;
        }
        saveLocation('home', currentUserLoc);
    };

    const handleSetCar = () => {
        if (!currentUserLoc) {
            alert("Aguarde o GPS encontrar sua localização.");
            return;
        }
        saveLocation('car', currentUserLoc);
    };

    return (
        <div className="absolute top-20 left-4 z-[998] flex flex-col gap-3">
            {/* Home Button Group */}
            <div className="flex items-center gap-2 group relative">
                <button 
                    onClick={() => places.home ? onSelectLocation(places.home) : handleSetHome()}
                    className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors border-2 ${places.home ? 'bg-white border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-400'}`}
                    title={places.home ? "Ir para Casa" : "Definir Casa Aqui"}
                >
                    <div className="icon-house text-lg"></div>
                </button>
                
                {places.home ? (
                     <div className="flex gap-1 animate-in fade-in slide-in-from-left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full shadow-sm">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSelectLocation(places.home); }} 
                            className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-100"
                            title="Rota para Casa"
                        >
                            <div className="icon-navigation w-4 h-4"></div>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSetHome(); }} 
                            className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                            title="Atualizar Localização"
                        >
                            <div className="icon-refresh-cw w-4 h-4"></div>
                        </button>
                     </div>
                ) : null}
            </div>

            {/* Car Button Group */}
            <div className="flex items-center gap-2 group relative">
                <button 
                    onClick={() => places.car ? onSelectLocation(places.car) : handleSetCar()}
                    className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors border-2 ${places.car ? 'bg-white border-orange-500 text-orange-600' : 'bg-white border-gray-200 text-gray-400'}`}
                    title={places.car ? "Onde estacionei?" : "Estacionar Aqui"}
                >
                    <div className="icon-car text-lg"></div>
                </button>
                
                {places.car ? (
                     <div className="flex gap-1 animate-in fade-in slide-in-from-left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full shadow-sm">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSelectLocation(places.car); }} 
                            className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 hover:bg-orange-100"
                            title="Rota para Carro"
                        >
                            <div className="icon-navigation w-4 h-4"></div>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSetCar(); }} 
                            className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                            title="Atualizar Localização"
                        >
                            <div className="icon-refresh-cw w-4 h-4"></div>
                        </button>
                     </div>
                ) : null}
            </div>
        </div>
    );
}