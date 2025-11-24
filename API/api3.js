// CODEHUB EXTRACTOR DIRETO - Extrai códigos completos
// Como usar: <script src="https://code.codehub2025.ct.ws/API/codehub-extractor-codigos.js"></script>

(function() {
    const CONFIG = {
        firebaseConfig: {
            apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
            authDomain: "html-15e80.firebaseapp.com",
            databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
            projectId: "html-15e80"
        },
        containerId: 'codehub-extractor-container',
        autoInit: true
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
                const scriptDB = document.createElement('script');
                scriptDB.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
                scriptDB.onload = resolve;
                document.head.appendChild(scriptDB);
            };
            document.head.appendChild(script);
        });
    }

    // Classe principal do extrator de códigos
    class CodeHubExtractor {
        constructor() {
            this.projects = [];
            this.extractedCodes = [];
            this.container = null;
            this.init();
        }

        async init() {
            try {
                await loadFirebase();
                firebase.initializeApp(CONFIG.firebaseConfig);
                this.db = firebase.database();
                this.setupContainer();
                
                // Vai direto - pega da URL automaticamente
                const params = new URLSearchParams(window.location.search);
                const userKey = params.get('userKey');
                const userName = params.get('userName');
                
                if (userKey || userName) {
                    this.showLoading('🔍 Buscando seus códigos...');
                    await this.extractCodes(userKey, userName);
                } else {
                    this.showMessage('❌ Adicione ?userKey=SEU_TOKEN à URL');
                }
            } catch (error) {
                console.error('Extractor Error:', error);
                this.showError('❌ Erro ao conectar com o Firebase: ' + error.message);
            }
        }

        setupContainer() {
            this.container = document.getElementById(CONFIG.containerId);
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = CONFIG.containerId;
                this.container.style.cssText = `
                    font-family: 'Segoe UI', Arial, sans-serif;
                    max-width: 1200px;
                    margin: 20px auto;
                    padding: 20px;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                `;
                document.body.appendChild(this.container);
            }
        }

        // Método principal para extrair códigos
        async extractCodes(userKey, userName) {
            try {
                // Pega apenas a primeira parte do userKey (antes do primeiro hífen)
                const userId = userKey ? userKey.split('-')[0] : null;
                const snapshot = await this.db.ref('projects').once('value');
                const allProjects = snapshot.val() || {};
                this.projects = [];
                this.extractedCodes = [];

                console.log('Buscando projetos para:', { userId, userName, userKey });
                console.log('Total de projetos no Firebase:', Object.keys(allProjects).length);

                // Busca projetos do usuário
                for (const projectUserId in allProjects) {
                    const userMatches = projectUserId === userId || 
                                      (userName && Object.values(allProjects[projectUserId]).some(p => 
                                        p.owner && p.owner.toLowerCase().includes(userName.toLowerCase())));

                    if (userMatches) {
                        console.log('Projeto encontrado para usuário:', projectUserId);
                        
                        for (const projectId in allProjects[projectUserId]) {
                            const project = allProjects[projectUserId][projectId];
                            const projectData = {
                                id: projectId,
                                userId: projectUserId,
                                name: project.name,
                                createdAt: project.createdAt,
                                files: []
                            };

                            // Extrai códigos dos arquivos
                            if (project.files) {
                                console.log('Arquivos no projeto', project.name, ':', Object.keys(project.files).length);
                                
                                for (const fileId in project.files) {
                                    const file = project.files[fileId];
                                    const extracted = this.extractCodeFromFile(file, project.name);
                                    if (extracted) {
                                        projectData.files.push(extracted);
                                        this.extractedCodes.push(extracted);
                                    }
                                }
                            }

                            if (projectData.files.length > 0) {
                                this.projects.push(projectData);
                            }
                        }
                    }
                }

                console.log('Projetos encontrados:', this.projects.length);
                console.log('Códigos extraídos:', this.extractedCodes.length);

                if (this.extractedCodes.length === 0) {
                    this.showMessage('📭 Nenhum código encontrado. Verifique se:<br><br>• O userKey está correto<br>• Você tem projetos com arquivos de código<br>• Os arquivos têm conteúdo');
                } else {
                    this.renderResults();
                }

            } catch (error) {
                console.error('Erro detalhado:', error);
                this.showError('❌ Erro ao extrair códigos: ' + error.message);
            }
        }

        // Extrai código completo de um arquivo
        extractCodeFromFile(file, projectName) {
            const fileName = file.name || file.originalName;
            let content = '';
            let type = 'code';
            let language = file.language || 'unknown';

            console.log('Processando arquivo:', fileName);

            if (file.content) {
                content = file.content;
                
                // Detecta linguagem baseada na extensão do arquivo
                if (!language && fileName) {
                    if (fileName.endsWith('.html')) language = 'html';
                    else if (fileName.endsWith('.css')) language = 'css';
                    else if (fileName.endsWith('.js')) language = 'javascript';
                    else if (fileName.endsWith('.json')) language = 'json';
                }
                
                console.log('Código extraído:', fileName, '-', content.length, 'caracteres');
            }

            if (!content || content.trim().length === 0) {
                console.log('Arquivo sem conteúdo:', fileName);
                return null;
            }

            return {
                fileName: fileName || 'arquivo-sem-nome',
                projectName,
                content,
                type,
                language,
                stats: this.calculateStats(content)
            };
        }

        // Calcula estatísticas do código
        calculateStats(content) {
            const lines = content.split('\n').length;
            const characters = content.length;
            const words = content.split(/\s+/).filter(word => word.length > 0).length;
            
            return {
                lines,
                characters,
                words,
                fileSize: Math.round((content.length * 2) / 1024 * 100) / 100 // KB aproximado
            };
        }

        // Renderiza os resultados
        renderResults() {
            let html = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 25px;">
                    <h1 style="margin: 0 0 10px 0; font-size: 2em;">💻 Códigos Extraídos</h1>
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <span style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 15px;">
                            📁 ${this.projects.length} projeto${this.projects.length !== 1 ? 's' : ''}
                        </span>
                        <span style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 15px;">
                            📄 ${this.extractedCodes.length} arquivo${this.extractedCodes.length !== 1 ? 's' : ''}
                        </span>
                        <span style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 15px;">
                            📝 ${this.extractedCodes.reduce((sum, file) => sum + file.stats.lines, 0)} linhas
                        </span>
                    </div>
                </div>
            `;

            // Agrupa por projeto
            this.projects.forEach(project => {
                if (project.files.length > 0) {
                    html += `
                        <div style="background: #f8f9fa; border-radius: 10px; padding: 0; margin-bottom: 25px; border: 1px solid #e9ecef;">
                            <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                                <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                                    📁 ${this.escapeHTML(project.name)}
                                    <span style="background: #3498db; padding: 4px 12px; border-radius: 15px; font-size: 0.8em;">
                                        ${project.files.length} arquivo${project.files.length !== 1 ? 's' : ''}
                                    </span>
                                </h2>
                            </div>
                    `;

                    project.files.forEach(file => {
                        html += this.renderFileCode(file);
                    });

                    html += `</div>`;
                }
            });

            this.container.innerHTML = html;

            // Adiciona funcionalidade de copiar
            this.addCopyFunctionality();
        }

        // Renderiza o código de um arquivo
        renderFileCode(file) {
            const languageIcon = this.getLanguageIcon(file.language);
            const languageName = this.getLanguageName(file.language);
            
            return `
                <div style="padding: 25px; border-bottom: 1px solid #dee2e6;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1;">
                            <strong style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 1.1em;">
                                ${languageIcon} ${this.escapeHTML(file.fileName)}
                            </strong>
                            <div style="font-size: 0.9em; color: #6c757d; display: flex; gap: 10px; flex-wrap: wrap;">
                                <span style="background: #e9ecef; padding: 4px 10px; border-radius: 12px;">
                                    ${languageName}
                                </span>
                                <span>📊 ${file.stats.lines} linhas</span>
                                <span>📝 ${file.stats.characters} caracteres</span>
                                <span>💾 ${file.stats.fileSize} KB</span>
                            </div>
                        </div>
                        <button onclick="codeHubExtractor.copyCode('${this.escapeForAttribute(file.content)}')" 
                                style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 600; transition: all 0.2s; white-space: nowrap;">
                            📋 Copiar Código
                        </button>
                    </div>
                    
                    <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden;">
                        <div style="background: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                            Código ${languageName}
                        </div>
                        <pre style="margin: 0; max-height: 400px; overflow-y: auto; line-height: 1.4; font-family: 'Courier New', monospace; font-size: 0.9em; padding: 20px; background: #f8f9fa; color: #2c3e50; white-space: pre-wrap;">${this.escapeHTML(file.content)}</pre>
                    </div>
                </div>
            `;
        }

        // Ícone baseado na linguagem
        getLanguageIcon(language) {
            const icons = {
                'html': '🌐',
                'css': '🎨',
                'javascript': '📜',
                'js': '📜',
                'json': '📋',
                'default': '📄'
            };
            return icons[language] || icons.default;
        }

        // Nome da linguagem formatado
        getLanguageName(language) {
            const names = {
                'html': 'HTML',
                'css': 'CSS',
                'javascript': 'JavaScript',
                'js': 'JavaScript',
                'json': 'JSON',
                'default': 'Código'
            };
            return names[language] || names.default;
        }

        addCopyFunctionality() {
            // Já está implementado nos botões via onclick
        }

        // Método para copiar código para clipboard
        copyCode(code) {
            // Decodifica o conteúdo (que foi escapado para o atributo)
            const decodedCode = this.unescapeFromAttribute(code);
            
            navigator.clipboard.writeText(decodedCode).then(() => {
                this.showToast('✅ Código copiado para a área de transferência!');
            }).catch(err => {
                // Fallback para navegadores antigos
                const textArea = document.createElement('textarea');
                textArea.value = decodedCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('✅ Código copiado!');
            });
        }

        showLoading(message) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${message}</h3>
                    <p style="color: #6c757d; margin: 0;">Aguarde enquanto buscamos seus códigos...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }

        showError(message) {
            this.container.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 25px; border-radius: 10px; border: 1px solid #f5c6cb; text-align: center;">
                    <h3 style="margin: 0 0 10px 0;">❌ Erro</h3>
                    <p style="margin: 0;">${message}</p>
                </div>
            `;
        }

        showMessage(message) {
            this.container.innerHTML = `
                <div style="background: #fff3cd; color: #856404; padding: 25px; border-radius: 10px; border: 1px solid #ffeaa7; text-align: center;">
                    <h3 style="margin: 0 0 10px 0;">📭 Aviso</h3>
                    <p style="margin: 0;">${message}</p>
                </div>
            `;
        }

        showToast(message) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                font-weight: 600;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 3000);
        }

        escapeHTML(str) {
            if (!str) return '';
            return str
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
                .replace(/\n/g, '<br>')
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                .replace(/ /g, '&nbsp;');
        }

        escapeForAttribute(str) {
            if (!str) return '';
            return str
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
        }

        unescapeFromAttribute(str) {
            if (!str) return '';
            return str
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r');
        }
    }

    // Inicialização automática
    if (CONFIG.autoInit) {
        window.codeHubExtractor = new CodeHubExtractor();
    }

})();