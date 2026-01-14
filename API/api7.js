// api7.js — API de navegador

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* API */
window.api7 = {
  ready: false,

  /* UPLOAD */
  async upload(token, file) {
    const id = "f_" + Date.now();
    const CHUNK = 1024 * 512;
    const chunks = [];

    for (let i = 0; i < file.base64.length; i += CHUNK) {
      chunks.push(file.base64.slice(i, i + CHUNK));
    }

    const updates = {};
    updates[`files/${token}/${id}`] = {
      name: file.name,
      mimeType: file.mimeType,
      chunks
    };
    updates[`index/${token}/${id}`] = {
      name: file.name,
      mimeType: file.mimeType,
      base64: file.base64
    };

    await update(ref(db), updates);
    return { ok: true, id };
  },

  /* LISTAR (INDEX) */
  async getAll(token) {
    const snap = await get(ref(db, `index/${token}`));
    if (!snap.exists()) return {};

    const data = snap.val();
    const result = {};
    for (const id in data) {
      const f = data[id];
      result[id] = { id, name: f.name, mimeType: f.mimeType, base64: f.base64 };
    }
    return result;
  },

  /* PEGAR 1 */
  async getFile(token, id) {
    const snap = await get(ref(db, `index/${token}/${id}`));
    if (!snap.exists()) return null;
    const f = snap.val();
    return { id, name: f.name, mimeType: f.mimeType, base64: f.base64 };
  },

  /* BUSCAR POR NOME */
  async search(token, text) {
    const all = await this.getAll(token);
    const out = {};
    for (const id in all) {
      if (all[id].name.toLowerCase().includes(text.toLowerCase())) out[id] = all[id];
    }
    return out;
  },

  /* TAMANHO */
  async getSize(token, id) {
    const f = await this.getFile(token, id);
    if (!f) return null;
    const bytes = Math.floor((f.base64.length * 3) / 4);
    return { bytes, kb: (bytes/1024).toFixed(2), mb: (bytes/1024/1024).toFixed(2) };
  },

  /* DATA URL */
  async getDataURL(token, id) {
    const f = await this.getFile(token, id);
    if (!f) return null;
    return `data:${f.mimeType};base64,${f.base64}`;
  },

  /* RENOMEAR */
  async rename(token, id, newName) {
    const updates = {};
    updates[`files/${token}/${id}/name`] = newName;
    updates[`index/${token}/${id}/name`] = newName;
    await update(ref(db), updates);
    return { ok: true };
  },

  /* EXCLUIR */
  async remove(token, id) {
    const updates = {};
    updates[`files/${token}/${id}`] = null;
    updates[`index/${token}/${id}`] = null;
    await update(ref(db), updates);
    return { ok: true };
  }
};

window.api7.ready = true;