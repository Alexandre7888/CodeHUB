const ApiBot = (function() {
  const URL = "https://html-785e3-default-rtdb.firebaseio.com";

  async function enviarMensagem(botId, botNome, grupoId, texto) {
    const msg = {
      senderId: botId,
      senderName: botNome,
      text: texto,
      timestamp: Date.now(),
      type: "text"
    };
    const r = await fetch(`${URL}/groups/${grupoId}/messages.json`, {
      method: 'POST',
      body: JSON.stringify(msg)
    });
    return r.json();
  }

  async function pegarTodosUsuarios() {
    const usuarios = {};
    const usersSnap = await fetch(`${URL}/users.json`).then(r => r.json());
    if (usersSnap) Object.assign(usuarios, usersSnap);
    const groupsSnap = await fetch(`${URL}/groups.json`).then(r => r.json());
    if (groupsSnap) {
      for (let gid in groupsSnap) {
        const group = groupsSnap[gid];
        if (group.members) {
          for (let uid in group.members) {
            if (!usuarios[uid]) {
              const member = group.members[uid];
              usuarios[uid] = typeof member === 'string' 
                ? { id: uid, nome: uid, role: member }
                : { id: uid, nome: member.name || member.nome || uid, ...member };
            }
          }
        }
      }
    }
    return usuarios;
  }

  async function pegarNomeUsuario(userId) {
    if (!userId) return null;
    const userSnap = await fetch(`${URL}/users/${userId}.json`).then(r => r.json());
    if (userSnap) return userSnap.nome || userSnap.name || userId;
    const groupsSnap = await fetch(`${URL}/groups.json`).then(r => r.json());
    if (groupsSnap) {
      for (let gid in groupsSnap) {
        const group = groupsSnap[gid];
        if (group.members && group.members[userId]) {
          const m = group.members[userId];
          return m.nome || m.name || userId;
        }
      }
    }
    return userId;
  }

  async function pegarUsuario(userId) {
    if (!userId) return null;
    const user = await fetch(`${URL}/users/${userId}.json`).then(r => r.json());
    if (user) return user;
    const groupsSnap = await fetch(`${URL}/groups.json`).then(r => r.json());
    if (groupsSnap) {
      for (let gid in groupsSnap) {
        const group = groupsSnap[gid];
        if (group.members && group.members[userId]) {
          return { id: userId, ...group.members[userId] };
        }
      }
    }
    return { id: userId, nome: userId };
  }

  async function entrarGrupo(botId, botNome, grupoId) {
    await fetch(`${URL}/groups/${grupoId}/members/${botId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ id: botId, nome: botNome, joinedAt: Date.now(), role: 'bot' })
    });
  }

  return {
    enviarMensagem,
    pegarTodosUsuarios,
    pegarNomeUsuario,
    pegarUsuario,
    entrarGrupo
  };
})();

if (typeof window !== 'undefined') window.ApiBot = ApiBot;
if (typeof module !== 'undefined') module.exports = ApiBot;