export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const token = process.env.BOT_TOKEN;
  const update = req.body;

  if (!update.message) {
    return res.status(200).end();
  }

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  let resposta = "🤖 Bot online!";

  if (text === "/start") {
    resposta = "🚀 Bot funcionando na Vercel";
  }

  if (text === "/id") {
    resposta = `🆔 Chat ID: ${chatId}`;
  }

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