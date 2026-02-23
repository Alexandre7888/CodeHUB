export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const baseUrl = 'https://script.google.com/macros/s/AKfycbxKCEdhxFayijLW3GafXV5yN2dZ-vUeR4AcZdrpjeGT1eThFDBLlYF_C6wcpYa9Lmyv7w/exec';
  
  try {
    // Construir URL com os parâmetros da requisição
    const url = new URL(baseUrl);
    
    // Pegar todos os parâmetros da URL (action, uid, etc)
    Object.keys(req.query).forEach(key => {
      url.searchParams.append(key, req.query[key]);
    });

    // Fazer a requisição para o Google Apps Script
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Retornar a resposta
    const data = await response.text();
    res.status(response.status).send(data);
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).send('Erro no proxy');
  }
}