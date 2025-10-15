// === CONFIGURAÇÕES ===
const dominiosPermitidos = [
    "alexandre7888.github.io"
    // Adicione outros domínios autorizados aqui
]; 

const webhookURL = "https://discord.com/api/webhooks/1416615114077110372/bcsRqA7uTdo3Z4o3EmsADepTcrbl5C30QBUMekF8nLYvrhqEUd8fo8-gFss7qZfNVWRJ";

// URL do áudio de alerta (pode ser MP3, WAV, etc)
const somAlertaURL = "alert.mp3";

// === VERIFICAÇÃO DE DOMÍNIO ===
function verificarDominio() {
    const dominioAtual = window.location.hostname;
    const urlAtual = window.location.href;
    
    console.log('Verificando domínio:', dominioAtual);
    
    // Verifica se o domínio atual está na lista de permitidos
    const dominioPermitido = dominiosPermitidos.some(dominio => 
        dominioAtual === dominio || 
        dominioAtual.endsWith('.' + dominio)
    );
    
    if (!dominioPermitido) {
        console.log('Domínio não autorizado detectado:', dominioAtual);
        bloquearAcesso(dominioAtual, urlAtual);
        return false;
    }
    
    console.log('Domínio autorizado:', dominioAtual);
    return true;
}

// === BLOQUEIO DE ACESSO ===
function bloquearAcesso(dominio, url) {
    // Remove todo o conteúdo original
    document.documentElement.innerHTML = '';
    
    // Cria página de erro
    const paginaErro = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acesso Bloqueado - CodeHUB</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #111;
                    color: #ff4444;
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                }
                .container {
                    max-width: 600px;
                    padding: 40px;
                    border: 2px solid #ff4444;
                    border-radius: 10px;
                    background: #1a1a1a;
                }
                h1 {
                    font-size: 2.5em;
                    margin-bottom: 20px;
                    text-shadow: 0 0 10px #ff0000;
                }
                p {
                    font-size: 1.2em;
                    margin-bottom: 15px;
                    color: #ccc;
                }
                .dominio {
                    color: #ff6b6b;
                    font-weight: bold;
                    background: #2a2a2a;
                    padding: 5px 10px;
                    border-radius: 5px;
                    margin: 0 5px;
                }
                .aviso {
                    color: #ffa500;
                    font-size: 0.9em;
                    margin-top: 30px;
                    padding: 15px;
                    background: #2a2a2a;
                    border-radius: 5px;
                    border-left: 4px solid #ffa500;
                }
                /* Esconde o player de áudio */
                .audio-hidden {
                    position: absolute;
                    opacity: 0;
                    pointer-events: none;
                    width: 0;
                    height: 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚫 ACESSO BLOQUEADO</h1>
                <p>Domínio não autorizado detectado:</p>
                <p class="dominio">${dominio}</p>
                <p>Este site só pode ser acessado através dos domínios oficiais.</p>
                
                <div class="aviso">
                    ⚠️ <strong>Aviso de Segurança</strong><br>
                    Tentativas de acesso não autorizado são monitoradas e registradas.
                </div>
            </div>

            <!-- Player de áudio escondido -->
            <audio id="alertaAudio" class="audio-hidden" preload="auto">
                <source src="${somAlertaURL}" type="audio/wav">
                <source src="${somAlertaURL.replace('.wav', '.mp3')}" type="audio/mpeg">
            </audio>
        </body>
        </html>
    `;
    
    document.write(paginaErro);
    
    // === EXECUTAR EFEITOS (APÓS O DOCUMENTO SER ESCRITO) ===
    setTimeout(executarEfeitos, 100);
    
    // === ENVIAR LOG PARA DISCORD ===
    enviarLogDiscord(dominio, url);
}

// === EXECUTAR EFEITOS ===
function executarEfeitos() {
    // Toca som de alerta (SEM VISUAL)
    tocarAlertaSonoro();
    
    // Vibração (se suportado)
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
    }
    
    // Impede qualquer interação
    document.addEventListener('click', bloquearInteracao);
    document.addEventListener('keydown', bloquearInteracao);
    document.addEventListener('contextmenu', bloquearInteracao);
}

// === TOCAR ALERTA SONORO (SEM VISUAL) ===
function tocarAlertaSonoro() {
    try {
        const audio = document.getElementById('alertaAudio');
        if (audio) {
            audio.volume = 0.7;
            audio.play().catch(err => {
                console.log("Áudio bloqueado pelo navegador:", err);
                // Fallback: criar áudio dinamicamente
                tocarAlertaFallback();
            });
        } else {
            tocarAlertaFallback();
        }
    } catch (error) {
        console.log("Erro no áudio:", error);
        tocarAlertaFallback();
    }
}

// === FALLBACK PARA ÁUDIO ===
function tocarAlertaFallback() {
    try {
        const audio = new Audio(somAlertaURL);
        audio.volume = 0.7;
        audio.play().catch(err => console.log("Fallback de áudio também falhou:", err));
    } catch (error) {
        console.log("Erro no fallback de áudio:", error);
    }
}

// === BLOQUEAR INTERAÇÕES ===
function bloquearInteracao(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}

// === ENVIAR LOG PARA DISCORD ===
function enviarLogDiscord(dominio, url) {
    if (!webhookURL || webhookURL === "SEU_WEBHOOK_AQUI") {
        console.log("Webhook não configurado");
        return;
    }
    
    const dados = {
        username: "🔒 Proteção CodeHUB",
        embeds: [
            {
                title: "🚨 ACESSO NÃO AUTORIZADO DETECTADO",
                color: 16711680, // Vermelho
                fields: [
                    {
                        name: "🌐 Domínio Bloqueado",
                        value: `\`\`\`${dominio}\`\`\``,
                        inline: false
                    },
                    {
                        name: "🔗 URL",
                        value: `\`\`\`${url}\`\`\``,
                        inline: false
                    },
                    {
                        name: "🕒 Data/Hora",
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: "👤 User Agent",
                        value: `\`\`\`${navigator.userAgent.substring(0, 100)}...\`\`\``,
                        inline: false
                    }
                ],
                footer: {
                    text: "Sistema de Proteção CodeHUB"
                },
                timestamp: new Date().toISOString()
            }
        ]
    };
    
    fetch(webhookURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) {
            console.error("Erro ao enviar para Discord:", response.status);
        }
    })
    .catch(error => {
        console.error("Falha ao enviar para Discord:", error);
    });
}

// === INICIALIZAR VERIFICAÇÃO ===
// Executa quando a página carrega
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarDominio);
} else {
    verificarDominio();
}

// Também verifica se tentam mudar a URL
window.addEventListener('hashchange', verificarDominio);
window.addEventListener('popstate', verificarDominio);

// Impede abertura em nova janela/aba
window.addEventListener('beforeunload', function(event) {
    if (!verificarDominio()) {
        event.preventDefault();
        event.returnValue = '';
    }
});

console.log('🔒 Sistema de proteção CodeHUB carregado');
