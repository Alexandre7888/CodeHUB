// /api/index.js
let pedidos = {}; // armazena pedidos em memória (reinicia a cada deploy, mas funciona para testes)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // lê o corpo do POST
    let body = "";
    req.on("data", chunk => body += chunk.toString());
    await new Promise(resolve => req.on("end", resolve));
    const data = JSON.parse(body);

    // -------- CHECKOUT ----------
    if (req.url.includes("/checkout") && req.method === "POST") {
      const { order_nsu, items, redirect_url } = data;

      // Salva pedido em memória
      pedidos[order_nsu] = {
        status: "pending",
        items,
        createdAt: Date.now()
      };

      // Cria link do InfinitePay
      const response = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer 6beZJtyP1RWkvwum2c9gIY7TzHRwgd2vT9aSX9k5" // sua chave InfinitePay
          },
          body: JSON.stringify({
            handle: "ana-aline-braatz",
            order_nsu,
            redirect_url,
            items
          })
        }
      );

      const json = await response.json();
      if (json.url) return res.status(200).json({ url: json.url });
      else return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }

    // -------- WEBHOOK ----------
    else if (req.url.includes("/webhook") && req.method === "POST") {
      const { order_nsu, status } = data;

      if (!order_nsu || !status) return res.status(400).json({ error: "Dados inválidos" });

      if (!pedidos[order_nsu]) pedidos[order_nsu] = {};
      pedidos[order_nsu].status = status;
      pedidos[order_nsu].updatedAt = Date.now();

      return res.status(200).json({ ok: true });
    }

    else {
      return res.status(404).end("Not Found");
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}