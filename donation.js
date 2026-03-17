// donation.js
(function() {
    // Cria o overlay full-screen
    const overlay = document.createElement('div');
    overlay.id = 'donationOverlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(18,18,18,0.95)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        zIndex: '9999',
        textAlign: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#e0e0e0',
        overflowY: 'auto',
    });

    // Cria a caixa central
    const box = document.createElement('div');
    Object.assign(box.style, {
        backgroundColor: '#1e1e1e',
        padding: '30px 25px',
        borderRadius: '12px',
        maxWidth: '500px',
        boxShadow: '0 0 25px rgba(0,255,0,0.2)',
        textAlign: 'center',
    });

    // Conteúdo completo
    box.innerHTML = `
        <h1 style="color:#00e676;margin-bottom:15px;">🚀 Nossa Plataforma</h1>
        <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
            Nossa plataforma ainda é pequena e não temos recursos suficientes para manter
            todos os servidores, storages e APIs que precisamos para deixar tudo funcionando
            da melhor forma. 😅
        </p>
        <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
            Estamos fazendo o nosso melhor para vocês, mas precisamos da sua ajuda para
            continuar crescendo e mantendo tudo estável.
        </p>
        <p style="font-size:16px;line-height:1.5;margin-bottom:25px;">
            Se você gosta do que estamos fazendo, considere nos apoiar com uma doação.
            Qualquer valor ajuda! 💚
        </p>
        <a href="COLOQUE_SEU_LINK_AQUI" target="_blank" 
           style="display:inline-block;padding:12px 25px;background-color:#00e676;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;">
           💸 Fazer Doação
        </a>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Bloqueia interação com o fundo
    overlay.addEventListener('click', e => e.stopPropagation(), true);
    document.body.addEventListener('click', e => e.stopPropagation(), true);
    document.body.addEventListener('keydown', e => e.stopPropagation(), true);
})();