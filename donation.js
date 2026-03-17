// donation.js

(function() {
    // Cria o overlay
    const overlay = document.createElement('div');
    overlay.id = 'donationOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(18,18,18,0.95)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 9999;
    overlay.style.textAlign = 'center';
    overlay.style.padding = '20px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    overlay.style.color = '#e0e0e0';
    overlay.style.overflow = 'hidden';

    // Cria a caixa central
    const box = document.createElement('div');
    box.style.backgroundColor = '#1e1e1e';
    box.style.padding = '30px 25px';
    box.style.borderRadius = '12px';
    box.style.maxWidth = '500px';
    box.style.boxShadow = '0 0 25px rgba(0,255,0,0.2)';

    // Conteúdo HTML
    box.innerHTML = `
        <h1 style="color:#00e676;margin-bottom:15px;">🚀 Nossa Plataforma</h1>
        <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
            Nossa plataforma ainda é pequena e não temos recursos suficientes para manter
            todos os servidores, storages e APIs que precisamos para deixar tudo funcionando
            da melhor forma. 😅
        </p>
        <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
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

    // Bloqueia interação com fundo
    overlay.addEventListener('click', e => e.stopPropagation(), true);
    document.body.addEventListener('click', e => e.stopPropagation(), true);
    document.body.addEventListener('keydown', e => e.stopPropagation(), true);
})();