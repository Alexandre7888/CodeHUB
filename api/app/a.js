export default function handler(req, res) {

  // bloquear acesso direto
  const origin = req.headers.origin

  if (origin !== "https://code.codehub.ct.ws") {
    res.status(403).send("<h1>Access denied </h1>")
    return
  }

  res.setHeader("Access-Control-Allow-Origin", "https://code.codehub.ct.ws")

  res.json({
    token: process.env.PUTER_TOKEN
  })
}