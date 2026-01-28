module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Parâmetro ?url= é obrigatório"
    });
  }

  try {
    /* 1️⃣ Buscar HTML da página de rastreio */
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "text/html"
      }
    });

    const html = await pageRes.text();

    /* 2️⃣ Prompt para o GPT */
    const prompt = `
Extraia informações de rastreio do HTML abaixo.
Responda SOMENTE em JSON neste formato:

{
  "codigo": "...",
  "status": "...",
  "eventos": [
    {
      "descricao": "...",
      "data": "...",
      "local": "...",
      "destino": "..."
    }
  ]
}

HTML:
${html}
`;

    /* 3️⃣ Chamada DIRETA à API do GPT (sem SDK) */
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GPT}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      })
    });

    const gptData = await gptRes.json();

    if (!gptData.choices) {
      return res.status(500).json({
        success: false,
        error: "Resposta inválida do GPT",
        raw: gptData
      });
    }

    /* 4️⃣ Retorno JSON limpo */
    const result = JSON.parse(gptData.choices[0].message.content);

    res.status(200).json({
      success: true,
      result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};