// ================================
// API2 — Buscar Projetos
// ================================
const FIREBASE_DB = "https://html-15e80-default-rtdb.firebaseio.com";

// Resolve userId => baseado no users e no prefixo da userKey
async function resolveUserId() {
  const userKey = localStorage.getItem("userKey");
  const userName = localStorage.getItem("userName");

  if (!userKey && !userName) return null;

  // 1 — tenta via /users
  try {
    const r = await fetch(`${FIREBASE_DB}/users.json`);
    const users = await r.json() || {};

    const uname = String(userName || "").toLowerCase();

    for (const uid in users) {
      const u = users[uid];
      if (!u) continue;

      const names = [
        u.name,
        u.displayName,
        u.username,
        u.userName,
        u.email
      ]
        .filter(Boolean)
        .map(s => String(s).toLowerCase());

      if (names.includes(uname)) return uid;
    }
  } catch {}

  // 2 — fallback via prefixo da userKey
  if (userKey) {
    const prefix = String(userKey).split("-")[0];
    if (prefix) return prefix;
  }

  return null;
}

// ================================
// BUSCAR PROJETOS
// ================================
window.api2_buscarProjetos = async function () {
  try {
    const userId = await resolveUserId();

    if (!userId) {
      return { sucesso: false, erro: "userId não encontrado" };
    }

    const req = await fetch(`${FIREBASE_DB}/projects/${userId}.json`);
    const data = await req.json();

    if (!data) {
      return { sucesso: false, erro: "Nenhum projeto encontrado" };
    }

    const projetos = {};

    for (const pid in data) {
      const p = data[pid] || {};
      const filesObj = p.files || {};
      const filesNormalized = {};

      for (const fid in filesObj) {
        const file = filesObj[fid] || {};

        let link = null;

        if (file.directUrl) link = file.directUrl;
        else if (file.url) link = file.url;
        else if (file.link) link = file.link;
        else if (file.content && file.content.startsWith("http")) link = file.content;
        else if (typeof file === "string" && file.startsWith("http")) link = file;

        const content = file.content || null;
        const filename = file.name || file.originalName || fid;

        filesNormalized[filename] = {
          name: filename,
          link: link || "",
          content: content || ""
        };
      }

      projetos[pid] = {
        id: pid,
        name: p.name || `Projeto ${pid}`,
        createdAt: p.createdAt || null,
        files: filesNormalized
      };
    }

    return { sucesso: true, projetos };

  } catch (e) {
    return { sucesso: false, erro: e.message };
  }
};

// ================================
// POLLING (tempo real)
// ================================
window.api2_startPolling = function (callback, interval = 5000) {
  let stopped = false;
  let timer = null;

  async function loop() {
    if (stopped) return;
    const r = await window.api2_buscarProjetos();
    callback(r);
    timer = setTimeout(loop, interval);
  }

  loop();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
};