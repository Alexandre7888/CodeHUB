import mysql from "mysql2/promise";

// Configuração MySQL
const dbConfig = {
  host: "sql310.infinityfree.com",
  user: "if0_40443909",
  password: "2McT5NrDJuWHJv",
  database: "if0_40443909_XXXSee"
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const { action, order_nsu, items, redirect_success, status } = req.body;

    // ---------------- #checkout ----------------
    if (action === "#checkout") {
      if (!order_nsu || !items || !redirect_success)
        return res.status(400).json({ error: "Dados incompletos" });

      // Salva pedido pendente no banco
      await connection.execute(
        "INSERT INTO pedidos (`order_nsu`,`status`,`items`,`redirect_url`,`createdAt`) VALUES (?,?,?,?,NOW())",
        [order_nsu, "pending", JSON.stringify(items), redirect_success]
      );

      // Monta link do InfinitePay
      const data = {
        handle: "ana-aline-braatz",
        order_nsu,
        redirect_url: redirect_success,
        items
      };

      const response = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();
      if (json.url) return res.status(200).json({ url: json.url });
      return res.status(400).json({ error: "Erro ao gerar link", details: json });
    }

    // ---------------- #webhook ----------------
    else if (action === "#webhook") {
      if (!order_nsu || !status) return res.status(400).json({ error: "Dados inválidos" });

      await connection.execute(
        "UPDATE pedidos SET status=?, updatedAt=NOW() WHERE order_nsu=?",
        [status, order_nsu]
      );

      console.log("Webhook recebido:", order_nsu, status);
      return res.status(200).json({ ok: true });
    }

    // ---------------- #status ----------------
    else if (action === "#status") {
      if (!order_nsu) return res.status(400).json({ error: "Pedido não informado" });

      const [rows] = await connection.execute(
        "SELECT status FROM pedidos WHERE order_nsu=?",
        [order_nsu]
      );

      if (rows.length === 0)
        return res.status(404).json({ error: "Pedido não encontrado" });

      return res.status(200).json({ status: rows[0].status });
    }

    else return res.status(400).json({ error: "Ação inválida" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    if (connection) await connection.end();
  }
}