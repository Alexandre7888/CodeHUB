export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { filename, fileBase64 } = req.body;
    if (!filename || !fileBase64) return res.status(400).json({ error: "Faltam dados" });

    // Token do Vercel Storage oficial
    const token = "vercel_blob_rw_Z8GA3U7wxbRsRhsc_YAxTwqsec4E063E8FrRqGY4aI2AvM4";

    // Endpoint oficial da API do Vercel Storage (funciona para PUT)
    const blobUrl = `https://api.vercel.com/v1/blob/storage/${filename}?token=${token}`;

    const buffer = Buffer.from(fileBase64, "base64");

    const response = await fetch(blobUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro no upload: ${response.status} ${text}`);
    }

    return res.status(200).json({ ok: true, url: blobUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}