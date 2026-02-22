const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Inicializa Firebase (sem try-catch pois o firebase-admin já deve estar disponível)
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

// Funções auxiliares
function generateRandomUsername() {
  const adjectives = ['Rapido', 'Bravo', 'Calmo', 'Esperto', 'Forte'];
  const nouns = ['Tigre', 'Leao', 'Lobo', 'Fenix', 'Dragao'];
  const numbers = Math.floor(Math.random() * 999) + 1;
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${numbers}`;
}

function generateRandomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// Handler principal
module.exports = async (req, res) => {
  // Configura CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Pega a ação
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      case 'newaccount':
        return await handleNewAccount(res);
      
      case 'newpassword':
        return await handleNewPassword(req, res);
      
      default:
        return res.status(400).json({
          error: 'Ação inválida',
            actions: ['newaccount', 'newpassword']
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
};

// Criar nova conta
async function handleNewAccount(res) {
  try {
    const username = generateRandomUsername();
    const password = generateRandomPassword();
    const email = `${username.toLowerCase()}@temp.local`;

    const user = await auth.createUser({
      email,
      password,
      displayName: username
    });

    return res.json({
      success: true,
      action: 'newaccount',
      uid: user.uid,
      username: username,
      password: password,
      email: email
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      action: 'newaccount',
      error: error.message
    });
  }
}

// Gerar nova senha
async function handleNewPassword(req, res) {
  try {
    const uid = req.query.uid || req.body?.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        action: 'newpassword',
        error: 'UID é obrigatório'
      });
    }

    // Busca usuário
    const user = await auth.getUser(uid);
    
    // Gera nova senha
    const newPassword = generateRandomPassword();

    // Atualiza senha
    await auth.updateUser(uid, {
      password: newPassword
    });

    return res.json({
      success: true,
      action: 'newpassword',
      uid: uid,
      username: user.displayName || user.email?.split('@')[0],
      newPassword: newPassword,
      email: user.email
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      action: 'newpassword',
      error: error.message
    });
  }
}