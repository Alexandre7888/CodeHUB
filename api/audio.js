const AUDIO_URL = "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3";

export default async function handler(req, res) {
  try {
    const response = await fetch(AUDIO_URL);
    if (!response.ok) return res.status(500).send("Falha ao buscar áudio");

    // CORS e tipo de conteúdo certo
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Detecta tipo do arquivo ou força audio/mpeg
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    res.setHeader("Content-Type", contentType);

    // Stream direto
    response.body.pipe(res);

  } catch (e) {
    res.status(500).send("Erro interno");
  }
}