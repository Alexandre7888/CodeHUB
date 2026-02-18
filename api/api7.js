export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { filename, fileBase64 } = req.body;
    if (!filename || !fileBase64) return res.status(400).json({ error: "Faltam dados" });

    const storeId = "store_Z8GA3U7wxbRsRhsc";
    const token = "vercel_blob_rw_Z8GA3U7wxbRsRhsc_YAxTwqsec4E063E8FrRqGY4aI2AvM4";

    // Endpoint PUT do Vercel Storage (o blob vai gerar ID interno)
    const url = `https://api.vercel.com/v1/blob/${storeId}/${encodeURIComponent(filename)}`;

    const buffer = Buffer.from(fileBase64, "base64");

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro no upload: ${response.status} ${text}`);
    }

    // URL pública final (Vercel vai gerar ID interno, mas você retorna para o frontend)
    const publicUrl = `https://z8ga3u7wxbrsrhsc.public.blob.vercel-storage.com/${encodeURIComponent(filename)}`;

    return res.status(200).json({ ok: true, url: publicUrl, name: filename });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}