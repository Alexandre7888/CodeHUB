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

// Elementos da UI
const elements = {
  newFileNameInput: document.getElementById('newFileName'),
  newFileForm: document.getElementById('newFileForm'),
  saveFileBtn: document.getElementById('saveFileBtn'),
  previewBtn: document.getElementById('previewBtn'),
  aiBtn: document.getElementById('aiBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  insertFileBtn: document.getElementById('insertFileBtn'),
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

// Função para mostrar o conteúdo principal
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

// SISTEMA DE DIVISÃO AUTOMÁTICA DE CÓDIGO GRANDE
function splitLargeContent(content, maxChunkSize = 60000) {
    if (content.length <= maxChunkSize) {
        return null; // Não precisa dividir
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

// Função para salvar arquivo com divisão automática
function saveFileWithChunks(fileKey, content) {
    const chunks = splitLargeContent(content);
    
    if (!chunks) {
        // Arquivo pequeno, salvar normalmente
        files[fileKey].content = content;
        files[fileKey].chunks = null;
        files[fileKey].isLargeFile = false;
    } else {
        // Arquivo grande, salvar em chunks
        files[fileKey].chunks = chunks;
        files[fileKey].content = null; // Limpar conteúdo direto para economizar espaço
        files[fileKey].isLargeFile = true;
        files[fileKey].chunkCount = chunks.length;
    }
    files[fileKey].updatedAt = new Date().toISOString();
}

// Função para carregar arquivo com chunks
function loadFileWithChunks(fileData) {
    if (fileData.chunks && Array.isArray(fileData.chunks)) {
        // Juntar chunks automaticamente
        return joinChunks(fileData.chunks);
    }
    return fileData.content || '';
}

// Verificar se arquivo é muito grande
function isFileTooLarge(content) {
    return content.length > 60000;
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

// Inicialização do editor
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
      
      // Verificar se o arquivo está ficando muito grande
      const content = editor.getModel().getValue();
      if (isFileTooLarge(content)) {
        showLargeFileWarning();
      }
    }
  });

  // Iniciar animação do loader
  startLoaderAnimation();

  // Inicializar aplicação
  initializeApp();
});

// Mostrar aviso de arquivo grande
function showLargeFileWarning() {
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #ff9800;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
    max-width: 300px;
  `;
  warning.innerHTML = `
    <strong>Arquivo Grande Detectado</strong>
    <p>O arquivo será automaticamente dividido para salvar no Firebase.</p>
  `;
  document.body.appendChild(warning);
  
  setTimeout(() => {
    warning.remove();
  }, 5000);
}

// Função principal de inicialização
function initializeApp() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = user;
    updateUserInfo(user);
    saveUserInfo(user);

    // Obter ID do projeto da URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('projectId');

    if (!currentProjectId) {
      alert('ID do projeto não encontrado na URL!');
      window.location.href = 'index.html';
      return;
    }

    // Configurar referências do Firebase
    projectRef = db.ref(`projects/${user.uid}/${currentProjectId}`);
    sessionRef = db.ref(`sessions/${currentProjectId}`);

    // Configurar listeners
    setupCodeListener();
    loadProject();
    loadUploadedFiles();
    setupEventListeners();
  });
}

// Configurar listeners de eventos
function setupEventListeners() {
  elements.newFileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    createNewFile();
  });

  elements.saveFileBtn.addEventListener('click', saveCurrentFile);

  elements.previewBtn.addEventListener('click', function() {
    if (!currentProjectId) {
      alert('Projeto não carregado corretamente!');
      return;
    }
    window.open(`view.html?projectId=${currentProjectId}`, '_blank');
  });

  elements.projectNameInput.addEventListener('blur', updateProjectName);

  // IA Assistente
  elements.aiBtn.addEventListener('click', function() {
    if (!currentProjectId) {
      alert('Projeto não carregado corretamente!');
      return;
    }
    const aiUrl = `https://pergunte-ia--socialkoala6579904.on.websim.com/?projectId=${currentProjectId}`;
    elements.aiIframe.src = aiUrl;
    elements.aiIframeContainer.style.display = 'flex';
  });

  elements.closeAiBtn.addEventListener('click', function() {
    elements.aiIframeContainer.style.display = 'none';
    elements.aiIframe.src = 'about:blank';
  });

  // Upload de arquivos
  elements.uploadBtn.addEventListener('click', function() {
    if (!currentProjectId) {
      alert('Projeto não carregado corretamente!');
      return;
    }
    const uploadUrl = `https://nuvem-de-arquivos-drive--narrownarwhal3891229.on.websim.com/?projectId=${currentProjectId}`;
    elements.uploadIframe.src = uploadUrl;
    elements.uploadIframeContainer.style.display = 'flex';
  });

  elements.closeUploadBtn.addEventListener('click', function() {
    elements.uploadIframeContainer.style.display = 'none';
    elements.uploadIframe.src = 'about:blank';
    // Recarregar arquivos após fechar o upload
    loadProject();
    loadUploadedFiles();
  });

  // Inserir arquivo
  elements.insertFileBtn.addEventListener('click', function() {
    showInsertModal();
  });

  elements.cancelInsertBtn.addEventListener('click', function() {
    elements.insertModal.style.display = 'none';
  });

  elements.confirmInsertBtn.addEventListener('click', insertFileReference);

  // Notificação de código
  elements.insertCodeBtn.addEventListener('click', insertCode);
  elements.discardCodeBtn.addEventListener('click', function() {
    elements.codeNotification.style.display = 'none';
    currentCode = null;
  });
}

