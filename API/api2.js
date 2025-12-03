// API2 — busca projetos usando localStorage (NÃO usa URL)

// Caminho do database
const DB_URL = "https://html-15e80-default-rtdb.firebaseio.com";

// Função principal
window.api2_buscarProjetos = async function () {
    try {
        // Pega do localStorage
        const userKey = localStorage.getItem("userKey");
        const userName = localStorage.getItem("userName");

        if (!userKey || !userName) {
            return {
                sucesso: false,
                erro: "userKey ou userName não encontrados no localStorage"
            };
        }

        // Extrair ID (antes do "-")
        const userId = userKey.split("-")[0];

        // Buscar os projetos corretamente
        const resp = await fetch(`${DB_URL}/projects/${userId}.json`);
        const data = await resp.json();

        if (!data) {
            return {
                sucesso: false,
                erro: "nenhum projeto encontrado para este usuário"
            };
        }

        return {
            sucesso: true,
            userId,
            userName,
            projetos: data
        };

    } catch (err) {
        return {
            sucesso: false,
            erro: "erro_servidor",
            detalhe: err.message
        };
    }
};