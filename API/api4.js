// ========== SCRIPT DE CAPTURA DE AUTENTICAÇÃO ==========
// Coloque este script no HEAD do seu HTML ou antes de qualquer outro script

(function() {
    // Função para extrair parâmetros da URL
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            userName: params.get('userName'),
            userKey: params.get('userKey'),
            success: params.get('success')
        };
    }

    // Função para salvar no localStorage
    function saveAuthData(userName, userKey) {
        if (userName && userKey) {
            localStorage.setItem('userName', userName);
            localStorage.setItem('userKey', userKey);
            console.log('✅ Dados de autenticação salvos!');
            return true;
        }
        return false;
    }

    // Função para limpar a URL (remove os parâmetros)
    function cleanUrl() {
        // Remove os parâmetros da URL sem recarregar a página
        const url = new URL(window.location.href);
        url.search = ''; // Remove todos os parâmetros
        window.history.replaceState({}, document.title, url.toString());
        console.log('🧹 URL limpa!');
    }

    // Função para verificar e processar autenticação
    function processAuth() {
        const params = getUrlParams();
        
        // Se tiver userName e userKey na URL
        if (params.userName && params.userKey) {
            // Salva no localStorage
            if (saveAuthData(params.userName, params.userKey)) {
                // Limpa a URL
                cleanUrl();
                
                // Mostra mensagem de sucesso (opcional)
                console.log('🔐 Autenticação concluída com sucesso!');
                
                // Se tiver um callback de sucesso, executa
                if (typeof window.onAuthSuccess === 'function') {
                    window.onAuthSuccess(params.userName, params.userKey);
                }
                
                return true;
            }
        }
        
        // Verifica se já tem dados salvos
        const savedName = localStorage.getItem('userName');
        const savedKey = localStorage.getItem('userKey');
        
        if (savedName && savedKey) {
            console.log('📦 Usando dados salvos no localStorage');
            return true;
        }
        
        return false;
    }

    // Executa automaticamente quando o script carrega
    processAuth();

    // Disponibiliza funções úteis globalmente
    window.auth = {
        // Pega os dados de autenticação
        getAuth: function() {
            return {
                userName: localStorage.getItem('userName'),
                userKey: localStorage.getItem('userKey'),
                isAuthenticated: !!(localStorage.getItem('userName') && localStorage.getItem('userKey'))
            };
        },
        
        // Faz logout (limpa localStorage)
        logout: function() {
            localStorage.removeItem('userName');
            localStorage.removeItem('userKey');
            console.log('👋 Logout realizado');
            
            // Se tiver callback de logout, executa
            if (typeof window.onAuthLogout === 'function') {
                window.onAuthLogout();
            }
        },
        
        // Força a limpeza da URL mesmo sem dados (útil para debug)
        forceCleanUrl: function() {
            cleanUrl();
        }
    };
})();