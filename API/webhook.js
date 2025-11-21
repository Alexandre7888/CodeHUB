
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// Rota onde a Vercel vai sincronizar
app.post("/sync", (req, res) => {
  console.log("Webhook recebido:");
  console.log(JSON.stringify(req.body, null, 2));

  // Você pode colocar qualquer ação aqui:
  // atualizar arquivos, enviar resposta, rodar script, etc.
  
  res.json({ ok: true, message: "Sincronizado com sucesso!" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor do Termux ON → porta ${PORT}`);
});
