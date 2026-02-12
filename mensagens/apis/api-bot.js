const ApiBot = (function() {
  const URL = "https://html-785e3-default-rtdb.firebaseio.com";

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
      console.error(e);
    }
    return botId;
  }

  async function enviarMensagem(botId, botNome, grupoId, texto) {
    const msg = {
      senderId: botId,
      senderName: botNome || botId,
      text: texto,
      timestamp: Date.now()
    };
    await fetch(`${URL}/groups/${grupoId}/messages.json`, {
      method: 'POST',
      body: JSON.stringify(msg)
    });
    return true;
  }

  return {
    pegarNomeBot,
    enviarMensagem
  };
})();

if (typeof window !== 'undefined') window.ApiBot = ApiBot;