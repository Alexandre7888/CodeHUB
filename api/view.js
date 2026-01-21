// Usar node-fetch que já vem no Vercel
module.exports = async (req, res) => {
    const FIREBASE_URL = 'https://html-15e80-default-rtdb.firebaseio.com';
    
    // Configurar resposta
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        // Extrair parâmetros da URL
        const url = req.url || '';
        const queryString = url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        
        const projectId = searchParams.get('project') || 
                         searchParams.get('id') || 
                         searchParams.get('l') ||
                         searchParams.get('p');
        
        // Se não tem ID, mostrar ajuda
        if (!projectId) {
            const helpResponse = {
                app: "Firebase JSON Viewer",
                descricao: "API que busca e retorna JSON do Firebase",
                uso: "Adicione ?project=ID_DO_PROJETO",
                exemplo: "/api/view?project=-OiB60evJmQ5u26huxmZ",
                endpoints: {
                    projetos_publicos: `${FIREBASE_URL}/projects.json`,
                    todos_dados: `${FIREBASE_URL}/.json`,
                    usuarios: `${FIREBASE_URL}/users.json`
                }
            };
            return res.end(JSON.stringify(helpResponse, null, 2));
        }
        
        console.log(`🔍 Buscando projeto ID: ${projectId}`);
        
        // ============================================
        // 1. TENTAR: Projeto Público Direto
        // ============================================
        try {
            const projectUrl = `${FIREBASE_URL}/projects/${projectId}.json`;
            console.log(`Tentando: ${projectUrl}`);
            
            const projectRes = await fetch(projectUrl);
            
            if (projectRes.ok) {
                const projectData = await projectRes.json();
                
                if (projectData && projectData !== null) {
                    console.log(`✅ Encontrado em: projects/${projectId}`);
                    
                    const response = {
                        success: true,
                        source: `projects/${projectId}`,
                        projectId: projectId,
                        data: projectData,
                        timestamp: new Date().toISOString(),
                        note: "Projeto encontrado na pasta 'projects'"
                    };
                    
                    return res.end(JSON.stringify(response, null, 2));
                }
            }
        } catch (err) {
            console.log(`❌ Não está em projects: ${err.message}`);
        }
        
        // ============================================
        // 2. TENTAR: Buscar em TODOS os Usuários
        // ============================================
        try {
            const usersUrl = `${FIREBASE_URL}/users.json`;
            console.log(`Buscando em: ${usersUrl}`);
            
            const usersRes = await fetch(usersUrl);
            
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                
                if (usersData) {
                    // Procurar projeto em cada usuário
                    for (const userId in usersData) {
                        const user = usersData[userId];
                        
                        if (user && user.projects) {
                            // Verificar se tem o projeto com exatamente este ID
                            if (user.projects[projectId]) {
                                console.log(`✅ Encontrado em: users/${userId}/projects/${projectId}`);
                                
                                const response = {
                                    success: true,
                                    source: `users/${userId}/projects/${projectId}`,
                                    projectId: projectId,
                                    userId: userId,
                                    data: user.projects[projectId],
                                    timestamp: new Date().toISOString(),
                                    note: "Projeto encontrado em projetos de usuário"
                                };
                                
                                return res.end(JSON.stringify(response, null, 2));
                            }
                            
                            // Procurar por qualquer projeto que possa corresponder
                            for (const projKey in user.projects) {
                                const project = user.projects[projKey];
                                
                                // Verificar vários critérios
                                if (project && (
                                    project.name === projectId ||
                                    project.id === projectId ||
                                    (project.originalName && project.originalName.includes(projectId)) ||
                                    projKey === projectId
                                )) {
                                    console.log(`✅ Encontrado similar em: users/${userId}/projects/${projKey}`);
                                    
                                    const response = {
                                        success: true,
                                        source: `users/${userId}/projects/${projKey}`,
                                        searchedId: projectId,
                                        foundId: projKey,
                                        userId: userId,
                                        data: project,
                                        timestamp: new Date().toISOString(),
                                        note: "Projeto encontrado com ID similar"
                                    };
                                    
                                    return res.end(JSON.stringify(response, null, 2));
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`❌ Erro em users: ${err.message}`);
        }
        
        // ============================================
        // 3. TENTAR: Outros caminhos possíveis
        // ============================================
        const alternativePaths = [
            `public/${projectId}`,
            `shared/${projectId}`,
            `published/${projectId}`,
            `all_projects/${projectId}`
        ];
        
        for (const path of alternativePaths) {
            try {
                const altUrl = `${FIREBASE_URL}/${path}.json`;
                console.log(`Tentando: ${altUrl}`);
                
                const altRes = await fetch(altUrl);
                
                if (altRes.ok) {
                    const altData = await altRes.json();
                    
                    if (altData && altData !== null) {
                        console.log(`✅ Encontrado em: ${path}`);
                        
                        const response = {
                            success: true,
                            source: path,
                            projectId: projectId,
                            data: altData,
                            timestamp: new Date().toISOString(),
                            note: "Projeto encontrado em caminho alternativo"
                        };
                        
                        return res.end(JSON.stringify(response, null, 2));
                    }
                }
            } catch (err) {
                // Ignorar e continuar
            }
        }
        
        // ============================================
        // 4. SE NÃO ENCONTROU EM LUGAR NENHUM
        // ============================================
        try {
            // Buscar estrutura completa para debug
            const allDataUrl = `${FIREBASE_URL}/.json?shallow=true`;
            const allRes = await fetch(allDataUrl);
            
            if (allRes.ok) {
                const allData = await allRes.json();
                
                const errorResponse = {
                    success: false,
                    error: "Projeto não encontrado",
                    searchedId: projectId,
                    firebaseStructure: allData,
                    availablePaths: Object.keys(allData || {}),
                    suggestions: [
                        "Verifique se o ID está correto",
                        "O projeto pode estar em uma pasta diferente",
                        "Teste manualmente estas URLs:"
                    ],
                    testUrls: {
                        allProjects: `${FIREBASE_URL}/projects.json`,
                        allUsers: `${FIREBASE_URL}/users.json`,
                        directTest: `${FIREBASE_URL}/projects/${projectId}.json`,
                        prettyFormat: `${FIREBASE_URL}/projects/${projectId}.json?print=pretty`
                    }
                };
                
                return res.end(JSON.stringify(errorResponse, null, 2));
            }
        } catch (finalErr) {
            // Último recurso: erro genérico
            const finalError = {
                success: false,
                error: "Não foi possível acessar o Firebase",
                searchedId: projectId,
                firebaseUrl: FIREBASE_URL,
                message: finalErr.message,
                directLink: `${FIREBASE_URL}/projects/${projectId}.json`,
                timestamp: new Date().toISOString()
            };
            
            return res.end(JSON.stringify(finalError, null, 2));
        }
        
    } catch (globalErr) {
        // Erro geral
        console.error("ERRO GLOBAL:", globalErr);
        
        const errorResponse = {
            success: false,
            error: "Erro interno do servidor",
            message: globalErr.message,
            timestamp: new Date().toISOString(),
            simpleTest: "https://html-15e80-default-rtdb.firebaseio.com/.json"
        };
        
        return res.end(JSON.stringify(errorResponse, null, 2));
    }
};