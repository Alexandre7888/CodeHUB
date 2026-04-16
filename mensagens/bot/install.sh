#!/bin/bash
# ============================================
# SISTEMA BOT 24/7 - LINUX SERVER
# Firebase + Node.js + PM2
# ============================================
# Uso: bash install.sh
# Ou: curl -sSL https://seu-link/install.sh | bash

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🤖 SISTEMA BOT 24/7 - LINUX SERVER              ║
║              Firebase + Terminal + PM2                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

INSTALL_DIR="/opt/bot-system"
PORT=3000

# ============================================
# DETECTAR SISTEMA
# ============================================
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    fi
    echo -e "${GREEN}✓ Sistema: ${OS}${NC}"
}

# ============================================
# INSTALAR DEPENDÊNCIAS
# ============================================
install_deps() {
    echo -e "\n${YELLOW}📦 Instalando dependências...${NC}"
    
    case $OS in
        ubuntu|debian)
            sudo apt-get update -qq
            sudo apt-get install -y curl git nginx nodejs npm
            ;;
        centos|rhel|fedora)
            sudo yum update -y
            sudo yum install -y curl git nginx nodejs npm
            ;;
        *)
            echo -e "${RED}Sistema não suportado${NC}"
            exit 1
            ;;
    esac
    
    # Node.js 18+
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # PM2
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
}

# ============================================
# CRIAR SISTEMA
# ============================================
create_system() {
    echo -e "\n${YELLOW}📁 Criando sistema...${NC}"
    
    sudo mkdir -p $INSTALL_DIR/{public,logs}
    sudo chown -R $USER:$USER $INSTALL_DIR
    
    # package.json
    cat > $INSTALL_DIR/package.json << 'EOF'
{
  "name": "bot-system-24-7",
  "version": "2.0.0",
  "description": "Sistema de Bots 24/7 com Firebase",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "bot": "node bot-cli.js",
    "pm2": "pm2 start ecosystem.config.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "firebase": "^10.7.0",
    "axios": "^1.6.2",
    "chalk": "^4.1.2",
    "inquirer": "^8.2.5",
    "node-cron": "^3.0.3"
  }
}
EOF

    # ecosystem.config.js para PM2
    cat > $INSTALL_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bot-system',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

    # server.js - Servidor Express
    cat > $INSTALL_DIR/server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: Date.now(),
        server: 'Bot System 24/7'
    });
});

