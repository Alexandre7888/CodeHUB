const VIDEO_URL = "https://api.websim.com/blobs/019bd91e-e198-758f-8b37-858823fa29a0.m4a"; // COLOQUE O LINK AQUI

export default async function handler(req, res) {
  try {
    const response = await fetch(VIDEO_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res.status(500).send("Erro ao carregar o vídeo");
    }

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "video/mp4"
    );

    response.body.pipe(res);
  } catch (e) {
    res.status(500).send("Erro interno");
  }
}