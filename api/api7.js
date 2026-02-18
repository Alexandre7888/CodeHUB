// api/upload.js
export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const base64Data = req.query.base64;

  if (!token) return res.status(500).json({ error: 'Token não configurado' });
  if (!base64Data) return res.status(400).json({ error: 'Falta ?base64=...' });

  try {
    const buffer = Buffer.from(base64Data, 'base64');

    // Exemplo: usando fetch nativo do Node 18+ (Vercel já suporta)
    const blobUrl = 'https://your-blob-storage.com/upload/file.png';

    const response = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    res.status(200).json({ success: true, message: 'Arquivo enviado!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}