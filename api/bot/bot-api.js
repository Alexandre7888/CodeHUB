// ============================================
// Node.js - API Bot para Vercel
// ============================================

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const URL = "https://html-785e3-default-rtdb.firebaseio.com";

// ==================== Funções ====================
async function pegarNomeBot(botId) {
  try {
    let res = await fetch(`${URL}/users/${botId}.json`);
    let user = await res.json();
    if (user && (user.nome || user.name)) return user.nome || user.name;

    res = await fetch(`${URL}/bots/${botId}.json`);
    let bot = await res.json();
    if (bot && (bot.nome || bot.name)) return bot.nome || bot.name;

    res = await fetch(`${URL}/groups.json`);
    let groups = await res.json();
    if (groups) {
      for (let gid in groups) {
        if (groups[gid]?.members?.[botId]) {
          const m = groups[gid].members[botId];
          if (m.nome || m.name) return m.nome || m.name;
        }
      }
    }
  } catch(e) {
    console.error(e);
  }
  return botId;
}

function formatarHora(timestamp) {
  const date = new Date(timestamp);
  const horas = date.getHours().toString().padStart(2, '0');
  const minutos = date.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

async function enviarMensagem(botId, botNome, grupoId, texto, leitores = {}) {
  const timestamp = Date.now();
  const msg = {
    senderId: botId,
    senderName: botNome || botId,
    text: texto,
    timestamp,
    time: formatarHora(timestamp),
    type: "text",
    readBy: { [botId]: timestamp, ...leitores }
  };

  const res = await fetch(`${URL}/groups/${grupoId}/messages.json`, {
    method: 'POST',
    body: JSON.stringify(msg),
    headers: { 'Content-Type': 'application/json' }
  });

  return await res.json(); // retorna { name: "mensagemId" }
}

// ============================================
// Webhook Vercel (Serverless Function)
// ============================================
// Crie um arquivo api/sendMessage.js na Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { botId, grupoId, texto } = req.body;
  if (!botId || !grupoId || !texto) return res.status(400).json({ error: 'Faltando botId, grupoId ou texto' });

  try {
    const botNome = await pegarNomeBot(botId);
    const resultado = await enviarMensagem(botId, botNome, grupoId, texto);
    res.status(200).json({ success: true, mensagemId: resultado.name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
}