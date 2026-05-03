// ============ SANITIZAÇÃO FIREBASE ============
function sanitizeFirebaseKey(filename) {
  return filename.replace(/[.#$\[\]/]/g, '_');
}

// ============ FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  authDomain: "html-15e80.firebaseapp.com",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  projectId: "html-15e80",
  storageBucket: "html-15e80.appspot.com",
  messagingSenderId: "1068148640439",
  appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ============ VARIÁVEIS GLOBAIS ============
let currentProjectId = new URLSearchParams(window.location.search).get('projectId') || 'proj_' + Date.now().toString(36);
let currentUser = null;
let currentFile = null;
let files = {};
let currentZoom = 1;
let workersList = [];
let hostingSubdomain = null;
let hostingUrl = null;
let siteCreated = false;
let modalCallback = null;
let autoSaveTimer = null;
let lastSavedContent = null;
let isSaving = false;
let previewBlobUrl = null;
let streamAbortController = null;
let appInitialized = false;

// Garantir projectId na URL
if (!new URLSearchParams(window.location.search).get('projectId')) {
  const url = new URL(window.location);
  url.searchParams.set('projectId', currentProjectId);
  window.history.replaceState({}, '', url);
}

// ============ INICIALIZAÇÃO DIRETA (SEM LOOP) ============
function initAppDirect() {
  currentUser = { uid: 'user_' + Date.now(), displayName: 'Dev' };
  
  // Auth anônimo sem bloquear
  auth.signInAnonymously().then(result => {
    if (result.user) {
      currentUser = result.user;
      document.getElementById('user-name').textContent = result.user.displayName || 'Dev';
    }
  }).catch(() => {
    document.getElementById('user-name').textContent = 'Dev (offline)';
  });

  // Listener de auth configurado apenas UMA vez
  auth.onAuthStateChanged(user => {
    if (user && (!currentUser || user.uid !== currentUser.uid)) {
      currentUser = user;
      document.getElementById('user-name').textContent = user.displayName || user.email?.split('@')[0] || 'Dev';
      loadProjectFromFirebase();
    }
  });

  // Iniciar imediatamente
  loadProjectFromFirebase();
}

// ============ CARREGAR PROJETO ============
async function loadProjectFromFirebase() {
  try {
    const snap = await db.ref(`projects/${currentUser.uid}/${currentProjectId}`).once('value');
    const d = snap.val();
    
    if (d) {
      document.getElementById('project-name').value = d.name || '';
      files = d.files || {};
      
      if (d.hosting?.url) {
        hostingUrl = d.hosting.url;
        siteCreated = true;
        document.getElementById('fileUrlTop').value = hostingUrl;
        document.getElementById('urlPanelTop').style.display = 'flex';
        document.getElementById('siteDeleteBtn').style.display = 'inline-flex';
        document.getElementById('sitePublishBtn').textContent = '🔄 Atualizar';
      }
    } else {
      createDefaultProject();
    }
  } catch(e) {
    console.log('Offline, criando projeto local');
    createDefaultProject();
  }

  const keys = Object.keys(files);
  if (keys.length > 0) openFile(keys[0]);
  updateTabs();
  finishLoading();
}

function createDefaultProject() {
  files = {
    'index_html': { 
      name: 'index.html', originalName: 'index.html', 
      content: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Meu Projeto</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Olá Mundo!</h1>\n  <script src="script.js"></script>\n</body>\n</html>', 
      createdAt: new Date().toISOString() 
    },
    'style_css': { 
      name: 'style.css', originalName: 'style.css', 
      content: 'body {\n  margin: 0;\n  font-family: sans-serif;\n  background: #0a0e14;\n  color: #e2e8f0;\n}\nh1 { color: #3dd6c8; text-align: center; margin-top: 100px; }', 
      createdAt: new Date().toISOString() 
    },
    'script_js': { 
      name: 'script.js', originalName: 'script.js', 
      content: 'console.log("CodeHUB Pro!");', 
      createdAt: new Date().toISOString() 
    }
  };
  
  document.getElementById('project-name').value = 'Novo Projeto';
  
  try {
    db.ref(`projects/${currentUser.uid}/${currentProjectId}`).set({
      name: 'Novo Projeto', files: files, createdAt: new Date().toISOString()
    }).catch(() => {});
  } catch(e) {}
}

function finishLoading() {
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app-content').style.display = 'flex';
    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      if (ls) ls.style.display = 'none';
    }, 600);
  }, 300);
}

