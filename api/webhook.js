export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const token = "8486927008:AAE5EHA9NrCKOW7ujnUKzeyUbhGvX6DzrMU";
  const update = req.body;

  if (!update.message) return res.status(200).end();

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  // Import Firebase
  const { initializeApp } = require("firebase/app");
  const { getDatabase, ref, get, child } = require("firebase/database");

  const firebaseConfig = {
    apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
    authDomain: "html-15e80.firebaseapp.com",
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
    projectId: "html-15e80",
    storageBucket: "html-15e80.firebasestorage.app",
    messagingSenderId: "1068148640439",
    appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32",
    measurementId: "G-V57KRZ02HJ"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Comando para ver os consoles
  if (text === "/meusdados") {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `usuarios/${chatId}/consoles`));

    let resposta = "";
    if (snapshot.exists()) {
      const consoles = snapshot.val();
      resposta = Object.values(consoles).join("\n");
    } else {
      resposta = "Você ainda não salvou nenhum console 😅";
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: resposta })
    });
  }

  res.status(200).end();
}