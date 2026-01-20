export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.end();

  const { token, fileName } = req.query;
  if (!token) return res.status(400).send("token obrigatório");

  // 🔹 buscar index
  const indexURL = `https://html-15e80-default-rtdb.firebaseio.com/index/${token}.json`;
  const indexRes = await fetch(indexURL);
  const index = await indexRes.json();

  if (!index) return res.status(404).send("sem arquivos");

  // 🔹 só token → JSON
  if (!fileName) {
    return res.json(index);
  }

  // 🔹 procurar arquivo pelo nome
  let fileId = null;
  let meta = null;

  for (const id in index) {
    if (index[id].name === fileName) {
      fileId = id;
      meta = index[id];
      break;
    }
  }

  if (!fileId) return res.status(404).send("arquivo não encontrado");

  // 🔹 buscar chunks
  const chunksURL = `https://html-15e80-default-rtdb.firebaseio.com/files/${token}/${fileId}/chunks.json`;
  const chunksRes = await fetch(chunksURL);
  const chunks = await chunksRes.json();

  if (!chunks || !Array.isArray(chunks))
    return res.status(500).send("chunks inválidos");

  // 🔹 juntar tudo
  const base64 = chunks.join("");
  const buffer = Buffer.from(base64, "base64");

  res.setHeader("Content-Type", meta.mimeType);
  res.send(buffer);
}