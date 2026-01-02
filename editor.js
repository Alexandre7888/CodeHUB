// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  authDomain: "html-15e80.firebaseapp.com",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  projectId: "html-15e80",
  storageBucket: "html-15e80.appspot.com",
  messagingSenderId: "1068148640439",
  appId: "1:1068148640439:web:1ac651348e624f6be41b32",
  measurementId: "G-7E1VWN07GM"
};

// Inicialização do Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Variáveis globais
let editor;
let currentProjectId;
let currentFile = null;
let projectRef = null;
let files = {};
let models = {};
let currentUser = null;
let sessionRef = null;
let currentCode = null;
let loaderInterval = null;
let uploadedFiles = {};
let currentSubdomain = null;

// Elementos da UI
const elements = {
  newFileNameInput: document.getElementById('newFileName'),
  newFileForm: document.getElementById('newFileForm'),
  saveFileBtn: document.getElementById('saveFileBtn'),
  previewBtn: document.getElementById('previewBtn'),
  aiBtn: document.getElementById('aiBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  insertFileBtn: document.getElementById('insertFileBtn'),
  domainBtn: document.getElementById('domainBtn'),
  projectNameInput: document.getElementById('project-name'),
  tabsContainer: document.getElementById('tabs'),
  userNameElement: document.getElementById('user-name'),
  aiIframeContainer: document.getElementById('ai-iframe-container'),
  aiIframe: document.getElementById('ai-iframe'),
  closeAiBtn: document.getElementById('close-ai-btn'),
  uploadIframeContainer: document.getElementById('upload-iframe-container'),
  uploadIframe: document.getElementById('upload-iframe'),
  closeUploadBtn: document.getElementById('close-upload-btn'),
  codeNotification: document.getElementById('code-notification'),
  codePreview: document.getElementById('code-preview'),
  targetFileSelect: document.getElementById('target-file-select'),
  insertCodeBtn: document.getElementById('insert-code-btn'),
  discardCodeBtn: document.getElementById('discard-code-btn'),
  loadingScreen: document.getElementById('loading-screen'),
  appContent: document.getElementById('app-content'),
  codefoxImage: document.getElementById('codefox'),
  uploadStatus: document.getElementById('uploadStatus'),
  fileContainer: document.getElementById('file-container'),
  fileIframe: document.getElementById('file-iframe'),
  insertModal: document.getElementById('insertModal'),
  fileSelect: document.getElementById('file-select'),
  insertStatus: document.getElementById('insert-status'),
  cancelInsertBtn: document.getElementById('cancel-insert-btn'),
  confirmInsertBtn: document.getElementById('confirm-insert-btn')
};

// Configurar animação do loader
const imagens = [
  "https://alexandre7888.github.io/CodeHUB/CodeFOX/foto1.jpg",
  "https://alexandre7888.github.io/CodeHUB/CodeFOX/foto2.jpg",
  "https://alexandre7888.github.io/CodeHUB/CodeFOX/foto3.jpg"
];

function startLoaderAnimation() {
  let index = 0;
  loaderInterval = setInterval(() => {
    index = (index + 1) % imagens.length;
    elements.codefoxImage.src = imagens[index];
  }, 2000);
}

function showAppContent() {
  elements.loadingScreen.style.opacity = '0';
  setTimeout(() => {
    elements.loadingScreen.style.display = 'none';
    elements.appContent.style.display = 'block';
    clearInterval(loaderInterval);
  }, 500);
}

// Funções auxiliares
function encodeKey(str) {
  return btoa(encodeURIComponent(str)).replace(/=/g, '');
}

function sanitizeFilename(filename) {
  return filename.replace(/[.#$/[\]]/g, '_');
}

// SISTEMA DE SUBDOMÍNIOS
function createCustomDomain(projectId, subdomain) {
    if (!subdomain || !projectId) return null;

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (cleanSubdomain.length < 3) {
        alert('Subdomínio deve ter pelo menos 3 caracteres');
        return null;
    }

    const domainRef = db.ref(`domains/${cleanSubdomain}`);
    domainRef.set({
        projectId: projectId,
        owner: currentUser.uid,
        createdAt: new Date().toISOString(),
        subdomain: cleanSubdomain
    });

    return cleanSubdomain;
}

async function checkSubdomainAvailable(subdomain) {
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const domainRef = db.ref(`domains/${cleanSubdomain}`);
    const snapshot = await domainRef.once('value');
    return !snapshot.exists();
}

function generateProjectUrl(projectId, subdomain = null) {
    const baseUrl = window.location.origin + window.location.pathname.replace('editor.html', '');

    if (subdomain) {
        return `${baseUrl}view.html?l=${subdomain}`;
    } else {
        return `${baseUrl}view.html?projectId=${projectId}`;
    }
}

function generateFileUrl(projectId, fileName, subdomain = null) {
    const baseUrl = window.location.origin + window.location.pathname.replace('editor.html', '');

    if (subdomain) {
        return `${baseUrl}view.html?l=${subdomain}/${fileName}`;
    } else {
        return `${baseUrl}view.html?projectId=${projectId}/${fileName}`;
    }
}

function showDomainModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="background: #252526; padding: 20px; border-radius: 10px; width: 400px; max-width: 90%;">
            <h3 style="color: #4cc9f0; margin-top: 0;">🌐 Configurar Subdomínio</h3>
            <p style="color: #ccc; font-size: 14px;">Crie um link personalizado para seu projeto</p>
            
            <input type="text" id="subdomainInput" placeholder="meusite" 
                   style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border: 1px solid #555; background: #1e1e1e; color: white;">
            
            <div id="domainPreview" style="background: #1e1e1e; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 14px; color: #ccc;">
                Seu link: <span id="previewUrl">...</span>
            </div>
            
            <div id="domainStatus" style="margin: 10px 0;"></div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelDomain" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancelar</button>
                <button id="saveDomain" style="padding: 8px 16px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">Salvar Domínio</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const subdomainInput = modal.querySelector('#subdomainInput');
    const previewUrl = modal.querySelector('#previewUrl');
    const domainStatus = modal.querySelector('#domainStatus');
    const cancelBtn = modal.querySelector('#cancelDomain');
    const saveBtn = modal.querySelector('#saveDomain');

    subdomainInput.addEventListener('input', function() {
        const sub = this.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (sub) {
            previewUrl.textContent = generateProjectUrl(currentProjectId, sub);
            previewUrl.style.color = '#4cc9f0';
        } else {
            previewUrl.textContent = generateProjectUrl(currentProjectId);
            previewUrl.style.color = '#ccc';
        }
    });

    subdomainInput.addEventListener('blur', async function() {
        const sub = this.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (sub.length < 3) {
            domainStatus.innerHTML = '<span style="color: #ff4444;">Mínimo 3 caracteres</span>';
            return;
        }

        const available = await checkSubdomainAvailable(sub);
        if (available) {
            domainStatus.innerHTML = '<span style="color: #4caf50;">✅ Subdomínio disponível</span>';
        } else {
            domainStatus.innerHTML = '<span style="color: #ff4444;">❌ Subdomínio já está em uso</span>';
        }
    });

    saveBtn.addEventListener('click', async function() {
        const sub = subdomainInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '');

        if (sub.length < 3) {
            alert('Subdomínio deve ter pelo menos 3 caracteres');
            return;
        }

        const available = await checkSubdomainAvailable(sub);
        if (!available) {
            alert('Este subdomínio já está em uso. Escolha outro.');
            return;
        }

        createCustomDomain(currentProjectId, sub);
        currentSubdomain = sub;

        updateDomainButton();

        modal.remove();
        alert(`✅ Domínio configurado! Seu projeto está disponível em: ${generateProjectUrl(currentProjectId, sub)}`);
    });

    cancelBtn.addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    previewUrl.textContent = generateProjectUrl(currentProjectId);
}

function updateDomainButton() {
    if (currentSubdomain) {
        elements.domainBtn.innerHTML = `🌐 ${currentSubdomain}`;
        elements.domainBtn.style.background = '#4caf50';
    } else {
        elements.domainBtn.innerHTML = '🌐 Domínio';
        elements.domainBtn.style.background = '#4361ee';
    }
}

// Sistema de divisão de código
function splitLargeContent(content, maxChunkSize = 60000) {
    if (content.length <= maxChunkSize) {
        return null;
    }

    const chunks = [];
    for (let i = 0; i < content.length; i += maxChunkSize) {
        chunks.push(content.slice(i, i + maxChunkSize));
    }
    return chunks;
}

function joinChunks(chunks) {
    return chunks.join('');
}

function saveFileWithChunks(fileKey, content) {
    const chunks = splitLargeContent(content);

    if (!chunks) {
        files[fileKey].content = content;
        files[fileKey].chunks = null;
    } else {
        files[fileKey].chunks = chunks;
        files[fileKey].content = null;
    }
    files[fileKey].updatedAt = new Date().toISOString();
}

function loadFileWithChunks(fileData) {
    if (fileData.chunks && Array.isArray(fileData.chunks)) {
        return joinChunks(fileData.chunks);
    }
    return fileData.content || '';
}

// Configuração do Monaco Editor
require.config({ 
  paths: { 
    'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
  } 
});

window.MonacoEnvironment = { 
  getWorkerUrl: function(moduleId, label) {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { 
        baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/' 
      };
      importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js');
    `)}`;
  }
};

require(['vs/editor/editor.main'], function() {
  editor = monaco.editor.create(document.getElementById('container'), {
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    language: 'html'
  });

  editor.onDidChangeModelContent(() => {
    if (currentFile) {
      elements.saveFileBtn.disabled = false;
    }
  });

  startLoaderAnimation();
  initializeApp();
});

function initializeApp() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = user;
    updateUserInfo(user);
    saveUserInfo(user);

    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('projectId');

    if (!currentProjectId) {
      alert('ID do projeto não encontrado na URL!');
      window.location.href = 'index.html';
      return;
    }

    projectRef = db.ref(`projects/${user.uid}/${currentProjectId}`);
    sessionRef = db.ref(`sessions/${currentProjectId}`);

    loadProjectDomain();
    setupCodeListener();
    loadProject();
    loadUploadedFiles();
    setupEventListeners();
    setupClipboardListener(); // Adicionado: listener para área de transferência
  });
}

