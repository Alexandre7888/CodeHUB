export default async function handler(req, res) {
  // CORS aberto
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.end();

  const { token, fileName } = req.query;
  if (!token) return res.status(400).send("token obrigatório");

  const fbURL = `https://html-15e80-default-rtdb.firebaseio.com/index/${token}.json`;
  const r = await fetch(fbURL);
  if (!r.ok) return res.status(500).send("Erro Firebase");

  const data = await r.json();
  if (!data) return res.status(404).send("Sem arquivos");

  // 🔹 SEM fileName → JSON
  if (!fileName) {
    return res.json(data);
  }

  // 🔹 COM fileName → proxy
  let found = null;

  for (const id in data) {
    if (data[id].name === fileName) {
      found = data[id];
      break;
    }
  }

  if (!found) return res.status(404).send("Arquivo não encontrado");

  const buffer = Buffer.from(found.base64, "base64");
  res.setHeader("Content-Type", found.mimeType);
  res.setHeader("Content-Length", buffer.length);

  res.send(buffer);
}