// ============ LOGS E STREAMING ============
function log(msg, type = 'system') {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = msg;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function logStream(msg) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  let last = msgs.querySelector('.message.ai.streaming');
  if (!last) {
    last = document.createElement('div');
    last.className = 'message ai streaming';
    msgs.appendChild(last);
  }
  last.textContent += msg;
  msgs.scrollTop = msgs.scrollHeight;
}

function finalizeStream() {
  const last = document.getElementById('chatMessages')?.querySelector('.message.ai.streaming');
  if (last) last.classList.remove('streaming');
  const stopBtn = document.getElementById('stopStreamBtn');
  if (stopBtn) stopBtn.style.display = 'none';
  const dot = document.getElementById('aiStatusDot');
  if (dot) dot.classList.remove('streaming');
  const txt = document.getElementById('aiStatusText');
  if (txt) txt.textContent = 'Online';
  streamAbortController = null;
}

function stopStream() {
  if (streamAbortController) { 
    streamAbortController.abort(); 
    finalizeStream(); 
  }
}

// ============ ZOOM ============
function changeZoom(d) { 
  currentZoom = Math.max(0.5, Math.min(2.5, currentZoom + d)); 
  document.body.style.zoom = currentZoom; 
  document.getElementById('zoomLevel').textContent = Math.round(currentZoom*100)+'%'; 
}

function resetZoom() { 
  currentZoom = 1; 
  document.body.style.zoom = 1; 
  document.getElementById('zoomLevel').textContent = '100%'; 
}

// ============ NOTIFICAÇÕES ============
function showNotification(msg, type) {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => { 
    n.style.opacity = '0'; 
    n.style.transition = 'opacity 0.3s'; 
    setTimeout(() => n.remove(), 300); 
  }, 3000);
}

// ============ MODAL ============
function showModal(title, msg, cb) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = msg;
  document.getElementById('confirmModal').style.display = 'flex';
  modalCallback = cb;
}

function modalConfirm() { 
  document.getElementById('confirmModal').style.display = 'none'; 
  if (modalCallback) { const cb = modalCallback; modalCallback = null; cb(); } 
}

function modalCancel() { 
  document.getElementById('confirmModal').style.display = 'none'; 
  modalCallback = null; 
}

// ============ ARQUIVOS ============
function updateTabs() {
  const tabs = document.getElementById('tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  Object.keys(files).forEach(key => {
    const file = files[key];
    const displayName = file.name || key;
    const btn = document.createElement('button');
    btn.className = `tab-btn ${key === currentFile ? 'active' : ''}`;
    btn.onclick = () => openFile(key);
    btn.innerHTML = `${displayName} <span class="close-tab-btn" onclick="event.stopPropagation();window.closeFile('${key}')">×</span>`;
    tabs.appendChild(btn);
  });
}

function openFile(key) {
  if (!files[key]) return;
  if (currentFile && currentFile !== key && files[currentFile]) {
    files[currentFile].content = document.getElementById('simple-editor').value;
  }
  currentFile = key;
  document.getElementById('simple-editor').value = files[key].content || '';
  lastSavedContent = files[key].content || '';
  updateTabs();
}

async function saveCurrentFile() {
  if (!currentFile || !files[currentFile] || isSaving) return;
  isSaving = true;
  try {
    const content = document.getElementById('simple-editor').value;
    if (lastSavedContent === content) { isSaving = false; return; }
    
    document.getElementById('auto-save-text').textContent = 'Salvando...';
    document.getElementById('auto-save-indicator').style.background = 'var(--accent-orange)';
    
    files[currentFile].content = content;
    files[currentFile].updatedAt = new Date().toISOString();
    lastSavedContent = content;
    
    await saveToFirebase();
    
    document.getElementById('auto-save-text').textContent = 'Salvo ✔';
    document.getElementById('auto-save-indicator').style.background = 'var(--accent-green)';
    document.getElementById('auto-save-time').textContent = new Date().toLocaleTimeString();
  } catch(e) { 
    console.error('Erro ao salvar:', e); 
  } finally { 
    isSaving = false; 
  }
}

