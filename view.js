// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
    authDomain: "html-15e80.firebaseapp.com",
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
    projectId: "html-15e80",
    storageBucket: "html-15e80.appspot.com",
    messagingSenderId: "1068148640439",
    appId: "1:1068148640439:web:1ac651348e624f6be41b32"
};

// Inicialização
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log('✅ Firebase OK');
} catch (e) {
    db = firebase.database();
}

// Elementos DOM
const loadingEl = document.getElementById('loading');
const previewFrame = document.getElementById('preview-frame');
const fileViewer = document.getElementById('file-viewer');
const fileContent = document.getElementById('file-content');
const fileTitle = document.getElementById('file-title');
const closeFileBtn = document.getElementById('close-file');
const fileList = document.getElementById('file-list');
const fileListContent = document.getElementById('file-list-content');

// Variáveis de estado
let currentProjectData = null;
let currentFileName = null;
let substituicaoAplicada = false;

// FUNÇÃO DE SUBSTITUIÇÃO AUTOMÁTICA - COMPLETA
function substituirArquivosPorURLs(htmlContent, projectFiles) {
    console.log('🔍 Iniciando substituição automática de arquivos...');

    if (!projectFiles || !htmlContent || substituicaoAplicada) {
        return htmlContent;
    }

    let novoHTML = htmlContent;

    // Função auxiliar para encontrar arquivo
    function encontrarArquivo(nomeArquivo) {
        if (!projectFiles) return null;

        const nomeLimpo = nomeArquivo.split('/').pop().split('?')[0];
        console.log(`🔎 Procurando: "${nomeArquivo}" -> "${nomeLimpo}"`);

        for (const fileKey in projectFiles) {
            const file = projectFiles[fileKey];
            const fileName = file.originalName || file.name || fileKey;

            if (fileName.toLowerCase() === nomeLimpo.toLowerCase()) {
                console.log(`✅ Encontrado: ${fileName}`);
                return file;
            }
        }

        console.log(`❌ Não encontrado: ${nomeLimpo}`);
        return null;
    }

    // FUNÇÃO PARA DETERMINAR SE É ARQUIVO DE MÍDIA
    function isArquivoMidia(fileName) {
        const extensoesMidia = [
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp',
            '.mp4', '.avi', '.mov', '.webm', '.mkv', '.ogg',
            '.mp3', '.wav', '.ogg', '.m4a', '.aac',
            '.pdf', '.zip', '.rar', '.7z'
        ];
        return extensoesMidia.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    // SUBSTITUIÇÃO DE SRC
    const srcRegex = /src=["']([^"']+)["']/g;
    novoHTML = novoHTML.replace(srcRegex, (match, src) => {
        if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('//') || src.includes('://')) {
            return match;
        }

        const arquivo = encontrarArquivo(src);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            const novaUrl = arquivo.directUrl || arquivo.url;
            console.log(`🔄 Substituindo SRC: "${src}" -> "${novaUrl}"`);
            return `src="${novaUrl}"`;
        }
        return match;
    });

    // SUBSTITUIÇÃO DE HREF
    const hrefRegex = /href=["']([^"']+)["']/g;
    novoHTML = novoHTML.replace(hrefRegex, (match, href) => {
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || 
            href.startsWith('tel:') || href.includes('://') || href.endsWith('.html')) {
            return match;
        }

        const extensoesMidia = ['.mp3', '.mp4', '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.wav', '.ogg'];
        const temExtensaoMidia = extensoesMidia.some(ext => href.toLowerCase().endsWith(ext));

        if (temExtensaoMidia) {
            const arquivo = encontrarArquivo(href);
            if (arquivo && (arquivo.directUrl || arquivo.url)) {
                const novaUrl = arquivo.directUrl || arquivo.url;
                console.log(`🔗 Substituindo HREF: "${href}" -> "${novaUrl}"`);
                return `href="${novaUrl}"`;
            }
        }
        return match;
    });

    // SUBSTITUIÇÃO DE BACKGROUND
    const bgRegex = /background(-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    novoHTML = novoHTML.replace(bgRegex, (match, prop, bgUrl) => {
        if (bgUrl.startsWith('http') || bgUrl.startsWith('data:') || bgUrl.startsWith('//') || bgUrl.includes('://')) {
            return match;
        }

        const arquivo = encontrarArquivo(bgUrl);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            const novaUrl = arquivo.directUrl || arquivo.url;
            console.log(`🎨 Substituindo BACKGROUND: "${bgUrl}" -> "${novaUrl}"`);
            return `background${prop || ''}: url("${novaUrl}")`;
        }
        return match;
    });

    // SISTEMA DE BOTÕES PARA ABRIR ARQUIVOS
    const buttonRegex = /<button[^>]*data-open-file=["']([^"']+)["'][^>]*>([^<]*)<\/button>/gi;
    novoHTML = novoHTML.replace(buttonRegex, (match, fileName, buttonText) => {
        console.log(`🎯 Botão encontrado: "${buttonText}" -> arquivo: "${fileName}"`);

        const arquivo = encontrarArquivo(fileName);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            const url = arquivo.directUrl || arquivo.url;
            console.log(`🔗 Criando botão com URL: ${url}`);
            return `<button onclick="window.open('${url}', '_blank')" style="cursor: pointer; padding: 10px 15px; background: #4361ee; color: white; border: none; border-radius: 5px;">${buttonText}</button>`;
        } else {
            console.log(`❌ Arquivo não encontrado para botão: ${fileName}`);
            return match;
        }
    });

    // SISTEMA DE LINKS ESPECIAIS
    const linkRegex = /<a[^>]*href=["']#open-file\/([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    novoHTML = novoHTML.replace(linkRegex, (match, fileName, linkText) => {
        console.log(`🔗 Link especial encontrado: "${linkText}" -> arquivo: "${fileName}"`);

        const arquivo = encontrarArquivo(fileName);
        if (arquivo) {
            console.log(`📁 Arquivo encontrado para link especial: ${fileName}`);
            return `<a href="javascript:void(0)" onclick="window.abrirArquivoNoVisualizador('${fileName}')" style="cursor: pointer; color: #4361ee; text-decoration: underline;">${linkText}</a>`;
        } else {
            console.log(`❌ Arquivo não encontrado para link especial: ${fileName}`);
            return match;
        }
    });

    substituicaoAplicada = true;
    console.log('✅ Substituição automática concluída!');
    return novoHTML;
}

