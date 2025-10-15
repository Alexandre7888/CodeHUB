// URL do arquivo de texto com os botões
const BUTTONS_FILE_URL = 'https://alexandre7888.github.io/CodeHUB/Botao/buttons.txt';

// Carregar botões do arquivo de texto
async function loadButtonsFromFile() {
    try {
        console.log('Carregando botões de:', BUTTONS_FILE_URL);
        const response = await fetch(BUTTONS_FILE_URL);
        if (!response.ok) throw new Error('Arquivo não encontrado');
        
        const text = await response.text();
        console.log('Conteúdo do arquivo:', text);
        return parseButtonsText(text);
    } catch (error) {
        console.error('Erro ao carregar botões:', error);
        // Botões de fallback caso o arquivo não carregue
        return [
            {
                title: "Editor de Código",
                description: "Crie e edite projetos online", 
                url: "https://alexandre7888.github.io/CodeHUB/editor.html",
                color: "#667eea",
                icon: "💻"
            },
            {
                title: "WhatsApp",
                description: "Fale conosco",
                url: "https://wa.me/5511999999999",
                color: "#25d366", 
                icon: "💬"
            }
        ];
    }
}

// Converter texto para array de botões
function parseButtonsText(text) {
    const buttons = [];
    const lines = text.split('\n');
    
    let currentButton = {};
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('title:')) {
            currentButton.title = trimmed.replace('title:', '').trim();
        }
        else if (trimmed.startsWith('description:')) {
            currentButton.description = trimmed.replace('description:', '').trim();
        }
        else if (trimmed.startsWith('url:')) {
            currentButton.url = trimmed.replace('url:', '').trim();
        }
        else if (trimmed.startsWith('color:')) {
            currentButton.color = trimmed.replace('color:', '').trim();
        }
        else if (trimmed.startsWith('icon:')) {
            currentButton.icon = trimmed.replace('icon:', '').trim();
        }
        else if (trimmed === '---') {
            if (currentButton.title && currentButton.url) {
                buttons.push({...currentButton});
            }
            currentButton = {};
        }
    }
    
    // Adicionar o último botão se existir
    if (currentButton.title && currentButton.url) {
        buttons.push(currentButton);
    }
    
    console.log('Botões carregados:', buttons);
    return buttons;
}

// Criar botão flutuante e menu
async function createFloatingMenu() {
    console.log('Iniciando criação do menu flutuante...');
    
    const buttons = await loadButtonsFromFile();
    
    if (buttons.length === 0) {
        console.log('Nenhum botão encontrado');
        return;
    }

    // Criar botão flutuante - LADO ESQUERDO
    const floatingBtn = document.createElement('button');
    floatingBtn.innerHTML = '⚙️';
    floatingBtn.id = 'floating-menu-btn';
    floatingBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 30px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        transition: all 0.3s ease;
    `;

    // Criar overlay de fundo - SEM BLUR
    const overlay = document.createElement('div');
    overlay.id = 'menu-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.3);
        z-index: 9998;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Criar menu lateral - LADO ESQUERDO
    const menu = document.createElement('div');
    menu.id = 'floating-menu';
    menu.style.cssText = `
        position: fixed;
        top: 0;
        left: -400px;
        width: 350px;
        height: 100%;
        background: white;
        box-shadow: 5px 0 25px rgba(0,0,0,0.2);
        z-index: 9999;
        transition: left 0.3s ease;
        padding: 30px 25px;
        overflow-y: auto;
    `;

    // Criar conteúdo do menu
    menu.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 10px;">🚀 CodeHUB</h2>
            <p style="color: #666; font-size: 14px;">Ferramentas para Desenvolvedores</p>
        </div>

        <div class="menu-section" style="margin-bottom: 25px;">
            <h3 style="color: #444; margin-bottom: 15px; font-size: 16px;">📦 RECURSOS</h3>
            ${generateButtonsHTML(buttons)}
        </div>

        <div style="margin-top: 30px; text-align: center;">
            <button onclick="closeFloatingMenu()" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">
                Fechar Menu
            </button>
        </div>
    `;

    // Adicionar elementos ao body
    document.body.appendChild(floatingBtn);
    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    // Event listeners
    floatingBtn.addEventListener('click', openFloatingMenu);
    overlay.addEventListener('click', closeFloatingMenu);

    // Adicionar estilos hover
    const style = document.createElement('style');
    style.textContent = `
        #floating-menu-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(0,0,0,0.4);
        }
        
        .menu-item:hover {
            background: #e9ecef !important;
            transform: translateX(5px);
        }
        
        #floating-menu::-webkit-scrollbar {
            width: 6px;
        }
        
        #floating-menu::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        #floating-menu::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }
        
        #floating-menu::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Menu flutuante criado com sucesso! (Sem blur)');
}

// Gerar HTML dos botões
function generateButtonsHTML(buttons) {
    return buttons.map(button => `
        <div class="menu-item" onclick="openFloatingLink('${button.url}')" style="
            padding: 12px 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
            border-left: 4px solid ${button.color || '#667eea'};
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${button.icon || '🔗'}</span>
                <div>
                    <div style="font-weight: bold; color: #333;">${button.title}</div>
                    <div style="font-size: 12px; color: #666;">${button.description || ''}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Função para abrir menu
function openFloatingMenu() {
    const overlay = document.getElementById('menu-overlay');
    const menu = document.getElementById('floating-menu');
    
    if (overlay && menu) {
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            menu.style.left = '0';
        }, 10);
    }
}

// Função para fechar menu
function closeFloatingMenu() {
    const overlay = document.getElementById('menu-overlay');
    const menu = document.getElementById('floating-menu');
    
    if (overlay && menu) {
        overlay.style.opacity = '0';
        menu.style.left = '-400px';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Função para abrir links
function openFloatingLink(url) {
    window.open(url, '_blank');
    closeFloatingMenu();
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingMenu);
} else {
    createFloatingMenu();
}

// Também exportar funções globalmente
window.openFloatingMenu = openFloatingMenu;
window.closeFloatingMenu = closeFloatingMenu;
window.openFloatingLink = openFloatingLink;
