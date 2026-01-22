const fetch = require("node-fetch");

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { order_nsu, items, redirect_success, redirect_fail } = req.body;

    if (!order_nsu || !items || !redirect_success) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // Dados para criar o checkout
    const data = {
      handle: "ana-aline-braatz", // seu handle InfinitePay
      order_nsu,
      redirect_url: redirect_success,
      items
    };

    // Chamada para criar o checkout no InfinitePay
    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }
    );

    const json = await response.json();

    if (json.url) {
      return res.status(200).json({ url: json.url });
    } else {
      return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}