// Só mostrar se o usuário não tiver clicado "Não mostrar novamente"
if (!localStorage.getItem('hidePushAlert')) {

  // Cria o container do alerta
  const alertDiv = document.createElement('div');
  alertDiv.id = 'pushAlert';
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20%';
  alertDiv.style.left = '50%';
  alertDiv.style.transform = 'translateX(-50%)';
  alertDiv.style.background = '#fff';
  alertDiv.style.border = '2px solid #333';
  alertDiv.style.borderRadius = '10px';
  alertDiv.style.padding = '20px';
  alertDiv.style.width = '300px';
  alertDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
  alertDiv.style.zIndex = '9999';
  alertDiv.style.textAlign = 'center';

  // Conteúdo
  alertDiv.innerHTML = `
    <p>Para ativar notificações em segundo plano, você precisa instalar o aplicativo.</p>
    <button id="cancel">Cancelar</button>
    <button id="installAPK">Instalar APK (Android)</button>
    <button id="installIOS">Instalar iOS</button>
    <br>
    <button id="dontShow">Não mostrar novamente</button>
  `;

  // Adiciona ao body
  document.body.appendChild(alertDiv);

  // Funções dos botões
  document.getElementById('cancel').onclick = function() {
    alertDiv.remove();
  }

  document.getElementById('installAPK').onclick = function() {
    window.location.href = 'https://code.codehub.ct.ws/mensagens/install.apk';
  }

  document.getElementById('installIOS').onclick = function() {
    alert('Ainda não está disponível para iOS.');
  }

  document.getElementById('dontShow').onclick = function() {
    localStorage.setItem('hidePushAlert', 'true');
    alertDiv.remove();
  }
}