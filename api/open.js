export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: "Parâmetro ?url= é obrigatório"
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/html,*/*"
      }
    });

    const contentType = response.headers.get("content-type");
    const body = await response.text();

    res.status(200).json({
      success: true,
      status: response.status,
      contentType,
      length: body.length,
      preview: body.slice(0, 1000)
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}