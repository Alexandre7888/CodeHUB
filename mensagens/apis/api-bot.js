const ApiBot = (function() {
  const URL = "https://html-785e3-default-rtdb.firebaseio.com";

  async function pegarNomeBot(botId) {
    const user = await fetch(`${URL}/users/${botId}.json`).then(r => r.json());
    if (user) return user.nome || user.name || botId;
    
    const bot = await fetch(`${URL}/bots/${botId}.json`).then(r => r.json());
    if (bot) return bot.nome || bot.name || botId;
    
    const groups = await fetch(`${URL}/groups.json`).then(r => r.json());
    for (let gid in groups) {
      if (groups[gid].members?.[botId]) {
        const m = groups[gid].members[botId];
        return m.nome || m.name || botId;
      }
    }
    
    return botId;
  }

  async function enviarMensagem(botId, botNome, grupoId, texto) {
    const msg = {
      senderId: botId,
      senderName: botNome,
      text: texto,
      timestamp: Date.now()
    };
    await fetch(`${URL}/groups/${grupoId}/messages.json`, {
      method: 'POST',
      body: JSON.stringify(msg)
    });
  }

  return {
    pegarNomeBot,
    enviarMensagem
  };
})();

if (typeof window !== 'undefined') window.ApiBot = ApiBot;