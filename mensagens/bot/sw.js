// ============================================
// SERVICE WORKER - BOT EM SEGUNDO PLANO 24/7
// ============================================
const CACHE_NAME = 'bot-background-v1';
const FIREBASE_URL = "https://html-785e3-default-rtdb.firebaseio.com";

// Instala e ativa
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ============================================
// RECEBE COMANDOS DO PAINEL
// ============================================
self.addEventListener('message', (event) => {
  const { type, botId, botNome, botAvatar, grupoId, comandos } = event.data;
  
  if (type === 'ATIVAR_BOT') {
    salvarBotAtivo(botId, {
      botNome,
      botAvatar,
      grupoId,
      comandos,
      ativo: true,
      ultimaExecucao: Date.now()
    });
    
    // Executa imediatamente
    executarBot(botId, botNome, grupoId, comandos);
  }
  
  if (type === 'DESATIVAR_BOT') {
    removerBotAtivo(botId);
  }
  
  if (type === 'EXECUTAR_AGORA') {
    executarBot(botId, botNome, grupoId, comandos);
  }
  
  if (type === 'GET_STATUS') {
    getBotsAtivos().then(bots => {
      event.ports[0].postMessage(bots);
    });
  }
});

// ============================================
// EXECUTA A CADA 20 SEGUNDOS (MESMO FECHADO)
// ============================================
setInterval(async () => {
  const botsAtivos = await getBotsAtivos();
  
  for (const [botId, config] of Object.entries(botsAtivos)) {
    if (config.ativo) {
      console.log(`🔄 [BACKGROUND] Executando bot ${botId}...`);
      await executarBot(botId, config.botNome, config.grupoId, config.comandos);
      
      // Atualiza última execução
      config.ultimaExecucao = Date.now();
      await salvarBotAtivo(botId, config);
    }
  }
}, 20000); // 20 segundos

// ============================================
// FUNÇÕES DO BOT
// ============================================

function formatarHora(timestamp) {
  const date = new Date(timestamp);
  const horas = date.getHours().toString().padStart(2, '0');
  const minutos = date.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

async function executarBot(botId, botNome, grupoId, comandos) {
  try {
    if (!comandos || !grupoId || !botId) return;
    if (!comandos.length) return;
    
    // Busca últimas mensagens
    const response = await fetch(`${FIREBASE_URL}/groups/${grupoId}/messages.json?orderBy="$key"&limitToLast=20`);
    const mensagens = await response.json();
    
    if (!mensagens) return;
    
    // Busca mensagens já processadas
    const processadas = await getMensagensProcessadas(botId);
    
    // Processa cada mensagem
    for (const [msgId, msg] of Object.entries(mensagens)) {
      if (!msg || !msg.text) continue;
      if (msg.senderId === botId) continue;
      if (processadas.includes(msgId)) continue;
      
      // Executa comandos
      for (const comando of comandos) {
        try {
          const reply = (texto) => {
            enviarMensagem(botId, botNome, grupoId, texto);
          };
          
          // Eval seguro
          const fn = new Function('msg', 'reply', comando.code || comando.codigo);
          fn(msg, reply);
          
          // Marca como processada
          await marcarProcessada(botId, msgId);
          
        } catch (e) {
          console.error('Erro no comando:', e);
        }
      }
    }
    
  } catch (error) {
    console.error(`Erro no bot ${botId}:`, error);
  }
}

async function enviarMensagem(botId, botNome, grupoId, texto) {
  try {
    const timestamp = Date.now();
    const horaFormatada = formatarHora(timestamp);
    
    const mensagem = {
      senderId: botId,
      senderName: botNome || botId,
      text: texto,
      timestamp: timestamp,
      time: horaFormatada,
      type: "text",
      readBy: {
        [botId]: timestamp
      }
    };
    
    await fetch(`${FIREBASE_URL}/groups/${grupoId}/messages.json`, {
      method: 'POST',
      body: JSON.stringify(mensagem),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Atualiza contador
    const countRes = await fetch(`${FIREBASE_URL}/bots/${botId}/messageCount.json`);
    let count = await countRes.json() || 0;
    
    await fetch(`${FIREBASE_URL}/bots/${botId}/messageCount.json`, {
      method: 'PUT',
      body: JSON.stringify(count + 1)
    });
    
    // Notificação
    self.registration.showNotification('🤖 Bot respondeu!', {
      body: `${botNome}: ${texto}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png'
    });
    
  } catch (e) {
    console.error('Erro ao enviar mensagem:', e);
  }
}

// ============================================
// INDEXEDDB - ARMAZENAMENTO PERSISTENTE
// ============================================
const DB_NAME = 'BotBackgroundDB';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('bots')) {
        db.createObjectStore('bots', { keyPath: 'botId' });
      }
      
      if (!db.objectStoreNames.contains('processadas')) {
        const store = db.createObjectStore('processadas', { keyPath: 'id' });
        store.createIndex('botId', 'botId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function salvarBotAtivo(botId, config) {
  const db = await openDB();
  const transaction = db.transaction('bots', 'readwrite');
  const store = transaction.objectStore('bots');
  await store.put({ botId, ...config });
}

async function removerBotAtivo(botId) {
  const db = await openDB();
  const transaction = db.transaction('bots', 'readwrite');
  const store = transaction.objectStore('bots');
  await store.delete(botId);
}

async function getBotsAtivos() {
  const db = await openDB();
  const transaction = db.transaction('bots', 'readonly');
  const store = transaction.objectStore('bots');
  
  const bots = {};
  const request = store.openCursor();
  
  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        bots[cursor.value.botId] = cursor.value;
        cursor.continue();
      } else {
        resolve(bots);
      }
    };
    request.onerror = () => resolve({});
  });
}

async function marcarProcessada(botId, msgId) {
  const db = await openDB();
  const transaction = db.transaction('processadas', 'readwrite');
  const store = transaction.objectStore('processadas');
  
  await store.put({
    id: `${botId}_${msgId}`,
    botId,
    msgId,
    timestamp: Date.now()
  });
}

async function getMensagensProcessadas(botId) {
  const db = await openDB();
  const transaction = db.transaction('processadas', 'readonly');
  const store = transaction.objectStore('processadas');
  const index = store.index('botId');
  
  const request = index.getAll(botId);
  
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const processadas = request.result.map(p => p.msgId);
      resolve(processadas);
    };
    request.onerror = () => resolve([]);
  });
}

// Limpar mensagens velhas (7 dias)
setInterval(async () => {
  const db = await openDB();
  const transaction = db.transaction('processadas', 'readwrite');
  const store = transaction.objectStore('processadas');
  const index = store.index('timestamp');
  
  const seteDiasAtras = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const range = IDBKeyRange.upperBound(seteDiasAtras);
  
  const request = index.openCursor(range);
  
  request.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      store.delete(cursor.primaryKey);
      cursor.continue();
    }
  };
}, 86400000); // 1 dia