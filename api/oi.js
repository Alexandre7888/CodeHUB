const fetch = require("node-fetch");
const firebase = require("firebase/app");
require("firebase/database");

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
  authDomain: "html-15e80.firebaseapp.com",
  databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  projectId: "html-15e80",
  storageBucket: "html-15e80.firebasestorage.app",
  messagingSenderId: "1068148640439",
  appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32",
  measurementId: "G-V57KRZ02HJ"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

module.exports = async function handler(req, res) {
  // Permitir CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url;

  try {
    // -------- FUNÇÃO CHECKOUT ----------
    if (url.startsWith("/api/checkout") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", async () => {
        const { order_nsu, items, redirect_url } = JSON.parse(body);

        // Salva pedido no Firebase com status pending
        await db.ref("pedidos/" + order_nsu).set({
          status: "pending",
          items: items,
          createdAt: Date.now()
        });

        // Cria link do InfinitePay
        const data = {
          handle: "ana-aline-braatz",
          order_nsu: order_nsu,
          redirect_url: redirect_url,
          items: items
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

        if (json.url) {
          return res.end(JSON.stringify({ url: json.url }));
        } else {
          return res.status(400).end(JSON.stringify({ error: "Erro ao gerar link", details: json }));
        }
      });
    }

    // -------- FUNÇÃO WEBHOOK ----------
    else if (url.startsWith("/api/webhook") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", async () => {
        const data = JSON.parse(body);
        // Exemplo: InfinitePay envia order_nsu e status
        const order_nsu = data.order_nsu;
        const status = data.status; // "paid" ou "failed"

        // Atualiza status real no Firebase
        await db.ref("pedidos/" + order_nsu).update({
          status: status,
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