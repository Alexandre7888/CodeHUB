// ===============================
// API2 — Buscar Projetos
// Compatível com auth.html novo
// ===============================

// Caminho do Firebase
const FIREBASE_DB = "https://html-15e80-default-rtdb.firebaseio.com";

// Função principal
window.api2_buscarProjetos = async function () {
  try {
    const userKey = localStorage.getItem("userKey");
    const userName = localStorage.getItem("userName");

    if (!userKey) {
      return {
        sucesso: false,
        erro: "Nenhum userKey encontrado (usuário não logado)"
      };
    }

    // userKey → userId (primeira parte antes do "-")
    const userId = userKey.split("-")[0];

    if (!userId) {
      return {
        sucesso: false,
        erro: "userId não pôde ser extraído do userKey"
      };
    }

    // Buscar projetos no Firebase
    const req = await fetch(`${FIREBASE_DB}/projects/${userId}.json`);
    const data = await req.json();

    if (!data) {
      return {
        sucesso: false,
        erro: "Nenhum projeto encontrado para este usuário"
      };
    }

    // Converter objetos para lista organizada
    let lista = [];

    for (const projectId in data) {
      const p = data[projectId];

      lista.push({
        id: projectId,
        nome: p.name || "Sem nome",
        arquivos: p.files ? Object.keys(p.files) : []
      });
    }

    return {
      sucesso: true,
      projetos: lista
    };

  } catch (e) {
    return {
      sucesso: false,
      erro: "Erro interno: " + e.message
    };
  }
};