async function saveToFirebase() {
  try {
    const sanitizedFiles = {};
    for (const [key, file] of Object.entries(files)) {
      sanitizedFiles[sanitizeFirebaseKey(key)] = file;
    }
    await db.ref(`projects/${currentUser.uid}/${currentProjectId}`).update({ 
      files: sanitizedFiles, updatedAt: new Date().toISOString() 
    });
  } catch(e) {
    console.error('Firebase save error:', e);
  }
}

function closeCurrentFile() { 
  if (Object.keys(files).length > 1) closeFile(currentFile); 
}

async function closeFile(key) {
  if (Object.keys(files).length <= 1) return;
  if (files[currentFile]) {
    files[currentFile].content = document.getElementById('simple-editor').value;
  }
  delete files[key];
  await saveToFirebase();
  if (key === currentFile) openFile(Object.keys(files)[0]);
  updateTabs();
}

function newFile() {
  document.getElementById('newFileName').value = '';
  document.getElementById('newFileType').value = 'html';
  document.getElementById('newFileModal').style.display = 'flex';
}

function closeNewFileModal() { 
  document.getElementById('newFileModal').style.display = 'none'; 
}

function confirmNewFile() {
  let name = document.getElementById('newFileName').value.trim();
  const type = document.getElementById('newFileType').value;
  
  if (!name) { 
    const map = { html:'index.html', css:'style.css', js:'script.js' }; 
    name = map[type] || 'file.txt'; 
  }
  if (!name.includes('.')) name += '.' + type;
  
  const key = sanitizeFirebaseKey(name);
  
  if (files[key]) { 
    showNotification('Arquivo já existe!', 'error'); 
    return; 
  }
  
  const templates = {
    html: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Olá!</h1>\n</body>\n</html>',
    css: '/* Estilos */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n',
    js: '// JavaScript\nconsole.log("Hello!");\n'
  };
  
  files[key] = { 
    name: name, originalName: name, 
    content: templates[type] || '', 
    createdAt: new Date().toISOString() 
  };
  
  closeNewFileModal();
  openFile(key);
  saveCurrentFile();
  saveToFirebase();
  showNotification('Arquivo criado!', 'success');
}

// ============ PUBLICAÇÃO ============
async function publishSite() {
  const hasIndex = Object.values(files).find(f => (f.name||f.originalName)==='index.html');
  if (!hasIndex) { 
    showNotification('Crie index.html primeiro!', 'error'); 
    return; 
  }
  await saveCurrentFile();
  
  if (siteCreated) {
    showModal('🔄 Atualizar?', 'Atualizar site?', async () => {
      await saveToFirebase();
      showNotification('✅ Atualizado!', 'success');
    });
  } else {
    showModal('🚀 Publicar?', 'Salvar no Firebase?', async () => {
      hostingUrl = `https://${currentProjectId}.web.app`;
      siteCreated = true;
      try {
        await db.ref(`projects/${currentUser.uid}/${currentProjectId}/hosting`).set({ 
          url: hostingUrl, publishedAt: new Date().toISOString() 
        });
      } catch(e) {}
      
      document.getElementById('fileUrlTop').value = hostingUrl;
      document.getElementById('urlPanelTop').style.display = 'flex';
      document.getElementById('siteDeleteBtn').style.display = 'inline-flex';
      document.getElementById('sitePublishBtn').textContent = '🔄 Atualizar';
      showNotification('✅ Publicado!', 'success');
    });
  }
}

async function deleteSite() {
  if (!siteCreated) return;
  showModal('🗑️ Deletar?', 'Deletar site?', async () => {
    hostingUrl = null; siteCreated = false;
    document.getElementById('urlPanelTop').style.display = 'none';
    document.getElementById('siteDeleteBtn').style.display = 'none';
    document.getElementById('sitePublishBtn').textContent = '🚀 Publicar';
    try {
      await db.ref(`projects/${currentUser.uid}/${currentProjectId}/hosting`).remove();
    } catch(e) {}
    showNotification('✅ Deletado!', 'success');
  });
}