// NOVA FUNÇÃO: Configurar listener para área de transferência
function setupClipboardListener() {
  document.addEventListener('paste', handlePasteEvent);
}

// NOVA FUNÇÃO: Manipular evento de colagem
function handlePasteEvent(event) {
  const clipboardData = event.clipboardData || window.clipboardData;
  
  if (!clipboardData) return;

  // Verificar se há arquivos na área de transferência
  const items = clipboardData.items;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        handlePastedFile(file);
        break;
      }
    }
  }
}

// NOVA FUNÇÃO: Manipular arquivo colado da área de transferência
function handlePastedFile(file) {
  if (!currentProjectId) return;

  // Mostrar status de upload
  showUploadStatus(`Processando arquivo da área de transferência: ${file.name}...`, 'info');

  // Criar um FormData para simular upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', currentProjectId);
  formData.append('source', 'clipboard');

  // Enviar para o endpoint de upload
  const uploadUrl = 'https://nuvem-de-arquivos-drive--narrownarwhal3891229.on.websim.com/upload';
  
  fetch(uploadUrl, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showUploadStatus(`✅ Arquivo "${file.name}" copiado com sucesso!`, 'success');
      
      // Recarregar arquivos após um breve delay
      setTimeout(() => {
        loadProject();
        loadUploadedFiles();
      }, 1000);
    } else {
      showUploadStatus(`❌ Erro ao copiar arquivo: ${data.message || 'Erro desconhecido'}`, 'error');
    }
  })
  .catch(error => {
    console.error('Erro ao enviar arquivo da área de transferência:', error);
    showUploadStatus(`❌ Erro ao copiar arquivo: ${error.message}`, 'error');
  });
}

