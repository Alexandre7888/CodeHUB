// api.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { action, userkey } = req.query;

  if (!action) {
    return res.status(400).json({ error: "Parâmetro 'action' é obrigatório." });
  }

  try {
    // Escolhe o que fazer baseado no action
    switch (action) {
      case "getUserData":
        if (!userkey) return res.status(400).json({ error: "Parâmetro 'userkey' é obrigatório." });
        const firebaseUrl = `https://html-15e80-default-rtdb.firebaseio.com/userKeysData/${userkey}.json`;
        const response = await fetch(firebaseUrl);
        const data = await response.json();
        if (!data) return res.status(404).json({ error: "Usuário não encontrado." });
        return res.status(200).json(data);

      case "ping":
        return res.status(200).json({ message: "API funcionando!" });

      // Adicione aqui outros "cases" para suas outras funções
      // Ex: case "mapData": ...

      default:
        return res.status(404).json({ error: "Action não encontrada." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
};