import admin from "firebase-admin";

// Firebase Admin com chave completa
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: "html-15e80",
      client_email: "firebase-adminsdk-fbsvc@html-15e80.iam.gserviceaccount.com",
      private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCMm6ME7bxxr4k3
pZV/WSzx7GUmd5X6HHJyGwPPUyWhRYpvL2qN9sEbjchTPfMs2jeTzpiOI/rgdjlJ
AC0CeRKAjJMiLVDCeufYjDcw8gxmjN7xbr3V4EshJ+xeRSw05G9CvwlO944ORNow
SnG8iFwBJpLMpKgikrbQTmSENE0pkc/7dUeCRAuOM44jl8FP9n8rSMyydPEmJmgI
NSYsI+Z54HBKD4G4XQFxxDb/hyHR2dhyPGuCUPp27ckeNUVHXaDPapyfQ3Sdx3NG
+yQZwqD0MeNJgM4CfMkUS/WnVO8alXuzrGgcAz0Q9wcGm93hzQRvDylgb7bzjvRk
x7/Ju9FNAgMBAAECggEAAkkUVwPrPHjTNOeY3LtNFviV81BdzHUyagbk4rWSBsNL
2v9NDtYsMN+22h2Hapr4bMteoO7WSNg7GaPqV2Ay7Ap86MEOTz7yrksnKYFBsNgI
1qlLZiLRbc5JkgWzUH/HDDFxPAqbkUFOv5qyKxOXVUB0geWKQxeZ55xil2CHQY3y
RbI1hM9J3/jivniwG4kDXTuHOAqQmYDAH5U5X0uBNwSKq3DoEpaSNhsAIwPvZB+S
SdK7W/Xb/f7ELSbaEQJZO1T+0hdDUcfYgBLTCSG5NKe2rjP30xlDzuG/Houpwe3A
lYapcywew92i8A4Yiwq64iMbQ/cENa1DLkcZ5p+dYQKBgQC/7/4m8O4yklfRQYZj
15qonnS6G6DAywHxlBy8Bb++S+Mape3oCddD8oItO577a/Sq6L4sRDaxXCjHAkkB
nETkyKi7b5cXLVTJsLRzvXu7i0jkHaRLY9kXX3TxoHnMzlmtEuOanyMbXajclGXA
WsvLMOys75eTCgy3Ub6lx54ALQKBgQC7idFQv0hYaRSzmuO+3a8xZEznnYy4XEKI
RvO3d9Q0Ee5FANDo7aG5us5i63ttlBsH1RGUNZQy6PYcvn33KPv1W/S7A8uCBHHf
vQJ423ay2g9OnerNdotxvwpS12KZ5QOhJA9INeeJV2gq4XiZnn2L8caWYMuaCut4
9tm3PkCpoQKBgQCkSyf/6Ufbngzxn+cLW6iVIV3FWJTXsm3tfdzCzSD+ITM6wkHM
12+eR91KHrjNefEqwqLWfWVbmAmHn9siN8N5GpHkL3bjbfgf1NQCJnXdaTJxoTXb
GpLfQOR3V+gqeY+laH/PAN0qNZeviI84gf/j4/MTbNsQEBAmcyCAA0ip2QKBgC9c
m98fn76sMw001cVzKPZ5VS69TDeXHTpbaNtxyMaprJoCnb/lm41TTyIORGqlF7p/
pePfMCE3UkhqF1ffItqRMZo1WCTqyHNvwXsSOcTrayg4m37uLEM6svm+6WjiPGtq
tu1Op724tFb4AEQTkbNRCQ0bPvAVR+iRtuQfNadhAoGBAKVgWmdpX8ZqKivCrr6r
5NphFOb04vyf0g0DVS42P6pSapNYopqFoGyPHXnmYeb21h8O30jpKApqeJQugMj+
MILCxu0Rxj5RlXNBERudUCrLoZPuOV0NxqWZGis/n8ZL3w2bC0VbvlkPnhwXuRIQ
MmFTScdpvarIz211NJol05Sa
-----END PRIVATE KEY-----`
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