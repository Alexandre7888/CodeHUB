const BOT_TOKEN = "8486927008:AAE5EHA9NrCKOW7ujnUKzeyUbhGvX6DzrMU";
const FIREBASE_DB = "https://html-15e80-default-rtdb.firebaseio.com";

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
      // Busca dados do usuário no Firebase via REST API
      const url = `${FIREBASE_DB}/usuarios/${chatId}/consoles.json`;
      const resp = await fetch(url);
      const data = await resp.json();

      let resposta = "";
      if (data) {
        resposta = Object.values(data).join("\n");
      } else {
        resposta = "Você ainda não salvou nenhum console 😅";
      }

      await sendMessage(chatId, resposta);
    }

    // --- Comando /enviar ---
    else if (text === "/enviar") {
      await sendMessage(chatId, "Ok! Agora me envie o arquivo ou vídeo que deseja salvar.");
    }

    else {
      await sendMessage(chatId, "Não conheço esse comando 😅");
    }

    res.status(200).end();
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.status(500).send("Erro interno do servidor");
  }
};