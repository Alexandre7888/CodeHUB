#!/bin/bash
# ============================================
# INSTALADOR UNIVERSAL - FUNCIONA EM QUALQUER LINUX
# ============================================

clear
echo "========================================="
echo "     INSTALANDO SISTEMA DE BOTS 24/7     "
echo "========================================="
echo ""

# Criar diretório
mkdir -p /opt/bot-system
cd /opt/bot-system

# Instalar Node.js (método universal)
echo "[1/5] Instalando Node.js..."
if ! command -v node &> /dev/null; then
    wget -q https://nodejs.org/dist/v18.20.0/node-v18.20.0-linux-x64.tar.xz
    tar -xf node-v18.20.0-linux-x64.tar.xz
    mv node-v18.20.0-linux-x64 nodejs
    export PATH=$PATH:/opt/bot-system/nodejs/bin
    rm node-v18.20.0-linux-x64.tar.xz
fi

# Criar package.json
echo "[2/5] Configurando sistema..."
cat > package.json << 'EOF'
{
  "name": "bot-system",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "bot": "node bot.js"
  }
}
EOF

# Instalar dependências via npm local
export PATH=$PATH:/opt/bot-system/nodejs/bin
./nodejs/bin/npm install firebase express node-cron axios

# Criar server.js
cat > server.js << 'EOF'
const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push, onValue, get, update } = require('firebase/database');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// Servir HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API para criar bot
app.post('/api/bot/create', (req, res) => {
    const { name, avatar } = req.body;
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    set(ref(db, `users/${botId}`), {
        id: botId, name, avatar,
        status: { state: 'online', lastChanged: Date.now() }
    });
    
    set(ref(db, `bots/${botId}/messageCount`), 0);
    
    res.json({ success: true, botId, name, avatar });
});

// API para enviar mensagem
app.post('/api/message/send', (req, res) => {
    const { botId, botName, groupId, text } = req.body;
    const timestamp = Date.now();
    
    push(ref(db, `groups/${groupId}/messages`), {
        senderId: botId,
        senderName: botName,
        text, timestamp,
        time: new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        readBy: { [botId]: timestamp }
    });
    
    update(ref(db, `bots/${botId}`), { messageCount: increment(1) });
    res.json({ success: true });
});

