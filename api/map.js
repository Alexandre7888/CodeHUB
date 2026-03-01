export default async function handler(req, res) {
  try {

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const redirectUri = req.query.redirect_uri;
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: "code faltando" });
    }

    if (!redirectUri) {
      return res.status(400).json({ error: "redirect_uri faltando" });
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

    const text = await response.text();

    return res.status(response.status).send(text);

  } catch (error) {
    console.error("ERRO:", error);
    return res.status(500).json({ error: error.message });
  }
}