// NOVA FUNÇÃO: Mostrar status do upload
function showUploadStatus(message, type) {
  if (elements.uploadStatus) {
    elements.uploadStatus.textContent = message;
    elements.uploadStatus.className = `status-${type}`;
    elements.uploadStatus.style.display = 'block';
    
    // Auto-esconder após 5 segundos para mensagens de sucesso/info
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        elements.uploadStatus.style.display = 'none';
      }, 5000);
    }
  }
}

function loadProjectDomain() {
    const domainsRef = db.ref('domains');
    domainsRef.orderByChild('projectId').equalTo(currentProjectId).on('value', (snapshot) => {
        const domains = snapshot.val();
        if (domains) {
            const domainKey = Object.keys(domains)[0];
            currentSubdomain = domains[domainKey].subdomain;
            updateDomainButton();
        }
    });
}

function setupEventListeners() {
  elements.newFileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    createNewFile();
  });

  elements.saveFileBtn.addEventListener('click', saveCurrentFile);

  elements.previewBtn.addEventListener('click', function() {
    if (!currentProjectId) return;
    const url = generateProjectUrl(currentProjectId, currentSubdomain);
    window.open(url, '_blank');
  });

  elements.domainBtn.addEventListener('click', showDomainModal);

  elements.projectNameInput.addEventListener('blur', updateProjectName);

  elements.aiBtn.addEventListener('click', function() {
    if (!currentProjectId) return;
    const aiUrl = `https://pergunte-ia--socialkoala6579904.on.websim.com/?projectId=${currentProjectId}`;
    elements.aiIframe.src = aiUrl;
    elements.aiIframeContainer.style.display = 'flex';
  });

  elements.closeAiBtn.addEventListener('click', function() {
    elements.aiIframeContainer.style.display = 'none';
    elements.aiIframe.src = 'about:blank';
  });

  elements.uploadBtn.addEventListener('click', function() {
    if (!currentProjectId) return;
    const uploadUrl = `https://nuvem-de-arquivos-drive--narrownarwhal3891229.on.websim.com/?projectId=${currentProjectId}&clipboard=true`;
    elements.uploadIframe.src = uploadUrl;
    elements.uploadIframeContainer.style.display = 'flex';
  });

  elements.closeUploadBtn.addEventListener('click', function() {
    elements.uploadIframeContainer.style.display = 'none';
    elements.uploadIframe.src = 'about:blank';
    loadProject();
    loadUploadedFiles();
  });

  elements.insertFileBtn.addEventListener('click', function() {
    showInsertModal();
  });

  elements.cancelInsertBtn.addEventListener('click', function() {
    elements.insertModal.style.display = 'none';
  });

  elements.confirmInsertBtn.addEventListener('click', insertFileReference);

  elements.insertCodeBtn.addEventListener('click', insertCode);
  elements.discardCodeBtn.addEventListener('click', function() {
    elements.codeNotification.style.display = 'none';
    currentCode = null;
  });
}

