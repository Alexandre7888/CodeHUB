// api/getUserData.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const userkey = req.query.userkey;

  if (!userkey) {
    return res.status(400).json({ error: "Parâmetro 'userkey' é obrigatório." });
  }

  const firebaseUrl = `https://html-15e80-default-rtdb.firebaseio.com/userKeysData/${userkey}.json`;

  try {
    const response = await fetch(firebaseUrl);
    const data = await response.json();

    if (!data) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao acessar o Firebase.", details: err.message });
  }
};