#!/bin/bash
# ============================================
# SISTEMA BOT FIREBASE - COMPLETO
# Um arquivo único que faz tudo
# ============================================

clear
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🤖 SISTEMA BOT FIREBASE COMPLETO              ║"
echo "║                  Instalador Universal                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

INSTALL_DIR="/opt/botsystem"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# ============================================
# INSTALAR NODE.JS PORTÁTIL
# ============================================
echo "[1/4] Instalando Node.js..."
if ! command -v node &> /dev/null; then
    wget -q https://nodejs.org/dist/v18.20.0/node-v18.20.0-linux-x64.tar.xz
    tar -xf node-v18.20.0-linux-x64.tar.xz
    mv node-v18.20.0-linux-x64 nodejs
    rm node-v18.20.0-linux-x64.tar.xz
fi
export PATH=$PATH:$INSTALL_DIR/nodejs/bin

# ============================================
# CRIAR SISTEMA COMPLETO
# ============================================
echo "[2/4] Criando sistema..."

cat > package.json << 'EOF'
{
  "name": "bot-system",
  "version": "1.0.0",
  "dependencies": {
    "firebase": "^10.7.0"
  }
}
EOF

./nodejs/bin/npm install --silent

# ============================================
# ARQUIVO PRINCIPAL: bot.js
# ============================================
cat > bot.js << 'BOTEOF'
#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push, onValue, get, update } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Banco local
const DB_FILE = path.join(__dirname, 'bots.json');
let localDB = { bots: [], activeBot: null };

if (fs.existsSync(DB_FILE)) {
  localDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveLocal() {
  fs.writeFileSync(DB_FILE, JSON.stringify(localDB, null, 2));
}

function formatTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ============================================
// COMANDOS
// ============================================

const args = process.argv.slice(2);
const cmd = args[0];

async function criarBot() {
  const name = args[1] || 'Bot_' + Date.now();
  const avatar = args[2] || 'https://i.imgur.com/6VBx3io.png';
  
  const botId = generateId();
  const bot = { id: botId, name, avatar, created: Date.now() };
  
  localDB.bots.push(bot);
  saveLocal();
  
  await set(ref(db, `users/${botId}`), {
    id: botId, name, avatar,
    status: { state: 'online', lastChanged: Date.now() }
  });
  await set(ref(db, `bots/${botId}/messageCount`), 0);
  
  console.log('✅ Bot criado!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🆔 ID:', botId);
  console.log('📛 Nome:', name);
  console.log('🖼️  Avatar:', avatar);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 Use: botcmd usar', botId);
}

function listarBots() {
  if (localDB.bots.length === 0) {
    console.log('⚠️ Nenhum bot criado.');
    console.log('Use: botcmd criar [nome] [url_foto]');
    return;
  }
  
  console.log('📋 SEUS BOTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  localDB.bots.forEach((bot, i) => {
    const active = localDB.activeBot === bot.id ? ' ★ (ATIVO)' : '';
    console.log(`${i+1}. ${bot.name}${active}`);
    console.log(`   ID: ${bot.id}`);
    console.log(`   Avatar: ${bot.avatar}`);
    console.log('');
  });
}

function usarBot() {
  const botId = args[1];
  
  if (!botId) {
    console.log('❌ Digite o ID do bot!');
    console.log('Use: botcmd usar [ID]');
    return;
  }
  
  const bot = localDB.bots.find(b => b.id === botId);
  if (!bot) {
    console.log('❌ Bot não encontrado!');
    return;
  }
  
  localDB.activeBot = botId;
  saveLocal();
  console.log('✅ Bot ativado:', bot.name);
  console.log('🆔 ID:', bot.id);
}

async function entrarGrupo() {
  if (!localDB.activeBot) {
    console.log('❌ Selecione um bot primeiro!');
    console.log('Use: botcmd usar [ID]');
    return;
  }
  
  const groupId = args[1];
  if (!groupId) {
    console.log('❌ Digite o ID do grupo!');
    console.log('Use: botcmd entrar [ID_GRUPO]');
    return;
  }
  
  const bot = localDB.bots.find(b => b.id === localDB.activeBot);
  
  await set(ref(db, `groups/${groupId}/members/${bot.id}`), {
    id: bot.id, name: bot.name, role: 'member', joinedAt: Date.now()
  });
  await set(ref(db, `bots/${bot.id}/groups/${groupId}`), Date.now());
  
  if (!bot.groups) bot.groups = [];
  if (!bot.groups.includes(groupId)) {
    bot.groups.push(groupId);
    saveLocal();
  }
  
  console.log('✅ Entrou no grupo:', groupId);
}

async function enviarMsg() {
  if (!localDB.activeBot) {
    console.log('❌ Selecione um bot primeiro!');
    return;
  }
  
  const groupId = args[1];
  const text = args.slice(2).join(' ');
  
  if (!groupId || !text) {
    console.log('❌ Uso: botcmd msg [ID_GRUPO] [MENSAGEM]');
    return;
  }
  
  const bot = localDB.bots.find(b => b.id === localDB.activeBot);
  const timestamp = Date.now();
  
  await push(ref(db, `groups/${groupId}/messages`), {
    senderId: bot.id,
    senderName: bot.name,
    text, timestamp,
    time: formatTime(),
    type: 'text',
    readBy: { [bot.id]: timestamp }
  });
  
  await update(ref(db, `bots/${bot.id}`), { messageCount: (bot.messageCount || 0) + 1 });
  
  console.log('✅ Mensagem enviada!');
  console.log(`📤 "${text}"`);
}

