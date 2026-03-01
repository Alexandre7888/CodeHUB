export default async function handler(req, res) {

  // 🔓 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    // 🔹 Permitir GET para teste no navegador
    if (req.method === "GET") {
      return res.status(200).json({
        status: "API funcionando",
        message: "Use POST para trocar o code por token."
      });
    }

    // 🔹 POST real
    const redirectUri = req.query.redirectUri;
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: "code faltando" });
    }

    if (!redirectUri) {
      return res.status(400).json({ error: "redirectUri faltando" });
    }

    const response = await fetch("https://www.openstreetmap.org/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.OSM_CLIENT_ID,
        client_secret: process.env.OSM_CLIENT_SECRET
      })
    });

    const data = await response.text();
    return res.status(response.status).send(data);

  } catch (error) {
    console.error("ERRO:", error);
    return res.status(500).json({ error: error.message });
  }
}