export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const BOT_TOKEN = process.env.BOT;
  const OPENAI_KEY = process.env.GPT;

  if (!BOT_TOKEN || !OPENAI_KEY) {
    return res.status(500).send("Env vars não configuradas");
  }

  const update = req.body;
  if (!update.message) return res.status(200).send("OK");

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  async function sendMessage(msg) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg
      })
    });
  }

  if (text === "/oi") {
    await sendMessage("Oi 😎 tô vivo sim!");
    return res.status(200).send("OK");
  }

  if (text.startsWith("/gpt")) {
    const prompt = text.replace("/gpt", "").trim();

    if (!prompt) {
      await sendMessage("Use assim:\n/gpt sua pergunta");
      return res.status(200).send("OK");
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        })
      }
    );

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content || "Erro na IA";

    await sendMessage(reply);
    return res.status(200).send("OK");
  }

  await sendMessage("Comando não reconhecido.");
  return res.status(200).send("OK");
}