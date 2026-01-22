const mysql = require("mysql2/promise");

// Config MySQL
const dbConfig = {
  host: "sql310.infinityfree.com",
  user: "if0_40443909",
  password: "2McT5NrDJuWHJv",
  database: "if0_40443909_XXXSee"
};

// Função handler Vercel
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Parse do corpo
    const body = req.body || JSON.parse(req.body);

    // --------- Checkout (#checkout) ---------
    if (body.action === "#checkout") {
      const order_nsu = body.order_nsu || "pedido_" + Date.now();
      const items = JSON.stringify(body.items || []);
      const redirect_url = body.redirect_success || "";

      // Salva no banco com status pending
      await connection.execute(
        "INSERT INTO pedidos (`order_nsu`,`status`,`items`,`redirect_url`,`createdAt`) VALUES (?,?,?,?,NOW())",
        [order_nsu, "pending", items, redirect_url]
      );

      // Aqui você chamaria InfinitePay API para gerar link de pagamento
      const checkoutLink = `https://checkout.infinitepay.io/${order_nsu}`; // mock link

      return res.status(200).json({ url: checkoutLink });
    }

    // --------- Webhook (#webhook) ---------
    if (body.action === "#webhook") {
      const { order_nsu, status } = body;

      await connection.execute(
        "UPDATE pedidos SET status=?, updatedAt=NOW() WHERE order_nsu=?",
        [status, order_nsu]
      );

      return res.status(200).json({ ok: true });
    }

    // --------- Status (#status) ---------
    if (body.action === "#status") {
      const { order_nsu } = body;
      const [rows] = await connection.execute(
        "SELECT * FROM pedidos WHERE order_nsu=?",
        [order_nsu]
      );

      if (rows.length === 0) return res.status(404).json({ error: "Pedido não encontrado" });
      return res.status(200).json(rows[0]);
    }

    res.status(400).json({ error: "Ação inválida" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    if (connection) await connection.end();
  }
}