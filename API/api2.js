// codehub-api-final.js

// 1. Configuração do Firebase (substitua com seus dados)
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

// 2. Verifica e carrega o Firebase se necessário
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

// 3. API Principal
class CodeHubAPI {
  constructor() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.database();
    } catch (error) {
      console.error("Erro no Firebase:", error);
      this.showError(document.body, "Erro na conexão com o servidor");
    }
  }

  async renderProjects(container, userKey, userName) {
    try {
      // Mostra estado de carregamento
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
            projects.push({
              id: projectId,
              ...allProjects[projectUserId][projectId]
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

      // Renderiza os projetos encontrados
      container.innerHTML = this.generateProjectsHTML(projects);
      this.addCodeViewListeners();

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

  generateProjectsHTML(projects) {
    let html = `
      <div class="ch-projects-container">
        <h2>Projetos Encontrados</h2>
        <div class="ch-projects-list">
    `;

    projects.forEach(project => {
      html += `
        <div class="ch-project-card">
          <h3>${this.escapeHTML(project.name)}</h3>
          <p>Criado em: ${new Date(project.createdAt).toLocaleString()}</p>
      `;

      if (project.files) {
        html += '<ul class="ch-files">';
        for (const fileId in project.files) {
          const file = project.files[fileId];
          html += `
            <li>
              <span>${this.escapeHTML(file.originalName)}</span>
              <button class="view-code" 
                data-content="${this.escapeHTML(file.content)}"
                data-lang="${file.language}">
                Ver Código
              </button>
            </li>
          `;
        }
        html += '</ul>';
      }

      html += `</div>`;
    });

    html += `</div></div>`;
    return html;
  }

  addCodeViewListeners() {
    document.querySelectorAll('.view-code').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showCodeModal(
          btn.dataset.content,
          btn.dataset.lang,
          btn.textContent.trim()
        );
      });
    });
  }

  showCodeModal(content, language, filename) {
    const modal = document.createElement('div');
    modal.className = 'code-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>${filename}</h3>
        <p>Linguagem: ${language}</p>
        <pre><code>${content}</code></pre>
      </div>
    `;
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
  }

  showError(container, message) {
    container.innerHTML = `
      <div class="ch-error">
        <p>${message}</p>
      </div>
    `;
  }

  escapeHTML(str) {
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// 4. Inicialização da Aplicação
async function initializeApp() {
  // Cria container principal
  const container = document.createElement('div');
  container.id = 'codehub-container';
  document.body.appendChild(container);

  // Adiciona estilos
  const style = document.createElement('style');
  style.textContent = `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    #codehub-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .ch-loading, .ch-error {
      text-align: center;
      padding: 40px;
    }
    .ch-spinner {
      border: 4px solid rgba(0,0,0,0.1);
      border-radius: 50%;
      border-top: 4px solid #3498db;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .ch-project-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .view-code {
      background: #4285f4;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      margin-left: 10px;
    }
    .code-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      padding: 20px;
      border-radius: 5px;
      width: 80%;
      max-width: 800px;
      max-height: 80vh;
      overflow: auto;
      position: relative;
    }
    .close-modal {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 24px;
      cursor: pointer;
    }
    pre {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
  `;
  document.head.appendChild(style);

  // Pega parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  const userKey = params.get('userKey');
  const userName = params.get('userName');

  // Verifica parâmetros
  if (!userKey && !userName) {
    container.innerHTML = `
      <div class="ch-error">
        <h2>Parâmetros ausentes</h2>
        <p>A URL deve conter userKey ou userName</p>
        <p>Exemplo: ?userKey=SEU_KEY&userName=SEU_NOME</p>
      </div>
    `;
    return;
  }

  // Carrega Firebase e inicia API
  try {
    await loadFirebase();
    const api = new CodeHubAPI();
    api.renderProjects(container, userKey, userName);
  } catch (error) {
    container.innerHTML = `
      <div class="ch-error">
        <h2>Erro na inicialização</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);