function ouvirMsgs() {
  const groupId = args[1];
  
  if (!groupId) {
    console.log('❌ Digite o ID do grupo!');
    console.log('Use: botcmd ouvir [ID_GRUPO]');
    return;
  }
  
  console.log(`👂 Ouvindo mensagens do grupo ${groupId}...`);
  console.log('Pressione CTRL+C para parar\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  onValue(ref(db, `groups/${groupId}/messages`), (snap) => {
    console.clear();
    console.log(`💬 MENSAGENS - Grupo: ${groupId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const msgs = [];
    snap.forEach(m => msgs.push(m.val()));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    
    msgs.forEach(m => {
      const prefix = m.senderId === localDB.activeBot ? '📤' : '📥';
      console.log(`${prefix} [${m.time}] ${m.senderName}: ${m.text}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👂 Ouvindo... (CTRL+C para sair)');
  });
  
  process.on('SIGINT', () => {
    console.log('\n\n✅ Parou de ouvir.');
    process.exit(0);
  });
}

async function listarGrupos() {
  if (!localDB.activeBot) {
    console.log('❌ Selecione um bot primeiro!');
    return;
  }
  
  const bot = localDB.bots.find(b => b.id === localDB.activeBot);
  
  const snap = await get(ref(db, `bots/${bot.id}/groups`));
  const groups = snap.val() || {};
  
  console.log('👥 GRUPOS DO BOT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  Object.keys(groups).forEach(g => {
    console.log(`  📍 ${g}`);
  });
  
  if (Object.keys(groups).length === 0) {
    console.log('  Nenhum grupo ainda.');
    console.log('  Use: botcmd entrar [ID_GRUPO]');
  }
}

function help() {
  console.log('🤖 BOT SYSTEM - COMANDOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📱 GERENCIAR BOTS:');
  console.log('  botcmd criar [nome] [url_foto]  - Criar novo bot');
  console.log('  botcmd listar                    - Listar todos os bots');
  console.log('  botcmd usar [id]                 - Selecionar um bot');
  console.log('');
  console.log('👥 GRUPOS:');
  console.log('  botcmd entrar [id_grupo]         - Entrar em um grupo');
  console.log('  botcmd grupos                    - Listar grupos do bot');
  console.log('');
  console.log('💬 MENSAGENS:');
  console.log('  botcmd msg [grupo] [mensagem]    - Enviar mensagem');
  console.log('  botcmd ouvir [grupo]             - Ouvir mensagens em tempo real');
  console.log('');
  console.log('📋 EXEMPLOS:');
  console.log('  botcmd criar MeuBot https://i.imgur.com/foto.png');
  console.log('  botcmd usar bot_1234567890_abc');
  console.log('  botcmd entrar grupo_123');
  console.log('  botcmd msg grupo_123 "Olá mundo!"');
  console.log('  botcmd ouvir grupo_123');
  console.log('');
}

// Executar comando
(async () => {
  switch(cmd) {
    case 'criar': await criarBot(); break;
    case 'listar': listarBots(); break;
    case 'usar': usarBot(); break;
    case 'entrar': await entrarGrupo(); break;
    case 'grupos': await listarGrupos(); break;
    case 'msg': await enviarMsg(); break;
    case 'ouvir': ouvirMsgs(); break;
    case 'help':
    case 'ajuda':
    case '': help(); break;
    default:
      console.log('❌ Comando desconhecido!');
      console.log('Use: botcmd help');
  }
  process.exit(0);
})();
BOTEOF

chmod +x bot.js

# ============================================
# CRIAR COMANDO GLOBAL
# ============================================
echo "[3/4] Criando comando global..."

cat > /usr/local/bin/botcmd << 'CMDEOF'
#!/bin/bash
export PATH=$PATH:/opt/botsystem/nodejs/bin
cd /opt/botsystem
node bot.js "$@"
CMDEOF

chmod +x /usr/local/bin/botcmd

# ============================================
# FINALIZAR
# ============================================
echo "[4/4] Finalizando..."

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALAÇÃO CONCLUÍDA!                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🤖 SISTEMA BOT FIREBASE INSTALADO!"
echo ""
echo "📋 COMANDOS:"
echo "  botcmd help                     - Ver todos os comandos"
echo ""
echo "🚀 COMEÇAR AGORA:"
echo "  1. botcmd criar MeuBot          - Criar seu primeiro bot"
echo "  2. botcmd listar                - Ver seus bots"
echo "  3. botcmd usar [ID]             - Ativar o bot"
echo "  4. botcmd entrar [ID_GRUPO]     - Entrar em um grupo"
echo "  5. botcmd msg [GRUPO] \"Olá\"     - Enviar mensagem"
echo "  6. botcmd ouvir [GRUPO]         - Ouvir mensagens"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Execute agora: botcmd help"
echo ""