function updateUserInfo(user) {
  if (!user) return;

  if (user.displayName) {
    elements.userNameElement.textContent = user.displayName;
  } else if (user.email) {
    elements.userNameElement.textContent = user.email.split('@')[0];
  } else {
    elements.userNameElement.textContent = 'Usuário';
  }
}

function saveUserInfo(user) {
  if (!user || !user.uid) return;

  const userRef = db.ref(`users/${user.uid}`);
  const userData = {
    name: user.displayName || user.email.split('@')[0],
    email: user.email,
    lastLogin: new Date().toISOString()
  };

  userRef.update(userData).catch(error => {
    console.error("Erro ao salvar informações do usuário:", error);
  });
}

function loadProject() {
  if (!projectRef) return;

  projectRef.on('value', (snapshot) => {
    const projectData = snapshot.val();
    if (!projectData) {
      alert('Projeto não encontrado no banco de dados!');
      window.location.href = 'index.html';
      return;
    }

    elements.projectNameInput.value = projectData.name || 'Projeto sem nome';
    files = projectData.files || {};

    const fileKeys = Object.keys(files);
    const indexHtmlKey = fileKeys.find(key => {
      const file = files[key];
      return file.originalName === 'index.html' || file.name === 'index.html';
    });
    const firstFileKey = indexHtmlKey || (fileKeys.length > 0 ? fileKeys[0] : null);

    if (firstFileKey) {
      openFile(firstFileKey);
    } else {
      createDefaultIndexHtml();
    }

    updateTabs();
    showAppContent();
  }, (error) => {
    console.error("Erro ao carregar projeto:", error);
    alert("Erro ao carregar o projeto. Por favor, recarregue a página.");
  });
}

function loadUploadedFiles() {
  const uploadedFilesRef = db.ref('projectFiles');
  uploadedFilesRef.orderByChild('projectId').equalTo(currentProjectId).on('value', (snapshot) => {
    uploadedFiles = snapshot.val() || {};
  });
}

function createDefaultIndexHtml() {
  const fileName = 'index.html';
  const sanitizedFileName = sanitizeFilename(fileName);
  const fileKey = encodeKey(sanitizedFileName);

  files[fileKey] = { 
    name: sanitizedFileName, 
    originalName: fileName,
    content: `<!DOCTYPE html>
<html>
<head>
  <title>Novo Projeto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <h1>Novo Projeto</h1>
  <p>Comece a editar seu código aqui!</p>
</body>
</html>`, 
    language: 'html',
    createdAt: new Date().toISOString()
  };

  updateFirebaseFiles();
  openFile(fileKey);
}