// ============ PREVIEW ============
function previewProject() {
  const idx = Object.values(files).find(f => (f.name||f.originalName)==='index.html');
  if (idx?.content) {
    saveCurrentFile();
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    let html = idx.content;
    
    for (const f of Object.values(files)) {
      const fn = f.name || f.originalName;
      if (fn === 'index.html') continue;
      if (fn.endsWith('.css')) {
        html = html.replace('</head>', `<style>${f.content}</style></head>`);
      }
      if (fn.endsWith('.js')) {
        html = html.replace('</body>', `<script>${f.content}<\/script></body>`);
      }
    }
    
    previewBlobUrl = URL.createObjectURL(new Blob([html], {type:'text/html'}));
    document.getElementById('previewIframe').src = previewBlobUrl;
    document.getElementById('previewModal').style.display = 'flex';
  } else {
    showNotification('Crie index.html primeiro!', 'info');
  }
}

function closePreviewModal() { 
  document.getElementById('previewModal').style.display = 'none'; 
}

// ============ AI COM STREAMING ============
async function sendToAI() {
  const chatInput = document.getElementById('chatInput');
  const msg = chatInput.value.trim();
  if (!msg) return;
  
  log('🧑 ' + msg, 'user');
  chatInput.value = '';
  
  streamAbortController = new AbortController();
  document.getElementById('stopStreamBtn').style.display = 'inline-flex';
  document.getElementById('aiStatusDot').classList.add('streaming');
  document.getElementById('aiStatusText').textContent = 'Streaming...';
  
  try {
    const ctx = `Você é um assistente no CodeHUB Pro. Use [CARQUIVO:nome.ext]conteúdo[/CARQUIVO] para criar arquivos, [EDITAR:nome.ext]conteúdo[/EDITAR] para editar. Projeto: ${currentProjectId}. Arquivos: ${Object.values(files).map(f=>f.name||'?').join(', ')}.`;
    
    const response = await fetch('https://api.puter.com/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'system', content: ctx }, { role: 'user', content: msg }],
        stream: true
      }),
      signal: streamAbortController.signal
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) { fullText += text; logStream(text); }
        } catch(e) {}
      }
    }
    
    finalizeStream();
    await processAICommands(fullText);
  } catch(e) {
    if (e.name === 'AbortError') return;
    finalizeStream();
    log('Erro IA: ' + e.message, 'error');
  }
}

async function processAICommands(text) {
  const createRe = /\[CARQUIVO:\s*([^\]]+)\]\s*([\s\S]*?)\s*\[\/CARQUIVO\]/g;
  let match;
  while ((match = createRe.exec(text)) !== null) {
    const fn = match[1].trim(), content = match[2];
    const key = sanitizeFirebaseKey(fn);
    files[key] = { name: fn, originalName: fn, content, createdAt: new Date().toISOString() };
    openFile(key); saveCurrentFile(); saveToFirebase();
    log(`✅ ${fn} criado`, 'success');
  }
  
  const editRe = /\[EDITAR:\s*([^\]]+)\]\s*([\s\S]*?)\s*\[\/EDITAR\]/g;
  while ((match = editRe.exec(text)) !== null) {
    const fn = match[1].trim(), content = match[2];
    const key = sanitizeFirebaseKey(fn);
    
    if (files[key]) {
      files[key].content = content;
      if (currentFile === key) document.getElementById('simple-editor').value = content;
      saveCurrentFile(); saveToFirebase();
      log(`✅ ${fn} editado`, 'success');
    } else {
      const existingKey = Object.keys(files).find(k => files[k].name === fn);
      if (existingKey) {
        files[existingKey].content = content;
        if (currentFile === existingKey) document.getElementById('simple-editor').value = content;
        saveCurrentFile(); saveToFirebase();
        log(`✅ ${fn} editado`, 'success');
      }
    }
  }
  updateTabs();
}

