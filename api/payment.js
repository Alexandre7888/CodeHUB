// api/payment.js
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { action, order_nsu } = req.body;
    const handle = "ana-aline-braatz"; // seu handle InfinitePay

    if (!order_nsu) return res.status(400).json({ error: "Pedido não informado" });

    // ---------------- #checkout ----------------
    if (action === "#checkout") {
      // Cria link de checkout direto
      const redirectUrl = req.body.redirect_success;
      const items = req.body.items;

      const response = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle,
            order_nsu,
            redirect_url: redirectUrl,
            items,
          }),
        }
      );

      const json = await response.json();
      if (json.url) return res.status(200).json({ url: json.url });
      return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }

    // ---------------- #status ----------------
    else if (action === "#status") {
      // Consulta status direto na API do InfinitePay
      const response = await fetch(
        `https://api.infinitepay.io/invoices/public/${order_nsu}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const json = await response.json();
      return res.status(200).json({ status: json.status || "unknown", details: json });
    }

    else return res.status(400).json({ error: "Ação inválida" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}