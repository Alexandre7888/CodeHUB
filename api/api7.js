import https from "https";
import { URL } from "url";

export default async function handler(req, res) {
  const base64Data = req.query.base64;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) return res.status(500).json({ error: "Token não configurado" });
  if (!base64Data) return res.status(400).json({ error: "Falta ?base64=..." });

  try {
    const buffer = Buffer.from(base64Data, "base64");

    // Gera nome automático do arquivo
    const blobName = `file-${Date.now()}`;

    // URL completa para enviar
    const url = new URL(`https://z8ga3u7wxbrsrhsc.public.blob.vercel-storage.com/${blobName}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Length": buffer.length,
        "Content-Type": "application/octet-stream"
      }
    };

    const request = https.request(options, (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        res.status(200).json({ success: true, blobUrl: url.toString() });
      } else {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => res.status(response.statusCode).json({ error: data }));
      }
    });

    request.on("error", (err) => res.status(500).json({ error: err.message }));
    request.write(buffer);
    request.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}