#!/bin/bash
# ============================================
# SISTEMA DE BOTS - COMANDOS SHELL PRONTOS
# ============================================

clear
echo "╔════════════════════════════════════════╗"
echo "║   🤖 SISTEMA DE BOTS - INSTALADOR      ║"
echo "╚════════════════════════════════════════╝"
echo ""

INSTALL_DIR="/opt/botcmd"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# ============================================
# INSTALAR NODE.JS (UNIVERSAL)
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
# CRIAR SISTEMA
# ============================================
echo "[2/4] Criando sistema..."

# package.json
cat > package.json << 'EOF'
{
  "name": "botcmd",
  "version": "1.0.0",
  "dependencies": {
    "ws": "^8.14.2",
    "sqlite3": "^5.1.6",
    "axios": "^1.6.2"
  }
}
EOF

# Instalar dependências
./nodejs/bin/npm install --silent

# ============================================
# SERVIDOR WEBSOCKET + SQLITE
# ============================================
cat > server.js << 'EOF'
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Banco de dados
const db = new sqlite3.Database('./bots.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT,
        avatar TEXT,
        created INTEGER
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS bot_groups (
        bot_id TEXT,
        group_id TEXT,
        joined INTEGER
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT,
        bot_id TEXT,
        bot_name TEXT,
        text TEXT,
        timestamp INTEGER
    )`);
});

// Servidor WebSocket
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = Date.now() + '_' + Math.random().toString(36);
    clients.set(clientId, { ws, groups: new Set() });
    
    console.log('📱 Novo cliente conectado');
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            // Broadcast para grupos
            if (msg.type === 'message') {
                const stmt = db.prepare(`INSERT INTO messages (group_id, bot_id, bot_name, text, timestamp) VALUES (?, ?, ?, ?, ?)`);
                stmt.run(msg.groupId, msg.botId, msg.botName, msg.text, Date.now());
                stmt.finalize();
                
                clients.forEach((client, id) => {
                    if (client.groups.has(msg.groupId) && client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(JSON.stringify(msg));
                    }
                });
            }
            
            // Entrar em grupo
            if (msg.type === 'join') {
                const client = clients.get(clientId);
                if (client) {
                    client.groups.add(msg.groupId);
                    client.ws.send(JSON.stringify({ type: 'joined', groupId: msg.groupId }));
                }
            }
            
            // Criar bot
            if (msg.type === 'create_bot') {
                const stmt = db.prepare(`INSERT OR REPLACE INTO bots (id, name, avatar, created) VALUES (?, ?, ?, ?)`);
                stmt.run(msg.botId, msg.name, msg.avatar, Date.now());
                stmt.finalize();
                ws.send(JSON.stringify({ type: 'bot_created', botId: msg.botId }));
            }
        } catch(e) {
            console.error('Erro:', e);
        }
    });
    
    ws.on('close', () => {
        clients.delete(clientId);
        console.log('📱 Cliente desconectado');
    });
});

console.log('🚀 Servidor rodando na porta 8080');
EOF

# ============================================
# COMANDOS SHELL
# ============================================
cat > botcmd.sh << 'EOF'
#!/bin/bash

INSTALL_DIR="/opt/botcmd"
export PATH=$PATH:$INSTALL_DIR/nodejs/bin
cd $INSTALL_DIR

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Arquivo de configuração
CONFIG_FILE="$INSTALL_DIR/config.json"
[ -f "$CONFIG_FILE" ] || echo '{"bots":[],"active_bot":null}' > "$CONFIG_FILE"

# ============================================
# FUNÇÕES
# ============================================

criar_bot() {
    echo -e "${CYAN}┌─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│         🤖 CRIAR NOVO BOT           │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────┘${NC}"
    echo ""
    
    read -p "📝 Nome do bot: " bot_name
    read -p "🖼️  URL da foto (opcional - Enter para padrão): " bot_avatar
    
    if [ -z "$bot_avatar" ]; then
        bot_avatar="https://i.imgur.com/6VBx3io.png"
    fi
    
    bot_id="bot_$(date +%s)_$(openssl rand -hex 3)"
    
    # Salvar local
    config=$(cat "$CONFIG_FILE")
    new_bot="{\"id\":\"$bot_id\",\"name\":\"$bot_name\",\"avatar\":\"$bot_avatar\"}"
    echo "$config" | jq ".bots += [$new_bot]" > "$CONFIG_FILE"
    
    echo ""
    echo -e "${GREEN}✅ Bot criado com sucesso!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "🆔 ${YELLOW}ID:${NC} $bot_id"
    echo -e "📛 ${YELLOW}Nome:${NC} $bot_name"
    echo -e "🖼️  ${YELLOW}Avatar:${NC} $bot_avatar"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}📋 Comando para usar este bot:${NC}"
    echo -e "${YELLOW}botcmd usar $bot_id${NC}"
    echo ""
}

listar_bots() {
    echo -e "${CYAN}┌─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│           📋 SEUS BOTS              │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────┘${NC}"
    echo ""
    
    bots=$(cat "$CONFIG_FILE" | jq -r '.bots[] | "\(.id)|\(.name)|\(.avatar)"' 2>/dev/null)
    
    if [ -z "$bots" ]; then
        echo -e "${YELLOW}⚠️  Nenhum bot criado ainda.${NC}"
        echo -e "Use: ${GREEN}botcmd criar${NC}"
        return
    fi
    
    count=1
    echo "$bots" | while IFS='|' read -r id name avatar; do
        active_mark=""
        active_bot=$(cat "$CONFIG_FILE" | jq -r '.active_bot')
        if [ "$active_bot" == "$id" ]; then
            active_mark="${GREEN}★${NC} "
        fi
        echo -e "${active_mark}${count}) ${GREEN}$name${NC}"
        echo -e "   ID: ${YELLOW}$id${NC}"
        echo -e "   Avatar: $avatar"
        echo ""
        count=$((count + 1))
    done
}

usar_bot() {
    bot_id="$1"
    
    if [ -z "$bot_id" ]; then
        listar_bots
        echo ""
        read -p "🆔 Digite o ID do bot: " bot_id
    fi
    
    # Verificar se existe
    existe=$(cat "$CONFIG_FILE" | jq -r ".bots[] | select(.id==\"$bot_id\") | .id")
    
    if [ -z "$existe" ]; then
        echo -e "${RED}❌ Bot não encontrado!${NC}"
        return
    fi
    
    # Ativar bot
    config=$(cat "$CONFIG_FILE")
    echo "$config" | jq ".active_bot = \"$bot_id\"" > "$CONFIG_FILE"
    
    bot_name=$(cat "$CONFIG_FILE" | jq -r ".bots[] | select(.id==\"$bot_id\") | .name")
    
    echo -e "${GREEN}✅ Bot ativado: $bot_name${NC}"
}

entrar_grupo() {
    active_bot=$(cat "$CONFIG_FILE" | jq -r '.active_bot')
    
    if [ "$active_bot" == "null" ] || [ -z "$active_bot" ]; then
        echo -e "${RED}❌ Nenhum bot ativo!${NC}"
        echo -e "Use: ${YELLOW}botcmd usar${NC}"
        return
    fi
    
    echo -e "${CYAN}┌─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│         👥 ENTRAR EM GRUPO          │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────┘${NC}"
    echo ""
    
    read -p "🆔 ID do grupo: " group_id
    read -p "📛 Nome do grupo (opcional): " group_name
    
    if [ -z "$group_name" ]; then
        group_name="Grupo $group_id"
    fi
    
    # Conectar via WebSocket e entrar
    node -e "
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'join',
            groupId: '$group_id',
            botId: '$active_bot'
        }));
        setTimeout(() => process.exit(0), 1000);
    });
    " 2>/dev/null
    
    echo -e "${GREEN}✅ Entrou no grupo: $group_name${NC}"
    echo -e "${YELLOW}ID: $group_id${NC}"
}

enviar_mensagem() {
    active_bot=$(cat "$CONFIG_FILE" | jq -r '.active_bot')
    
    if [ "$active_bot" == "null" ] || [ -z "$active_bot" ]; then
        echo -e "${RED}❌ Nenhum bot ativo!${NC}"
        echo -e "Use: ${YELLOW}botcmd usar${NC}"
        return
    fi
    
    bot_name=$(cat "$CONFIG_FILE" | jq -r ".bots[] | select(.id==\"$active_bot\") | .name")
    
    echo -e "${CYAN}┌─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│        💬 ENVIAR MENSAGEM           │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────┘${NC}"
    echo ""
    echo -e "🤖 Bot ativo: ${GREEN}$bot_name${NC}"
    echo ""
    
    read -p "🆔 ID do grupo: " group_id
    read -p "📝 Mensagem: " message
    
    if [ -z "$message" ]; then
        echo -e "${RED}❌ Mensagem vazia!${NC}"
        return
    fi
    
    # Enviar via WebSocket
    node -e "
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'message',
            groupId: '$group_id',
            botId: '$active_bot',
            botName: '$bot_name',
            text: '$message'
        }));
        setTimeout(() => process.exit(0), 1000);
    });
    " 2>/dev/null
    
    echo -e "${GREEN}✅ Mensagem enviada!${NC}"
    echo -e "📤 \"$message\""
}

ouvir_mensagens() {
    echo -e "${CYAN}┌─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│       👂 OUVINDO MENSAGENS          │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────┘${NC}"
    echo ""
    
    read -p "🆔 ID do grupo: " group_id
    
    echo -e "${YELLOW}👂 Ouvindo mensagens do grupo $group_id...${NC}"
    echo -e "${YELLOW}Pressione CTRL+C para parar${NC}"
    echo ""
    
    node -e "
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'join',
            groupId: '$group_id'
        }));
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'message' && msg.groupId === '$group_id') {
            const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            console.log(\`[\\x1b[36m\${time}\\x1b[0m] \\x1b[32m\${msg.botName}:\\x1b[0m \${msg.text}\`);
        }
    });
    
    ws.on('error', () => {
        console.log('\\x1b[31m❌ Servidor não está rodando!\\x1b[0m');
        console.log('Execute primeiro: \\x1b[33mbotcmd iniciar\\x1b[0m');
        process.exit(1);
    });
    
    process.on('SIGINT', () => process.exit(0));
    "
}

iniciar_servidor() {
    echo -e "${CYAN}🚀 Iniciando servidor...${NC}"
    
    # Verificar se já está rodando
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${YELLOW}⚠️  Servidor já está rodando!${NC}"
        return
    fi
    
    cd "$INSTALL_DIR"
    nohup ./nodejs/bin/node server.js > server.log 2>&1 &
    
    sleep 2
    
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Servidor iniciado com sucesso!${NC}"
        echo -e "${BLUE}📡 WebSocket: ws://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Erro ao iniciar servidor!${NC}"
        echo -e "Verifique o log: ${YELLOW}cat $INSTALL_DIR/server.log${NC}"
    fi
}

parar_servidor() {
    echo -e "${YELLOW}🛑 Parando servidor...${NC}"
    pkill -f "node.*server.js"
    echo -e "${GREEN}✅ Servidor parado!${NC}"
}

status_servidor() {
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Servidor ONLINE${NC}"
        echo -e "${BLUE}📡 WebSocket: ws://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Servidor OFFLINE${NC}"
        echo -e "Use: ${YELLOW}botcmd iniciar${NC}"
    fi
}

# ============================================
# MENU PRINCIPAL
# ============================================

case "$1" in
    criar)
        criar_bot
        ;;
    listar|bots)
        listar_bots
        ;;
    usar)
        usar_bot "$2"
        ;;
    entrar|grupo)
        entrar_grupo
        ;;
    enviar|msg)
        enviar_mensagem
        ;;
    ouvir|listen)
        ouvir_mensagens
        ;;
    iniciar|start)
        iniciar_servidor
        ;;
    parar|stop)
        parar_servidor
        ;;
    status)
        status_servidor
        ;;
    ajuda|help|"")
        echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║              🤖 BOTCMD - COMANDOS DISPONÍVEIS            ║${NC}"
        echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}📱 GERENCIAR BOTS:${NC}"
        echo -e "  ${GREEN}botcmd criar${NC}        - Criar um novo bot"
        echo -e "  ${GREEN}botcmd listar${NC}        - Listar todos os bots"
        echo -e "  ${GREEN}botcmd usar [ID]${NC}     - Ativar um bot"
        echo ""
        echo -e "${YELLOW}👥 GRUPOS:${NC}"
        echo -e "  ${GREEN}botcmd entrar${NC}        - Entrar em um grupo"
        echo ""
        echo -e "${YELLOW}💬 MENSAGENS:${NC}"
        echo -e "  ${GREEN}botcmd enviar${NC}        - Enviar mensagem"
        echo -e "  ${GREEN}botcmd ouvir${NC}         - Ouvir mensagens em tempo real"
        echo ""
        echo -e "${YELLOW}⚙️  SERVIDOR:${NC}"
        echo -e "  ${GREEN}botcmd iniciar${NC}       - Iniciar servidor"
        echo -e "  ${GREEN}botcmd parar${NC}         - Parar servidor"
        echo -e "  ${GREEN}botcmd status${NC}        - Ver status do servidor"
        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}💡 Dica: Sempre inicie o servidor primeiro!${NC}"
        echo -e "    ${GREEN}botcmd iniciar${NC}"
        echo ""
        ;;
    *)
        echo -e "${RED}❌ Comando desconhecido!${NC}"
        echo -e "Use: ${YELLOW}botcmd ajuda${NC}"
        ;;
esac
EOF

chmod +x botcmd.sh

# ============================================
# INSTALAR JQ (para JSON)
# ============================================
echo "[3/4] Instalando jq..."
if ! command -v jq &> /dev/null; then
    wget -q https://github.com/jqlang/jq/releases/download/jq-1.7/jq-linux-amd64 -O /usr/local/bin/jq
    chmod +x /usr/local/bin/jq
fi

# ============================================
# CRIAR LINK GLOBAL
# ============================================
echo "[4/4] Configurando comando global..."
ln -sf $INSTALL_DIR/botcmd.sh /usr/local/bin/botcmd

# ============================================
# INICIAR SERVIDOR
# ============================================
cd $INSTALL_DIR
nohup ./nodejs/bin/node server.js > server.log 2>&1 &

# ============================================
# FINALIZAR
# ============================================
IP=$(ip route get 1 2>/dev/null | awk '{print $NF;exit}' || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALAÇÃO CONCLUÍDA!                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🤖 SISTEMA DE BOTS INSTALADO COM SUCESSO!${NC}"
echo ""
echo -e "${CYAN}📋 COMANDOS DISPONÍVEIS:${NC}"
echo -e "  ${YELLOW}botcmd ajuda${NC}     - Ver todos os comandos"
echo -e "  ${YELLOW}botcmd criar${NC}     - Criar um bot"
echo -e "  ${YELLOW}botcmd entrar${NC}    - Entrar em grupo"
echo -e "  ${YELLOW}botcmd enviar${NC}    - Enviar mensagem"
echo -e "  ${YELLOW}botcmd ouvir${NC}     - Ouvir mensagens"
echo ""
echo -e "${CYAN}🚀 COMEÇAR AGORA:${NC}"
echo -e "  1. ${GREEN}botcmd criar${NC}     # Crie seu primeiro bot"
echo -e "  2. ${GREEN}botcmd entrar${NC}    # Entre em um grupo"
echo -e "  3. ${GREEN}botcmd enviar${NC}    # Envie mensagens"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""