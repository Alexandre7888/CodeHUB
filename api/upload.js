export default async function handler(req, res) {
  // 🌐 CORS aberto para todos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // responde preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { fileBase64, fileName } = req.body;

    // upload para ImageKit
    const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        file: fileBase64,
        fileName: fileName
      })
    });

    const ikData = await ikRes.json();

    // salvar no Firebase
    const firebaseRes = await fetch(
      "https://html-785e3-default-rtdb.firebaseio.com/files.json",
      {
        method: "POST",
        body: JSON.stringify({
          fileId: ikData.fileId,
          url: ikData.url,
          name: fileName,
          createdAt: Date.now()
        })
      }
    );

    const firebaseData = await firebaseRes.json();

    return res.status(200).json({
      id: firebaseData.name,
      fileId: ikData.fileId,
      url: ikData.url
    });

  } catch (e) {
    return res.status(500).json({ error: "erro" });
  }
}