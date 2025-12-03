// ===============================
// CONFIG DO FIREBASE
// ===============================
const FIREBASE_USERKEYS_URL =
  "https://html-15e80-default-rtdb.firebaseio.com/userKeysData.json";

// ===============================
// LER PARÂMETROS DA URL
// ===============================
function getParams() {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(params.entries());
}

// ===============================
// VALIDAR LOGIN
// ===============================
async function validarLogin(callback) {
  const p = getParams();
  const userKey = p.userKey;

  if (!userKey) {
    callback({ success: false });
    return;
  }

  try {
    const req = await fetch(FIREBASE_USERKEYS_URL);
    const list = await req.json();

    if (!list || !list[userKey]) {
      callback({ success: false });
      return;
    }

    const userName = list[userKey].nome;
    const userId = list[userKey].userId;

    callback({
      success: true,
      userKey,
      userId,
      userName
    });

  } catch (e) {
    callback({ success: false });
  }
}