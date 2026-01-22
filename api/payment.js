// api/payment.js
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbsPDM3IzeWEQS02CtOVGZVcEFIdj096Rs4t_rPEG_x4vTGTQIYlpJEd-1d6uiC1GpqA/exec";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { action, order_nsu, items, redirect_success, status } = req.body;

    // ---------------- #checkout ----------------
    if (action === "#checkout") {
      if (!order_nsu || !items || !redirect_success)
        return res.status(400).json({ error: "Dados incompletos" });

      // Salva pedido pendente no Google Sheet
      await fetch(`${GOOGLE_SCRIPT_URL}?action=%23checkout&order_nsu=${order_nsu}&items=${encodeURIComponent(JSON.stringify(items))}&redirect_url=${encodeURIComponent(redirect_success)}`, {
        method: "POST"
      });

      // Cria link InfinitePay
      const data = {
        handle: "ana-aline-braatz",
        order_nsu,
        redirect_url: redirect_success,
        items
      };

      const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const json = await response.json();
      if (json.url) return res.status(200).json({ url: json.url });
      return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }

    // ---------------- #webhook ----------------
    else if (action === "#webhook") {
      if (!order_nsu || !status) return res.status(400).json({ error: "Dados inválidos" });

      await fetch(`${GOOGLE_SCRIPT_URL}?action=%23webhook&order_nsu=${order_nsu}&status=${status}`, {
        method: "POST"
      });

      return res.status(200).json({ ok: true });
    }

    // ---------------- #status ----------------
    else if (action === "#status") {
      if (!order_nsu) return res.status(400).json({ error: "Pedido não informado" });

      const response = await fetch(`${GOOGLE_SCRIPT_URL}?order_nsu=${order_nsu}`);
      const json = await response.json();
      return res.status(200).json(json);
    }

    else return res.status(400).json({ error: "Ação inválida" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}