// api/bot.js
export const config = {
  runtime: 'edge',
};

const URL = "https://html-785e3-default-rtdb.firebaseio.com";

function formatarHora(timestamp) {
  const date = new Date(timestamp);
  const horas = date.getHours().toString().padStart(2, '0');
  const minutos = date.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

async function pegarNomeBot(botId) {
  try {
    const res1 = await fetch(`${URL}/users/${botId}.json`);
    const user = await res1.json();
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
    console.error(e);
  }
  return botId;
}

// Envia mensagem replicando fielmente o JSON que você mostrou
async function enviarMensagem(botId, botNome, grupoId, texto, options = {}) {
  const timestamp = Date.now();
  const time = formatarHora(timestamp);

  const msg = {
    senderId: botId,
    senderName: botNome || botId,
    text: texto,
    timestamp,
    time,
    type: "text",
    automated: options.automated || false,
    sistema247: options.sistema247 || false,
    readBy: options.readBy || { [botId]: timestamp }
  };

  const res = await fetch(`${URL}/groups/${grupoId}/messages.json`, {
    method: 'POST',
    body: JSON.stringify(msg),
    headers: { 'Content-Type': 'application/json' }
  });

  return await res.json(); // retorna o ID da mensagem gerado pelo Firebase
}

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers
    });
  }

  try {
    const data = await req.json();
    const { botId, grupoId, texto, automated, sistema247, readBy } = data;

    if (!botId || !grupoId || !texto) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers
      });
    }

    const botNome = await pegarNomeBot(botId);
    const resultado = await enviarMensagem(botId, botNome, grupoId, texto, { automated, sistema247, readBy });

    return new Response(JSON.stringify({ success: true, resultado }), { status: 200, headers });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}