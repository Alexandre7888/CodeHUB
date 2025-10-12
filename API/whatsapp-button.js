// Criar o botão do WhatsApp com imagem externa
function criarBotaoWhatsApp() {
    // Criar elemento do botão
    const whatsappBtn = document.createElement('div');
    whatsappBtn.id = 'whatsapp-float';
    whatsappBtn.innerHTML = `
        <a href="https://wa.me/554799536379" target="_blank" class="whatsapp-link">
            <img src="https://store-images.s-microsoft.com/image/apps.8453.13655054093851568.4a371b72-2ce8-4bdb-9d83-be49894d3fa0.7f3687b9-847d-4f86-bb5c-c73259e2b38e?h=307" alt="WhatsApp" class="whatsapp-img">
        </a>
    `;

    // Adicionar estilos
    const styles = `
        #whatsapp-float {
            position: fixed;
            bottom: 25px;
            left: 25px;
            width: 70px;
            height: 70px;
            background-color: transparent;
            border-radius: 50%;
            box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
            overflow: hidden;
        }
        
        #whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 2px 2px 20px rgba(0, 0, 0, 0.4);
        }
        
        .whatsapp-link {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            text-decoration: none;
            border-radius: 50%;
        }
        
        .whatsapp-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }
        
        #whatsapp-float:hover .whatsapp-img {
            transform: rotate(10deg);
        }
        
        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
            }
            70% {
                box-shadow: 0 0 0 15px rgba(37, 211, 102, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
            }
        }

        /* Responsivo */
        @media (max-width: 768px) {
            #whatsapp-float {
                width: 60px;
                height: 60px;
                bottom: 20px;
                left: 20px;
            }
        }
    `;

    // Adicionar estilos ao documento
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Adicionar botão ao corpo do documento
    document.body.appendChild(whatsappBtn);

    // Adicionar efeito de clique
    whatsappBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
}

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarBotaoWhatsApp);
} else {
    criarBotaoWhatsApp();
}