const Aki = require("aki-api");

// Guarda instâncias por usuário
const games = {};

module.exports = async (req, res) => {
  const { user = "default", action, answer } = req.query;

  try {
    // Iniciar jogo
    if (action === "start") {
      const aki = new Aki("pt"); // idioma português
      await aki.start();

      games[user] = aki; // salva instância por usuário

      return res.json({
        question: aki.question,
        answers: aki.answers,
        progression: aki.progression
      });
    }

    // Responder pergunta
    if (action === "step") {
      const aki = games[user];
      if (!aki) return res.status(400).json({ error: "Jogo não iniciado. Use ?action=start" });
      if (answer === undefined) return res.status(400).json({ error: "Informe a resposta: 0-4" });

      await aki.step(Number(answer));

      if (aki.progression >= 95) {
        return res.json({
          finished: true,
          guess: aki.answers // personagem adivinhado
        });
      }

      return res.json({
        question: aki.question,
        answers: aki.answers,
        progression: aki.progression
      });
    }

    res.status(400).json({ error: "Use action=start ou action=step" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};