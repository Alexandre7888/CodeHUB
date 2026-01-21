let pedidos = {}; // memória temporária dos pedidos

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const url = req.url; // ex: /api/payment#checkout ou /api/payment#webhook
    const data = req.body; // Vercel já parseia JSON

    // ------------------ CHECKOUT ------------------
    if (url.includes("#checkout") && req.method === "POST") {
      const { order_nsu, items, redirect_success, redirect_fail } = data;

      if (!order_nsu || !items || !redirect_success)
        return res.status(400).json({ error: "Dados incompletos" });

      // salva pedido como pending
      pedidos[order_nsu] = {
        status: "pending",
        items,
        createdAt: Date.now()
      };

      // chama InfinitePay
      const response = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.INFINITEPAY_TOKEN
          },
          body: JSON.stringify({
            handle: "ana-aline-braatz",
            order_nsu,
            redirect_url: redirect_success,
            items
          })
        }
      );

      const json = await response.json();

      if (json.url) return res.status(200).json({ url: json.url });
      return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }

    // ------------------ WEBHOOK ------------------
    else if (url.includes("#webhook") && req.method === "POST") {
      const { order_nsu, status } = data;
      if (!order_nsu || !status)
        return res.status(400).json({ error: "Dados inválidos" });

      if (!pedidos[order_nsu]) pedidos[order_nsu] = {};
      pedidos[order_nsu].status = status;
      pedidos[order_nsu].updatedAt = Date.now();

      console.log("Webhook recebido:", pedidos[order_nsu]);

      return res.status(200).json({ ok: true });
    }

    else {
      return res.status(404).json({ error: "Endpoint não encontrado" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}