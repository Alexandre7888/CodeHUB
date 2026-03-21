const https = require("https");

module.exports = async (req, res) => {
  // ===== CORS para todos os domínios =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Responde rápido para preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { userkey, info } = req.query;

  if (!userkey && !info) {
    return res.status(400).json({ error: "Parâmetro 'userkey' ou 'info' é obrigatório." });
  }

  // ===== 1️⃣ Se info existe e userkey existe, faz PUT =====
  if (info && userkey) {
    const dataToSave = JSON.stringify({ data: info });
    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataToSave)
      }
    };

    const putUrl = `https://html-15e80-default-rtdb.firebaseio.com/tokens/${userkey}.json`;

    const putReq = https.request(putUrl, options, (putRes) => {
      let responseData = "";
      putRes.on("data", (chunk) => responseData += chunk);
      putRes.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          return res.status(200).json({ success: true, result: parsed });
        } catch (err) {
          return res.status(500).json({ error: "Erro ao processar resposta do Firebase.", details: err.message });
        }
      });
    });

    putReq.on("error", (err) => res.status(500).json({ error: "Erro ao enviar dados para o Firebase.", details: err.message }));

    putReq.write(dataToSave);
    putReq.end();
    return;
  }

  // ===== 2️⃣ Se info existe mas userkey não, faz GET =====
  if (info && !userkey) {
    const getUrl = `https://html-15e80-default-rtdb.firebaseio.com/tokens/${info}.json`;

    https.get(getUrl, (getRes) => {
      let data = "";
      getRes.on("data", (chunk) => data += chunk);
      getRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed) return res.status(404).json({ error: "Info não encontrada." });
          return res.status(200).json(parsed);
        } catch (err) {
          return res.status(500).json({ error: "Erro ao processar os dados do Firebase.", details: err.message });
        }
      });
    }).on("error", (err) => res.status(500).json({ error: "Erro ao acessar o Firebase.", details: err.message }));

    return;
  }

  // ===== 3️⃣ Se só userkey, GET do userKeysData =====
  if (userkey) {
    const getUrl = `https://html-15e80-default-rtdb.firebaseio.com/userKeysData/${userkey}.json`;

    https.get(getUrl, (getRes) => {
      let data = "";
      getRes.on("data", (chunk) => data += chunk);
      getRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed) return res.status(404).json({ error: "Usuário não encontrado." });
          return res.status(200).json(parsed);
        } catch (err) {
          return res.status(500).json({ error: "Erro ao processar os dados do Firebase.", details: err.message });
        }
      });
    }).on("error", (err) => res.status(500).json({ error: "Erro ao acessar o Firebase.", details: err.message }));

    return;
  }
};