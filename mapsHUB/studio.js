// Placeholder Token - User should replace this if they have a specific app token
const CODEHUB_APP_TOKEN = "KytjBryAR2zS8sVaj3vd"; 

function LoginScreen({ onLogin }) {
    const handleLogin = () => {
        // Redirect to CodeHub Auth
        window.location.href = "https://code.codehub.ct.ws/API/continuar-conta?token=" + CODEHUB_APP_TOKEN;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mx-auto mb-6">
                    <div className="icon-lock text-3xl"></div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                <p className="text-gray-500 mb-8">
                    Para acessar o <span className="font-bold text-blue-600">Maps Studio</span> e contribuir com o mapa, você precisa estar logado.
                </p>

                <button 
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-blue-200 shadow-lg flex items-center justify-center gap-3"
                >
                    <span>Fazer Login com CodeHub</span>
                    <div className="icon-arrow-right"></div>
                </button>

                <p className="mt-6 text-xs text-gray-400">
                    Sua identificação será usada para atribuir autoria aos seus envios.
                </p>
                
                <div className="mt-8 border-t border-gray-100 pt-6">
                    <a href="index.html" className="text-sm text-gray-500 hover:text-gray-800 flex items-center justify-center gap-2">
                        <div className="icon-arrow-left w-4 h-4"></div>
                        Voltar para o Mapa
                    </a>
                </div>
            </div>
        </div>
    );
}

function StudioApp() {
    const [user, setUser] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        checkAuth();

        // Listen for CodeHub auth events
        const handleAuthEvent = (e) => {
            console.log('Auth Event:', e.detail);
            checkAuth();
        };

        window.addEventListener('auth-completed', handleAuthEvent);
        return () => window.removeEventListener('auth-completed', handleAuthEvent);
    }, []);

    const checkAuth = () => {
        // Check if CodeHub script loaded and has data
        if (window.limparURL && typeof window.limparURL.getDados === 'function') {
            const data = window.limparURL.getDados();
            if (data.temDados) {
                setUser({
                    name: data.userName,
                    token: data.userToken
                });
            } else {
                setUser(null);
            }
        }
        setIsLoading(false);
    };

    const handleLogout = () => {
        if (window.limparURL && typeof window.limparURL.limparDados === 'function') {
            window.limparURL.limparDados();
            setUser(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="icon-loader animate-spin text-blue-600 text-3xl"></div>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                            <div className="icon-clapperboard"></div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 leading-none">mapsHUB Studio</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 font-medium">Logado como:</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    {user.name}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLogout}
                            className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <div className="icon-log-out w-3 h-3"></div>
                            Sair
                        </button>
                        <a href="index.html" className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center gap-1">
                            <div className="icon-arrow-left w-4 h-4"></div>
                            Mapa
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="icon-info text-blue-600 mt-0.5"></div>
                    <div>
                        <h3 className="font-bold text-blue-800 text-sm">Bem-vindo ao Studio, {user.name}!</h3>
                        <p className="text-xs text-blue-700 mt-1">
                            Suas contribuições serão registradas em seu nome.
                        </p>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TourEditor currentUser={user} />
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<StudioApp />);
