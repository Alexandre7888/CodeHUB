export default async function handler(req, res) {
  // Permite que qualquer domínio faça requisição
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde imediatamente se for preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { order_nsu, items } = req.body;

    const data = {
      handle: "ana-aline-braatz", // seu handle
      order_nsu: order_nsu || "pedido_001",
      items: items || [
        { quantity: 1, price: 1000, description: "Produto Exemplo" },
      ],
    };

    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    const json = await response.json();

    if (json.url) return res.status(200).json({ url: json.url });
    return res.status(400).json({ error: "Erro ao gerar link", details: json });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}