function quickAI(type) {
  const prompts = {
    create_html: 'Crie um index.html responsivo',
    create_css: 'Crie um style.css tema escuro',
    create_js: 'Crie um script.js com funções úteis',
    create_worker: 'Crie um worker chamado api',
    analyze: 'Analise o código atual'
  };
  document.getElementById('chatInput').value = prompts[type] || '';
  sendToAI();
}

// ============ WORKERS ============
function createNewWorker() {
  document.getElementById('newWorkerModal').style.display = 'flex';
}

function closeNewWorkerModal() { 
  document.getElementById('newWorkerModal').style.display = 'none'; 
}

function confirmNewWorker() {
  const name = document.getElementById('newWorkerName').value.trim();
  const route = document.getElementById('newWorkerRoute').value.trim();
  if (!name) { showNotification('Nome obrigatório', 'error'); return; }
  const id = sanitizeFirebaseKey(name) + '_' + Date.now().toString(36);
  workersList.push({ id, name, route: route || '/api' });
  renderWorkersList();
  closeNewWorkerModal();
  showNotification('Worker criado!', 'success');
}

function renderWorkersList() {
  const list = document.getElementById('workersList');
  const count = document.getElementById('workersCount');
  if (count) count.textContent = workersList.length;
  if (!list) return;
  
  if (!workersList.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:30px;">📭 Nenhum worker</div>';
    return;
  }
  list.innerHTML = workersList.map(w => 
    `<div class="worker-item"><div class="worker-name">${w.name}</div><div class="worker-route">📌 ${w.route}</div></div>`
  ).join('');
}

// ============ HISTÓRICO ============
function showVersionHistory() {
  if (!currentFile) { showNotification('Abra um arquivo primeiro', 'info'); return; }
  document.getElementById('versionFileName').textContent = files[currentFile]?.name || currentFile;
  document.getElementById('versionList').innerHTML = `<p style="color:var(--text-muted);">Versão atual salva em: ${new Date(files[currentFile]?.updatedAt || Date.now()).toLocaleString()}</p>`;
  document.getElementById('versionHistoryModal').style.display = 'flex';
}

function closeVersionHistoryModal() { 
  document.getElementById('versionHistoryModal').style.display = 'none'; 
}

// ============ UTILS ============
function copyUrl() { 
  const u = document.getElementById('fileUrlTop').value; 
  if (u) { navigator.clipboard.writeText(u); showNotification('📋 URL copiada!', 'info'); } 
}

function logout() { 
  auth.signOut(); 
  window.location.href = 'index.html'; 
}

// ============ ATALHOS DE TECLADO ============
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    
    if (ctrl && e.key === 's') { e.preventDefault(); saveCurrentFile(); }
    else if (ctrl && e.key === 'n') { e.preventDefault(); newFile(); }
    else if (ctrl && e.key === 'w') { e.preventDefault(); closeCurrentFile(); }
    else if (ctrl && e.key === 'p') { e.preventDefault(); previewProject(); }
    else if (ctrl && e.key === 'h') { e.preventDefault(); showVersionHistory(); }
    else if (ctrl && e.key === 'b') { e.preventDefault(); publishSite(); }
    else if (ctrl && e.key === '=') { e.preventDefault(); changeZoom(0.1); }
    else if (ctrl && e.key === '-') { e.preventDefault(); changeZoom(-0.1); }
    else if (ctrl && e.key === '0') { e.preventDefault(); resetZoom(); }
    else if (ctrl && e.key === 'Enter') { e.preventDefault(); sendToAI(); }
    else if (ctrl && e.key === 'd') { e.preventDefault(); duplicateLine(); }
    else if (ctrl && e.key === '/') { e.preventDefault(); toggleComment(); }
  });
}

function duplicateLine() {
  const editor = document.getElementById('simple-editor');
  const pos = editor.selectionStart;
  const text = editor.value;
  const ls = text.lastIndexOf('\n', pos - 1) + 1;
  const le = text.indexOf('\n', pos);
  const ae = le === -1 ? text.length : le;
  editor.value = text.substring(0, ae) + '\n' + text.substring(ls, ae) + text.substring(ae);
  saveCurrentFile();
}

