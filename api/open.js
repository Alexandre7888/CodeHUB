const OpenAI = require("openai");
const fetch = require("node-fetch"); // se estiver usando Node 18+ pode usar fetch nativo

const openai = new OpenAI({
  apiKey: process.env.GPT
});

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Parâmetro ?url= é obrigatório"
    });
  }

  try {
    // 1️⃣ Pega o HTML do link com User-Agent de navegador
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/html,*/*"
      }
    });

    const html = await response.text();

    // 2️⃣ Envia o HTML para a IA extrair os dados
    const prompt = `
Você é um assistente que extrai informações de rastreio de encomendas do HTML fornecido.
Responda apenas em JSON no formato:

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

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const content = gptResponse.choices[0].message.content;

    // 3️⃣ Retorna JSON limpo
    res.status(200).json({
      success: true,
      result: JSON.parse(content)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};