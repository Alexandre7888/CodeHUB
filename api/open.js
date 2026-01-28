module.exports = async (req, res) => {
  const { codigo } = req.query;

  if (!codigo) {
    return res.status(400).json({ success: false, error: "Parâmetro ?codigo= é obrigatório" });
  }

  try {
    // 1️⃣ Pega os dados do rastreio diretamente da API pública
    const apiRes = await fetch(`https://seurastreio.com.br/api/public/rastreio/${codigo}`);
    const trackingData = await apiRes.json();

    if (!trackingData.success) {
      return res.status(404).json({ success: false, error: "Rastreio não encontrado" });
    }

    // 2️⃣ Cria prompt para GPT
    const prompt = `
Você é um assistente que recebe dados de rastreio de encomendas em JSON e precisa formatar para o seguinte padrão:

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

JSON de entrada:
${JSON.stringify(trackingData, null, 2)}
`;

    // 3️⃣ Chamada direta para GPT oficial via REST
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

    // 4️⃣ Retorna JSON limpo
    const result = JSON.parse(gptData.choices[0].message.content);

    res.status(200).json({ success: true, result });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};