    // === CONFIGURAÇÕES ===
    const dominiosPermitidos = ["alexandre7888.github.io"]; // domínio oficial
    const webhookURL = "https://discord.com/api/webhooks/1416615114077110372/bcsRqA7uTdo3Z4o3EmsADepTcrbl5C30QBUMekF8nLYvrhqEUd8fo8-gFss7qZfNVWRJ"; // coloque seu webhook do Discord
    const somURL = "https://www.soundjay.com/button/beep-07.wav"; // áudio de alerta

    // === VERIFICAÇÃO DE DOMÍNIO ===
    const dominioAtual = window.location.hostname;

    if (!dominiosPermitidos.includes(dominioAtual)) {
      // === Remove conteúdo original e mostra erro ===
      document.body.innerHTML = `
        <div style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          height:100vh;
          background:#111;
          color:#f00;
          font-family:Arial, sans-serif;
          text-align:center;
        ">
          <h1>❌ Acesso não autorizado!</h1>
          <p>Este domínio (<b>${dominioAtual}</b>) não tem permissão para abrir este site.</p>
        </div>
      `;

      // === Toca som de alerta ===
      const audio = new Audio(somURL);
      audio.play().catch(err => console.log("Não foi possível tocar o áudio:", err));

      // === Vibração ===
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }

      // === Envia log para o Discord ===
      fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Proteção CodeHUB",
          content: `⚠️ Acesso não autorizado detectado!\nDomínio: **${dominioAtual}**\nURL: ${window.location.href}`
        })
      }).catch(err => console.error("Erro ao enviar para o Discord:", err));
    }
