export default async function handler(req, res) {
  const { cmd } = req.body;

  try {
    // comandos simples permitidos
    if (cmd === "ls") {
      return res.json({ out: "Nenhum arquivo disponível (sandbox Vercel)" });
    }

    if (cmd.startsWith("js ")) {
      const code = cmd.replace("js ", "");
      const out = eval(code);
      return res.json({ out: String(out) });
    }

    return res.json({ out: "Comando não permitido." });
  } catch (e) {
    return res.json({ out: "Erro: " + e.message });
  }
}
