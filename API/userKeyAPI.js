// =======================================
// URL do Firebase contendo todas as userKeys
// =======================================
const FIREBASE_URL = "https://html-15e80-default-rtdb.firebaseio.com/userKeysData.json";

// =======================================
// Pega parâmetros da URL
// =======================================
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

// =======================================
// Função principal de validação (só é chamada manualmente)
// =======================================
async function validarLogin(callback) {
  const params = getQueryParams();
  const userKey = params.userKey || null;

  // Se não veio userKey → negar
  if (!userKey) {
    callback({
      success: false,
      error: "acesso_negado"
    });
    return;
  }

  try {
    const req = await fetch(FIREBASE_URL);
    const data = await req.json();

    // Se a key existir → sucesso
    if (data && data[userKey]) {
      callback({
        success: true,
        userName: data[userKey].nome || null,
        dados: data[userKey]
      });
    } else {
      callback({
        success: false,
        error: "acesso_negado"
      });
    }
  } catch (e) {
    callback({
      success: false,
      error: "erro_servidor"
    });
  }
}