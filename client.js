// client.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// lê storage do SEU domínio
function readStorage() {
  return {
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
  };
}

// quando o usuário logar
onAuthStateChanged(auth, user => {
  if (!user) return;

  const uid = user.uid;
  const userRef = ref(db, "users/" + uid);

  set(userRef, {
    email: user.email,
    online: true,
    lastSeen: serverTimestamp(),
    storage: readStorage(),
    ban: {
      active: false,
      until: null
    }
  });

  onDisconnect(userRef).update({
    online: false,
    lastSeen: serverTimestamp()
  });

  // escuta banimento
  onValue(userRef, snap => {
    if (!snap.exists()) return;
    const data = snap.val();

    if (data.ban?.active) {
      if (data.ban.until && Date.now() > data.ban.until) {
        update(userRef, { "ban/active": false, "ban/until": null });
        return;
      }

      document.documentElement.innerHTML = `
        <body style="background:#000;color:#fff;
        display:flex;align-items:center;justify-content:center;height:100vh">
          <h1>🚫 Conta banida</h1>
        </body>`;
    }
  });
});