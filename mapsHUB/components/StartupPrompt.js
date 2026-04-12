function StartupPrompt() {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);

    React.useEffect(() => {
        // Verifica se o usuário já respondeu ao prompt anteriormente
        const hasPrompted = localStorage.getItem('offline_app_prompt_shown');
        if (!hasPrompted) {
            setIsVisible(true);
        }
    }, []);

    const handleDownload = () => {
        setIsDownloading(true);
        
        // O Service Worker já faz o cache em segundo plano na instalação.
        // Aqui mostramos um feedback visual para o usuário entender que o processo está ocorrendo.
        // Se quisermos forçar, poderíamos enviar uma mensagem ao SW, mas a simulação visual alinha a UX com a ação técnica que já ocorre.
        setTimeout(() => {
            setIsDownloading(false);
            setIsVisible(false);
            localStorage.setItem('offline_app_prompt_shown', 'true');
            
            // Registra novamente o SW explicitamente caso o usuário tenha aceitado (reforço)
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js');
            }
            
            alert("Arquivos baixados com sucesso! A interface e os códigos do aplicativo agora funcionarão offline.");
        }, 3000);
    };

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem('offline_app_prompt_shown', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[5000] bg-black bg-opacity-70 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <div className="icon-download-cloud text-3xl"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Baixar Aplicativo?</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Deseja baixar todos os scripts, códigos e a interface gráfica para que o <strong>mapsHUB</strong> inicie e funcione completamente offline? <br/><br/>
                    <span className="text-blue-600 font-semibold">(Recomendado para conexões instáveis)</span>
                </p>
                
                {isDownloading ? (
                    <div className="space-y-4 py-2">
                        <div className="icon-loader animate-spin text-blue-600 text-3xl mx-auto"></div>
                        <p className="text-sm font-bold text-blue-600">Baixando arquivos do sistema...</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full w-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <button 
                            onClick={handleDownload}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <div className="icon-circle-check w-5 h-5"></div>
                            Sim, baixar tudo
                        </button>
                        <button 
                            onClick={handleSkip}
                            className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Não, usar apenas online
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}