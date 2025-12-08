// =======================
// CONFIGURAÇÃO FIREBASE
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

// Inicialização
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log('✅ Firebase OK');
} catch (e) {
    console.error('❌ Firebase não inicializado:', e);
    db = firebase.database();
}

// =======================
// ELEMENTOS DOM
// =======================
const loadingEl = document.getElementById('loading');
const previewFrame = document.getElementById('preview-frame');
const fileViewer = document.getElementById('file-viewer');
const fileContent = document.getElementById('file-content');
const fileTitle = document.getElementById('file-title');
const closeFileBtn = document.getElementById('close-file');
const fileList = document.getElementById('file-list');
const fileListContent = document.getElementById('file-list-content');

// =======================
// VARIÁVEIS DE ESTADO
// =======================
let currentProjectData = null;
let currentFileName = null;
let substituicaoAplicada = false;

// =======================
// FUNÇÕES AUXILIARES
// =======================

function escapeHtml(unsafe) {
    return unsafe
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
// PARSE URL PARAMS
// =======================
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    let projectId = null;
    let fileName = null;

    // 1. Checa parâmetros ?file= ou ?open=
    for (const [k, v] of urlParams.entries()) {
        if (!fileName && (k.toLowerCase().includes("file") || k==="f" || k==="open")) {
            fileName = v;
        }
        if (!projectId && (k.toLowerCase().includes("project") || k==="l" || k==="projectId")) {
            projectId = v;
        }
    }

    // 2. Checa ?project= ou ?projectId=
    if (!projectId) projectId = urlParams.get('project') || urlParams.get('projectId');

    // 3. Checa path /view.html/SUBDOMINIO
    if (!projectId && path.includes('/view.html/')) {
        const pathParts = path.split('/view.html/');
        if (pathParts.length > 1) {
            const restante = pathParts[1];
            if (restante.includes('/')) {
                const subParts = restante.split('/');
                projectId = subParts[0];
                fileName = subParts.slice(1).join('/');
            } else {
                projectId = restante;
            }
        }
    }

    return { projectId, fileName };
}

// =======================
// FUNÇÕES DE EXIBIÇÃO
// =======================
function showError(msg) {
    loadingEl.innerHTML = `<div class="error">${msg}</div>`;
    loadingEl.style.display = 'flex';
    previewFrame.style.display = 'none';
    fileViewer.style.display = 'none';
    fileList.style.display = 'none';
}

function findFileByName(fileName) {
    if (!currentProjectData.files) return null;
    const fileNameLower = fileName.toLowerCase();
    for (const key in currentProjectData.files) {
        const file = currentProjectData.files[key];
        const name = (file.originalName || file.name || key).toLowerCase();
        if (name === fileNameLower) return file;
    }
    return null;
}

function findMainFile() {
    if (!currentProjectData.files) return null;
    const files = Object.values(currentProjectData.files);
    let mainFile = files.find(f => (f.originalName||f.name||'').toLowerCase() === 'index.html');
    if (!mainFile) mainFile = files.find(f => (f.originalName||f.name||'').toLowerCase().endsWith('.html'));
    return mainFile;
}

// =======================
// FUNÇÕES DE VISUALIZAÇÃO DE ARQUIVO
// =======================
function showMediaFile(file, fileName) {
    const url = file.directUrl || file.url;
    const type = file.type || '';
    const ext = fileName.split('.').pop().toLowerCase();
    fileTitle.textContent = fileName || file.originalName || 'Arquivo';

    if (type.startsWith('image/') || ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext)) {
        fileContent.innerHTML = `<img src="${url}" alt="${fileName}" style="max-width:100%; max-height:100%;">`;
    } else if (type.startsWith('video/') || ['mp4','avi','mov','webm','mkv'].includes(ext)) {
        fileContent.innerHTML = `<video controls autoplay style="max-width:100%; max-height:100%;"><source src="${url}" type="${type}">Seu navegador não suporta vídeo.</video>`;
    } else if (type.startsWith('audio/') || ['mp3','wav','ogg'].includes(ext)) {
        fileContent.innerHTML = `<audio controls autoplay><source src="${url}" type="${type}">Seu navegador não suporta áudio.</audio>`;
    } else if (ext === 'pdf') {
        fileContent.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;
    } else {
        fileContent.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;
    }

    fileViewer.style.display = 'flex';
    loadingEl.style.display = 'none';
    previewFrame.style.display = 'none';
    fileList.style.display = 'none';
}

