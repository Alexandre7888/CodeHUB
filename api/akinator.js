// api/akinator.js

let session = null; // mantém estado temporário

module.exports = async (req, res) => {
  const { action, answer } = req.query;

  try {
    if (action === 'start') {
      // Iniciar jogo
      const init = await fetch(
        'https://srv12.akinator.com:9162/new_session?callback=foo&partner=1&player=website&uid=&frontaddr=127.0.0.1&constraint=ETAT%3C%3E%22%22&lang=pt'
      );

      const text = await init.text();
      const json = JSON.parse(text.match(/foo\((.*)\)/)[1]);

      session = {
        session: json.parameters.identification.session,
        signature: json.parameters.identification.signature,
        step: 0
      };

      return res.json({ question: json.parameters.step_information.question });
    }

    if (action === 'step') {
      if (!session) return res.status(400).json({ error: "Jogo não iniciado. Use ?action=start" });
      if (answer === undefined) return res.status(400).json({ error: "Informe a resposta: 0-4" });

      const stepReq = await fetch(
        `https://srv12.akinator.com:9162/answer?callback=foo&session=${session.session}&signature=${session.signature}&step=${session.step}&answer=${answer}`
      );

      const textStep = await stepReq.text();
      const jsonStep = JSON.parse(textStep.match(/foo\((.*)\)/)[1]);

      session.step++; // próximo passo

      if (jsonStep.parameters.progression >= 95) {
        // Akinator adivinha
        return res.json({ finished: true, guess: jsonStep.parameters.elements[0].element[0] });
      }

      return res.json({ question: jsonStep.parameters.question, progression: jsonStep.parameters.progression });
    }

    res.status(400).json({ error: "Ação inválida. Use ?action=start ou ?action=step&answer=0-4" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};