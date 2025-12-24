export default function handler(req, res) {
  res.status(200).json({
    online: true,
    mensagem: "Backend funcionando 🚀",
    hora: new Date()
  });
}
