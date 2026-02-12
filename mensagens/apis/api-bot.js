const ApiBot = (function() {
  const URL = "https://html-785e3-default-rtdb.firebaseio.com";

  // ============================================
  // FORMATAR HORA
  // ============================================
  function formatarHora(timestamp) {
    const date = new Date(timestamp);
    const horas = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  // ============================================
  // PEGAR NOME DO BOT
  // ============================================
  async function pegarNomeBot(botId) {
    try {
      const res = await fetch(`${URL}/users/${botId}.json`);
      const user = await res.json();
      if (user && (user.nome || user.name)) return user.nome || user.name;

      const res2 = await fetch(`${URL}/bots/${botId}.json`);
      const bot = await res2.json();
      if (bot && (bot.nome || bot.name)) return bot.nome || bot.name;

      const res3 = await fetch(`${URL}/groups.json`);
      const groups = await res3.json();
      if (groups) {
        for (let gid in groups) {
          if (groups[gid]?.members?.[botId]) {
            const m = groups[gid].members[botId];
            if (m.nome || m.name) return m.nome || m.name;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao pegar nome do bot:', e);
    }
    return botId;
  }

  // ============================================
  // ENVIAR MENSAGEM - FORMATO CORRETO ✅
  // ============================================
  async function enviarMensagem(botId, botNome, grupoId, texto) {
    try {
      const timestamp = Date.now();
      const horaFormatada = formatarHora(timestamp);
      
      // ✅ FORMATO EXATO DO SEU JSON
      const msg = {
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

      console.log('📤 Enviando mensagem no formato correto:', msg);

      const response = await fetch(`${URL}/groups/${grupoId}/messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(msg)
      });

      const result = await response.json();
      console.log('✅ Mensagem enviada! ID:', result.name);
      
      return {
        success: true,
        messageId: result.name,
        data: msg
      };

    } catch (e) {
      console.error('❌ Erro ao enviar mensagem:', e);
      return {
        success: false,
        error: e.message
      };
    }
  }

  // ============================================
  // ENVIAR COM READBY PERSONALIZADO
  // ============================================
  async function enviarComReadBy(botId, botNome, grupoId, texto, leitores = {}) {
    try {
      const timestamp = Date.now();
      const horaFormatada = formatarHora(timestamp);
      
      const msg = {
        senderId: botId,
        senderName: botNome || botId,
        text: texto,
        timestamp: timestamp,
        time: horaFormatada,
        type: "text",
        readBy: {
          [botId]: timestamp,
          ...leitores
        }
      };

      const response = await fetch(`${URL}/groups/${grupoId}/messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(msg)
      });

      const result = await response.json();
      return {
        success: true,
        messageId: result.name
      };

    } catch (e) {
      console.error('Erro:', e);
      return { success: false };
    }
  }

  // ============================================
  // MARCAR MENSAGEM COMO LIDA
  // ============================================
  async function marcarComoLida(grupoId, mensagemId, userId) {
    try {
      const timestamp = Date.now();
      
      await fetch(`${URL}/groups/${grupoId}/messages/${mensagemId}/readBy/${userId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timestamp)
      });
      
      return true;
    } catch (e) {
      console.error('Erro ao marcar como lida:', e);
      return false;
    }
  }

  // ============================================
  // BUSCAR MENSAGENS DO GRUPO
  // ============================================
  async function buscarMensagens(grupoId, limite = 50) {
    try {
      const response = await fetch(`${URL}/groups/${grupoId}/messages.json?orderBy="$key"&limitToLast=${limite}`);
      const mensagens = await response.json();
      
      // Converte objeto para array e ordena
      const mensagensArray = Object.entries(mensagens || {})
        .map(([id, msg]) => ({
          id,
          ...msg
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return mensagensArray;
      
    } catch (e) {
      console.error('Erro ao buscar mensagens:', e);
      return [];
    }
  }

  // ============================================
  // FORMATAR HORA (EXPOSTO)
  // ============================================
  function getHoraAtual() {
    return formatarHora(Date.now());
  }

  return {
    pegarNomeBot,
    enviarMensagem,
    enviarComReadBy,
    marcarComoLida,
    buscarMensagens,
    formatarHora,
    getHoraAtual
  };

})();

// Exporta para window
if (typeof window !== 'undefined') window.ApiBot = ApiBot;

// Exporta para Node.js (se necessário)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiBot;
}