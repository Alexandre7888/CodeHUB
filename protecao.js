// === CONFIGURAÇÕES ===
const dominiosPermitidos = ["code.codehub2025.ct.ws/"];
const webhookURL = "https://discord.com/api/webhooks/1416615114077110372/bcsRqA7uTdo3Z4o3EmsADepTcrbl5C30QBUMekF8nLYvrhqEUd8fo8-gFss7qZfNVWRJ";

// === VERIFICAÇÃO PRINCIPAL ===
function verificarDominio() {
    const dominioAtual = window.location.hostname;
    
    // Verifica se está na lista de permitidos
    const dominioPermitido = dominiosPermitidos.includes(dominioAtual);
    
    if (!dominioPermitido) {
        console.log('🚨 DOMÍNIO BLOQUEADO:', dominioAtual);
        mostrarPaginaBloqueio(dominioAtual);
        return false;
    }
    
    console.log('✅ Domínio autorizado');
    return true;
}

// === PÁGINA DE BLOQUEIO ===
function mostrarPaginaBloqueio(dominio) {
    // Para completamente a página atual
    document.documentElement.innerHTML = '';
    document.documentElement.style.display = 'block';
    
    // Cria a página de bloqueio diretamente
    document.body.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            color: red;
            font-family: Arial;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            z-index: 99999;
        ">
            <h1 style="font-size: 2.5em; margin-bottom: 20px;">🚫 ACESSO BLOQUEADO</h1>
            <p style="font-size: 1.2em; color: white;">Domínio não autorizado:</p>
            <p style="font-size: 1.5em; color: #ff4444; font-weight: bold; background: #222; padding: 10px; border-radius: 5px;">${dominio}</p>
            <p style="color: #ccc; margin-top: 20px;">Este domínio não tem permissão para acessar este conteúdo.
            mas se aconteceu isso por engano é só pedir permissão de domínio!</p>
            
            <div style="
                margin-top: 30px;
                padding: 15px;
                background: #222;
                border-radius: 8px;
                border-left: 4px solid #ff4444;
            ">
                <p style="color: #ff8888; margin: 0; font-size: 1.1em;">
                    ⚠️ ATENÇÃO: Acesso não autorizado detectado.<br>
                    Recomendamos que saia desta página imediatamente.
                </p>
            </div>
            
            <p style="color: #666; margin-top: 30px; font-size: 0.9em;">
                ❌ Não copie sites de outras pessoas sem autorização
            </p>
        </div>
    `;

    // Mostrar alerta após um pequeno delay
    setTimeout(() => {
        console.log('🔄 Mostrando alerta...');
        alert("🚨 POR FAVOR, SAIA DESTA PÁGINA!\n\nVocê está acessando conteúdo protegido sem autorização.");
        console.log('✅ Usuário confirmou o alerta');
    }, 1500);

    // Envia log para Discord
    enviarLogDiscord(dominio);
}

// === ENVIAR LOG PARA DISCORD ===
function enviarLogDiscord(dominio) {
    if (!webhookURL) {
        console.log('❌ Webhook não configurado');
        return;
    }
    
    const dados = {
        username: "🔒 Proteção CodeHUB",
        embeds: [{
            title: "🚨 ACESSO BLOQUEADO",
            description: `Domínio **${dominio}** tentou acessar o site sem autorização`,
            color: 16711680,
            timestamp: new Date().toISOString(),
            fields: [
                {
                    name: "URL",
                    value: window.location.href || 'N/A',
                    inline: false
                },
                {
                    name: "User Agent", 
                    value: navigator.userAgent ? navigator.userAgent.substring(0, 100) + '...' : 'N/A',
                    inline: false
                }
            ]
        }]
    };

    fetch(webhookURL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dados)
    }).then(() => {
        console.log('✅ Log enviado para Discord');
    }).catch(error => {
        console.log('❌ Erro ao enviar para Discord:', error);
    });
}

// === INICIALIZAÇÃO ===
console.log('🔒 Iniciando verificação de domínio...');

// Verifica imediatamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarDominio);
} else {
    verificarDominio();
}

// Verifica também quando a página carrega completamente
window.addEventListener('load', verificarDominio);

// Verifica mudanças na URL
window.addEventListener('hashchange', verificarDominio);
window.addEventListener('popstate', verificarDominio);

console.log('✅ Sistema de proteção ativo');