// API para entrar em grupo
app.post('/api/group/join', (req, res) => {
    const { botId, botName, groupId } = req.body;
    
    set(ref(db, `groups/${groupId}/members/${botId}`), {
        id: botId, name: botName, role: 'member', joinedAt: Date.now()
    });
    
    set(ref(db, `bots/${botId}/groups/${groupId}`), Date.now());
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
EOF

# Criar bot.js (CLI)
cat > bot.js << 'EOF'
#!/usr/bin/env node
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push, onValue, update } = require('firebase/database');
const readline = require('readline');

const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🤖 BOT SYSTEM - TERMINAL\n');
console.log('1 - Criar Bot');
console.log('2 - Entrar em Grupo');
console.log('3 - Enviar Mensagem');
console.log('4 - Ouvir Mensagens\n');

rl.question('Escolha: ', (op) => {
    if (op === '1') {
        rl.question('Nome do bot: ', (name) => {
            rl.question('URL da foto: ', (avatar) => {
                const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                set(ref(db, `users/${botId}`), {
                    id: botId, name, avatar,
                    status: { state: 'online', lastChanged: Date.now() }
                });
                console.log('\n✅ Bot criado!');
                console.log('ID:', botId);
                rl.close();
            });
        });
    } else if (op === '2') {
        rl.question('ID do bot: ', (botId) => {
            rl.question('Nome do bot: ', (botName) => {
                rl.question('ID do grupo: ', (groupId) => {
                    set(ref(db, `groups/${groupId}/members/${botId}`), {
                        id: botId, name: botName, role: 'member', joinedAt: Date.now()
                    });
                    console.log('\n✅ Entrou no grupo!');
                    rl.close();
                });
            });
        });
    } else if (op === '3') {
        rl.question('ID do bot: ', (botId) => {
            rl.question('Nome do bot: ', (botName) => {
                rl.question('ID do grupo: ', (groupId) => {
                    rl.question('Mensagem: ', (text) => {
                        push(ref(db, `groups/${groupId}/messages`), {
                            senderId: botId, senderName: botName, text,
                            timestamp: Date.now(),
                            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        });
                        console.log('\n✅ Mensagem enviada!');
                        rl.close();
                    });
                });
            });
        });
    } else if (op === '4') {
        rl.question('ID do grupo: ', (groupId) => {
            console.log('\n👂 Ouvindo mensagens... (CTRL+C para sair)\n');
            onValue(ref(db, `groups/${groupId}/messages`), (snap) => {
                console.clear();
                console.log('📨 MENSAGENS DO GRUPO:', groupId, '\n');
                snap.forEach((msg) => {
                    const m = msg.val();
                    console.log(`[${m.time || ''}] ${m.senderName}: ${m.text}`);
                });
            });
        });
    } else {
        rl.close();
    }
});
EOF

# Criar HTML
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🤖 Bot System 24/7</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  font-family: 'Segoe UI', Arial, sans-serif; 
  background: #0a0c10; 
  color: #e6e9f0;
  padding: 20px;
}
.panel {
  background: #151a1f;
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 25px;
  border: 1px solid #2a323a;
  max-width: 500px;
  margin: 20px auto;
}
h2 { color: #2d9cdb; margin-bottom: 20px; }
input, button {
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
  background: #2d9cdb;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
button:hover { opacity: 0.9; }
.bot-card {
  padding: 15px;
  border: 1px solid #2a323a;
  border-radius: 12px;
  margin: 10px 0;
  background: #1a1f24;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
}
.bot-card:hover { background: #242c34; }
.bot-avatar { width: 50px; height: 50px; border-radius: 50%; }
.messages {
  max-height: 300px;
  overflow-y: auto;
  background: #0e1217;
  padding: 15px;
  border-radius: 12px;
  margin-top: 15px;
}
.msg { 
  padding: 10px; 
  background: #1e262e; 
  border-radius: 12px; 
  margin: 5px 0;
}
</style>
</head>
<body>

<div class="panel">
    <h2>➕ Criar Bot</h2>
    <input id="botName" placeholder="Nome do bot">
    <input id="botAvatar" placeholder="URL da foto">
    <button onclick="criarBot()">Criar</button>
</div>

<div class="panel">
    <h2>🤖 Bot Ativo</h2>
    <div id="botInfo"></div>
    
    <h3 style="margin-top:20px;">👥 Grupo</h3>
    <input id="groupId" placeholder="ID do grupo">
    <button onclick="entrarGrupo()">Entrar</button>
    
    <h3 style="margin-top:20px;">💬 Mensagem</h3>
    <textarea id="messageText" placeholder="Digite..." rows="3"></textarea>
    <button onclick="enviarMsg()">Enviar</button>
    
    <h3 style="margin-top:20px;">📨 Mensagens</h3>
    <div id="messages" class="messages"></div>
</div>

<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
<script>
firebase.initializeApp({
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com"
});
const db = firebase.database();

let botAtual = JSON.parse(localStorage.getItem('bot_atual')) || null;
let grupoAtual = localStorage.getItem('grupo_atual') || '';

if(botAtual) {
    document.getElementById('botInfo').innerHTML = `
        <div class="bot-card">
            <img src="${botAtual.avatar}" class="bot-avatar" onerror="this.src='https://via.placeholder.com/50'">
            <div>
                <div><strong>${botAtual.name}</strong></div>
                <div style="font-size:12px;color:#888;">ID: ${botAtual.id}</div>
            </div>
        </div>
    `;
}
if(grupoAtual) document.getElementById('groupId').value = grupoAtual;

async function criarBot() {
    const name = document.getElementById('botName').value;
    const avatar = document.getElementById('botAvatar').value;
    if(!name || !avatar) return alert('Preencha tudo!');
    
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    botAtual = { id: botId, name, avatar };
    localStorage.setItem('bot_atual', JSON.stringify(botAtual));
    
    await db.ref("users/" + botId).set({
        id: botId, name, avatar,
        status: { state: 'online', lastChanged: Date.now() }
    });
    await db.ref("bots/" + botId + "/messageCount").set(0);
    
    alert('Bot criado! ID: ' + botId);
    location.reload();
}

async function entrarGrupo() {
    if(!botAtual) return alert('Crie um bot primeiro!');
    const groupId = document.getElementById('groupId').value;
    if(!groupId) return alert('Digite o ID do grupo!');
    
    grupoAtual = groupId;
    localStorage.setItem('grupo_atual', groupId);
    
    await db.ref(`groups/${groupId}/members/${botAtual.id}`).set({
        id: botAtual.id, name: botAtual.name, role: 'member', joinedAt: Date.now()
    });
    await db.ref(`bots/${botAtual.id}/groups/${groupId}`).set(Date.now());
    
    alert('Entrou no grupo!');
    ouvirMensagens();
}

function enviarMsg() {
    if(!botAtual) return alert('Crie um bot!');
    if(!grupoAtual) return alert('Entre em um grupo!');
    
    const text = document.getElementById('messageText').value;
    if(!text) return alert('Digite uma mensagem!');
    
    const timestamp = Date.now();
    db.ref(`groups/${grupoAtual}/messages`).push({
        senderId: botAtual.id,
        senderName: botAtual.name,
        text, timestamp,
        time: new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    
    document.getElementById('messageText').value = '';
}

function ouvirMensagens() {
    if(!grupoAtual) return;
    
    db.ref(`groups/${grupoAtual}/messages`).on('value', snap => {
        const msgs = document.getElementById('messages');
        msgs.innerHTML = '';
        const mensagens = [];
        snap.forEach(m => mensagens.push(m.val()));
        mensagens.sort((a,b) => a.timestamp - b.timestamp);
        mensagens.forEach(m => {
            const div = document.createElement('div');
            div.className = 'msg';
            div.innerHTML = `<strong>${m.senderName}:</strong> ${m.text}`;
            msgs.appendChild(div);
        });
        msgs.scrollTop = msgs.scrollHeight;
    });
}

if(grupoAtual) ouvirMensagens();
</script>
</body>
</html>
EOF

# Iniciar servidor
echo "[3/5] Iniciando servidor..."
export PATH=$PATH:/opt/bot-system/nodejs/bin
./nodejs/bin/node server.js > logs.txt 2>&1 &

# Criar script de start automático
echo "[4/5] Configurando auto-start..."
cat > /etc/systemd/system/bot-system.service << EOF
[Unit]
Description=Bot System 24/7
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bot-system
Environment=PATH=/opt/bot-system/nodejs/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/opt/bot-system/nodejs/bin/node /opt/bot-system/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bot-system
systemctl start bot-system

# Pegar IP
IP=$(ip route get 1 | awk '{print $NF;exit}' 2>/dev/null || hostname -I | awk '{print $1}')

echo "[5/5] Finalizado!"
echo ""
echo "========================================="
echo "  ✅ SISTEMA INSTALADO COM SUCESSO!     "
echo "========================================="
echo ""
echo "🌐 ACESSE: http://$IP:3000"
echo ""
echo "📱 COMANDOS:"
echo "   cd /opt/bot-system"
echo "   ./nodejs/bin/node bot.js"
echo ""
echo "🔧 GERENCIAR:"
echo "   systemctl status bot-system"
echo "   systemctl restart bot-system"
echo "   tail -f /opt/bot-system/logs.txt"
echo ""
echo "========================================="