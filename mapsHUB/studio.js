function StudioApp() {
    const [activeTab, setActiveTab] = React.useState('tour'); // Default to tour creation

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
                            <span className="text-xs text-gray-500 font-medium">Central do Criador</span>
                        </div>
                    </div>
                    
                    <a href="index.html" className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center gap-1">
                        <div className="icon-arrow-left w-4 h-4"></div>
                        Voltar ao Mapa
                    </a>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="icon-info text-blue-600 mt-0.5"></div>
                    <div>
                        <h3 className="font-bold text-blue-800 text-sm">Bem-vindo ao Studio!</h3>
                        <p className="text-xs text-blue-700 mt-1">
                            Aqui você pode criar tours virtuais, processar vídeos de ruas e contribuir com o mapa. 
                            Suas criações serão enviadas para revisão antes de aparecerem publicamente.
                        </p>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TourEditor />
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<StudioApp />);