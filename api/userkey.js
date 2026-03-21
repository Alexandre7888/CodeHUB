// api.js
const https = require("https");

module.exports = async (req, res) => {
  const { userkey, info } = req.query;

  if (!userkey) {
    return res.status(400).json({ error: "Parâmetro 'userkey' é obrigatório." });
  }

  // Se tiver "info", faz PUT para salvar base64
  if (info) {
    const dataToSave = JSON.stringify({ data: info }); // pode guardar qualquer string/base64
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

      putRes.on("data", (chunk) => {
        responseData += chunk;
      });

      putRes.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          return res.status(200).json({ success: true, result: parsed });
        } catch (err) {
          return res.status(500).json({ error: "Erro ao processar resposta do Firebase.", details: err.message });
        }
      });
    });

    putReq.on("error", (err) => {
      return res.status(500).json({ error: "Erro ao enviar dados para o Firebase.", details: err.message });
    });

    putReq.write(dataToSave);
    putReq.end();
    return;
  }

  // Se não tiver "info", faz GET do userKey
  const getUrl = `https://html-15e80-default-rtdb.firebaseio.com/userKeysData/${userkey}.json`;

  https.get(getUrl, (getRes) => {
    let data = "";

    getRes.on("data", (chunk) => {
      data += chunk;
    });

    getRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);

        if (!parsed) {
          return res.status(404).json({ error: "Usuário não encontrado." });
        }

        return res.status(200).json(parsed);
      } catch (err) {
        return res.status(500).json({ error: "Erro ao processar os dados do Firebase.", details: err.message });
      }
    });
  }).on("error", (err) => {
    return res.status(500).json({ error: "Erro ao acessar o Firebase.", details: err.message });
  });
};