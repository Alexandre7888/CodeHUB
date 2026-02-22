function StoreApp() {
    const [user, setUser] = React.useState(null);
    const [credits, setCredits] = React.useState(0);
    const [history, setHistory] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('stickers'); // stickers, sounds, credits
    
    // Sticker Creation
    const [stickerUrl, setStickerUrl] = React.useState("");
    const [myStickers, setMyStickers] = React.useState([]);

    // Sound Effects
    const [soundName, setSoundName] = React.useState("");
    const [soundFile, setSoundFile] = React.useState(null);
    const [mySounds, setMySounds] = React.useState([]);

    React.useEffect(() => {
        const storedUser = localStorage.getItem("chat_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            window.location.href = 'index.html';
        }

        // Load Credits
        const storedCredits = localStorage.getItem("saldo_creditos");
        setCredits(storedCredits ? parseFloat(storedCredits) : 0);

        // Load History
        const storedHistory = localStorage.getItem("historico_recargas");
        setHistory(storedHistory ? JSON.parse(storedHistory) : []);

        // Load Stickers & Sounds (Mock local storage for now)
        const storedStickers = localStorage.getItem("user_stickers");
        if(storedStickers) setMyStickers(JSON.parse(storedStickers));

        const storedSounds = localStorage.getItem("user_sounds");
        if(storedSounds) setMySounds(JSON.parse(storedSounds));

    }, []);

    const addCredits = (amount) => {
        const newBalance = credits + amount;
        setCredits(newBalance);
        localStorage.setItem("saldo_creditos", newBalance);

        const newEntry = {
            id: Date.now(),
            amount: amount,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            desc: "Recarga Manual"
        };
        const newHistory = [newEntry, ...history];
        setHistory(newHistory);
        localStorage.setItem("historico_recargas", JSON.stringify(newHistory));
        
        alert(`Recarga de ${amount} realizada com sucesso!`);
    };

    const handleCreateSticker = () => {
        if (!stickerUrl) return alert("Insira uma URL de imagem/gif");
        
        const cost = 10;
        if (credits < cost) return alert("Saldo insuficiente (Custo: 10)");

        const newSticker = { id: Date.now(), url: stickerUrl };
        const updated = [...myStickers, newSticker];
        setMyStickers(updated);
        localStorage.setItem("user_stickers", JSON.stringify(updated));

        // Deduct
        setCredits(credits - cost);
        localStorage.setItem("saldo_creditos", credits - cost);

        setStickerUrl("");
        alert("Sticker Criado!");
    };

    const handleAddSound = async () => {
        if (!soundName || !soundFile) return alert("Preencha nome e arquivo");
        
        const cost = 50;
        if (credits < cost) return alert("Saldo insuficiente (Custo: 50)");

        try {
            // Compress/Convert logic here if needed, for now just base64
            const reader = new FileReader();
            reader.readAsDataURL(soundFile);
            reader.onload = () => {
                const newSound = { id: Date.now(), name: soundName, src: reader.result };
                const updated = [...mySounds, newSound];
                setMySounds(updated);
                localStorage.setItem("user_sounds", JSON.stringify(updated));

                // Deduct
                setCredits(credits - cost);
                localStorage.setItem("saldo_creditos", credits - cost);

                setSoundName("");
                setSoundFile(null);
                alert("Efeito Sonoro Adicionado!");
            };
        } catch (e) {
            console.error(e);
            alert("Erro ao processar áudio");
        }
    };

    if (!user) return <div className="p-10 text-center">Carregando...</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center">
            <div className="w-full max-w-md bg-white shadow-xl min-h-screen flex flex-col">
                {/* Header */}
                <div className="bg-[#00a884] p-4 text-white flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.location.href = 'index.html'} className="hover:bg-white/20 p-2 rounded-full">
                            <div className="icon-arrow-left text-xl"></div>
                        </button>
                        <h1 className="font-bold text-lg">Loja & Estúdio</h1>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
                        <div className="icon-coins text-yellow-300"></div>
                        <span className="font-mono font-bold">{credits}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-white">
                    <button 
                        onClick={() => setActiveTab('stickers')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'stickers' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-gray-500'}`}
                    >
                        GIF Stickers
                    </button>
                    <button 
                        onClick={() => setActiveTab('sounds')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'sounds' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-gray-500'}`}
                    >
                        Efeitos Sonoros
                    </button>
                    <button 
                        onClick={() => setActiveTab('credits')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'credits' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-gray-500'}`}
                    >
                        Carteira
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    
                    {/* STICKERS TAB */}
                    {activeTab === 'stickers' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <div className="icon-sticker text-purple-500"></div> Criar Sticker
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">Transforme qualquer URL de GIF/Imagem em Sticker.</p>
                                
                                <input 
                                    type="text" 
                                    placeholder="Cole a URL da imagem aqui..." 
                                    className="w-full border p-2 rounded mb-2 text-sm"
                                    value={stickerUrl}
                                    onChange={e => setStickerUrl(e.target.value)}
                                />
                                {stickerUrl && <img src={stickerUrl} className="w-20 h-20 object-contain mx-auto mb-2 border rounded" />}
                                
                                <button onClick={handleCreateSticker} className="w-full bg-purple-600 text-white py-2 rounded text-sm font-bold hover:bg-purple-700">
                                    Criar (10 Créditos)
                                </button>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-600 mb-2 text-sm">Meus Stickers ({myStickers.length})</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {myStickers.map(s => (
                                        <div key={s.id} className="bg-white p-2 rounded shadow-sm flex items-center justify-center aspect-square relative group">
                                            <img src={s.url} className="max-w-full max-h-full object-contain" />
                                            <button 
                                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 text-[10px]"
                                                onClick={() => {
                                                    const updated = myStickers.filter(x => x.id !== s.id);
                                                    setMyStickers(updated);
                                                    localStorage.setItem("user_stickers", JSON.stringify(updated));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SOUNDS TAB */}
                    {activeTab === 'sounds' && (
                        <div className="space-y-6">
                             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <div className="icon-music text-blue-500"></div> Adicionar Efeito Sonoro
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">Envie um arquivo de áudio curto (MP3/WAV) para usar nas chamadas.</p>
                                
                                <input 
                                    type="text" 
                                    placeholder="Nome do Efeito (ex: Aplausos)" 
                                    className="w-full border p-2 rounded mb-2 text-sm"
                                    value={soundName}
                                    onChange={e => setSoundName(e.target.value)}
                                />
                                <input 
                                    type="file" 
                                    accept="audio/*"
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-3"
                                    onChange={e => setSoundFile(e.target.files[0])}
                                />
                                
                                <button onClick={handleAddSound} className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700">
                                    Adicionar (50 Créditos)
                                </button>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-600 mb-2 text-sm">Meus Efeitos ({mySounds.length})</h4>
                                <div className="space-y-2">
                                    {mySounds.map(s => (
                                        <div key={s.id} className="bg-white p-3 rounded shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                    <div className="icon-volume-2 text-sm"></div>
                                                </div>
                                                <span className="text-sm font-medium">{s.name}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => new Audio(s.src).play()} className="text-gray-500 hover:text-blue-500">
                                                    <div className="icon-play text-xs"></div>
                                                </button>
                                                <button 
                                                    className="text-gray-400 hover:text-red-500"
                                                    onClick={() => {
                                                        const updated = mySounds.filter(x => x.id !== s.id);
                                                        setMySounds(updated);
                                                        localStorage.setItem("user_sounds", JSON.stringify(updated));
                                                    }}
                                                >
                                                    <div className="icon-trash text-xs"></div>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDITS TAB */}
                    {activeTab === 'credits' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white text-center shadow-lg">
                                <p className="text-sm opacity-80 mb-1">Saldo Atual</p>
                                <h2 className="text-4xl font-bold mb-4">{credits}</h2>
                                <div className="flex gap-3 justify-center">
                                    <button onClick={() => addCredits(100)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
                                        +100 Grátis
                                    </button>
                                    <button onClick={() => addCredits(500)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
                                        +500 Grátis
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-600 mb-3 text-sm">Histórico de Recargas</h4>
                                <div className="space-y-2">
                                    {history.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum histórico.</p>}
                                    {history.map(h => (
                                        <div key={h.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{h.desc}</p>
                                                <p className="text-xs text-gray-400">{h.date}</p>
                                            </div>
                                            <span className="text-green-600 font-bold">+{h.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<StoreApp />);