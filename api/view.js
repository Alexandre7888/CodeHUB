const FIREBASE_URL = "https://html-15e80-default-rtdb.firebaseio.com";

// Função para testar múltiplos caminhos
async function tryAllPaths(projectId) {
    console.log(`🔍 Testando TODOS os caminhos para: ${projectId}`);
    
    const testPaths = [
        // 1. Projeto público direto
        `projects/${projectId}`,
        
        // 2. Projeto em usuário específico (precisa saber o UID)
        // Vamos tentar alguns UIDs comuns ou buscar todos
        
        // 3. Em users/UID/projects/ (vamos buscar primeiro todos os users)
    ];
    
    // Primeiro: tentar o caminho direto
    try {
        const directUrl = `${FIREBASE_URL}/projects/${projectId}.json`;
        const res = await fetch(directUrl);
        if (res.ok) {
            const data = await res.json();
            if (data) {
                return {
                    data,
                    path: `projects/${projectId}`,
                    source: 'projects'
                };
            }
        }
    } catch (e) {}
    
    // Segundo: buscar EM TODOS os usuários
    try {
        const usersUrl = `${FIREBASE_URL}/users.json`;
        const usersRes = await fetch(usersUrl);
        
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            
            if (usersData) {
                // Procurar projeto em QUALQUER usuário
                for (const userId in usersData) {
                    const user = usersData[userId];
                    
                    // Verificar se user tem projetos
                    if (user && user.projects) {
                        // Verificar se tem o projeto específico
                        if (user.projects[projectId]) {
                            return {
                                data: user.projects[projectId],
                                path: `users/${userId}/projects/${projectId}`,
                                source: 'users',
                                userId: userId
                            };
                        }
                        
                        // Verificar todos os projetos do usuário
                        // (às vezes o projectId pode ser diferente)
                        for (const projId in user.projects) {
                            const project = user.projects[projId];
                            // Verificar por nome ou ID interno
                            if (project.name === projectId || 
                                project.id === projectId ||
                                projId === projectId) {
                                return {
                                    data: project,
                                    path: `users/${userId}/projects/${projId}`,
                                    source: 'users',
                                    userId: userId,
                                    realProjectId: projId
                                };
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Erro ao buscar em users:", e);
    }
    
    // Terceiro: buscar em /public/ ou /public_projects/
    const alternativePaths = [
        `public/${projectId}`,
        `public_projects/${projectId}`,
        `shared/${projectId}`,
        `published/${projectId}`
    ];
    
    for (const path of alternativePaths) {
        try {
            const url = `${FIREBASE_URL}/${path}.json`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    return {
                        data,
                        path: path,
                        source: 'alternative'
                    };
                }
            }
        } catch (e) {}
    }
    
    return null;
}

// API principal
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    
    try {
        const { query } = req;
        
        // Extrair projectId
        let projectId = query.project || query.projectId || query.l || query.id;
        
        // Se não tem, mostrar ajuda
        if (!projectId) {
            return res.json({
                status: 'info',
                message: 'API Firebase Viewer',
                usage: 'Adicione ?project=ID_DO_PROJETO',
                example: '/api/view?project=-OiB60evJmQ5u26huxmZ',
                endpoints: {
                    test_all: '/api/debug/project/-OiB60evJmQ5u26huxmZ',
                    search: '/api/search?q=ID_DO_PROJETO',
                    firebase_structure: '/api/structure'
                }
            });
        }
        
        console.log(`🚀 Buscando projeto: ${projectId}`);
        
        // TESTAR: Ver URL direta no navegador primeiro
        const testUrl = `${FIREBASE_URL}/.json`;
        console.log(`🔗 URL completa do Firebase: ${testUrl}`);
        
        // 1. Primeiro tentar a URL MÃE de tudo
        try {
            const rootRes = await fetch(testUrl);
            if (rootRes.ok) {
                const rootData = await rootRes.json();
                
                // Salvar para debug
                console.log("📊 Estrutura raiz do Firebase:");
                console.log("Keys disponíveis:", Object.keys(rootData || {}));
                
                // Retornar estrutura para debug
                if (query.debug === '1') {
                    return res.json({
                        status: 'debug',
                        projectId: projectId,
                        firebaseRoot: Object.keys(rootData || {}),
                        fullStructure: rootData,
                        testUrl: testUrl
                    });
                }
            }
        } catch (e) {
            console.error("Erro ao buscar raiz:", e);
        }
        
        // 2. Buscar projeto usando a função que testa tudo
        const projectResult = await tryAllPaths(projectId);
        
        if (!projectResult) {
            // Última tentativa: buscar TODOS os dados e procurar
            try {
                const allDataUrl = `${FIREBASE_URL}/.json?shallow=true`;
                const allRes = await fetch(allDataUrl);
                
                if (allRes.ok) {
                    const allData = await allRes.json();
                    
                    return res.json({
                        status: 'not_found_but_here_is_structure',
                        searchedId: projectId,
                        firebaseStructure: allData,
                        allPaths: Object.keys(allData || {}),
                        searchTip: 'O projeto pode estar em uma dessas pastas acima',
                        directLinks: {
                            projects: `${FIREBASE_URL}/projects.json`,
                            users: `${FIREBASE_URL}/users.json`,
                            domains: `${FIREBASE_URL}/domains.json`
                        }
                    });
                }
            } catch (finalErr) {
                return res.status(404).json({
                    error: "Projeto não encontrado após busca completa",
                    projectId: projectId,
                    firebaseUrl: FIREBASE_URL,
                    directTestUrl: `${FIREBASE_URL}/.json`,
                    suggestion: "Acesse o link acima para ver a estrutura completa do Firebase"
                });
            }
        }
        
        // 3. Se encontrou, retornar dados
        const { data, path, source, userId, realProjectId } = projectResult;
        
        const response = {
            status: 'success',
            project: {
                id: realProjectId || projectId,
                originalId: projectId,
                foundIn: path,
                source: source,
                userId: userId
            },
            metadata: {
                name: data.name || realProjectId || projectId,
                hasFiles: !!(data.files),
                fileCount: data.files ? Object.keys(data.files).length : 0,
                createdAt: data.createdAt || data.timestamp || null
            },
            data: data,
            links: {
                raw: `${FIREBASE_URL}/${path}.json`,
                pretty: `${FIREBASE_URL}/${path}.json?print=pretty`,
                download: `${FIREBASE_URL}/${path}.json?download=true`
            }
        };
        
        // Adicionar lista de arquivos se existir
        if (data.files) {
            const files = [];
            for (const key in data.files) {
                const file = data.files[key];
                files.push({
                    id: key,
                    name: file.originalName || file.name || key,
                    type: file.type || 'unknown',
                    hasUrl: !!(file.directUrl || file.url),
                    url: file.directUrl || file.url || null,
                    size: file.size || null
                });
            }
            response.files = files;
        }
        
        return res.json(response);
        
    } catch (error) {
        console.error("❌ ERRO CRÍTICO:", error);
        return res.status(500).json({
            error: "Erro interno",
            message: error.message,
            firebaseUrl: FIREBASE_URL,
            tip: "Verifique se o Firebase está acessível"
        });
    }
};
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas GET permitido
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Método não permitido', 
            allowed: ['GET'] 
        });
    }
    
    try {
        const { query } = req;
        
        // =======================
        // 1. EXTRAIR PARÂMETROS
        // =======================
        let projectId = query.project || query.projectId || query.l || query.id;
        let fileName = query.file || query.fileName || query.f || query.open;
        
        // Verificar se veio pelo path: /api/view/ID_PROJETO
        if (!projectId && req.url.includes('/api/view/')) {
            const pathParts = req.url.split('/api/view/')[1]?.split('?')[0];
            if (pathParts) {
                const parts = pathParts.split('/');
                projectId = parts[0];
                if (parts.length > 1) {
                    fileName = parts.slice(1).join('/');
                }
            }
        }
        
        // =======================
        // 2. SE NÃO TEM ID, MOSTRA AJUDA
        // =======================
        if (!projectId) {
            return res.json({
                app: "Firebase Viewer API",
                descricao: "API para acessar projetos do Firebase Realtime Database",
                uso: "Adicione ?project=ID_DO_PROJETO na URL",
                exemplos: [
                    "/api/view?project=exemplo123",
                    "/api/view/exemplo123",
                    "/api/view?project=exemplo123&file=index.html",
                    "/api/view/exemplo123/index.html"
                ],
                estrutura_firebase: {
                    projects: "ID_DO_PROJETO (públicos)",
                    users: "UID_USUARIO/projects/ID_DO_PROJETO (privados)",
                    domains: "NOME_DOMINIO (redirecionamentos)"
                },
                url_base: FIREBASE_URL
            });
        }
        
        console.log(`🔍 Buscando: projeto="${projectId}", arquivo="${fileName || 'principal'}"`);
        
        // =======================
        // 3. PRIMEIRO: VERIFICAR DOMÍNIO
        // =======================
        let realProjectId = projectId;
        const domainCheckUrl = `${FIREBASE_URL}/domains/${projectId.toLowerCase()}.json`;
        
        try {
            const domainRes = await fetch(domainCheckUrl);
            if (domainRes.ok) {
                const domainData = await domainRes.json();
                if (domainData && domainData.projectId) {
                    console.log(`🔄 Domínio encontrado: ${projectId} → ${domainData.projectId}`);
                    realProjectId = domainData.projectId;
                }
            }
        } catch (domainErr) {
            console.log(`ℹ️  Nenhum domínio para: ${projectId}`);
        }
        
        // =======================
        // 4. BUSCAR PROJETO (3 TENTATIVAS)
        // =======================
        let projectData = null;
        let projectSource = null;
        
        // TENTATIVA 1: Projeto público direto
        try {
            const url1 = `${FIREBASE_URL}/projects/${realProjectId}.json`;
            console.log(`🔗 Tentando: ${url1}`);
            const res1 = await fetch(url1);
            if (res1.ok) {
                projectData = await res1.json();
                projectSource = "projects";
            }
        } catch (e1) { /* ignorar */ }
        
        // TENTATIVA 2: Buscar em todos os usuários
        if (!projectData) {
            try {
                const url2 = `${FIREBASE_URL}/users.json`;
                console.log(`🔗 Tentando buscar em usuários: ${url2}`);
                const res2 = await fetch(url2);
                if (res2.ok) {
                    const usersData = await res2.json();
                    
                    // Procurar projeto em qualquer usuário
                    for (const userId in usersData) {
                        const user = usersData[userId];
                        if (user && user.projects && user.projects[realProjectId]) {
                            projectData = user.projects[realProjectId];
                            projectSource = `users/${userId}/projects`;
                            console.log(`✅ Encontrado em: users/${userId}/projects`);
                            break;
                        }
                    }
                }
            } catch (e2) { 
                console.log("❌ Erro ao buscar em usuários:", e2.message);
            }
        }
        
        // TENTATIVA 3: Buscar direto no users/UID/projects/
        if (!projectData) {
            try {
                // Se projectId tem formato de UID (28 caracteres)
                if (realProjectId.length === 28) {
                    const url3 = `${FIREBASE_URL}/users/${realProjectId}/projects.json`;
                    console.log(`🔗 Tentando: ${url3}`);
                    const res3 = await fetch(url3);
                    if (res3.ok) {
                        const userProjects = await res3.json();
                        // Pegar primeiro projeto do usuário
                        const firstProjectKey = Object.keys(userProjects || {})[0];
                        if (firstProjectKey) {
                            projectData = userProjects[firstProjectKey];
                            projectSource = `users/${realProjectId}/projects`;
                            realProjectId = firstProjectKey; // Atualiza para o ID real do projeto
                        }
                    }
                }
            } catch (e3) { /* ignorar */ }
        }
        
        // =======================
        // 5. SE NÃO ENCONTROU
        // =======================
        if (!projectData) {
            return res.status(404).json({
                error: "Projeto não encontrado",
                searchedId: projectId,
                realId: realProjectId,
                firebaseUrl: FIREBASE_URL,
                possibleLocations: [
                    `projects/${realProjectId}`,
                    `users/*/projects/${realProjectId}`,
                    `users/${realProjectId}/projects/*`
                ],
                tip: "Verifique se o projeto existe e se você tem permissão de leitura"
            });
        }
        
        // =======================
        // 6. PROCESSAR ARQUIVO ESPECÍFICO
        // =======================
        if (fileName) {
            const files = projectData.files || {};
            let fileFound = null;
            let fileKey = null;
            
            // Buscar arquivo (case insensitive)
            const fileNameLower = fileName.toLowerCase();
            for (const key in files) {
                const file = files[key];
                const fileOriginalName = (file.originalName || file.name || key || "").toLowerCase();
                const fileNameOnly = fileOriginalName.split('?')[0].split('#')[0];
                
                if (fileNameOnly === fileNameLower || fileOriginalName === fileNameLower) {
                    fileFound = file;
                    fileKey = key;
                    break;
                }
            }
            
            if (!fileFound) {
                return res.status(404).json({
                    error: "Arquivo não encontrado",
                    projectId: realProjectId,
                    fileName: fileName,
                    availableFiles: Object.keys(files).map(k => ({
                        key: k,
                        name: files[k].originalName || files[k].name || k,
                        type: files[k].type || "unknown",
                        hasUrl: !!(files[k].directUrl || files[k].url)
                    })),
                    tip: "Tente o nome exato do arquivo (com extensão)"
                });
            }
            
            // Preparar resposta do arquivo
            const fileResult = {
                status: "success",
                type: "file",
                projectId: realProjectId,
                projectSource: projectSource,
                fileName: fileName,
                fileKey: fileKey,
                fileData: fileFound,
                metadata: {
                    originalName: fileFound.originalName || fileFound.name || fileKey,
                    type: fileFound.type || "unknown",
                    language: fileFound.language || null,
                    size: fileFound.size || null,
                    hasUrl: !!(fileFound.directUrl || fileFound.url),
                    hasChunks: !!(fileFound.chunks),
                    chunksCount: fileFound.chunks ? Object.keys(fileFound.chunks).length : 0
                },
                urls: {
                    directUrl: fileFound.directUrl || fileFound.url || null,
                    viewInBrowser: `/api/view?project=${realProjectId}&file=${fileName}`,
                    download: fileFound.directUrl || fileFound.url || null
                },
                content: fileFound.chunks ? 
                    Object.values(fileFound.chunks).join('') : 
                    fileFound.content || ""
            };
            
            // Se for HTML, aplicar substituição automática
            if ((fileName.toLowerCase().endsWith('.html') || fileFound.language === 'html') && fileResult.content) {
                fileResult.content = substituteFileUrls(fileResult.content, files);
                fileResult.processed = true;
            }
            
            return res.json(fileResult);
        }
        
        // =======================
        // 7. RETORNAR PROJETO COMPLETO
        // =======================
        const result = {
            status: "success",
            type: "project",
            projectId: realProjectId,
            originalRequestId: projectId,
            projectSource: projectSource,
            metadata: {
                name: projectData.name || realProjectId,
                description: projectData.description || null,
                createdAt: projectData.createdAt || null,
                updatedAt: projectData.updatedAt || null,
                isPublic: projectData.public !== false,
                hasFiles: !!(projectData.files),
                filesCount: projectData.files ? Object.keys(projectData.files).length : 0
            },
            firebasePaths: {
                project: `${projectSource}/${realProjectId}`,
                files: `${projectSource}/${realProjectId}/files`,
                rawJson: `${FIREBASE_URL}/${projectSource}/${realProjectId}.json`
            },
            links: {
                self: `/api/view?project=${realProjectId}`,
                pretty: `/api/view?project=${realProjectId}&pretty=1`,
                listFiles: `/api/view?project=${realProjectId}&list=1`
            }
        };
        
        // Adicionar lista de arquivos se existir
        if (projectData.files) {
            const filesList = [];
            const fileTypes = {};
            
            for (const key in projectData.files) {
                const file = projectData.files[key];
                const fileName = file.originalName || file.name || key;
                const extension = fileName.split('.').pop().toLowerCase();
                const isMedia = !!(file.directUrl || file.url);
                
                filesList.push({
                    id: key,
                    name: fileName,
                    extension: extension,
                    type: file.type || "unknown",
                    isMedia: isMedia,
                    mediaUrl: file.directUrl || file.url || null,
                    size: file.size || null,
                    language: file.language || null,
                    viewUrl: `/api/view?project=${realProjectId}&file=${encodeURIComponent(fileName)}`
                });
                
                // Contar tipos
                fileTypes[extension] = (fileTypes[extension] || 0) + 1;
            }
            
            result.files = {
                count: filesList.length,
                list: filesList,
                types: fileTypes,
                mainFile: filesList.find(f => f.name.toLowerCase() === 'index.html') ||
                         filesList.find(f => f.extension === 'html') ||
                         null
            };
            
            // Adicionar link para arquivo principal
            if (result.files.mainFile) {
                result.links.mainFile = `/api/view?project=${realProjectId}&file=${encodeURIComponent(result.files.mainFile.name)}`;
            }
        }
        
        // Formatar bonito se solicitado
        const pretty = query.pretty === '1' || query.format === 'pretty';
        return res.json(pretty ? JSON.stringify(result, null, 2) : result);
        
    } catch (error) {
        console.error("❌ ERRO NA API:", error);
        
        return res.status(500).json({
            error: "Erro interno do servidor",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =======================
// FUNÇÃO DE SUBSTITUIÇÃO DE URLs (igual ao original)
// =======================
function substituteFileUrls(htmlContent, projectFiles) {
    if (!projectFiles || !htmlContent) return htmlContent;
    
    let novoHTML = htmlContent;
    
    function encontrarArquivo(nomeArquivo) {
        if (!projectFiles) return null;
        const nomeLimpo = nomeArquivo.split('/').pop().split('?')[0];
        for (const key in projectFiles) {
            const f = projectFiles[key];
            const fname = (f.originalName || f.name || key).toLowerCase();
            if (fname === nomeLimpo.toLowerCase()) return f;
        }
        return null;
    }
    
    // Substituir src=""
    novoHTML = novoHTML.replace(/src=["']([^"']+)["']/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('data:') || src.includes('://')) return match;
        const arquivo = encontrarArquivo(src);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            return `src="${arquivo.directUrl || arquivo.url}"`;
        }
        return match;
    });
    
    // Substituir href="" (para CSS)
    novoHTML = novoHTML.replace(/href=["']([^"']+)["']/g, (match, href) => {
        if (href.startsWith('http') || href.startsWith('data:') || href.includes('://')) return match;
        const arquivo = encontrarArquivo(href);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            return `href="${arquivo.directUrl || arquivo.url}"`;
        }
        return match;
    });
    
    return novoHTML;
}