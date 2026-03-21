// api.js
const https = require("https");

module.exports = async (req, res) => {
  const userkey = req.query.userkey;

  if (!userkey) {
    return res.status(400).json({ error: "Parâmetro 'userkey' é obrigatório." });
  }

  const url = `https://html-15e80-default-rtdb.firebaseio.com/userKeysData/${userkey}.json`;

  https.get(url, (response) => {
    let data = "";

    // Recebe os chunks
    response.on("data", (chunk) => {
      data += chunk;
    });

    // Quando terminar de receber
    response.on("end", () => {
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