function toggleComment() {
  const editor = document.getElementById('simple-editor');
  const pos = editor.selectionStart;
  const text = editor.value;
  const ls = text.lastIndexOf('\n', pos - 1) + 1;
  const le = text.indexOf('\n', pos);
  const ae = le === -1 ? text.length : le;
  const line = text.substring(ls, ae);
  let nl = line.startsWith('// ') ? line.substring(3) : line.startsWith('//') ? line.substring(2) : '// ' + line;
  editor.value = text.substring(0, ls) + nl + text.substring(ae);
  saveCurrentFile();
}

function setupAutoSave() {
  const editor = document.getElementById('simple-editor');
  editor.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveCurrentFile(), 1000);
  });
  editor.addEventListener('blur', () => { 
    clearTimeout(autoSaveTimer); 
    saveCurrentFile(); 
  });
}

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
  // Event Listeners
  document.getElementById('saveFileBtn')?.addEventListener('click', saveCurrentFile);
  document.getElementById('previewBtn')?.addEventListener('click', previewProject);
  document.getElementById('sitePublishBtn')?.addEventListener('click', publishSite);
  document.getElementById('siteDeleteBtn')?.addEventListener('click', deleteSite);
  
  document.getElementById('project-name')?.addEventListener('blur', function() { 
    if (this.value.trim() && currentUser) {
      db.ref(`projects/${currentUser.uid}/${currentProjectId}/name`).set(this.value.trim()).catch(()=>{});
    }
  });

  // Resize Workers Panel
  let resizingW = false;
  document.getElementById('workersResizeHandle')?.addEventListener('mousedown', e => { 
    resizingW = true; e.preventDefault(); 
  });
  document.addEventListener('mousemove', e => { 
    if (!resizingW) return; 
    const w = e.clientX; 
    if (w >= 180 && w <= 380) {
      document.getElementById('workers-panel').style.width = w + 'px'; 
    }
  });
  document.addEventListener('mouseup', () => { resizingW = false; });

  // Resize AI Sidebar
  let resizing = false;
  document.getElementById('resizeHandle')?.addEventListener('mousedown', e => { 
    resizing = true; e.preventDefault(); 
  });
  document.addEventListener('mousemove', e => { 
    if (!resizing) return; 
    const w = innerWidth - e.clientX; 
    if (w >= 260 && w <= 560) {
      document.getElementById('ai-sidebar').style.width = w + 'px'; 
    }
  });
  document.addEventListener('mouseup', () => { resizing = false; });

  // Modal backdrops
  ['confirmModal','previewModal','newFileModal','newWorkerModal','versionHistoryModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function(e) {
      if (e.target === this) {
        if (id === 'confirmModal') modalCancel();
        else if (id === 'previewModal') closePreviewModal();
        else if (id === 'newFileModal') closeNewFileModal();
        else if (id === 'newWorkerModal') closeNewWorkerModal();
        else if (id === 'versionHistoryModal') closeVersionHistoryModal();
      }
    });
  });

  initKeyboard();
  setupAutoSave();
  initAppDirect(); // ✅ INICIAR SEM LOOP
});

// Expor funções globalmente
window.changeZoom = changeZoom;
window.resetZoom = resetZoom;
window.saveCurrentFile = saveCurrentFile;
window.publishSite = publishSite;
window.deleteSite = deleteSite;
window.previewProject = previewProject;
window.closePreviewModal = closePreviewModal;
window.createNewWorker = createNewWorker;
window.closeNewWorkerModal = closeNewWorkerModal;
window.confirmNewWorker = confirmNewWorker;
window.copyUrl = copyUrl;
window.logout = logout;
window.closeFile = closeFile;
window.closeCurrentFile = closeCurrentFile;
window.newFile = newFile;
window.closeNewFileModal = closeNewFileModal;
window.confirmNewFile = confirmNewFile;
window.stopStream = stopStream;
window.sendToAI = sendToAI;
window.quickAI = quickAI;
window.showVersionHistory = showVersionHistory;
window.closeVersionHistoryModal = closeVersionHistoryModal;
window.modalConfirm = modalConfirm;
window.modalCancel = modalCancel;
