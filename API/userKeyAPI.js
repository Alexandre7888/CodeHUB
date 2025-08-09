// Função para pegar parâmetros da URL
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return Object.fromEntries(urlParams.entries());
}

// Cria o conteúdo da página dinamicamente
function createPage() {
  // Limpa o body
  document.body.innerHTML = '';
  document.body.style.fontFamily = 'Arial, sans-serif';
  document.body.style.textAlign = 'center';
  document.body.style.padding = '50px';
  document.body.style.background = '#f0f0f0';

  // Cria título
  const h1 = document.createElement('h1');
  h1.textContent = 'Bem-vindo!';
  document.body.appendChild(h1);

  // Cria div para mostrar o nome
  const userNameDisplay = document.createElement('div');
  userNameDisplay.id = 'userNameDisplay';
  userNameDisplay.style.fontSize = '1.5rem';
  userNameDisplay.style.color = '#333';
  userNameDisplay.style.marginTop = '20px';

  const params = getQueryParams();
  const userName = params.userName || null;

  if (userName) {
    userNameDisplay.textContent = `Olá, ${userName}!`;
  } else {
    userNameDisplay.textContent = 'Nome do usuário não encontrado na URL.';
  }

  document.body.appendChild(userNameDisplay);
}

// Executa a criação da página
createPage();