// FUNÇÃO GLOBAL PARA ABRIR ARQUIVOS NO VISUALIZADOR
function abrirArquivoNoVisualizador(fileName) {
    console.log(`🚀 Abrindo arquivo no visualizador: ${fileName}`);
    if (currentProjectData && currentProjectData.files) {
        openSpecificFile(fileName);
    } else {
        alert('Arquivo não encontrado no projeto atual');
    }
}

// FUNÇÃO PARA PROCESSAR URL - COM SUBDOMÍNIO

function parseUrlParameters() {
    const all = {};
    const params = new URLSearchParams(window.location.search);
    for (const [k,v] of params.entries()) all[k]=v;

    let projectId = null;
    let fileName = null;

    for (const k in all) {
        if (!fileName && (k.toLowerCase().includes("file") || k==="f" || k==="open")) {
            fileName = all[k];
        }
        if (!projectId) projectId = all[k];
    }

    return { projectId, fileName, type: "param-only" };
}
;
    }

    // 2. Tenta parâmetro ?project= (ID direto)
    let projectParam = urlParams.get('project');
    if (projectParam) {
        console.log('📝 Usando parâmetro ?project=', projectParam);
        if (projectParam.includes('/')) {
            const parts = projectParam.split('/');
            projectId = parts[0];
            fileName = parts.slice(1).join('/');
        } else {
            projectId = projectParam;
        }
        return { projectId, fileName, type: 'projectId' };
    }

    // 3. Tenta parâmetro ?projectId= (ID direto)
    let projectIdParam = urlParams.get('projectId');
    if (projectIdParam) {
        console.log('📝 Usando parâmetro ?projectId=', projectIdParam);
        if (projectIdParam.includes('/')) {
            const parts = projectIdParam.split('/');
            projectId = parts[0];
            fileName = parts.slice(1).join('/');
        } else {
            projectId = projectIdParam;
        }
        return { projectId, fileName, type: 'projectId' };
    }

    // 4. Tenta path /view.html/SUBDOMINIO
    if (path.includes('/view.html/')) {
        const pathParts = path.split('/view.html/');
        if (pathParts.length > 1) {
            const restante = pathParts[1];
            console.log('📝 Usando path com subdomínio:', restante);
            
            if (restante.includes('/')) {
                const subParts = restante.split('/');
                projectId = subParts[0];
                fileName = subParts.slice(1).join('/');
            } else {
                projectId = restante;
            }
            
            // Verifica se é subdomínio (não começa com -) ou projectId (começa com -)
            if (projectId && !projectId.startsWith('-')) {
                console.log('🔍 Identificado como subdomínio:', projectId);
                return { projectId, fileName, type: 'subdomain' };
            } else {
                console.log('🔍 Identificado como projectId:', projectId);
                return { projectId, fileName, type: 'projectId' };
            }
        }
    }

    console.log('❌ Nenhum parâmetro válido encontrado');
    return { projectId: null, fileName: null, type: null };
}

