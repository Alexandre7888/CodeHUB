import admin from "firebase-admin";

// Inicializa Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: "html-15e80",
      client_email: "firebase-adminsdk-fbsvc@html-15e80.iam.gserviceaccount.com",
      private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCMm6ME7bxxr4k3\n...restante da chave...\n-----END PRIVATE KEY-----`
    }),
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.url.endsWith("/checkout") && req.method === "POST") {
      const { order_nsu, items, redirect_url } = req.body;

      // Salva pedido pending
      await db.ref("pedidos/" + order_nsu).set({
        status: "pending",
        items,
        createdAt: Date.now()
      });

      // Cria link InfinitePay
      const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
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
      });

      const data = await response.json();
      if (data.url) return res.status(200).json({ url: data.url });
      else return res.status(400).json({ error: "Erro ao gerar link", details: data });
    }

    else if (req.url.endsWith("/webhook") && req.method === "POST") {
      const { order_nsu, status } = req.body;
      if (!order_nsu || !status) return res.status(400).json({ error: "Dados inválidos" });

      await db.ref("pedidos/" + order_nsu).update({
        status,
        updatedAt: Date.now()
      });

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