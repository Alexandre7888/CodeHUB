const fetch = require("node-fetch");
const admin = require("firebase-admin");

// Inicializa Firebase Admin (somente campos obrigatórios)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: "html-15e80",
      client_email: "firebase-adminsdk-fbsvc@html-15e80.iam.gserviceaccount.com",
      private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCMm6ME7bxxr4k3
...restante da chave...
-----END PRIVATE KEY-----`
    }),
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const url = req.url;

    // -------- CHECKOUT ----------
    if (url.startsWith("/api/checkout") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", async () => {
        const { order_nsu, items, redirect_url } = JSON.parse(body);

        // Salva pedido no Firebase
        await db.ref("pedidos/" + order_nsu).set({
          status: "pending",
          items,
          createdAt: Date.now()
        });

        // Cria link InfinitePay
        const response = await fetch(
          "https://api.infinitepay.io/invoices/public/checkout/links",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer 6beZJtyP1RWkvwum2c9gIY7TzHRwgd2vT9aSX9k5"
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
        if (json.url) return res.end(JSON.stringify({ url: json.url }));
        else return res.status(400).end(JSON.stringify({ error: "Erro", details: json }));
      });
    }

    // -------- WEBHOOK ----------
    else if (url.startsWith("/api/webhook") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", async () => {
        const data = JSON.parse(body);
        const order_nsu = data.order_nsu;
        const status = data.status;

        // Atualiza status real no Firebase
        await db.ref("pedidos/" + order_nsu).update({
          status,
          updatedAt: Date.now()
        });

        return res.end(JSON.stringify({ ok: true }));
      });
    }

    else {
      res.statusCode = 404;
      res.end("Not Found");
    }

  } catch (err) {
    console.error(err);
    res.status(500).end(JSON.stringify({ error: err.message }));
  }
};