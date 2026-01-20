export default async function handler(req, res) {
  // CORS totalf
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { token, fileName } = req.query;
  if (!token) return res.status(400).send("token é obrigatório");

  const url = `https://html-15e80-default-rtdb.firebaseio.com/index/${token}.json`;
  const r = await fetch(url);
  if (!r.ok) return res.status(500).send("Erro no Firebase");

  const data = await r.json();
  if (!data) return res.status(404).send("Nenhum arquivo");

  // 🔹 MODO JSON (só token)
  if (!fileName) {
    return res.json(data);
  }

  // 🔹 MODO ARQUIVO
  let file = null;
  for (const id in data) {
    if (data[id].name === fileName) {
      file = data[id];
      break;
    }
  }

  if (!file) return res.status(404).send("Arquivo não encontrado");

  const buffer = Buffer.from(file.base64, "base64");
  res.setHeader("Content-Type", file.mimeType);

  // texto
  if (file.mimeType.startsWith("text")) {
    return res.send(buffer.toString());
  }

  // imagem / vídeo / áudio / download
  res.send(buffer);
}