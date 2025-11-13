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

// FUNÇÃO DE SUBSTITUIÇÃO AUTOMÁTICA - CORRIGIDA
function substituirArquivosPorURLs(htmlContent, projectFiles) {
    console.log('🔍 Iniciando substituição automática de arquivos...');

    if (!projectFiles || !htmlContent) {
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
            // Imagens
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico',
            // Vídeos
            '.mp4', '.avi', '.mov', '.webm', '.mkv', '.ogg', '.wmv',
            // Áudio
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // Documentos/Outros
            '.pdf', '.zip', '.rar', '.7z'
        ];
        return extensoesMidia.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    // FUNÇÃO PARA DETERMINAR SE É ARQUIVO DE TEXTO/CÓDIGO
    function isArquivoTexto(fileName) {
        const extensoesTexto = [
            '.html', '.htm', '.css', '.js', '.json', '.txt', '.xml', '.md'
        ];
        return extensoesTexto.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    // SUBSTITUIÇÃO DE SRC (imagens, vídeos, scripts)
    const srcRegex = /src=["']([^"']+)["']/g;
    novoHTML = novoHTML.replace(srcRegex, (match, src) => {
        if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('//') || src.includes('://')) {
            return match;
        }

        const arquivo = encontrarArquivo(src);
        if (!arquivo) return match;

        // Se for mídia, usa a URL
        if (isArquivoMidia(arquivo.originalName || arquivo.name)) {
            const url = arquivo.directUrl || arquivo.url;
            if (url) {
                console.log(`🔄 Substituindo SRC (mídia): "${src}" -> "${url}"`);
                return `src="${url}"`;
            }
        }
        // Se for arquivo de texto, cria um blob URL (para CSS/JS)
        else if (isArquivoTexto(arquivo.originalName || arquivo.name)) {
            const content = arquivo.content || (arquivo.chunks ? arquivo.chunks.join('') : '');
            if (content) {
                const blob = new Blob([content], { type: getMimeType(arquivo.originalName || arquivo.name) });
                const blobUrl = URL.createObjectURL(blob);
                console.log(`📄 Criando blob URL para: "${src}"`);
                return `src="${blobUrl}"`;
            }
        }

        return match;
    });

    // SUBSTITUIÇÃO DE HREF (CSS, links, etc)
    const hrefRegex = /href=["']([^"']+)["']/g;
    novoHTML = novoHTML.replace(hrefRegex, (match, href) => {
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || 
            href.startsWith('tel:') || href.includes('://')) {
            return match;
        }

        const arquivo = encontrarArquivo(href);
        if (!arquivo) return match;

        // Se for mídia, usa a URL
        if (isArquivoMidia(arquivo.originalName || arquivo.name)) {
            const url = arquivo.directUrl || arquivo.url;
            if (url) {
                console.log(`🔗 Substituindo HREF (mídia): "${href}" -> "${url}"`);
                return `href="${url}"`;
            }
        }
        // Se for CSS, cria blob URL
        else if (href.toLowerCase().endsWith('.css')) {
            const content = arquivo.content || (arquivo.chunks ? arquivo.chunks.join('') : '');
            if (content) {
                const blob = new Blob([content], { type: 'text/css' });
                const blobUrl = URL.createObjectURL(blob);
                console.log(`🎨 Criando blob URL para CSS: "${href}"`);
                return `href="${blobUrl}"`;
            }
        }

        return match;
    });

    // SUBSTITUIÇÃO DE BACKGROUND IMAGES
    const bgRegex = /background(-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    novoHTML = novoHTML.replace(bgRegex, (match, prop, bgUrl) => {
        if (bgUrl.startsWith('http') || bgUrl.startsWith('data:') || bgUrl.startsWith('//') || bgUrl.includes('://')) {
            return match;
        }

        const arquivo = encontrarArquivo(bgUrl);
        if (arquivo && (arquivo.directUrl || arquivo.url)) {
            const url = arquivo.directUrl || arquivo.url;
            console.log(`🎨 Substituindo BACKGROUND: "${bgUrl}" -> "${url}"`);
            return `background${prop || ''}: url("${url}")`;
        }
        return match;
    });

    console.log('✅ Substituição automática concluída!');
    return novoHTML;
}

// FUNÇÃO AUXILIAR - PEGA MIME TYPE
function getMimeType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'txt': 'text/plain',
        'xml': 'application/xml',
        'md': 'text/markdown'
    };
    return mimeTypes[extension] || 'text/plain';
}

