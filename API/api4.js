// ========== limpar-url.js ==========
// Script independente para capturar dados da URL, salvar no localStorage e limpar a URL

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
            console.log('✅ Dados salvos no localStorage:', { userName, userKey });
            return true;
        }
        return false;
    }

    // Função para limpar a URL completamente
    function cleanUrl() {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
        console.log('✅ URL limpa com sucesso!');
    }

    // Função principal
    function processAndClean() {
        const params = getUrlParams();
        
        if (params.userName && params.userKey) {
            saveAuthData(params.userName, params.userKey);
            cleanUrl();
            
            window.dispatchEvent(new CustomEvent('auth-completed', {
                detail: {
                    userName: params.userName,
                    userKey: params.userKey
                }
            }));
            
            return true;
        }
        return false;
    }

    // Executa automaticamente
    processAndClean();

    // Expõe funções úteis globalmente
    window.limparURL = {
        executar: processAndClean,
        getDados: function() {
            return {
                userName: localStorage.getItem('userName'),
                userKey: localStorage.getItem('userKey'),
                temDados: !!(localStorage.getItem('userName') && localStorage.getItem('userKey'))
            };
        },
        limparAgora: cleanUrl,
        limparDados: function() {
            localStorage.removeItem('userName');
            localStorage.removeItem('userKey');
            console.log('✅ Dados do localStorage removidos');
        }
    };

})();