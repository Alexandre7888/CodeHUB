// =======================
// CONFIGURAÇÃO
// =======================
const FIREBASE_DB_URL = "https://html-15e80-default-rtdb.firebaseio.com";

// =======================
// FUNÇÃO PRINCIPAL
// =======================
module.exports = async (req, res) => {
    // Configurar headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Método não permitido',
            allowed: ['GET']
        });
    }
    
    try {
        const { query } = req;
        const urlPath = req.url.split('?')[0];
        
        // =======================
        // 1. ANALISAR PARÂMETROS
        // =======================
        let projectId = query.project || query.projectId || query.l || query.id;
        let fileName = query.file || query.fileName || query.f || query.open;
        
        // Se não tem query, verifica path: /api/view/PROJETO_ID/arquivo
        if (!projectId && urlPath.includes('/api/view/')) {
            const parts = urlPath.replace('/api/view/', '').split('/');
            if (parts.length > 0 && parts[0]) {
                projectId = parts[0];
                if (parts.length > 1) {
                    fileName = parts.slice(1).join('/');
                }
            }
        }
        
        // =======================
        // 2. SEM PROJETO ID - PÁGINA INICIAL
        // =======================
        if (!projectId) {
            return res.json({
                titulo: "🔥 Firebase Viewer API",
                descricao: "API para visualizar projetos do Firebase",
                uso: "Adicione ?project=ID_DO_PROJETO na URL",
                exemplos: [
                    "GET /api/view?project=SEU_ID",
                    "GET /api/view/SEU_ID",
                    "GET /api/view/SEU_ID/index.html",
                    "GET /api/view?project=SEU_ID&file=style.css"
                ],
                parametros: {
                    project: "ID do projeto (obrigatório)",
                    file: "Nome do arquivo específico (opcional)",
                    pretty: "1 para JSON formatado (opcional)"
                },
                firebase_url: FIREBASE_DB_URL,
                timestamp: new Date().toISOString()
            });
        }
        
        // =======================
        // 3. BUSCAR NO FIREBASE
        // =======================
        console.log(`🔍 Buscando projeto: ${projectId}, arquivo: ${fileName || '(principal)'}`);
        
        // URL para o Firebase
        let firebaseUrl = `${FIREBASE_DB_URL}/projects/${projectId}.json`;
        
        // Se tem nome de arquivo, busca arquivo específico
        if (fileName) {
            firebaseUrl = `${FIREBASE_DB_URL}/projects/${projectId}/files.json?orderBy="originalName"&equalTo="${fileName}"`;
        }
        
        // =======================
        // 4. FAZER REQUISIÇÃO
        // =======================
        const fetchResponse = await fetch(firebaseUrl);
        
        if (!fetchResponse.ok) {
            // Tenta buscar em domains
            const domainUrl = `${FIREBASE_DB_URL}/domains/${projectId.toLowerCase()}.json`;
            const domainResponse = await fetch(domainUrl);
            
            if (domainResponse.ok) {
                const domainData = await domainResponse.json();
                if (domainData && domainData.projectId) {
                    // Redirecionar para o projeto real
                    const redirectUrl = req.url.replace(projectId, domainData.projectId);
                    return res.json({
                        redirect: true,
                        message: "Domínio encontrado, redirecionando...",
                        originalProjectId: projectId,
                        realProjectId: domainData.projectId,
                        newUrl: `/api/view?project=${domainData.projectId}${fileName ? `&file=${fileName}` : ''}`,
                        domainData: domainData
                    });
                }
            }
            
            return res.status(404).json({
                error: "Projeto não encontrado",
                projectId: projectId,
                firebaseUrl: firebaseUrl,
                suggestions: [
                    "Verifique se o ID está correto",
                    "O projeto pode estar em um usuário: https://html-15e80-default-rtdb.firebaseio.com/projects/USUARIO/PROJETO.json",
                    "Tente buscar diretamente: " + firebaseUrl
                ]
            });
        }
        
        const data = await fetchResponse.json();
        
        // =======================
        // 5. PROCESSAR RESPOSTA
        // =======================
        if (!data) {
            return res.status(404).json({
                error: "Projeto vazio ou não existe",
                projectId: projectId,
                firebaseUrl: firebaseUrl
            });
        }
        
        // Se estamos buscando arquivo específico
        if (fileName) {
            const files = data;
            let fileFound = null;
            let fileKey = null;
            
            // Buscar arquivo pelo nome
            for (const key in files) {
                const file = files[key];
                const originalName = (file.originalName || file.name || key).toLowerCase();
                if (originalName === fileName.toLowerCase()) {
                    fileFound = file;
                    fileKey = key;
                    break;
                }
            }
            
            if (!fileFound) {
                return res.status(404).json({
                    error: "Arquivo não encontrado",
                    projectId: projectId,
                    fileName: fileName,
                    availableFiles: Object.keys(files).map(k => files[k].originalName || files[k].name || k)
                });
            }
            
            // Retornar dados do arquivo
            return res.json({
                status: "success",
                type: "file",
                projectId: projectId,
                fileName: fileName,
                fileData: fileFound,
                metadata: {
                    firebaseKey: fileKey,
                    hasUrl: !!(fileFound.directUrl || fileFound.url),
                    hasChunks: !!(fileFound.chunks),
                    type: fileFound.type || "unknown",
                    size: fileFound.size || null,
                    timestamp: new Date().toISOString()
                },
                links: {
                    rawContent: fileFound.directUrl || fileFound.url || null,
                    viewProject: `/api/view?project=${projectId}`,
                    download: fileFound.directUrl || fileFound.url || null
                }
            });
        }
        
        // =======================
        // 6. RETORNAR PROJETO COMPLETO
        // =======================
        const result = {
            status: "success",
            type: "project",
            projectId: projectId,
            firebaseUrl: firebaseUrl,
            projectData: data,
            metadata: {
                name: data.name || projectId,
                hasFiles: !!(data.files),
                fileCount: data.files ? Object.keys(data.files).length : 0,
                timestamp: new Date().toISOString(),
                fetchedFrom: FIREBASE_DB_URL
            }
        };
        
        // Adicionar lista de arquivos se existir
        if (data.files) {
            const files = data.files;
            const fileList = [];
            const fileExtensions = {};
            
            for (const key in files) {
                const file = files[key];
                const fileName = file.originalName || file.name || key;
                const extension = fileName.split('.').pop().toLowerCase();
                const hasUrl = !!(file.directUrl || file.url);
                
                fileList.push({
                    name: fileName,
                    key: key,
                    type: file.type || "unknown",
                    extension: extension,
                    hasUrl: hasUrl,
                    url: file.directUrl || file.url || null,
                    size: file.size || null
                });
                
                // Contar extensões
                fileExtensions[extension] = (fileExtensions[extension] || 0) + 1;
            }
            
            result.files = {
                list: fileList,
                count: fileList.length,
                extensions: fileExtensions,
                mainFile: fileList.find(f => f.name.toLowerCase() === 'index.html') || 
                         fileList.find(f => f.extension === 'html') || 
                         null
            };
            
            // Links úteis
            result.links = {
                viewIndex: `/api/view?project=${projectId}&file=index.html`,
                viewMain: result.files.mainFile ? 
                    `/api/view?project=${projectId}&file=${result.files.mainFile.name}` : 
                    null,
                browseFiles: `/api/view?project=${projectId}&list=files`,
                rawJson: firebaseUrl,
                prettyJson: `${firebaseUrl}?print=pretty`
            };
        }
        
        // Formatar JSON se solicitado
        const shouldPrettyPrint = query.pretty === '1' || query.format === 'pretty';
        return res.json(shouldPrettyPrint ? 
            JSON.stringify(result, null, 2) : 
            result
        );
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO:', error);
        
        return res.status(500).json({
            error: "Erro interno do servidor",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            support: "Verifique os logs do servidor para mais detalhes"
        });
    }
};

// =======================
// FUNÇÕES AUXILIARES (não exportadas)
// =======================
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            
            if (i === retries - 1) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Esperar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}