// FUNÇÃO AUXILIAR - BUSCA NO FIREBASE
function getFromFirebase(path) {
    return new Promise((resolve) => {
        db.ref(path).once('value', (snapshot) => {
            resolve(snapshot.val());
        });
    });
}

// MOSTRA ERRO
function showError(msg) {
    loadingEl.innerHTML = `<div class="error">${msg}</div>`;
}

// ENCONTRA ARQUIVO PELO NOME
function findFileByName(fileName) {
    if (!currentProjectData.files) return null;

    const fileNameLower = fileName.toLowerCase();

    for (const fileKey in currentProjectData.files) {
        const file = currentProjectData.files[fileKey];
        const currentName = (file.originalName || file.name || fileKey).toLowerCase();
        if (currentName === fileNameLower) {
            return file;
        }
    }

    return null;
}

// ENCONTRA ARQUIVO PRINCIPAL
function findMainFile() {
    if (!currentProjectData.files) return null;
    
    const files = currentProjectData.files;
    const fileList = Object.values(files);
    
    // Procura index.html
    let mainFile = fileList.find(f => {
        const name = (f.originalName || f.name || '').toLowerCase();
        return name === 'index.html';
    });

    // Se não achou, procura qualquer HTML
    if (!mainFile) {
        mainFile = fileList.find(f => {
            const name = (f.originalName || f.name || '').toLowerCase();
            return name.endsWith('.html');
        });
    }

    return mainFile;
}

// VERIFICA SE É ARQUIVO COM URL (imagem, vídeo, etc)
function isUploadedFile(file) {
    return file && (file.directUrl || file.url);
}

