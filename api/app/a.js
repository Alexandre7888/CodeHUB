export default function handler(req, res) {

  const origin = req.headers.origin;

  // bloquear se não for seu site
  if (origin !== "https://code.codehub.ct.ws") {
    res.status(403).send("<h1>Access denied.</h1>");
    return;
  }

  // permitir apenas seu domínio
  res.setHeader("Access-Control-Allow-Origin", "https://code.codehub.ct.ws");
  res.setHeader("Content-Type", "application/json");

  res.status(200).json({
    access: process.env.PUTER_TOKEN
  });

}