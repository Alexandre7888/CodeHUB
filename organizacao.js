// ======================================================
//  CodeHUB - API de Organização (UI + IndexedDB)
// ======================================================

// -----------------------------------------------
// CONFIG FIREBASE REST (para validação do token)
// -----------------------------------------------
const FIREBASE_DB = "https://html-15e80-default-rtdb.firebaseio.com";

// -----------------------------------------------
// PEGAR TOKEN DA URL
// -----------------------------------------------
function getTokenFromURL() {
    const url = new URL(window.location.href);
    return url.searchParams.get("token");
}
const TOKEN = getTokenFromURL();

// -----------------------------------------------
// VERIFICAR TOKEN NO FIREBASE
// -----------------------------------------------
async function validarToken() {
    if (!TOKEN) {
        alert("API Organização: Nenhum token encontrado.");
        return false;
    }

    const url = `${FIREBASE_DB}/tokens/${TOKEN}.json`;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (json === null) {
            alert("Token inválido! A API não vai funcionar.");
            console.error("Token inválido.");
            return false;
        }

        console.log("Token válido:", TOKEN);
        return true;

    } catch (err) {
        console.error("Erro ao validar token:", err);
        return false;
    }
}

// ======================================================
// INDEXEDDB
// ======================================================
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("CodeHUB_Organizacao", 1);

        req.onupgradeneeded = e => {
            db = e.target.result;
            db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        };

        req.onsuccess = e => {
            db = e.target.result;
            resolve();
        };

        req.onerror = () => reject();
    });
}

// ======================================================
// FUNÇÕES GLOBAIS DA API
// ======================================================
const Org = {
    add(text) {
        const tx = db.transaction("items", "readwrite");
        tx.objectStore("items").add({ text, createdAt: Date.now() });
        atualizarLista();
    },

    remove(id) {
        const tx = db.transaction("items", "readwrite");
        tx.objectStore("items").delete(id);
        atualizarLista();
    },

    clear() {
        const tx = db.transaction("items", "readwrite");
        tx.objectStore("items").clear();
        atualizarLista();
    },

    getAll(callback) {
        const tx = db.transaction("items", "readonly");
        const req = tx.objectStore("items").getAll();
        req.onsuccess = () => callback(req.result);
    }
};

// ======================================================
// CRIAÇÃO AUTOMÁTICA DA INTERFACE
// ======================================================
function criarInterface() {
    const css = `
    .org-box {
        font-family: Arial;
        background: #fff;
        max-width: 500px;
        margin: 30px auto;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px #0002;
    }
    .org-input {
        width: 100%; padding: 12px;
        border: 1px solid #ccc; border-radius: 6px;
        margin-bottom: 10px;
    }
    .org-btn {
        width: 100%; padding: 12px; margin-top: 5px;
        border: none; border-radius: 6px;
        background: #4CAF50; color: white; cursor: pointer;
        font-size: 15px;
    }
    .org-del-all {
        background: #d9534f;
    }
    .org-item {
        background: #f0f0f0;
        padding: 10px; border-radius: 6px;
        margin-top: 10px;
    }
    .org-del {
        margin-top: 5px; width: 100%;
        background: #d9534f; border: none; padding: 8px;
        color: white; border-radius: 6px; cursor: pointer;
    }
    `;
    
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);

    const box = document.createElement("div");
    box.className = "org-box";
    box.innerHTML = `
        <h2>Organização</h2>
        <input id="orgInput" class="org-input" placeholder="Digite algo...">
        <button class="org-btn" id="addBtn">Salvar</button>
        <button class="org-btn org-del-all" id="clearBtn">Apagar Tudo</button>
        <h3>Itens:</h3>
        <div id="orgLista"></div>
    `;

    document.body.appendChild(box);

    document.getElementById("addBtn").onclick = () => {
        const value = document.getElementById("orgInput").value.trim();
        if (!value) return alert("Digite algo!");
        Org.add(value);
        document.getElementById("orgInput").value = "";
    };

    document.getElementById("clearBtn").onclick = () => {
        if (confirm("Apagar tudo?")) Org.clear();
    };
}

// ======================================================
// ATUALIZAR LISTA AUTOMATICAMENTE
// ======================================================
function atualizarLista() {
    if (!db) return;

    Org.getAll(items => {
        const lista = document.getElementById("orgLista");
        if (!lista) return;

        lista.innerHTML = "";

        items.forEach(item => {
            const div = document.createElement("div");
            div.className = "org-item";
            div.innerHTML = `
                ${item.text}
                <br>
                <button class="org-del" onclick="Org.remove(${item.id})">Excluir</button>
            `;
            lista.appendChild(div);
        });
    });
}

// ======================================================
// INICIAR API
// ======================================================
async function iniciarAPI() {
    const ok = await validarToken();
    if (!ok) return;

    await initDB();
    criarInterface();
    atualizarLista();
}

iniciarAPI();