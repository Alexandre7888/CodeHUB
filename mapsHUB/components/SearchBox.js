function SearchBox({ onSelectResult, onMenuClick }) {
    const [query, setQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 3) {
                setIsLoading(true);
                const results = await searchPlaces(query);
                setSuggestions(results);
                setIsLoading(false);
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item) => {
        setQuery(item.display_name.split(',')[0]); // Keep only main name in input
        setSuggestions([]);
        onSelectResult(item);
        setIsFocused(false);
    };

    return (
        <div className="absolute top-4 left-4 z-[1000] flex flex-col w-[calc(100%-2rem)] md:w-[380px]" data-file="SearchBox.js">
            <div className="glass-panel rounded-lg flex items-center p-2 gap-2 transition-shadow focus-within:shadow-xl">
                <button 
                    onClick={onMenuClick}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 md:hidden"
                >
                    <div className="icon-menu"></div>
                </button>
                <div className="p-2 text-gray-400 hidden md:block">
                     <div className="icon-search"></div>
                </div>
                
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-base h-10"
                    placeholder="Pesquisar no OpenMaps"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                />
                
                {query && (
                    <button 
                        onClick={() => { setQuery(''); setSuggestions([]); }}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                    >
                        <div className="icon-x"></div>
                    </button>
                )}
                <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                <button className="p-2 hover:bg-gray-100 rounded-full text-blue-600 font-medium">
                     <div className="icon-arrow-right"></div>
                </button>
            </div>

            {/* Suggestions Dropdown */}
            {isFocused && (suggestions.length > 0 || isLoading) && (
                <div className="glass-panel mt-2 rounded-lg overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4 text-gray-500 gap-2">
                            <div className="icon-loader animate-spin"></div>
                            <span>Buscando...</span>
                        </div>
                    ) : (
                        suggestions.map((item, index) => (
                            <div 
                                key={index}
                                onClick={() => handleSelect(item)}
                                className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-start gap-3 border-b border-gray-50 last:border-0"
                            >
                                <div className="mt-1 text-gray-400">
                                    <div className="icon-map-pin"></div>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-800 text-sm">
                                        {item.display_name.split(',')[0]}
                                    </div>
                                    <div className="text-xs text-gray-500 line-clamp-1">
                                        {formatAddress(item)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}