// FUNÇÃO PRINCIPAL - BUSCA NO FIREBASE
async function loadProject() {
    console.log('🚀 Iniciando...');
    
    const params = parseUrlParameters();
    
    if (!params.projectId) {
        showError('URL inválida. Use: /view.html?l=SUBDOMINIO ou /view.html?project=ID_DO_PROJETO');
        return;
    }

    console.log('🔍 Buscando projeto:', params.projectId);
    if (params.fileName) {
        console.log('📁 Arquivo específico:', params.fileName);
    }

    try {
        // BUSCA DIRETA NO FIREBASE

        // 1. Tenta como subdomínio
        console.log('🔍 Tentando como subdomínio...');
        const domainData = await getFromFirebase('domains/' + params.projectId.toLowerCase());
        
        if (domainData && domainData.projectId) {
            console.log('✅ Subdomínio encontrado, buscando projeto...');
            const projectData = await getFromFirebase('projects/' + domainData.projectId);
            if (projectData) {
                currentProjectData = projectData;
                if (params.fileName) {
                    openSpecificFile(params.fileName);
                } else {
                    showMainFile();
                }
                return;
            }
        }

        // 2. Tenta como projeto público
        console.log('🔍 Tentando como projeto público...');
        let projectData = await getFromFirebase('projects/' + params.projectId);
        
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

        // 3. Tenta em projetos de usuário
        console.log('🔍 Tentando projetos de usuário...');
        const usersRef = db.ref('projects');
        const usersSnapshot = await usersRef.once('value');
        const usersData = usersSnapshot.val();
        
        if (usersData) {
            for (const userId in usersData) {
                if (usersData[userId][params.projectId]) {
                    projectData = usersData[userId][params.projectId];
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

        showError(`Projeto "${params.projectId}" não encontrado no Firebase.`);

    } catch (error) {
        console.error('❌ Erro:', error);
        showError('Erro ao buscar projeto: ' + error.message);
    }
}

// FUNÇÃO PARA PROCESSAR URL
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    let projectId = null;
    let fileName = null;

    // 1. Tenta parâmetro ?l=
    let lParam = urlParams.get('l');
    if (lParam) {
        console.log('📝 Usando parâmetro ?l=', lParam);
        if (lParam.includes('/')) {
            const parts = lParam.split('/');
            projectId = parts[0];
            fileName = parts.slice(1).join('/');
        } else {
            projectId = lParam;
        }
        return { projectId, fileName };
    }

    // 2. Tenta parâmetro ?project=
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
        return { projectId, fileName };
    }

    // 3. Tenta parâmetro ?projectId=
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
        return { projectId, fileName };
    }

    return { projectId: null, fileName: null };
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
        fileContent.innerHTML = `
            <div style="text-align: center;">
                <img src="${url}" alt="${fileName}" style="max-width: 95%; max-height: 95%; border-radius: 8px;">
            </div>
        `;
    } 
    // VÍDEO
    else if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv', 'ogg'].includes(extension)) {
        fileContent.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <video controls autoplay style="max-width: 95%; max-height: 95%;">
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta vídeo.
                </video>
            </div>
        `;
    } 
    // ÁUDIO
    else if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
        fileContent.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <audio controls autoplay style="width: 80%;">
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta áudio.
                </audio>
            </div>
        `;
    }
    // PDF
    else if (type.includes('pdf') || extension === 'pdf') {
        fileContent.innerHTML = `
            <div style="width: 100%; height: 100%;">
                <iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `;
    }
    // OUTROS ARQUIVOS (abre em nova aba)
    else {
        fileContent.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h3>Arquivo: ${fileName}</h3>
                <p>Este tipo de arquivo não pode ser visualizado diretamente.</p>
                <button onclick="window.open('${url}', '_blank')" style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Abrir em Nova Aba
                </button>
            </div>
        `;
    }

    fileViewer.style.display = 'flex';
    loadingEl.style.display = 'none';
    previewFrame.style.display = 'none';
    fileList.style.display = 'none';
}

// MOSTRA ARQUIVO DE TEXTO/HTML
function showTextFile(content, fileName, type = 'html') {
    if (type === 'html') {
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
        // Para outros arquivos de texto, mostra no viewer
        fileTitle.textContent = fileName;

        // Formatação de código
        if (type === 'css' || type === 'javascript' || type === 'json') {
            content = `<pre>${escapeHtml(content)}</pre>`;
        } else {
            content = `<pre class="code-plain">${escapeHtml(content)}</pre>`;
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

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', loadProject);

// Event Listeners
closeFileBtn.addEventListener('click', closeFileViewer);

// Funções globais
window.showProject = showProject;
window.showFileList = showFileList;
window.openSpecificFile = openSpecificFile;
window.closeFileViewer = closeFileViewer;