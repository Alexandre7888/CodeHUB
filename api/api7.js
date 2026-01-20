import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "html-15e80",
      clientEmail: "firebase-adminsdk@html-15e80.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();

export default async function handler(req, res) {
  // CORS TOTAL
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { token, fileName } = req.query;
  if (!token || !fileName)
    return res.status(400).send("token e fileName são obrigatórios");

  const snap = await db.ref(`index/${token}`).once("value");
  if (!snap.exists()) return res.status(404).send("Nenhum arquivo");

  const files = snap.val();
  let file = null;

  for (const id in files) {
    if (files[id].name === fileName) {
      file = files[id];
      break;
    }
  }

  if (!file) return res.status(404).send("Arquivo não encontrado");

  const buffer = Buffer.from(file.base64, "base64");
  res.setHeader("Content-Type", file.mimeType);

  // texto
  if (file.mimeType.startsWith("text")) {
    return res.send(buffer.toString());
  }

  // imagem / vídeo / áudio
  res.send(buffer);
}