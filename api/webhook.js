export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  // Coloca seu token direto aqui
  const token = "8486927008:AAE5EHA9NrCKOW7ujnUKzeyUbhGvX6DzrMU";
  const update = req.body;

  if (!update.message) return res.status(200).end();

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  let resposta = "";

  // Comandos simples
  if (text === "/oi") {
    resposta = "Oi! 😄 Como você tá?";
  } else if (text === "/start") {
    resposta = "Bot iniciado 🚀 Use /oi para testar!";
  } else {
    resposta = "Não conheço esse comando 😅";
  }

  // Envia resposta
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: resposta
    })
  });

  res.status(200).end();
}