function showTextFile(content, fileName, type='html') {
    if (type==='html') {
        substituicaoAplicada = false;
        const htmlComSub = substituirArquivosPorURLs(content, currentProjectData.files);
        previewFrame.srcdoc = htmlComSub;
        previewFrame.style.display = 'block';
        loadingEl.style.display = 'none';
        fileViewer.style.display = 'none';
        fileList.style.display = 'none';
        document.title = fileName;
    } else {
        fileTitle.textContent = fileName;
        if (['css','javascript','json'].includes(type)) {
            content = `<pre style="font-family:'Courier New', monospace;background:#f8f8f8;padding:20px;border-radius:5px;overflow:auto;margin:0;">${escapeHtml(content)}</pre>`;
        } else {
            content = `<pre style="font-family:Arial,sans-serif;padding:20px;margin:0;">${escapeHtml(content)}</pre>`;
        }
        fileContent.innerHTML = content;
        fileViewer.style.display = 'flex';
        loadingEl.style.display = 'none';
        previewFrame.style.display = 'none';
        fileList.style.display = 'none';
    }
}

function openSpecificFile(fileName) {
    if (!currentProjectData.files) return;
    const file = findFileByName(fileName);
    if (!file) return showError(`Arquivo "${fileName}" não encontrado.`);

    currentFileName = fileName;
    if (isUploadedFile(file)) {
        showMediaFile(file, fileName);
    } else {
        const content = joinChunks(file.chunks) || file.content || '';
        const fileType = file.language || fileName.split('.').pop() || 'text';
        showTextFile(content, fileName, fileType);
    }
}

function showMainFile() {
    const mainFile = findMainFile();
    if (mainFile) openSpecificFile(mainFile.originalName || mainFile.name);
    else showFileList();
}

function showProject() { showMainFile(); }
function closeFileViewer() { fileViewer.style.display='none'; fileContent.innerHTML=''; showProject(); }

// =======================
// FUNÇÃO DE SUBSTITUIÇÃO AUTOMÁTICA
// =======================
function substituirArquivosPorURLs(htmlContent, projectFiles) {
    if (!projectFiles || !htmlContent || substituicaoAplicada) return htmlContent;
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

    // SRC
    novoHTML = novoHTML.replace(/src=["']([^"']+)["']/g,(match, src)=>{
        if (src.startsWith('http')||src.startsWith('data:')||src.includes('://')) return match;
        const arquivo = encontrarArquivo(src);
        if (arquivo && (arquivo.directUrl||arquivo.url)) return `src="${arquivo.directUrl||arquivo.url}"`;
        return match;
    });

    substituicaoAplicada = true;
    return novoHTML;
}

// =======================
// FIREBASE HELPER
// =======================
function getFromFirebase(path) {
    return new Promise(resolve => {
        db.ref(path).once('value', snapshot => resolve(snapshot.val()));
    });
}

// =======================
// CARREGAMENTO DO PROJETO
// =======================
async function loadProject() {
    const params = parseUrlParameters();
    if (!params.projectId) return showError('URL inválida: use ?project=ID ou /view.html/SUBDOMINIO');

    let finalProjectId = params.projectId;
    let projectData = null;

    // SUBDOMÍNIO
    const domainData = await getFromFirebase('domains/' + finalProjectId.toLowerCase());
    if (domainData && domainData.projectId) finalProjectId = domainData.projectId;

    // PROJETO PÚBLICO
    projectData = await getFromFirebase('projects/' + finalProjectId);
    if (!projectData) {
        // TENTA PROJETOS DE USUÁRIO
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

    if (!projectData) return showError(`Projeto "${finalProjectId}" não encontrado.`);

    currentProjectData = projectData;
    if (params.fileName) openSpecificFile(params.fileName);
    else showMainFile();
}

// =======================
// EVENT LISTENERS
// =======================
document.addEventListener('DOMContentLoaded', loadProject);
closeFileBtn.addEventListener('click', closeFileViewer);

// GLOBALS
window.showProject = showProject;
window.showFileList = showFileList;
window.openSpecificFile = openSpecificFile;
window.closeFileViewer = closeFileViewer;
window.abrirArquivoNoVisualizador = openSpecificFile;
window.substituirArquivosPorURLs = substituirArquivosPorURLs;