import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, child } from "firebase/database";

// Config Firebase
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Coloque aqui o token do seu bot
const BOT_TOKEN = "8486927008:AAE5EHA9NrCKOW7ujnUKzeyUbhGvX6DzrMU";

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const update = req.body;
  if (!update.message) return res.status(200).end();

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  // --- Comando /start ---
  if (text === "/start") {
    await sendMessage(chatId, "Bot iniciado! Use /app para abrir o Web App ou /meusdados para ver seus dados.");
  }

  // --- Comando /oi ---
  else if (text === "/oi") {
    await sendMessage(chatId, "Oi! 😄 Como você tá?");
  }

  // --- Comando /app ---
  else if (text === "/app") {
    const link = `https://SEU_SITE_AQUI.com/?user=${chatId}`;
    await sendMessage(chatId, `Abra seu Web App aqui: ${link}`);
  }

  // --- Comando /meusdados ---
  else if (text === "/meusdados") {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `usuarios/${chatId}/consoles`));

    let resposta = "";
    if (snapshot.exists()) {
      const consoles = snapshot.val();
      resposta = Object.values(consoles).join("\n");
    } else {
      resposta = "Você ainda não salvou nenhum console 😅";
    }

    await sendMessage(chatId, resposta);
  }

  // --- Comando /enviar ---
  else if (text === "/enviar") {
    await sendMessage(chatId, "Ok! Agora me envie o arquivo ou vídeo que deseja salvar (em breve podemos integrar).");
  }

  // --- Qualquer outro comando desconhecido ---
  else {
    await sendMessage(chatId, "Não conheço esse comando 😅");
  }

  res.status(200).end();
}