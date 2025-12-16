// ================= FIREBASE =================
const firebaseConfig = {
    apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
    authDomain: "html-15e80.firebaseapp.com",
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
    projectId: "html-15e80",
    storageBucket: "html-15e80.appspot.com",
    messagingSenderId: "1068148640439",
    appId: "1:1068148640439:web:1ac651348e624f6be41b32"
};

let db;
firebase.initializeApp(firebaseConfig);
db = firebase.database();
console.log("✅ Firebase conectado");

// ================= DOM =================
const loadingEl = document.getElementById('loading');
const previewFrame = document.getElementById('preview-frame');
const fileViewer = document.getElementById('file-viewer');
const fileContent = document.getElementById('file-content');
const fileTitle = document.getElementById('file-title');
const closeFileBtn = document.getElementById('close-file');
const fileList = document.getElementById('file-list');
const fileListContent = document.getElementById('file-list-content');

// ================= ESTADO =================
let currentProjectData = null;
let substituicaoAplicada = false;

// ================= URL =================
function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    let projectId = params.get('l') || params.get('project') || params.get('projectId');
    let fileName = params.get('file');

    if (projectId && projectId.includes('/')) {
        const p = projectId.split('/');
        projectId = p[0];
        fileName = p.slice(1).join('/');
    }

    if (!projectId && path.includes('/view.html/')) {
        const p = path.split('/view.html/')[1].split('/');
        projectId = p[0];
        fileName = p.slice(1).join('/');
    }

    return {
        projectId,
        fileName,
        type: projectId && !projectId.startsWith('-') ? 'subdomain' : 'projectId'
    };
}

// ================= FIREBASE =================
function getFromFirebase(path) {
    return db.ref(path).once('value').then(s => s.val());
}

// ================= SUBSTITUIÇÃO =================
function substituirArquivosPorURLs(html, files) {
    if (!files || substituicaoAplicada) return html;

    function findFile(name) {
        name = name.split('/').pop().toLowerCase();
        return Object.values(files).find(f =>
            (f.originalName || f.name || '').toLowerCase() === name
        );
    }

    html = html.replace(/src=["']([^"']+)["']/g, (m, v) => {
        if (v.startsWith('http') || v.startsWith('data:')) return m;
        const f = findFile(v);
        return f?.directUrl ? `src="${f.directUrl}"` : m;
    });

    html = html.replace(/href=["']([^"']+)["']/g, (m, v) => {
        if (v.startsWith('http') || v.startsWith('#')) return m;
        const f = findFile(v);
        return f?.directUrl ? `href="${f.directUrl}"` : m;
    });

    substituicaoAplicada = true;
    return html;
}

// ================= FILE =================
function findMainFile() {
    return Object.values(currentProjectData.files || {})
        .find(f => (f.originalName || '').toLowerCase() === 'index.html');
}

function openSpecificFile(name) {
    const file = Object.values(currentProjectData.files || {})
        .find(f => (f.originalName || f.name) === name);

    if (!file) return alert('Arquivo não encontrado');

    if (file.directUrl) {
        fileViewer.style.display = 'flex';
        previewFrame.style.display = 'none';
        fileContent.innerHTML = `<iframe src="${file.directUrl}" style="width:100%;height:100%"></iframe>`;
        return;
    }

    const content = (file.chunks || []).join('') || file.content || '';
    substituicaoAplicada = false;
    previewFrame.srcdoc = substituirArquivosPorURLs(content, currentProjectData.files);
    previewFrame.style.display = 'block';
    fileViewer.style.display = 'none';
}

// ================= LOAD =================
async function loadProject() {
    const params = parseUrlParameters();
    if (!params.projectId) {
        loadingEl.innerText = 'URL inválida';
        return;
    }

    let projectId = params.projectId;

    if (params.type === 'subdomain') {
        const domain = await getFromFirebase('domains/' + projectId);
        if (!domain) return loadingEl.innerText = 'Subdomínio não existe';
        projectId = domain.projectId;
    }

    const project = await getFromFirebase('projects/' + projectId);
    if (!project) return loadingEl.innerText = 'Projeto não encontrado';

    currentProjectData = project;

    if (params.fileName) {
        openSpecificFile(params.fileName);
    } else {
        const main = findMainFile();
        if (main) openSpecificFile(main.originalName);
    }

    loadingEl.style.display = 'none';
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', loadProject);
closeFileBtn?.addEventListener('click', () => fileViewer.style.display = 'none');

window.openSpecificFile = openSpecificFile;