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

// Funções auxiliares
function generateRandomUsername() {
  const adjectives = ['Rapido', 'Bravo', 'Calmo', 'Esperto', 'Forte', 'Veloz', 'Sábio', 'Leal'];
  const nouns = ['Tigre', 'Leao', 'Lobo', 'Fenix', 'Dragao', 'Águia', 'Pantera', 'Falcao'];
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

// Handler principal - gerencia todas as rotas/acoes
module.exports = async (req, res) => {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Pega a ação da query string ou body
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      // Ações de autenticação
      case 'newaccount':
        return await handleNewAccount(res);
      
      case 'newpassword':
        return await handleNewPassword(req, res);
      
      // Você pode adicionar mais casos aqui para outras funcionalidades
      case 'webhook':
        return await handleWebhook(req, res);
      
      case 'whatsapp':
        return await handleWhatsApp(req, res);
      
      case 'audio':
        return await handleAudio(req, res);
      
      case 'check':
        return await handleCheck(req, res);
      
      case 'bot':
        return await handleBot(req, res);
      
      case 'api7':
        return await handleApi7(req, res);
      
      case 'apicall':
        return await handleApiCall(req, res);
      
      default:
        return res.status(400).json({
          error: 'Ação inválida',
          availableActions: [
            'newaccount', 'newpassword', 'webhook', 'whatsapp', 
            'audio', 'check', 'bot', 'api7', 'apicall'
          ]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
};

// ========== HANDLERS DAS AÇÕES ==========

// Criar nova conta (Firebase)
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

// Gerar nova senha (Firebase)
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

    const user = await auth.getUser(uid);
    const newPassword = generateRandomPassword();

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

// Handlers placeholders para suas outras APIs
async function handleWebhook(req, res) {
  return res.json({
    success: true,
    action: 'webhook',
    message: 'Webhook funcionando',
    method: req.method,
    data: req.body || req.query
  });
}

async function handleWhatsApp(req, res) {
  return res.json({
    success: true,
    action: 'whatsapp',
    message: 'API WhatsApp funcionando'
  });
}

async function handleAudio(req, res) {
  return res.json({
    success: true,
    action: 'audio',
    message: 'API Áudio funcionando'
  });
}

async function handleCheck(req, res) {
  return res.json({
    success: true,
    action: 'check',
    message: 'Health check OK',
    timestamp: new Date().toISOString()
  });
}

async function handleBot(req, res) {
  return res.json({
    success: true,
    action: 'bot',
    message: 'Bot funcionando'
  });
}

async function handleApi7(req, res) {
  return res.json({
    success: true,
    action: 'api7',
    message: 'API7 funcionando'
  });
}

async function handleApiCall(req, res) {
  return res.json({
    success: true,
    action: 'apicall',
    message: 'APICall funcionando'
  });
}