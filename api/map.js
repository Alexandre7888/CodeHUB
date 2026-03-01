export default async function handler(req, res) {

  const redirectUri = req.query.redirect_uri;

  const response = await fetch("https://www.openstreetmap.org/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: req.body.code,
      redirect_uri: redirectUri,
      client_id: process.env.OSM_CLIENT_ID,
      client_secret: process.env.OSM_CLIENT_SECRET
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}