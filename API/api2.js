// CODEHUB API COM EXECUTOR DE HTML
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

// Carregar Firebase
function loadFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js';
    script.onload = () => {
      const scriptAuth = document.createElement('script');
      scriptAuth.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js';
      scriptAuth.onload = () => {
        const scriptDB = document.createElement('script');
        scriptDB.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
        scriptDB.onload = resolve;
        document.head.appendChild(scriptDB);
      };
      document.head.appendChild(scriptAuth);
    };
    document.head.appendChild(script);
  });
}

// VISUALIZADOR INTELIGENTE DE ARQUIVOS
class SmartFileViewer {
  constructor() {
    this.supportedFormats = {
      video: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
      audio: ['mp3', 'wav', 'ogg', 'm4a'],
      html: ['html', 'htm'],
      code: ['css', 'js', 'json', 'txt', 'md'],
      document: ['pdf', 'doc', 'docx']
    };
  }

  detectFileType(url) {
    if (!url) return 'unknown';
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(extension)) {
        return type;
      }
    }
    return 'unknown';
  }

  createViewer(url, filename = 'arquivo') {
    const type = this.detectFileType(url);
    const container = document.createElement('div');
    container.className = 'file-viewer';

    switch (type) {
      case 'video':
        container.innerHTML = this.createVideoPlayer(url, filename);
        break;
      case 'image':
        container.innerHTML = this.createImageViewer(url, filename);
        break;
      case 'audio':
        container.innerHTML = this.createAudioPlayer(url, filename);
        break;
      case 'html':
        this.fetchAndExecuteHTML(url, filename, container);
        break;
      case 'code':
        this.fetchCodeContent(url, filename, container);
        break;
      default:
        container.innerHTML = this.createDownloadLink(url, filename);
    }

    return container;
  }

  createVideoPlayer(url, filename) {
    return `
      <div class="video-container">
        <h3>🎥 ${this.escapeHTML(filename)}</h3>
        <video controls width="100%" style="max-width: 600px; border-radius: 8px;">
          <source src="${url}" type="video/mp4">
          Seu navegador não suporta o elemento de vídeo.
        </video>
        <div class="file-actions">
          <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
        </div>
      </div>
    `;
  }

  createImageViewer(url, filename) {
    return `
      <div class="image-container">
        <h3>🖼️ ${this.escapeHTML(filename)}</h3>
        <img src="${url}" alt="${this.escapeHTML(filename)}" style="max-width: 100%; max-height: 400px; border-radius: 8px;">
        <div class="file-actions">
          <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
        </div>
      </div>
    `;
  }

  createAudioPlayer(url, filename) {
    return `
      <div class="audio-container">
        <h3>🎵 ${this.escapeHTML(filename)}</h3>
        <audio controls style="width: 100%;">
          <source src="${url}" type="audio/mp3">
          Seu navegador não suporta o elemento de áudio.
        </audio>
        <div class="file-actions">
          <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
        </div>
      </div>
    `;
  }

  async fetchAndExecuteHTML(url, filename, container) {
    try {
      const response = await fetch(url);
      const htmlContent = await response.text();
      
      container.innerHTML = this.createHTMLExecutor(htmlContent, filename, url);
      
      // EXECUTA o HTML em um iframe seguro
      const iframe = container.querySelector('#html-preview-frame');
      const blob = new Blob([htmlContent], { type: 'text/html' });
      iframe.src = URL.createObjectURL(blob);
      
    } catch (error) {
      container.innerHTML = this.createDownloadLink(url, filename);
    }
  }

  createHTMLExecutor(htmlContent, filename, url) {
    return `
      <div class="html-executor">
        <h3>🌐 ${this.escapeHTML(filename)}</h3>
        <div class="html-controls">
          <span class="file-type">HTML EXECUTÁVEL</span>
          <div>
            <button class="view-source-btn" onclick="this.parentElement.parentElement.nextElementSibling.style.display='block'">
              📄 Ver Código
            </button>
            <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
          </div>
        </div>
        
        <div class="html-preview">
          <h4>🔍 Visualização do HTML:</h4>
          <iframe 
            id="html-preview-frame"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style="width: 100%; height: 400px; border: 2px solid #ddd; border-radius: 8px;"
            title="Preview do HTML"
          ></iframe>
        </div>

        <div class="source-code" style="display: none; margin-top: 20px;">
          <h4>📝 Código Fonte:</h4>
          <pre class="code-content"><code>${this.escapeHTML(htmlContent)}</code></pre>
        </div>
      </div>
    `;
  }

  async fetchCodeContent(url, filename, container) {
    try {
      const response = await fetch(url);
      const content = await response.text();
      container.innerHTML = this.createCodeViewer(content, filename, url);
    } catch (error) {
      container.innerHTML = this.createDownloadLink(url, filename);
    }
  }

  createCodeViewer(content, filename, url) {
    const language = this.detectFileType(url);
    return `
      <div class="code-container">
        <h3>📄 ${this.escapeHTML(filename)}</h3>
        <div class="code-header">
          <span class="file-type">${language.toUpperCase()}</span>
          <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
        </div>
        <pre class="code-content"><code>${this.escapeHTML(content)}</code></pre>
      </div>
    `;
  }

  createDownloadLink(url, filename) {
    return `
      <div class="download-container">
        <h3>📎 ${this.escapeHTML(filename)}</h3>
        <p>Arquivo não suportado para visualização</p>
        <a href="${url}" download="${filename}" class="download-btn">📥 Download</a>
      </div>
    `;
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// API PRINCIPAL COM EXECUTOR HTML
class CodeHubAPI {
  constructor() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.database();
      this.selectedProjects = [];
      this.fileViewer = new SmartFileViewer();
    } catch (error) {
      console.error("Erro no Firebase:", error);
      this.showError(document.body, "Erro na conexão com o servidor");
    }
  }

  async renderProjects(container, userKey, userName) {
    try {
      container.innerHTML = `
        <div class="ch-loading">
          <div class="ch-spinner"></div>
          <p>Buscando projetos...</p>
        </div>
      `;

      const userId = userKey?.split('-')[0];
      const snapshot = await this.db.ref('projects').once('value');
      const allProjects = snapshot.val() || {};
      let projects = [];

      for (const projectUserId in allProjects) {
        if (projectUserId === userId || 
            Object.values(allProjects[projectUserId]).some(p => p.owner === userName)) {

          for (const projectId in allProjects[projectUserId]) {
            const project = allProjects[projectUserId][projectId];
            projects.push({
              id: projectId,
              userId: projectUserId,
              ...project
            });
          }
        }
      }

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="ch-error">
            <p>Nenhum projeto encontrado para:</p>
            <p>User: ${userName || 'não especificado'}</p>
            <p>ID: ${userId || 'não especificado'}</p>
          </div>
        `;
        return;
      }

      container.innerHTML = this.generateProjectSelectionHTML(projects);
      this.addSelectionListeners(container, projects);

    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
      container.innerHTML = `
        <div class="ch-error">
          <p>Erro ao carregar projetos:</p>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  generateProjectSelectionHTML(projects) {
    let html = `
      <div class="ch-projects-selection">
        <h2>📁 Selecione os projetos que deseja visualizar</h2>
        <div class="projects-list">
    `;

    projects.forEach((project, index) => {
      const fileCount = project.files ? Object.keys(project.files).length : 0;
      html += `
        <div class="project-item">
          <input type="checkbox" id="project-${index}" class="project-checkbox" 
                 data-project-id="${project.id}" data-user-id="${project.userId}">
          <label for="project-${index}">
            <strong>${this.escapeHTML(project.name)}</strong> 
            <small>(${fileCount} arquivo${fileCount !== 1 ? 's' : ''})</small>
            <br>
            <small>Criado em: ${new Date(project.createdAt).toLocaleString()}</small>
          </label>
        </div>
      `;
    });

    html += `
        </div>
        <button id="view-selected-projects" class="view-projects-btn">👁️ Visualizar Projetos Selecionados</button>
      </div>
    `;

    return html;
  }

  addSelectionListeners(container, projects) {
    const viewBtn = container.querySelector('#view-selected-projects');
    viewBtn.addEventListener('click', () => {
      const checkboxes = container.querySelectorAll('.project-checkbox:checked');
      this.selectedProjects = [];

      checkboxes.forEach(checkbox => {
        const projectId = checkbox.dataset.projectId;
        const userId = checkbox.dataset.userId;
        const project = projects.find(p => p.id === projectId && p.userId === userId);
        if (project) {
          this.selectedProjects.push(project);
        }
      });

      if (this.selectedProjects.length > 0) {
        container.innerHTML = this.generateProjectsHTML(this.selectedProjects);
        this.addFileViewListeners();
      } else {
        container.innerHTML = `
          <div class="ch-error">
            <p>❌ Nenhum projeto selecionado</p>
            <button id="back-to-selection" class="back-btn">⬅ Voltar para seleção</button>
          </div>
        `;
        container.querySelector('#back-to-selection').addEventListener('click', () => {
          this.renderProjects(container, null, null);
        });
      }
    });
  }

  generateProjectsHTML(projects) {
    let html = `
      <div class="ch-projects-container">
        <button id="back-to-selection" class="back-btn">⬅ Voltar para seleção</button>
        <h2>📂 Projetos Selecionados (${projects.length})</h2>
        <div class="ch-projects-list">
    `;

    projects.forEach(project => {
      html += `
        <div class="ch-project-card">
          <div class="project-header">
            <h3>${this.escapeHTML(project.name)}</h3>
            <span class="project-date">${new Date(project.createdAt).toLocaleString()}</span>
          </div>
      `;

      if (project.files && Object.keys(project.files).length > 0) {
        html += '<div class="ch-files">';
        
        for (const fileId in project.files) {
          const file = project.files[fileId];
          const fileName = file.name || file.originalName;
          
          if (file.directUrl) {
            const fileType = this.fileViewer.detectFileType(file.directUrl);
            const icon = this.getFileIcon(fileType);
            
            html += `
              <div class="file-item">
                <span class="file-name">${icon} ${this.escapeHTML(fileName)}</span>
                <button class="view-file" 
                  data-url="${file.directUrl}"
                  data-filename="${fileName}">
                  👁️ Visualizar
                </button>
              </div>
            `;
          } else if (file.content) {
            // Verificar se é HTML no conteúdo
            if (file.language === 'html' || fileName.toLowerCase().endsWith('.html')) {
              html += `
                <div class="file-item">
                  <span class="file-name">🌐 ${this.escapeHTML(fileName)}</span>
                  <button class="view-html" 
                    data-content="${this.escapeHTML(file.content)}"
                    data-filename="${fileName}">
                    🚀 Executar HTML
                  </button>
                </div>
              `;
            } else {
              html += `
                <div class="file-item">
                  <span class="file-name">📝 ${this.escapeHTML(fileName)}</span>
                  <button class="view-code" 
                    data-content="${this.escapeHTML(file.content)}"
                    data-lang="${file.language}">
                    📄 Ver Código
                  </button>
                </div>
              `;
            }
          } else if (file.url) {
            const fileType = this.fileViewer.detectFileType(file.url);
            const icon = this.getFileIcon(fileType);
            
            html += `
              <div class="file-item">
                <span class="file-name">${icon} ${this.escapeHTML(fileName)}</span>
                <button class="view-file" 
                  data-url="${file.url}"
                  data-filename="${fileName}">
                  👁️ Visualizar
                </button>
              </div>
            `;
          }
        }
        html += '</div>';
      } else {
        html += '<p class="no-files">📭 Nenhum arquivo encontrado neste projeto</p>';
      }

      html += `</div>`;
    });

    html += `</div></div>`;

    return html;
  }

  getFileIcon(fileType) {
    const icons = {
      video: '🎥',
      image: '🖼️',
      audio: '🎵',
      html: '🌐',
      code: '📄',
      document: '📎',
      unknown: '📎'
    };
    return icons[fileType] || '📎';
  }

  addFileViewListeners() {
    // Arquivos com URL
    document.querySelectorAll('.view-file').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showFileModal(btn.dataset.url, btn.dataset.filename);
      });
    });

    // HTML para executar
    document.querySelectorAll('.view-html').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showHTMLModal(btn.dataset.content, btn.dataset.filename);
      });
    });

    // Código normal
    document.querySelectorAll('.view-code').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showCodeModal(
          btn.dataset.content,
          btn.dataset.lang,
          btn.previousElementSibling.textContent.replace('📝 ', '')
        );
      });
    });

    // Voltar
    document.querySelector('#back-to-selection').addEventListener('click', () => {
      window.location.reload();
    });
  }

  showFileModal(url, filename) {
    const modal = this.createModal();
    const viewerContainer = modal.querySelector('#file-viewer-container');
    const viewer = this.fileViewer.createViewer(url, filename);
    viewerContainer.appendChild(viewer);
    document.body.appendChild(modal);
  }

  showHTMLModal(content, filename) {
    const modal = this.createModal();
    const viewerContainer = modal.querySelector('#file-viewer-container');
    
    const htmlExecutor = document.createElement('div');
    htmlExecutor.innerHTML = this.createHTMLExecutor(content, filename);
    viewerContainer.appendChild(htmlExecutor);

    // Executar o HTML no iframe
    const iframe = htmlExecutor.querySelector('#html-preview-frame');
    const blob = new Blob([content], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);

    document.body.appendChild(modal);
  }

  createHTMLExecutor(htmlContent, filename) {
    return `
      <div class="html-executor">
        <h3>🌐 ${this.escapeHTML(filename)}</h3>
        <div class="html-controls">
          <span class="file-type">HTML EXECUTÁVEL</span>
          <div>
            <button class="view-source-btn" onclick="this.parentElement.parentElement.nextElementSibling.style.display='block'; this.style.display='none'">
              📄 Ver Código
            </button>
            <button class="download-html" onclick="this.downloadHTML('${this.escapeHTML(htmlContent)}', '${filename}')">
              📥 Download
            </button>
          </div>
        </div>
        
        <div class="html-preview">
          <h4>🔍 Visualização do HTML (Executando):</h4>
          <iframe 
            id="html-preview-frame"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style="width: 100%; height: 500px; border: 2px solid #ddd; border-radius: 8px; background: white;"
            title="Preview do HTML"
          ></iframe>
        </div>

        <div class="source-code" style="display: none; margin-top: 20px;">
          <h4>📝 Código Fonte:</h4>
          <pre class="code-content"><code>${this.escapeHTML(htmlContent)}</code></pre>
        </div>
      </div>
    `;
  }

  showCodeModal(content, language, filename) {
    const modal = this.createModal();
    modal.querySelector('.modal-content').innerHTML = `
      <span class="close-modal">&times;</span>
      <h3>${this.escapeHTML(filename)}</h3>
      <p>Linguagem: <strong>${language}</strong></p>
      <pre><code>${content}</code></pre>
    `;
    document.body.appendChild(modal);
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'file-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <div id="file-viewer-container"></div>
      </div>
    `;

    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    return modal;
  }

  // Função global para download de HTML
  downloadHTML(content, filename) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  showError(container, message) {
    container.innerHTML = `
      <div class="ch-error">
        <p>${message}</p>
      </div>
    `;
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}

// INICIALIZAÇÃO
async function initializeApp() {
  const container = document.createElement('div');
  container.id = 'codehub-container';
  document.body.appendChild(container);

  // Adiciona estilos
  const style = document.createElement('style');
  style.textContent = `
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    #codehub-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .ch-loading, .ch-error {
      text-align: center;
      padding: 60px 20px;
    }
    .ch-spinner {
      border: 4px solid rgba(0,0,0,0.1);
      border-radius: 50%;
      border-top: 4px solid #3498db;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .ch-project-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .project-header h3 {
      margin: 0;
      color: #2c3e50;
    }
    .project-date {
      color: #6c757d;
      font-size: 0.9em;
    }
    .ch-files {
      margin-top: 15px;
    }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .file-name {
      font-weight: 500;
      color: #495057;
    }
    .view-file, .view-html, .view-code {
      background: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
    }
    .view-html {
      background: #28a745;
    }
    .view-html:hover {
      background: #218838;
    }
    .view-file:hover, .view-code:hover {
      background: #3367d6;
    }
    .file-modal, .code-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      width: 95%;
      max-width: 1000px;
      max-height: 95vh;
      overflow: auto;
      position: relative;
    }
    .close-modal {
      position: absolute;
      top: 15px;
      right: 20px;
      font-size: 28px;
      cursor: pointer;
      color: #6c757d;
      z-index: 1001;
    }
    .close-modal:hover {
      color: #495057;
    }
    .html-executor {
      margin: 20px 0;
    }
    .html-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .file-type {
      background: #e9ecef;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: bold;
    }
    .view-source-btn, .download-html, .download-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      font-size: 0.9em;
      margin-left: 8px;
    }
    .download-btn, .download-html {
      background: #28a745;
    }
    .download-btn:hover, .download-html:hover {
      background: #218838;
    }
    .html-preview {
      margin: 20px 0;
    }
    pre {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #e9ecef;
    }
    .no-files {
      color: #6c757d;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }
    .project-item {
      margin: 12px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .project-checkbox {
      margin-right: 12px;
      transform: scale(1.2);
    }
    .view-projects-btn, .back-btn {
      background: #4285f4;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 20px;
      font-size: 16px;
      font-weight: 600;
    }
    .back-btn {
      background: #6c757d;
    }
  `;
  document.head.appendChild(style);

  // Parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  const userKey = params.get('userKey');
  const userName = params.get('userName');

  if (!userKey && !userName) {
    container.innerHTML = `
      <div class="ch-error">
        <h2>🔍 Parâmetros ausentes</h2>
        <p>A URL deve conter userKey ou userName</p>
        <p><strong>Exemplo:</strong> ?userKey=SEU_KEY&userName=SEU_NOME</p>
      </div>
    `;
    return;
  }

  try {
    await loadFirebase();
    const api = new CodeHubAPI();
    
    // Adiciona função global para download
    window.downloadHTML = api.downloadHTML.bind(api);
    
    api.renderProjects(container, userKey, userName);
  } catch (error) {
    container.innerHTML = `
      <div class="ch-error">
        <h2>❌ Erro na inicialização</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Iniciar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);