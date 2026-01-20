// =======================
// CONFIGURAÇÃO FIREBASE ADMIN (Server-Side)
// =======================
const firebaseConfig = {
    apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
    authDomain: "html-15e80.firebaseapp.com",
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
    projectId: "html-15e80",
    storageBucket: "html-15e80.appspot.com",
    messagingSenderId: "1068148640439",
    appId: "1:1068148640439:web:1ac651348e624f6be41b32"
};

// Importações necessárias para Vercel
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Inicializar Firebase Admin (modo server-side)
let db;
try {
    initializeApp({
        credential: cert({
            projectId: firebaseConfig.projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk@html-15e80.iam.gserviceaccount.com",
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n')
        }),
        databaseURL: firebaseConfig.databaseURL
    });
    db = getDatabase();
    console.log('✅ Firebase Admin inicializado');
} catch (e) {
    console.error('❌ Erro ao inicializar Firebase:', e);
}

// =======================
// FUNÇÕES AUXILIARES
// =======================
function escapeHtml(unsafe) {
    return String(unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function joinChunks(chunks) {
    return chunks ? chunks.join('') : '';
}

function isUploadedFile(file) {
    return file && (file.directUrl || file.url);
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    if (extension === 'html') return '🌐';
    if (extension === 'css') return '🎨';
    if (extension === 'js') return '⚡';
    if (extension === 'json') return '📋';
    if (extension === 'txt') return '📄';
    if (['jpg','jpeg','png','gif','svg','webp'].includes(extension)) return '🖼️';
    if (['mp4','avi','mov','webm','mkv'].includes(extension)) return '🎥';
    if (['mp3','wav','ogg','m4a','aac'].includes(extension)) return '🎵';
    if (['pdf'].includes(extension)) return '📕';
    if (['zip','rar','7z'].includes(extension)) return '📦';
    return '📄';
}

// =======================
// FUNÇÕES DE BUSCA FIREBASE
// =======================
async function getFromFirebase(path) {
    if (!db) return null;
    try {
        const snapshot = await db.ref(path).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Erro Firebase:', error);
        return null;
    }
}

function findFileByName(fileName, files) {
    if (!files) return null;
    const fileNameLower = fileName.toLowerCase();
    for (const key in files) {
        const file = files[key];
        const name = (file.originalName || file.name || key).toLowerCase();
        if (name === fileNameLower) return file;
    }
    return null;
}

function findMainFile(files) {
    if (!files) return null;
    const fileList = Object.values(files);
    let mainFile = fileList.find(f => (f.originalName||f.name||'').toLowerCase() === 'index.html');
    if (!mainFile) mainFile = fileList.find(f => (f.originalName||f.name||'').toLowerCase().endsWith('.html'));
    return mainFile;
}

// =======================
// FUNÇÃO DE SUBSTITUIÇÃO DE URLs
// =======================
function substituirArquivosPorURLs(htmlContent, projectFiles) {
    if (!projectFiles || !htmlContent) return htmlContent;
    let novoHTML = htmlContent;

    function encontrarArquivo(nomeArquivo) {
        if (!projectFiles) return null;
        const nomeLimpo = nomeArquivo.split('/').pop().split('?')[0];
        for (const key in projectFiles) {
            const f = projectFiles[key];
            const fname = f.originalName || f.name || key;
            if (fname.toLowerCase() === nomeLimpo.toLowerCase()) return f;
        }
        return null;
    }

    // Substituir SRC
    novoHTML = novoHTML.replace(/src=["']([^"']+)["']/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('data:') || src.includes('://')) return match;
        const arquivo = encontrarArquivo(src);
        if (arquivo && (arquivo.directUrl || arquivo.url)) return `src="${arquivo.directUrl || arquivo.url}"`;
        return match;
    });

    // Substituir HREF (para CSS)
    novoHTML = novoHTML.replace(/href=["']([^"']+)["']/g, (match, href) => {
        if (href.startsWith('http') || href.startsWith('data:') || href.includes('://')) return match;
        const arquivo = encontrarArquivo(href);
        if (arquivo && (arquivo.directUrl || arquivo.url)) return `href="${arquivo.directUrl || arquivo.url}"`;
        return match;
    });

    return novoHTML;
}

