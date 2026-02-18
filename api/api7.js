// api/upload.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { filename, fileContentBase64 } = req.body;
    const blobUrl = `https://z8ga3u7wxbrsrhsc.public.blob.vercel-storage.com/${filename}`;
    
    const buffer = Buffer.from(fileContentBase64, "base64");
    
    const response = await fetch(blobUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer
    });
    
    res.status(response.ok ? 200 : 500).json({ ok: response.ok });
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}