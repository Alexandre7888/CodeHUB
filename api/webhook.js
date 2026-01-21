const fetch = require("node-fetch");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, child } = require("firebase/database");

// Configuração do Firebase
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

// Token do seu bot
const BOT_TOKEN = "8486927008:AAE5EHA9NrCKOW7ujnUKzeyUbhGvX6DzrMU";

// Função para enviar mensagem
async function sendMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
}

module.exports = async (req, res) => {
  try {
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
      const link = `https://code-hub-eta.vercel.app/app.html?user=${chatId}`;
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
      await sendMessage(chatId, "Ok! Agora me envie o arquivo ou vídeo que deseja salvar.");
    }

    // --- Qualquer outro comando desconhecido ---
    else {
      await sendMessage(chatId, "Não conheço esse comando 😅");
    }

    res.status(200).end();
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.status(500).send("Erro interno do servidor");
  }
};