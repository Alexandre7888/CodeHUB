export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // 🔥 pega o body manualmente
    let body = "";

    for await (const chunk of req) {
      body += chunk;
    }

    const data = JSON.parse(body);

    const { fileBase64, fileName } = data;

    if (!fileBase64) {
      return res.status(400).json({ error: "fileBase64 faltando" });
    }

    const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        file: fileBase64,
        fileName: fileName || "teste.txt"
      })
    });

    const ikData = await ikRes.json();

    return res.status(200).json({
      url: ikData.url,
      fileId: ikData.fileId
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}