function createNewFile() {
  const fileName = elements.newFileNameInput.value.trim();
  if (!fileName) {
    alert('Por favor, insira um nome de arquivo válido.');
    return;
  }

  const sanitizedFileName = sanitizeFilename(fileName);
  const fileKey = encodeKey(sanitizedFileName);

  const existingFile = Object.values(files).find(f => 
    f.name === fileName || f.originalName === fileName
  );

  if (existingFile) {
    alert('Um arquivo com este nome já existe.');
    return;
  }

  const uploadedFile = findUploadedFileByName(fileName);

  if (uploadedFile) {
    files[fileKey] = { 
      name: sanitizedFileName, 
      originalName: fileName,
      url: uploadedFile.url,
      isUploadedFile: true,
      createdAt: new Date().toISOString()
    };
  } else {
    let content = '';
    const extension = fileName.split('.').pop().toLowerCase();
    const language = extension;

    switch(extension) {
      case 'html':
        content = `<!DOCTYPE html>
<html>
<head>
  <title>${fileName}</title>
  <style>
  </style>
</head>
<body>
</body>
</html>`;
        break;
      case 'css':
        content = `/* ${fileName} */`;
        break;
      case 'js':
        content = `// ${fileName}`;
        break;
      default:
        content = `// ${fileName}`;
    }

    files[fileKey] = { 
      name: sanitizedFileName, 
      originalName: fileName,
      content: content, 
      language: language,
      createdAt: new Date().toISOString()
    };
  }

  updateFirebaseFiles();
  openFile(fileKey);
  elements.newFileNameInput.value = '';
}

function findUploadedFileByName(fileName) {
  for (const key in uploadedFiles) {
    if (uploadedFiles[key].originalName === fileName) {
      return uploadedFiles[key];
    }
  }
  return null;
}

function openFile(fileKey) {
  if (!files[fileKey] || !editor) return;

  currentFile = fileKey;
  const fileData = files[fileKey];

  if (fileData.url) {
    showUploadedFile(fileData);
    return;
  }

  elements.fileContainer.style.display = 'none';
  editor.getDomNode().style.display = 'block';

  let language;
  switch(fileData.language) {
    case 'html': language = 'html'; break;
    case 'css': language = 'css'; break;
    case 'js': language = 'javascript'; break;
    default: language = 'plaintext';
  }

  let model = models[fileKey];
  if (!model) {
    model = monaco.editor.createModel(
      loadFileWithChunks(fileData),
      language,
      monaco.Uri.parse(`file:///${fileData.originalName || fileData.name}`)
    );
    models[fileKey] = model;
  }

  editor.setModel(model);
  monaco.editor.setModelLanguage(model, language);
  updateTabs();
  elements.saveFileBtn.disabled = true;
}

function showUploadedFile(fileData) {
  editor.getDomNode().style.display = 'none';
  elements.fileContainer.style.display = 'block';
  elements.fileIframe.src = fileData.url;

  updateTabs();
  elements.saveFileBtn.disabled = true;
}

function updateTabs() {
  elements.tabsContainer.innerHTML = '';
  Object.keys(files).forEach(fileKey => {
    const fileData = files[fileKey];
    const tab = document.createElement('button');
    tab.className = `tab-btn ${fileKey === currentFile ? 'active' : ''}`;
    tab.onclick = () => openFile(fileKey);

    const label = document.createElement('span');
    label.textContent = fileData.originalName || fileData.name;

    if (fileData.chunks && fileData.chunks.length > 1) {
      const sizeIndicator = document.createElement('span');
      sizeIndicator.textContent = ' 📦';
      sizeIndicator.title = 'Arquivo grande (dividido)';
      label.appendChild(sizeIndicator);
    }

    tab.appendChild(label);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-tab-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeFile(fileKey);
    };
    tab.appendChild(closeBtn);

    elements.tabsContainer.appendChild(tab);
  });
}

function closeFile(fileKey) {
  if (Object.keys(files).length <= 1) {
    alert('Você não pode fechar o último arquivo do projeto.');
    return;
  }

  const model = models[fileKey];
  if (model) {
    model.dispose();
    delete models[fileKey];
  }

  delete files[fileKey];
  updateFirebaseFiles();

  if (fileKey === currentFile) {
    currentFile = null;
    openFile(Object.keys(files)[0]);
  }
  updateTabs();
}

function saveCurrentFile() {
  if (!currentFile || !editor) return;

  const model = editor.getModel();
  if (model) {
    const content = model.getValue();
    saveFileWithChunks(currentFile, content);

    projectRef.update({
      files: files,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      elements.saveFileBtn.disabled = true;
      elements.saveFileBtn.textContent = 'Salvo!';
      setTimeout(() => { 
        elements.saveFileBtn.textContent = '💾 Salvar';
      }, 1500);
    })
    .catch(error => {
      console.error('Erro ao salvar arquivo:', error);
      alert('Falha ao salvar o arquivo. Por favor, tente novamente.');
    });
  }
}

