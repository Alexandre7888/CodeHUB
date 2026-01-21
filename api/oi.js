export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const update = req.body;

  if (update.message) {
    console.log("CHAT ID:", update.message.chat.id);
  }

  res.status(200).end();
}