app.listen(PORT, () => {
    console.log(`\n🤖 Bot System rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`💻 Terminal: node bot-cli.js\n`);
});
EOF

    # bot-cli.js - CLI para gerenciar bots via terminal
    cat > $INSTALL_DIR/bot-cli.js << 'EOF'
#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push, onValue, get, update, increment } = require('firebase/database');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Dados locais
const DATA_FILE = path.join(__dirname, 'bots-data.json');
let botsData = [];

if (fs.existsSync(DATA_FILE)) {
    botsData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(botsData, null, 2));
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// MENU PRINCIPAL
// ============================================
async function mainMenu() {
    console.clear();
    console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan('║      🤖 BOT SYSTEM - TERMINAL       ║'));
    console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));
    
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'O que deseja fazer?',
            choices: [
                { name: '🆕 Criar novo bot', value: 'create' },
                { name: '📋 Listar meus bots', value: 'list' },
                { name: '🤖 Selecionar bot', value: 'select' },
                { name: '👥 Entrar em grupo', value: 'join' },
                { name: '💬 Enviar mensagem', value: 'send' },
                { name: '👀 Ouvir mensagens (live)', value: 'listen' },
                { name: '⚙️  Comandos automáticos', value: 'commands' },
                { name: '❌ Sair', value: 'exit' }
            ]
        }
    ]);
    
    switch(action) {
        case 'create': await createBot(); break;
        case 'list': await listBots(); break;
        case 'select': await selectBot(); break;
        case 'join': await joinGroup(); break;
        case 'send': await sendMessage(); break;
        case 'listen': await listenMessages(); break;
        case 'commands': await manageCommands(); break;
        case 'exit': 
            console.log(chalk.green('\n✅ Até logo!\n'));
            process.exit(0);
    }
    
    await inquirer.prompt([{ name: 'back', message: 'Pressione ENTER para voltar...' }]);
    mainMenu();
}

// ============================================
// CRIAR BOT
// ============================================
async function createBot() {
    console.log(chalk.blue('\n📝 CRIAR NOVO BOT\n'));
    
    const answers = await inquirer.prompt([
        { name: 'name', message: 'Nome do bot:' },
        { name: 'avatar', message: 'URL da foto do bot:' }
    ]);
    
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    const botData = {
        id: botId,
        name: answers.name,
        avatar: answers.avatar,
        status: 'online',
        created: Date.now()
    };
    
    botsData.push(botData);
    saveData();
    
    // Salvar no Firebase
    await set(ref(db, `users/${botId}`), {
        id: botId,
        name: answers.name,
        avatar: answers.avatar,
        status: { state: 'online', lastChanged: Date.now() }
    });
    
    await set(ref(db, `bots/${botId}/messageCount`), 0);
    
    console.log(chalk.green('\n✅ Bot criado com sucesso!'));
    console.log(chalk.yellow('🆔 ID:'), chalk.white(botId));
    console.log(chalk.cyan('📋 Copie este ID para usar no grupo\n'));
}

// ============================================
// LISTAR BOTS
// ============================================
async function listBots() {
    console.log(chalk.blue('\n📋 SEUS BOTS\n'));
    
    if (botsData.length === 0) {
        console.log(chalk.yellow('Nenhum bot criado ainda.'));
        return;
    }
    
    botsData.forEach((bot, i) => {
        console.log(chalk.cyan(`\n${i + 1}. ${bot.name}`));
        console.log(`   ID: ${bot.id}`);
        console.log(`   Status: ${bot.status || 'offline'}`);
    });
}

// ============================================
// SELECIONAR BOT
// ============================================
let selectedBot = null;
let selectedGroup = null;

async function selectBot() {
    if (botsData.length === 0) {
        console.log(chalk.yellow('Nenhum bot criado.'));
        return;
    }
    
    const { botIndex } = await inquirer.prompt([
        {
            type: 'list',
            name: 'botIndex',
            message: 'Selecione um bot:',
            choices: botsData.map((b, i) => ({ 
                name: `${b.name} (${b.id})`, 
                value: i 
            }))
        }
    ]);
    
    selectedBot = botsData[botIndex];
    console.log(chalk.green(`\n✅ Bot selecionado: ${selectedBot.name}`));
    
    // Carregar grupos do bot
    const groupsSnap = await get(ref(db, `bots/${selectedBot.id}/groups`));
    const groups = groupsSnap.val() || {};
    
    if (Object.keys(groups).length > 0) {
        console.log(chalk.cyan('\n👥 Grupos:'));
        Object.keys(groups).forEach(gid => {
            console.log(`  - ${gid}`);
        });
    }
}

// ============================================
// ENTRAR EM GRUPO
// ============================================
async function joinGroup() {
    if (!selectedBot) {
        console.log(chalk.red('❌ Selecione um bot primeiro!'));
        return;
    }
    
    const { groupId } = await inquirer.prompt([
        { name: 'groupId', message: 'ID do grupo:' }
    ]);
    
    selectedGroup = groupId;
    
    // Verificar se já é membro
    const memberSnap = await get(ref(db, `groups/${groupId}/members/${selectedBot.id}`));
    
    if (!memberSnap.exists()) {
        await set(ref(db, `groups/${groupId}/members/${selectedBot.id}`), {
            id: selectedBot.id,
            name: selectedBot.name,
            role: 'member',
            joinedAt: Date.now()
        });
    }
    
    await set(ref(db, `bots/${selectedBot.id}/groups/${groupId}`), Date.now());
    
    console.log(chalk.green(`\n✅ Bot entrou no grupo: ${groupId}`));
}

// ============================================
// ENVIAR MENSAGEM
// ============================================
async function sendMessage() {
    if (!selectedBot) {
        console.log(chalk.red('❌ Selecione um bot primeiro!'));
        return;
    }
    
    if (!selectedGroup) {
        const { groupId } = await inquirer.prompt([
            { name: 'groupId', message: 'ID do grupo:' }
        ]);
        selectedGroup = groupId;
    }
    
    const { message } = await inquirer.prompt([
        { name: 'message', message: 'Mensagem:' }
    ]);
    
    const timestamp = Date.now();
    const horaFormatada = formatTime(timestamp);
    
    const msgData = {
        senderId: selectedBot.id,
        senderName: selectedBot.name,
        text: message,
        timestamp: timestamp,
        time: horaFormatada,
        type: 'text',
        readBy: { [selectedBot.id]: timestamp }
    };
    
    await push(ref(db, `groups/${selectedGroup}/messages`), msgData);
    await update(ref(db, `bots/${selectedBot.id}`), {
        messageCount: increment(1)
    });
    
    console.log(chalk.green(`\n✅ Mensagem enviada: "${message}"`));
}

// ============================================
// OUVIR MENSAGENS
// ============================================
async function listenMessages() {
    if (!selectedBot) {
        console.log(chalk.red('❌ Selecione um bot primeiro!'));
        return;
    }
    
    if (!selectedGroup) {
        const { groupId } = await inquirer.prompt([
            { name: 'groupId', message: 'ID do grupo:' }
        ]);
        selectedGroup = groupId;
    }
    
    console.log(chalk.cyan(`\n👂 Ouvindo mensagens do grupo ${selectedGroup}...`));
    console.log(chalk.yellow('Pressione CTRL+C para parar\n'));
    
    const messagesRef = ref(db, `groups/${selectedGroup}/messages`);
    
    onValue(messagesRef, (snapshot) => {
        console.clear();
        console.log(chalk.cyan(`\n💬 MENSAGENS - Grupo: ${selectedGroup}\n`));
        console.log(chalk.gray('─'.repeat(50)));
        
        const messages = [];
        snapshot.forEach((child) => {
            messages.push(child.val());
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(msg => {
            const isOwn = msg.senderId === selectedBot.id;
            const prefix = isOwn ? chalk.green('▶') : chalk.blue('◀');
            const name = isOwn ? chalk.green(msg.senderName) : chalk.blue(msg.senderName);
            const time = chalk.gray(`[${msg.time || formatTime(msg.timestamp)}]`);
            
            console.log(`${prefix} ${time} ${name}: ${msg.text}`);
        });
        
        console.log(chalk.gray('\n' + '─'.repeat(50)));
        console.log(chalk.yellow('\n👂 Ouvindo novas mensagens... (CTRL+C para voltar)'));
    });
    
    // Esperar indefinidamente
    await new Promise(() => {});
}

// ============================================
// GERENCIAR COMANDOS
// ============================================
let commands = [];

const COMMANDS_FILE = path.join(__dirname, 'commands.json');
if (fs.existsSync(COMMANDS_FILE)) {
    commands = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
}

async function manageCommands() {
    console.log(chalk.blue('\n⚙️ COMANDOS AUTOMÁTICOS\n'));
    
    if (commands.length > 0) {
        console.log(chalk.cyan('Comandos configurados:'));
        commands.forEach((cmd, i) => {
            console.log(`  ${i + 1}. ${cmd.name}`);
        });
    }
    
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Opção:',
            choices: [
                { name: '➕ Adicionar comando', value: 'add' },
                { name: '🗑️ Remover comando', value: 'remove' },
                { name: '📋 Ver código', value: 'view' },
                { name: '↩️ Voltar', value: 'back' }
            ]
        }
    ]);
    
    switch(action) {
        case 'add':
            const cmd = await inquirer.prompt([
                { name: 'name', message: 'Nome do comando (ex: !oi):' },
                { name: 'code', message: 'Código JavaScript:' }
            ]);
            commands.push({ name: cmd.name, code: cmd.code });
            fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
            console.log(chalk.green('✅ Comando salvo!'));
            break;
        case 'remove':
            if (commands.length > 0) {
                const { index } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'index',
                        message: 'Qual comando remover?',
                        choices: commands.map((c, i) => ({ name: c.name, value: i }))
                    }
                ]);
                commands.splice(index, 1);
                fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
                console.log(chalk.green('✅ Comando removido!'));
            }
            break;
        case 'view':
            if (commands.length > 0) {
                const { index } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'index',
                        message: 'Qual comando ver?',
                        choices: commands.map((c, i) => ({ name: c.name, value: i }))
                    }
                ]);
                console.log(chalk.cyan('\n📝 Código:'));
                console.log(chalk.white(commands[index].code));
            }
            break;
    }
}

// Iniciar
mainMenu().catch(console.error);
EOF

    # Tornar executável
    chmod +x $INSTALL_DIR/bot-cli.js
    
    # HTML para interface web
    cat > $INSTALL_DIR/public/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🤖 Bot System - 24/7</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  font-family: 'Segoe UI', Arial, sans-serif; 
  background: linear-gradient(135deg, #0a0c10 0%, #1a1e24 100%);
  color: #e6e9f0; 
  min-height: 100vh;
}

.container { max-width: 1200px; margin: 0 auto; padding: 20px; }

header { 
  background: rgba(26, 30, 36, 0.95);
  padding: 20px 30px; 
  border-radius: 16px;
  border: 1px solid #2a323a;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
}

h1 { 
  background: linear-gradient(135deg, #2d9cdb, #6c5ce7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 28px;
}

.status-badge {
  background: #1e2a36;
  padding: 8px 16px;
  border-radius: 30px;
  border: 1px solid #2d9cdb;
}

.panel {
  background: rgba(21, 26, 31, 0.95);
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 25px;
  border: 1px solid #2a323a;
  backdrop-filter: blur(10px);
}

.panel h3 { 
  color: #a0d6ff; 
  border-bottom: 1px solid #2d3a44; 
  padding-bottom: 12px; 
  margin-bottom: 20px;
}

input, textarea, button {
  margin: 8px 0; 
  padding: 12px 16px; 
  width: 100%; 
  border-radius: 12px; 
  font-size: 15px;
  background: #1e262c;
  color: #fff;
  border: 1px solid #36424a;
}

button {
  background: linear-gradient(135deg, #2d9cdb, #6c5ce7);
  color: white;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: transform 0.2s;
}

button:hover { 
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(45, 156, 219, 0.3);
}

.bot-card {
  padding: 20px;
  border: 1px solid #2a323a;
  border-radius: 16px;
  margin: 15px 0;
  background: #1a1f24;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.bot-card:hover {
  background: #242c34;
  border-color: #2d9cdb;
}

.bot-avatar { 
  width: 60px; 
  height: 60px; 
  border-radius: 50%; 
  border: 3px solid #2d9cdb;
  object-fit: cover;
}

.bot-info { flex: 1; }
.bot-name { font-size: 18px; font-weight: bold; }
.bot-id { font-size: 12px; color: #888; margin-top: 5px; }

.messages { 
  max-height: 400px; 
  overflow-y: auto; 
  background: #0e1217; 
  padding: 20px; 
  border-radius: 16px; 
}

.msg { 
  padding: 12px 18px; 
  background: #1e262e; 
  border-radius: 20px; 
  margin: 8px 0;
}

.msg.own { 
  background: linear-gradient(135deg, #1f4a5c, #1a3a4a);
  margin-left: 20px;
}

.msg-time {
  float: right;
  color: #888;
  font-size: 11px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

@media (max-width: 768px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="container">
    <header>
        <h1>🤖 Bot System 24/7</h1>
        <span class="status-badge" id="statusDisplay">🟢 Conectado ao Firebase</span>
    </header>

    <div class="grid-2">
        <!-- Painel Esquerdo -->
        <div>
            <div class="panel">
                <h3>➕ Criar Bot</h3>
                <input id="botName" placeholder="Nome do bot">
                <input id="botAvatarUrl" placeholder="URL da foto do bot">
                <button onclick="createBot()">🚀 Criar Bot</button>
            </div>

            <div class="panel">
                <h3>📋 Meus Bots</h3>
                <div id="botList"></div>
            </div>
        </div>

        <!-- Painel Direito -->
        <div>
            <div class="panel" id="botPanel" style="display:none;">
                <h3>🤖 Bot Selecionado</h3>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <img id="selectedBotAvatar" style="width:70px;height:70px;border-radius:50%;border:3px solid #2d9cdb;">
                    <div style="flex:1">
                        <h3 id="selectedBotName"></h3>
                        <p style="color:#888;" id="selectedBotId"></p>
                    </div>
                </div>

                <h4 style="margin-top:20px;">👥 Entrar em Grupo</h4>
                <input id="groupIdInput" placeholder="ID do grupo">
                <button onclick="joinGroup()">🔗 Conectar ao Grupo</button>

                <h4 style="margin-top:20px;">💬 Enviar Mensagem</h4>
                <textarea id="messageInput" placeholder="Digite sua mensagem..." rows="3"></textarea>
                <button onclick="sendMessage()">📤 Enviar</button>

                <h4 style="margin-top:20px;">📨 Mensagens do Grupo</h4>
                <div class="messages" id="messagesContainer"></div>
            </div>
        </div>
    </div>
</div>

<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
<script>
const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let bots = JSON.parse(localStorage.getItem("server_bots") || "[]");
let selectedBot = null;
let currentGroup = null;

document.getElementById('statusDisplay').textContent = '🟢 Conectado';

function saveBots() {
    localStorage.setItem("server_bots", JSON.stringify(bots));
    loadBots();
}

function createBot() {
    const name = document.getElementById('botName').value;
    const avatar = document.getElementById('botAvatarUrl').value;
    
    if (!name || !avatar) {
        alert('Preencha nome e URL da foto!');
        return;
    }
    
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    const botData = { id: botId, name, avatar, status: 'online', created: Date.now() };
    bots.push(botData);
    saveBots();
    
    db.ref("users/" + botId).set({
        id: botId, name, avatar,
        status: { state: 'online', lastChanged: Date.now() }
    });
    
    db.ref("bots/" + botId + "/messageCount").set(0);
    
    document.getElementById('botName').value = '';
    document.getElementById('botAvatarUrl').value = '';
    
    alert('✅ Bot criado! ID: ' + botId);
}

function loadBots() {
    const list = document.getElementById('botList');
    list.innerHTML = '';
    
    bots.forEach(bot => {
        const div = document.createElement('div');
        div.className = 'bot-card';
        div.onclick = () => selectBot(bot);
        
        div.innerHTML = `
            <img src="${bot.avatar}" class="bot-avatar" onerror="this.src='https://via.placeholder.com/60?text=Bot'">
            <div class="bot-info">
                <div class="bot-name">${bot.name}</div>
                <div class="bot-id">ID: ${bot.id}</div>
            </div>
        `;
        
        list.appendChild(div);
    });
}

function selectBot(bot) {
    selectedBot = bot;
    document.getElementById('botPanel').style.display = 'block';
    document.getElementById('selectedBotAvatar').src = bot.avatar;
    document.getElementById('selectedBotName').textContent = bot.name;
    document.getElementById('selectedBotId').textContent = 'ID: ' + bot.id;
    
    db.ref("bots/" + bot.id + "/messageCount").once("value", snap => {
        console.log('Mensagens enviadas:', snap.val() || 0);
    });
}

function joinGroup() {
    if (!selectedBot) {
        alert('Selecione um bot primeiro!');
        return;
    }
    
    const groupId = document.getElementById('groupIdInput').value;
    if (!groupId) {
        alert('Digite o ID do grupo!');
        return;
    }
    
    currentGroup = groupId;
    
    db.ref(`groups/${groupId}/members/${selectedBot.id}`).once("value", snap => {
        if (!snap.exists()) {
            db.ref(`groups/${groupId}/members/${selectedBot.id}`).set({
                id: selectedBot.id,
                name: selectedBot.name,
                role: 'member',
                joinedAt: Date.now()
            });
        }
        
        db.ref("bots/" + selectedBot.id + "/groups/" + groupId).set(Date.now());
        listenMessages();
        alert('✅ Conectado ao grupo: ' + groupId);
    });
}

function sendMessage() {
    if (!selectedBot) {
        alert('Selecione um bot!');
        return;
    }
    
    if (!currentGroup) {
        alert('Conecte a um grupo primeiro!');
        return;
    }
    
    const text = document.getElementById('messageInput').value;
    if (!text) {
        alert('Digite uma mensagem!');
        return;
    }
    
    const timestamp = Date.now();
    const time = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    db.ref(`groups/${currentGroup}/messages`).push({
        senderId: selectedBot.id,
        senderName: selectedBot.name,
        text: text,
        timestamp: timestamp,
        time: time,
        type: 'text',
        readBy: { [selectedBot.id]: timestamp }
    });
    
    db.ref("bots/" + selectedBot.id + "/messageCount").transaction(v => (v || 0) + 1);
    
    document.getElementById('messageInput').value = '';
}

function listenMessages() {
    if (!currentGroup) return;
    
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<p style="color:#888;">Carregando mensagens...</p>';
    
    db.ref(`groups/${currentGroup}/messages`).off();
    db.ref(`groups/${currentGroup}/messages`).on("value", snapshot => {
        container.innerHTML = '';
        const messages = [];
        
        snapshot.forEach(child => {
            messages.push(child.val());
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'msg' + (msg.senderId === selectedBot?.id ? ' own' : '');
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'msg-time';
            timeSpan.textContent = msg.time || '';
            
            div.innerHTML = `<strong>${msg.senderName}:</strong> ${msg.text}`;
            div.appendChild(timeSpan);
            
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    });
}

loadBots();
</script>
</body>
</html>
HTMLEOF

    echo -e "${GREEN}✓ Sistema criado${NC}"
}

# ============================================
# INSTALAR E CONFIGURAR
# ============================================
install_and_config() {
    echo -e "\n${YELLOW}📦 Instalando dependências Node.js...${NC}"
    cd $INSTALL_DIR
    npm install --silent
    
    echo -e "\n${YELLOW}⚙️ Configurando PM2...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd 2>/dev/null || pm2 startup
    
    # Configurar Nginx
    echo -e "\n${YELLOW}🌐 Configurando Nginx...${NC}"
    
    sudo tee /etc/nginx/sites-available/bot-system > /dev/null << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/bot-system /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl restart nginx
    
    echo -e "${GREEN}✓ Nginx configurado${NC}"
}

# ============================================
# FINALIZAR
# ============================================
finish() {
    IP=$(curl -s ifconfig.me || echo "localhost")
    
    echo -e "\n${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║          ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!            ║${NC}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${CYAN}📱 ACESSE SEU PAINEL:${NC}"
    echo -e "   ${BOLD}http://${IP}${NC}"
    echo -e "   ${BOLD}http://${IP}:${PORT}${NC}"
    
    echo -e "\n${CYAN}💻 COMANDOS DO TERMINAL:${NC}"
    echo -e "   ${YELLOW}cd ${INSTALL_DIR} && node bot-cli.js${NC}  ${GRAY}# Abrir CLI interativo${NC}"
    echo -e "   ${YELLOW}pm2 status${NC}                          ${GRAY}# Ver status do servidor${NC}"
    echo -e "   ${YELLOW}pm2 logs bot-system${NC}                 ${GRAY}# Ver logs${NC}"
    echo -e "   ${YELLOW}pm2 restart bot-system${NC}              ${GRAY}# Reiniciar${NC}"
    
    echo -e "\n${CYAN}📋 PRÓXIMOS PASSOS:${NC}"
    echo -e "   1. Acesse o painel web ou use o CLI"
    echo -e "   2. Crie um bot (coloque URL da foto)"
    echo -e "   3. Copie o ID do bot gerado"
    echo -e "   4. Entre em um grupo usando o ID do grupo"
    echo -e "   5. Envie mensagens e configure comandos!"
    
    echo -e "\n${PURPLE}🔥 Seu sistema de bots 24/7 está ONLINE!${NC}\n"
}

# ============================================
# EXECUTAR
# ============================================
main() {
    detect_os
    install_deps
    create_system
    install_and_config
    finish
    
    # Perguntar se quer abrir CLI
    read -p "Deseja abrir o CLI agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        cd $INSTALL_DIR && node bot-cli.js
    fi
}

main