// Atualizar informações do usuário na UI
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

// Salvar informações do usuário no Firebase
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

// Carregar projeto do Firebase
function loadProject() {
  if (!projectRef) {
    console.error('Referência do projeto não definida');
    return;
  }

  projectRef.on('value', (snapshot) => {
    const projectData = snapshot.val();
    if (!projectData) {
      alert('Projeto não encontrado no banco de dados!');
      window.location.href = 'index.html';
      return;
    }

    // Atualizar nome do projeto
    elements.projectNameInput.value = projectData.name || 'Projeto sem nome';
    files = projectData.files || {};

    // Processar arquivos com chunks
    processFilesWithChunks();

    // Encontrar arquivo index.html ou o primeiro arquivo disponível
    const fileKeys = Object.keys(files);
    const indexHtmlKey = fileKeys.find(key => {
      const file = files[key];
      return file.originalName === 'index.html' || file.name === 'index.html';
    });
    const firstFileKey = indexHtmlKey || (fileKeys.length > 0 ? fileKeys[0] : null);

    if (firstFileKey) {
      openFile(firstFileKey);
    } else {
      // Criar um arquivo index.html padrão se não houver arquivos
      createDefaultIndexHtml();
    }

    updateTabs();

    // Mostrar conteúdo principal após carregar tudo
    showAppContent();
  }, (error) => {
    console.error("Erro ao carregar projeto:", error);
    alert("Erro ao carregar o projeto. Por favor, recarregue a página.");
  });
}

// Processar arquivos que estão divididos em chunks
function processFilesWithChunks() {
  for (const fileKey in files) {
    const file = files[fileKey];
    if (file.chunks && Array.isArray(file.chunks)) {
      console.log(`Arquivo ${file.originalName} carregado com ${file.chunks.length} chunks`);
    }
  }
}

// Carregar arquivos enviados pelo WebSim
function loadUploadedFiles() {
  const uploadedFilesRef = db.ref('projectFiles');
  uploadedFilesRef.orderByChild('projectId').equalTo(currentProjectId).on('value', (snapshot) => {
    uploadedFiles = snapshot.val() || {};
    console.log('Arquivos carregados:', uploadedFiles);
  });
}

// Criar arquivo index.html padrão
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

