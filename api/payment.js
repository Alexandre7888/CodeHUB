// api/payment.js
let pedidos = {}; // memória temporária para armazenar pedidos

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { action, order_nsu, items, redirect_success } = req.body;
    const handle = "ana-aline-braatz"; // seu handle InfinitePay

    // ---------------- #checkout ----------------
    if (action === "#checkout") {
      if (!order_nsu || !items || !redirect_success)
        return res.status(400).json({ error: "Dados incompletos" });

      // salva pedido pendente
      pedidos[order_nsu] = { status: "pending", items, createdAt: Date.now() };

      const response = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle,
            order_nsu,
            redirect_url: redirect_success,
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
      if (!order_nsu || !pedidos[order_nsu])
        return res.status(404).json({ error: "Pedido não encontrado" });

      // consulta pagamento usando payment_check
      const checkRes = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/payment_check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, order_nsu }),
        }
      );

      const checkJson = await checkRes.json();

      // atualiza status local
      pedidos[order_nsu].status = checkJson.status || "pending";
      pedidos[order_nsu].updatedAt = Date.now();

      return res.status(200).json({ status: pedidos[order_nsu].status, details: checkJson });
    }

    else return res.status(400).json({ error: "Ação inválida" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}