// =======================
// FUNÇÕES DE PROCESSAMENTO DE ARQUIVO
// =======================
function processFileContent(file, fileName, allFiles) {
    if (!file) return null;

    const result = {
        fileName: fileName || file.originalName || file.name || 'arquivo',
        fileType: file.language || fileName?.split('.').pop() || 'text',
        isMedia: false,
        content: null,
        url: null,
        icon: getFileIcon(fileName || file.originalName || '')
    };

    // Arquivos com URL (imagens, vídeos, etc)
    if (isUploadedFile(file)) {
        result.isMedia = true;
        result.url = file.directUrl || file.url;
        result.contentType = file.type || 'application/octet-stream';
        return result;
    }

    // Arquivos de texto/HTML
    const content = joinChunks(file.chunks) || file.content || '';
    
    if (result.fileType === 'html') {
        result.content = substituirArquivosPorURLs(content, allFiles);
        result.contentType = 'text/html';
    } else {
        result.content = escapeHtml(content);
        result.contentType = 'text/plain';
        if (['css', 'js', 'javascript', 'json'].includes(result.fileType)) {
            result.isCode = true;
        }
    }

    return result;
}

// =======================
// API PRINCIPAL DO VERCEL
// =======================
module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Lidar com OPTIONS para CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas GET permitido
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { query } = req;
        
        // Extrair parâmetros
        const projectId = query.project || query.projectId || query.l;
        const fileName = query.file || query.fileName || query.open || query.f;
        const pathParts = req.url.split('/').filter(Boolean);
        
        let finalProjectId = projectId;
        let finalFileName = fileName;

        // Se não tem query params, verifica na URL
        if (!finalProjectId && pathParts.length > 1) {
            finalProjectId = pathParts[0];
            finalFileName = pathParts.slice(1).join('/') || null;
        }

        if (!finalProjectId) {
            return res.status(400).json({
                error: 'ID do projeto não especificado',
                usage: 'Use ?project=ID ou /api/view/PROJETO_ID[/nome_arquivo]'
            });
        }

        console.log(`📁 Buscando projeto: ${finalProjectId}, arquivo: ${finalFileName || '(principal)'}`);

        // 1. Verificar domínio personalizado
        let domainData = await getFromFirebase(`domains/${finalProjectId.toLowerCase()}`);
        if (domainData && domainData.projectId) {
            finalProjectId = domainData.projectId;
            console.log(`🔗 Redirecionando domínio para projeto: ${finalProjectId}`);
        }

        // 2. Buscar projeto
        let projectData = await getFromFirebase(`projects/${finalProjectId}`);
        
        // 3. Se não encontrar, buscar em projetos de usuários
        if (!projectData) {
            const usersData = await getFromFirebase('projects');
            if (usersData) {
                for (const userId in usersData) {
                    if (usersData[userId][finalProjectId]) {
                        projectData = usersData[userId][finalProjectId];
                        break;
                    }
                }
            }
        }

        if (!projectData) {
            return res.status(404).json({
                error: `Projeto "${finalProjectId}" não encontrado`
            });
        }

        const files = projectData.files || {};
        
        // 4. Determinar qual arquivo mostrar
        let targetFile;
        
        if (finalFileName) {
            targetFile = findFileByName(finalFileName, files);
            if (!targetFile) {
                return res.status(404).json({
                    error: `Arquivo "${finalFileName}" não encontrado no projeto`
                });
            }
        } else {
            targetFile = findMainFile(files);
            if (!targetFile) {
                // Retornar lista de arquivos se não tem arquivo principal
                const fileList = Object.keys(files).map(key => {
                    const file = files[key];
                    return {
                        name: file.originalName || file.name || key,
                        type: file.type || 'text/plain',
                        icon: getFileIcon(file.originalName || file.name || key),
                        hasUrl: !!(file.directUrl || file.url),
                        size: file.size || null
                    };
                });
                
                return res.json({
                    projectId: finalProjectId,
                    projectName: projectData.name || finalProjectId,
                    hasMainFile: false,
                    files: fileList
                });
            }
        }

        // 5. Processar o arquivo
        const fileInfo = processFileContent(
            targetFile, 
            finalFileName || targetFile.originalName || targetFile.name, 
            files
        );

        if (!fileInfo) {
            return res.status(500).json({ error: 'Erro ao processar arquivo' });
        }

        // 6. Responder conforme o tipo de arquivo
        if (fileInfo.isMedia) {
            // Redirecionar para URL do arquivo
            return res.json({
                type: 'media',
                fileName: fileInfo.fileName,
                url: fileInfo.url,
                contentType: fileInfo.contentType,
                projectId: finalProjectId,
                redirect: true
            });
        } else {
            // Retornar conteúdo
            return res.json({
                type: 'text',
                fileName: fileInfo.fileName,
                fileType: fileInfo.fileType,
                content: fileInfo.content,
                contentType: fileInfo.contentType,
                isCode: fileInfo.isCode || false,
                icon: fileInfo.icon,
                projectId: finalProjectId,
                projectName: projectData.name || finalProjectId,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Erro na API:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
};