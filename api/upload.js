export default async function handler(req, res) {
  // CORS aberto
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { upload, atualiza, file } = req.query;

  try {

    // 📤 UPLOAD NOVO
    if (upload) {
      const base64 = "data:text/plain;base64," + upload;

      const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          file: base64,
          fileName: "arquivo.txt"
        })
      });

      const ikData = await ikRes.json();

      return res.status(200).json({
        fileId: ikData.fileId,
        url: ikData.url
      });
    }

    // 🔄 ATUALIZAR (deleta e envia novo)
    if (atualiza && file) {
      const base64 = "data:text/plain;base64," + file;

      // deleta antigo
      await fetch(`https://api.imagekit.io/v1/files/${atualiza}`, {
        method: "DELETE",
        headers: {
          Authorization: "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64")
        }
      });

      // envia novo
      const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          file: base64,
          fileName: "arquivo.txt"
        })
      });

      const ikData = await ikRes.json();

      return res.status(200).json({
        fileId: ikData.fileId,
        url: ikData.url
      });
    }

    return res.status(400).json({ error: "Use ?upload= ou ?atualiza=" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}