// PEGA ÍCONE DO ARQUIVO
function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();

    if (extension === 'html') return '🌐';
    if (extension === 'css') return '🎨';
    if (extension === 'js') return '⚡';
    if (extension === 'json') return '📋';
    if (extension === 'txt') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return '🖼️';
    if (['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(extension)) return '🎥';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return '🎵';
    if (['pdf'].includes(extension)) return '📕';
    if (['zip', 'rar', '7z'].includes(extension)) return '📦';
    return '📄';
}

// MOSTRA ARQUIVO DE MÍDIA (imagem, vídeo, áudio, PDF)
function showMediaFile(file, fileName) {
    const url = file.directUrl || file.url;
    const type = file.type || '';
    const extension = fileName.split('.').pop().toLowerCase();

    fileTitle.textContent = fileName || file.originalName || 'Arquivo';

    // IMAGEM
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
        fileContent.innerHTML = `<img src="${url}" alt="${fileName}" style="max-width: 100%; max-height: 100%;">`;
    } 
    // VÍDEO
    else if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv', 'ogg'].includes(extension)) {
        fileContent.innerHTML = `
            <video controls autoplay style="max-width: 100%; max-height: 100%;">
                <source src="${url}" type="${type}">
                Seu navegador não suporta vídeo.
            </video>
        `;
    } 
    // ÁUDIO
    else if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
        fileContent.innerHTML = `
            <audio controls autoplay>
                <source src="${url}" type="${type}">
                Seu navegador não suporta áudio.
            </audio>
        `;
    }
    // PDF
    else if (type.includes('pdf') || extension === 'pdf') {
        fileContent.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    }
    // OUTROS ARQUIVOS
    else {
        fileContent.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    }

    fileViewer.style.display = 'flex';
    loadingEl.style.display = 'none';
    previewFrame.style.display = 'none';
    fileList.style.display = 'none';
}

// MOSTRA ARQUIVO DE TEXTO/HTML
function showTextFile(content, fileName, type = 'html') {
    if (type === 'html') {
        // Reseta a flag de substituição para aplicar novamente
        substituicaoAplicada = false;

        // APLICA A SUBSTITUIÇÃO AUTOMÁTICA
        console.log('🎯 Aplicando substituição automática no HTML...');
        const htmlComSubstituicao = substituirArquivosPorURLs(content, currentProjectData.files);

        previewFrame.srcdoc = htmlComSubstituicao;
        previewFrame.style.display = 'block';
        loadingEl.style.display = 'none';
        fileViewer.style.display = 'none';
        fileList.style.display = 'none';
        document.title = fileName;
    } else {
        fileTitle.textContent = fileName;

        // Formatação de código
        if (type === 'css' || type === 'javascript' || type === 'json') {
            content = `<pre style="font-family: 'Courier New', monospace; background: #f8f8f8; padding: 20px; border-radius: 5px; overflow: auto; margin: 0;">${escapeHtml(content)}</pre>`;
        } else {
            content = `<pre style="font-family: Arial, sans-serif; padding: 20px; margin: 0;">${escapeHtml(content)}</pre>`;
        }

        fileContent.innerHTML = content;
        fileViewer.style.display = 'flex';
        loadingEl.style.display = 'none';
        previewFrame.style.display = 'none';
        fileList.style.display = 'none';
    }
}

// ESCAPE HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// JUNTA CHUNKS
function joinChunks(chunks) {
    return chunks ? chunks.join('') : '';
}

// MOSTRA LISTA DE ARQUIVOS
function showFileList() {
    if (!currentProjectData.files) {
        showError('Nenhum arquivo encontrado');
        return;
    }

    fileListContent.innerHTML = '';
    const files = currentProjectData.files;

    for (const fileKey in files) {
        const file = files[fileKey];
        const fileName = file.originalName || file.name || fileKey;
        const fileType = file.language || (fileName.split('.').pop() || 'arquivo');
        const fileIcon = getFileIcon(fileName);
        const isUrlFile = isUploadedFile(file);

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.onclick = () => openSpecificFile(fileName);

        fileItem.innerHTML = `
            <div>
                <span class="file-icon">${fileIcon}</span>
                <span class="file-name">${fileName}</span>
                ${isUrlFile ? '<span class="url-badge">URL</span>' : ''}
                <div class="file-type">Tipo: ${fileType}</div>
            </div>
        `;

        fileListContent.appendChild(fileItem);
    }

    fileList.style.display = 'block';
    loadingEl.style.display = 'none';
    previewFrame.style.display = 'none';
    fileViewer.style.display = 'none';
}

// MOSTRA ARQUIVO PRINCIPAL
function showMainFile() {
    const mainFile = findMainFile();
    
    if (mainFile) {
        openSpecificFile(mainFile.originalName || mainFile.name);
    } else {
        showFileList();
    }
}

