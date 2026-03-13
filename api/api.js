// Configurações do Firebase
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo'
};

// HTTP
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const uid = e.parameter.uid;

  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!uid) {
    return output.setContent(JSON.stringify({
      success: false,
      error: "UID não enviado"
    }));
  }

  const result = loginWithUID(uid);

  return output.setContent(JSON.stringify(result, null, 2));
}

// Login usando UID
function loginWithUID(uid) {
  try {

    const response = UrlFetchApp.fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_CONFIG.apiKey,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json"
        },
        payload: JSON.stringify({
          localId: [uid]
        }),
        muteHttpExceptions: true
      }
    );

    const data = JSON.parse(response.getContentText());

    if (data.users && data.users.length > 0) {
      const user = data.users[0];

      return {
        success: true,
        autenticado: true,
        uid: uid,
        email: user.email || null,
        username: user.displayName || null
      };

    } else {
      return {
        success: false,
        autenticado: false,
        mensagem: "UID não encontrado"
      };
    }

  } catch (error) {
    return {
      success: false,
      erro: error.toString()
    };
  }
}