function updateFirebaseFiles(callback) {
  if (!projectRef) return;

  projectRef.update({
    files: files,
    updatedAt: new Date().toISOString()
  })
    .then(() => {
      if (callback) callback();
    })
    .catch(error => {
      console.error('Erro ao salvar arquivos:', error);
      alert('Falha ao salvar os arquivos. Por favor, tente novamente.');
    });
}

function updateProjectName() {
  const newName = elements.projectNameInput.value.trim();
  if (!newName) {
    alert('O nome do projeto não pode ser vazio.');
    projectRef.child('name').once('value', snapshot => {
      elements.projectNameInput.value = snapshot.val() || '';
    });
    return;
  }

  projectRef.update({
    name: newName,
    updatedAt: new Date().toISOString()
  });
}

function setupCodeListener() {
  if (!sessionRef) return;

  sessionRef.child('codes').on('child_added', (snapshot) => {
    const codeData = snapshot.val();
    if (codeData && codeData.code) {
      showCodeNotification(codeData);
    }
  });
}

function showCodeNotification(codeData) {
  currentCode = codeData;
  elements.codePreview.textContent = codeData.code;

  elements.targetFileSelect.innerHTML = '';
  Object.keys(files).forEach(fileKey => {
    const fileData = files[fileKey];
    if (!fileData.url) {
      const option = document.createElement('option');
      option.value = fileKey;
      option.textContent = fileData.originalName || fileData.name;
      elements.targetFileSelect.appendChild(option);
    }
  });

  elements.codeNotification.style.display = 'block';
}

function insertCode() {
  if (!currentCode) return;

  const selectedFileKey = elements.targetFileSelect.value;
  if (!selectedFileKey || !files[selectedFileKey]) return;

  if (files[selectedFileKey].url) {
    alert('Não é possível inserir código em arquivos de mídia.');
    return;
  }

  const currentContent = loadFileWithChunks(files[selectedFileKey]);
  const newContent = currentContent + '\n' + currentCode.code;

  saveFileWithChunks(selectedFileKey, newContent);

  updateFirebaseFiles(() => {
    if (selectedFileKey === currentFile) {
      const model = editor.getModel();
      if (model) {
        model.setValue(newContent);
      }
    } else {
      openFile(selectedFileKey);
    }

    elements.codeNotification.style.display = 'none';
    currentCode = null;
  });
}

function showInsertModal() {
  elements.fileSelect.innerHTML = '<option value="">Selecione um arquivo</option>';

  for (const key in uploadedFiles) {
    const file = uploadedFiles[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = file.originalName;
    elements.fileSelect.appendChild(option);
  }

  elements.insertModal.style.display = 'flex';
}

function insertFileReference() {
  const selectedFileKey = elements.fileSelect.value;

  if (!selectedFileKey) {
    showInsertStatus('Por favor, selecione um arquivo.', 'error');
    return;
  }

  const file = uploadedFiles[selectedFileKey];
  if (!file) {
    showInsertStatus('Arquivo não encontrado.', 'error');
    return;
  }

  const codeToInsert = `<iframe src="${file.url}" frameborder="0" style="width:100%; height:400px;"></iframe>`;

  if (editor && currentFile && files[currentFile] && !files[currentFile].url) {
    const model = editor.getModel();
    if (model) {
      const position = editor.getPosition();

      const range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      );

      const id = { major: 1, minor: 1 };
      const op = { 
        identifier: id, 
        range: range, 
        text: codeToInsert, 
        forceMoveMarkers: true 
      };

      model.applyEdits([op]);

      showInsertStatus('Arquivo inserido com sucesso!', 'success');
      setTimeout(() => {
        elements.insertModal.style.display = 'none';
        elements.insertStatus.style.display = 'none';
      }, 1500);
    } else {
      showInsertStatus('Erro: Editor não está disponível.', 'error');
    }
  } else {
    showInsertStatus('Erro: Não é possível inserir arquivo neste tipo de arquivo.', 'error');
  }
}

function showInsertStatus(message, type) {
  elements.insertStatus.textContent = message;
  elements.insertStatus.className = 'status-' + type;
  elements.insertStatus.style.display = 'block';
}