// ABRE ARQUIVO ESPECÍFICO
function openSpecificFile(fileName) {
    if (!currentProjectData.files) return;

    const file = findFileByName(fileName);
    if (!file) {
        showError(`Arquivo "${fileName}" não encontrado.`);
        return;
    }

    currentFileName = fileName;

    // Se é arquivo com URL (imagem, vídeo, etc)
    if (isUploadedFile(file)) {
        showMediaFile(file, fileName);
    } else {
        // Se é arquivo de texto/HTML
        const content = joinChunks(file.chunks) || file.content || '';
        const fileType = file.language || fileName.split('.').pop() || 'text';
        showTextFile(content, fileName, fileType);
    }
}

// VOLTA PARA PROJETO PRINCIPAL
function showProject() {
    showMainFile();
}

// FECHA VISUALIZADOR DE ARQUIVO
function closeFileViewer() {
    fileViewer.style.display = 'none';
    fileContent.innerHTML = '';
    showProject();
}

// FUNÇÃO PRINCIPAL - BUSCA NO FIREBASE
async function loadProject() {
    console.log('🚀 Iniciando carregamento do projeto...');
    
    const params = parseUrlParameters();
    
    if (!params.projectId) {
        showError('URL inválida. Use: /view.html?l=SUBDOMINIO ou /view.html?project=ID_DO_PROJETO ou /view.html/SUBDOMINIO');
        return;
    }

    console.log('🔍 Buscando:', params.projectId, 'Tipo:', params.type);
    if (params.fileName) {
        console.log('📁 Arquivo específico:', params.fileName);
    }

    try {
        loadingEl.style.display = 'flex';
        
        let finalProjectId = params.projectId;
        let projectData = null;

        // SE FOR SUBDOMÍNIO, BUSCA O PROJECT ID REAL
        if (params.type === 'subdomain') {
            console.log('🔍 Buscando projectId para subdomínio:', params.projectId);
            const domainData = await getFromFirebase('domains/' + params.projectId.toLowerCase());
            
            if (domainData && domainData.projectId) {
                console.log('✅ Subdomínio encontrado. ProjectId:', domainData.projectId);
                finalProjectId = domainData.projectId;
            } else {
                showError(`Subdomínio "${params.projectId}" não encontrado.`);
                return;
            }
        }

        // BUSCA O PROJETO
        console.log('🔍 Buscando projeto com ID:', finalProjectId);

        // 1. Tenta como projeto público
        projectData = await getFromFirebase('projects/' + finalProjectId);
        
        if (projectData) {
            console.log('✅ Projeto público encontrado');
            currentProjectData = projectData;
            if (params.fileName) {
                openSpecificFile(params.fileName);
            } else {
                showMainFile();
            }
            return;
        }

        // 2. Tenta em projetos de usuário
        console.log('🔍 Tentando projetos de usuário...');
        const usersRef = db.ref('projects');
        const usersSnapshot = await usersRef.once('value');
        const usersData = usersSnapshot.val();
        
        if (usersData) {
            for (const userId in usersData) {
                if (usersData[userId][finalProjectId]) {
                    projectData = usersData[userId][finalProjectId];
                    console.log('✅ Projeto encontrado em usuário:', userId);
                    currentProjectData = projectData;
                    if (params.fileName) {
                        openSpecificFile(params.fileName);
                    } else {
                        showMainFile();
                    }
                    return;
                }
            }
        }

        showError(`Projeto "${finalProjectId}" não encontrado no Firebase.`);

    } catch (error) {
        console.error('❌ Erro:', error);
        showError('Erro ao buscar projeto: ' + error.message);
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', loadProject);

// Event Listeners
closeFileBtn.addEventListener('click', closeFileViewer);

// Funções globais
window.showProject = showProject;
window.showFileList = showFileList;
window.openSpecificFile = openSpecificFile;
window.closeFileViewer = closeFileViewer;
window.abrirArquivoNoVisualizador = abrirArquivoNoVisualizador;
window.substituirArquivosPorURLs = substituirArquivosPorURLs;
