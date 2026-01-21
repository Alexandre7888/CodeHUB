export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Envie mensagem no Telegram");
  }

  const update = req.body;

  if (update.message) {
    return res.status(200).json({
      chat_id: update.message.chat.id,
      tipo: update.message.chat.type,
      titulo: update.message.chat.title || "privado"
    });
  }

  res.status(200).send("Sem mensagem");
}
