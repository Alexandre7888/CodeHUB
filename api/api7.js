export default async function handler(req, res) {
  // Permitir CORS para qualquer origem
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responder OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { filename, fileBase64 } = req.body;
    if (!filename || !fileBase64) {
      return res.status(400).json({ error: "Faltam dados" });
    }

    const token = "vercel_blob_rw_Z8GA3U7wxbRsRhsc_YAxTwqsec4E063E8FrRqGY4aI2AvM4";
    const blobUrl = `https://z8ga3u7wxbrsrhsc.public.blob.vercel-storage.com/${filename}?token=${token}`;

    const buffer = Buffer.from(fileBase64, "base64");

    // PUT no blob usando token
    const response = await fetch(blobUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer
    });

    if (!response.ok) {
      throw new Error(`Erro no upload: ${response.statusText}`);
    }

    return res.status(200).json({ ok: true, url: blobUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}