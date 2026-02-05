function Settings({ user, onClose, chats }) {
    const [settings, setSettings] = React.useState({
        publicId: true,
        showOnline: true,
        readReceipts: true,
        readReceiptExceptions: {} // { userId: true }
    });
    const [showExceptionModal, setShowExceptionModal] = React.useState(false);

    React.useEffect(() => {
        window.firebaseDB.ref(`users/${user.id}/settings`).once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                setSettings({ ...settings, ...data });
            }
        });
    }, [user.id]);

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        window.firebaseDB.ref(`users/${user.id}/settings/${key}`).set(value);
    };

    const toggleException = (contactId) => {
        const newExceptions = { ...settings.readReceiptExceptions };
        if (newExceptions[contactId]) {
            delete newExceptions[contactId];
        } else {
            newExceptions[contactId] = true;
        }
        updateSetting('readReceiptExceptions', newExceptions);
    };

    const contacts = chats ? chats.filter(c => c.type !== 'group') : [];

    const handleAvatarChange = async (e) => {
        if (!e.target.files[0]) return;
        
        try {
            const file = e.target.files[0];
            const base64 = await window.compressImage(file, 300, 0.7);
            
            // Update Firebase
            window.firebaseDB.ref(`users/${user.id}/avatar`).set(base64);
            
            // Update Local Storage
            const updatedUser = { ...user, avatar: base64 };
            localStorage.setItem("chat_user", JSON.stringify(updatedUser));
            
            // Update state (Settings is controlled by props mostly, but we can try to force update or rely on parent re-render if it listened to firebase, 
            // but for immediate feedback in this modal which uses props.user, we might need to reload or just trust Firebase listener in parent will propagate)
            // Ideally, App.js listens to user changes or we update the parent. 
            // Since we are just editing DB, let's assume real-time listener in App/ChatInterface will pick it up? 
            // Actually ChatInterface passes `user` prop from App.js state which comes from localStorage initially.
            // We should notify user to reload or handle it better.
            // BUT, let's update the image src directly in DOM for instant feedback if we want, or just wait.
            // Let's reload page for simplicity to ensure all states sync, OR dispatch event.
            // Actually, best way in this architecture: Update DB, and update LocalStorage. App.js won't re-render automatically from LocalStorage change.
            // Let's use window.location.reload() for a hard sync as requested "funciona de verdade" often implies consistency.
            // Or better: trigger a callback if we had one.
            window.location.reload(); 
            
        } catch (error) {
            console.error("Erro ao trocar foto:", error);
            alert("Erro ao carregar a imagem.");
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl animate-fade-in overflow-hidden h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#00a884] text-white shrink-0">
                    <h2 className="text-lg font-semibold">Configurações & Privacidade</h2>
                    <button onClick={onClose}><div className="icon-x text-xl"></div></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="relative group cursor-pointer">
                            <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-gray-100 object-cover" />
                            <label htmlFor="user-avatar-upload" className="absolute bottom-0 right-0 bg-[#00a884] p-2 rounded-full cursor-pointer hover:bg-[#008f6f] shadow-md transition-transform hover:scale-110">
                                <div className="icon-camera text-white text-lg"></div>
                            </label>
                            <input 
                                id="user-avatar-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-gray-800 text-lg">{user.name}</h3>
                            <p className="text-gray-500 text-sm">ID: {user.id}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase">Privacidade</h4>
                        
                        {/* Show Online */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-800">Status Online</h4>
                                <p className="text-xs text-gray-500">Mostrar quando você está online</p>
                            </div>
                            <button 
                                onClick={() => updateSetting('showOnline', !settings.showOnline)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.showOnline ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.showOnline ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>

                        {/* Read Receipts */}
                        <div className="flex flex-col p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-medium text-gray-800">Confirmação de Leitura</h4>
                                    <p className="text-xs text-gray-500">Mostrar ticks azuis</p>
                                </div>
                                <button 
                                    onClick={() => updateSetting('readReceipts', !settings.readReceipts)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.readReceipts ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.readReceipts ? 'translate-x-6' : ''}`}></div>
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowExceptionModal(true)}
                                className="text-xs text-[#00a884] font-semibold self-start hover:underline"
                            >
                                Configurar Exceções ({Object.keys(settings.readReceiptExceptions || {}).length})
                            </button>
                        </div>

                         {/* Public ID */}
                         <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-800">ID Público</h4>
                                <p className="text-xs text-gray-500">Permitir ser encontrado pelo ID</p>
                            </div>
                            <button 
                                onClick={() => updateSetting('publicId', !settings.publicId)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.publicId ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.publicId ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 shrink-0">
                    MensagensHUB v2.1 • Privacidade Protegida
                </div>

                {/* Exception Modal */}
                {showExceptionModal && (
                    <div className="absolute inset-0 bg-white z-20 flex flex-col animate-slide-in-right">
                         <div className="p-4 border-b border-gray-200 flex items-center gap-4 bg-gray-50">
                            <button onClick={() => setShowExceptionModal(false)} className="icon-arrow-left text-gray-600"></button>
                            <div>
                                <h3 className="font-bold text-gray-800">Exceções de Leitura</h3>
                                <p className="text-xs text-gray-500">
                                    {settings.readReceipts 
                                        ? "Ocultar visto para estes contatos:" 
                                        : "Mostrar visto para estes contatos:"}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {contacts.map(contact => (
                                <div key={contact.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => toggleException(contact.id)}>
                                    <div className="flex items-center gap-3">
                                        <img src={contact.avatar} className="w-10 h-10 rounded-full" />
                                        <span className="font-medium">{contact.name}</span>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${settings.readReceiptExceptions && settings.readReceiptExceptions[contact.id] ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                                        {settings.readReceiptExceptions && settings.readReceiptExceptions[contact.id] && <div className="icon-check text-white text-xs"></div>}
                                    </div>
                                </div>
                            ))}
                            {contacts.length === 0 && <p className="text-center text-gray-400 mt-10">Nenhum contato privado encontrado.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
