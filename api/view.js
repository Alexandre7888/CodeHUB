// Simples API que retorna links do Firebase
module.exports = async (req, res) => {
    // Configurações básicas
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const FIREBASE_URL = 'https://html-15e80-default-rtdb.firebaseio.com';
    
    try {
        // Obter parâmetros da URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        const params = url.searchParams;
        
        const projectId = params.get('project') || params.get('id') || params.get('l');
        
        // Se não tem projeto, mostra ajuda
        if (!projectId) {
            return res.end(JSON.stringify({
                message: 'Firebase Viewer API',
                usage: 'Adicione ?project=ID_DO_PROJETO',
                exemplo: `/api/view?project=-OiB60evJmQ5u26huxmZ`,
                links_uteis: {
                    ver_estrutura: `${FIREBASE_URL}/.json`,
                    ver_projects: `${FIREBASE_URL}/projects.json`,
                    ver_users: `${FIREBASE_URL}/users.json`
                }
            }, null, 2));
        }
        
        // Gerar TODOS os links possíveis
        const allLinks = {
            projectId: projectId,
            firebaseBase: FIREBASE_URL,
            
            // Links principais
            links: {
                // 1. Tentativa direta
                direct_project: `${FIREBASE_URL}/projects/${projectId}.json`,
                
                // 2. Em usuários
                in_users: `${FIREBASE_URL}/users.json?orderBy="projects/${projectId}"`,
                
                // 3. Domínio
                domain_check: `${FIREBASE_URL}/domains/${projectId.toLowerCase()}.json`,
                
                // 4. Busca completa
                search_all: `${FIREBASE_URL}/.json?orderBy="$key"&equalTo="${projectId}"`,
                
                // 5. Shallow para ver estrutura
                shallow_structure: `${FIREBASE_URL}/.json?shallow=true`
            },
            
            // Links para testar manualmente
            manual_test_urls: [
                `${FIREBASE_URL}/projects/${projectId}.json`,
                `${FIREBASE_URL}/.json?print=pretty`,
                `https://view-source:${FIREBASE_URL}/projects/${projectId}.json`,
                `https://jsonviewer.stack.hu/#url=${encodeURIComponent(`${FIREBASE_URL}/projects/${projectId}.json`)}`
            ],
            
            timestamp: new Date().toISOString()
        };
        
        // Retornar como JSON
        return res.end(JSON.stringify(allLinks, null, 2));
        
    } catch (error) {
        // Em caso de erro, retornar mensagem simples
        return res.end(JSON.stringify({
            error: 'Erro simples',
            message: error.message,
            suggestion: 'Tente acessar diretamente: https://html-15e80-default-rtdb.firebaseio.com/projects.json'
        }, null, 2));
    }
};