// Criar novo arquivo
function createNewFile() {
  const fileName = elements.newFileNameInput.value.trim();
  if (!fileName) {
    alert('Por favor, insira um nome de arquivo válido.');
    return;
  }

  const sanitizedFileName = sanitizeFilename(fileName);
  const fileKey = encodeKey(sanitizedFileName);

  // Verificar se arquivo já existe
  const existingFile = Object.values(files).find(f => 
    f.name === fileName || f.originalName === fileName
  );

  if (existingFile) {
    alert('Um arquivo com este nome já existe.');
    return;
  }

  // Verificar se é um arquivo enviado pelo WebSim
  const uploadedFile = findUploadedFileByName(fileName);

  if (uploadedFile) {
    // Se for um arquivo enviado, criar um arquivo com a URL
    files[fileKey] = { 
      name: sanitizedFileName, 
      originalName: fileName,
      url: uploadedFile.url,
      isUploadedFile: true,
      createdAt: new Date().toISOString()
    };
  } else {
    // Determinar conteúdo padrão baseado na extensão
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

    // Criar novo arquivo
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

// Encontrar arquivo enviado pelo nome
function findUploadedFileByName(fileName) {
  for (const key in uploadedFiles) {
    if (uploadedFiles[key].originalName === fileName) {
      return uploadedFiles[key];
    }
  }
  return null;
}

// Abrir arquivo no editor
function openFile(fileKey) {
  if (!files[fileKey] || !editor) {
    console.error('Arquivo ou editor não disponível');
    return;
  }

  currentFile = fileKey;
  const fileData = files[fileKey];

  // Se for um arquivo enviado (com URL), mostrar na visualização de arquivo
  if (fileData.url) {
    showUploadedFile(fileData);
    return;
  }

  // Caso contrário, é um arquivo de texto - abrir no editor
  elements.fileContainer.style.display = 'none';
  editor.getDomNode().style.display = 'block';

  // Carregar conteúdo (juntando chunks automaticamente se necessário)
  const content = loadFileWithChunks(fileData);

  // Determinar linguagem
  let language;
  switch(fileData.language) {
    case 'html': language = 'html'; break;
    case 'css': language = 'css'; break;
    case 'js': language = 'javascript'; break;
    default: language = 'plaintext';
  }

  // Criar ou reutilizar modelo
  let model = models[fileKey];
  if (!model) {
    model = monaco.editor.createModel(
      content,
      language,
      monaco.Uri.parse(`file:///${fileData.originalName || fileData.name}`)
    );
    models[fileKey] = model;
  } else {
    model.setValue(content);
  }

  // Definir modelo no editor
  editor.setModel(model);
  monaco.editor.setModelLanguage(model, language);
  updateTabs();
  elements.saveFileBtn.disabled = true;

  // Mostrar info se arquivo foi dividido
  if (fileData.chunks && fileData.chunks.length > 1) {
    console.log(`Arquivo carregado de ${fileData.chunks.length} partes`);
  }
}

// Mostrar arquivo enviado em um iframe
function showUploadedFile(fileData) {
  editor.getDomNode().style.display = 'none';
  elements.fileContainer.style.display = 'block';
  elements.fileIframe.src = fileData.url;

  updateTabs();
  elements.saveFileBtn.disabled = true;
}

// Atualizar abas de arquivos
function updateTabs() {
  elements.tabsContainer.innerHTML = '';
  Object.keys(files).forEach(fileKey => {
    const fileData = files[fileKey];
    const tab = document.createElement('button');
    tab.className = `tab-btn ${fileKey === currentFile ? 'active' : ''}`;
    tab.onclick = () => openFile(fileKey);

    const label = document.createElement('span');
    label.textContent = fileData.originalName || fileData.name;
    
    // Adicionar indicador se arquivo é grande
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

// Fechar arquivo
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

// Salvar arquivo atual COM SUPORTE A CHUNKS
function saveCurrentFile() {
  if (!currentFile || !editor) return;

  const model = editor.getModel();
  if (model) {
    const content = model.getValue();
    
    // Usar sistema de chunks automático
    saveFileWithChunks(currentFile, content);

    // Atualizar Firebase
    projectRef.update({
      files: files,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      elements.saveFileBtn.disabled = true;
      
      // Mostrar mensagem diferente se arquivo foi dividido
      if (files[currentFile].chunks && files[currentFile].chunks.length > 1) {
        elements.saveFileBtn.textContent = `Salvo! (${files[currentFile].chunks.length} partes)`;
      } else {
        elements.saveFileBtn.textContent = 'Salvo!';
      }
      
      setTimeout(() => { 
        elements.saveFileBtn.textContent = '💾 Salvar';
      }, 2000);
    })
    .catch(error => {
      console.error('Erro ao salvar arquivo:', error);
      alert('Falha ao salvar o arquivo. Por favor, tente novamente.');
    });
  }
}

// Atualizar arquivos no Firebase
function updateFirebaseFiles(callback) {
  if (!projectRef) {
    console.error('Referência do projeto não definida');
    return;
  }

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

// Atualizar nome do projeto
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

// Monitorar códigos recebidos da IA
function setupCodeListener() {
  if (!sessionRef) {
    console.error('Referência de sessão não definida');
    return;
  }

  sessionRef.child('codes').on('child_added', (snapshot) => {
    const codeData = snapshot.val();
    if (codeData && codeData.code) {
      console.log('Novo código recebido:', codeData);
      showCodeNotification(codeData);
    }
  }, (error) => {
    console.error('Erro ao monitorar códigos:', error);
  });
}

// Mostrar notificação de novo código
function showCodeNotification(codeData) {
  currentCode = codeData;
  elements.codePreview.textContent = codeData.code;

  // Preencher seletor de arquivos
  elements.targetFileSelect.innerHTML = '';
  Object.keys(files).forEach(fileKey => {
    const fileData = files[fileKey];
    // Apenas arquivos de texto podem receber código
    if (!fileData.url) {
      const option = document.createElement('option');
      option.value = fileKey;
      let text = fileData.originalName || fileData.name;
      if (fileData.chunks && fileData.chunks.length > 1) {
        text += ' 📦';
      }
      option.textContent = text;
      elements.targetFileSelect.appendChild(option);
    }
  });

  elements.codeNotification.style.display = 'block';
}

// Inserir código no arquivo selecionado
function insertCode() {
  if (!currentCode) {
    console.error('Nenhum código para inserir');
    return;
  }

  const selectedFileKey = elements.targetFileSelect.value;
  if (!selectedFileKey || !files[selectedFileKey]) {
    console.error('Arquivo selecionado inválido');
    return;
  }

  // Adicionar código ao arquivo (apenas para arquivos de texto)
  if (files[selectedFileKey].url) {
    alert('Não é possível inserir código em arquivos de mídia.');
    return;
  }

  // Carregar conteúdo atual (juntando chunks se necessário)
  const currentContent = loadFileWithChunks(files[selectedFileKey]);
  const newContent = currentContent + '\n' + currentCode.code;

  // Salvar com sistema de chunks
  saveFileWithChunks(selectedFileKey, newContent);

  // Atualizar Firebase
  updateFirebaseFiles(() => {
    console.log('Código inserido com sucesso no arquivo:', selectedFileKey);

    // Atualizar editor se estiver aberto
    if (selectedFileKey === currentFile) {
      const model = editor.getModel();
      if (model) {
        model.setValue(newContent);
      }
    } else {
      openFile(selectedFileKey);
    }

    // Fechar notificação
    elements.codeNotification.style.display = 'none';
    currentCode = null;
  });
}

// Mostrar modal para inserir arquivo
function showInsertModal() {
  // Limpar seleções anteriores
  elements.fileSelect.innerHTML = '<option value="">Selecione um arquivo</option>';

  // Preencher com arquivos disponíveis
  for (const key in uploadedFiles) {
    const file = uploadedFiles[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = file.originalName;
    elements.fileSelect.appendChild(option);
  }

  elements.insertModal.style.display = 'flex';
}

// Inserir referência de arquivo no código (apenas iframe)
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

  // Gerar código iframe
  const codeToInsert = `<iframe src="${file.url}" frameborder="0" style="width:100%; height:400px;"></iframe>`;

  // Inserir no editor atual
  if (editor && currentFile && files[currentFile] && !files[currentFile].url) {
    const model = editor.getModel();
    if (model) {
      // Obter posição atual do cursor
      const position = editor.getPosition();

      // Inserir o código na posição atual
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

// Mostrar status da operação de inserção
function showInsertStatus(message, type) {
  elements.insertStatus.textContent = message;
  elements.insertStatus.className = 'status-' + type;
  elements.insertStatus.style.display = 'block';
}