const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Inicializa Firebase (uma única vez)
if (!global.firebaseApp) {
  try {
    global.firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
  }
}

const auth = getAuth();

// Gerar nome aleatório
function generateRandomUsername() {
  const adj = ['Bravo', 'Rapido', 'Forte', 'Sábio'][Math.floor(Math.random() * 4)];
  const noun = ['Tigre', 'Leao', 'Lobo', 'Fenix'][Math.floor(Math.random() * 4)];
  return adj + noun + (Math.floor(Math.random() * 999) + 1);
}

// Gerar senha aleatória
function generateRandomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + '@' + Math.floor(Math.random() * 99);
}

module.exports = async (req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action;

  try {
    if (action === 'newaccount') {
      // CRIA CONTA
      const username = generateRandomUsername();
      const password = generateRandomPassword();
      const email = `${username.toLowerCase()}@temp.local`;

      const user = await auth.createUser({
        email,
        password,
        displayName: username
      });

      return res.json({
        uid: user.uid,
        username: username,
        password: password
      });

    } else if (action === 'newpassword') {
      // TROCA SENHA
      const uid = req.query.uid || req.body?.uid;

      if (!uid) {
        return res.status(400).json({ erro: 'UID obrigatório' });
      }

      const user = await auth.getUser(uid);
      const newPassword = generateRandomPassword();

      await auth.updateUser(uid, { password: newPassword });

      return res.json({
        uid: uid,
        username: user.displayName || user.email?.split('@')[0],
        newPassword: newPassword
      });

    } else {
      return res.status(400).json({ erro: 'Ação inválida' });
    }

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
};