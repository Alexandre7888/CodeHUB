export default async function handler(req, res) {
  const targetUrl = 'https://script.google.com/macros/s/AKfycbxKCEdhxFayijLW3GafXV5yN2dZ-vUeR4AcZdrpjeGT1eThFDBLlYF_C6wcpYa9Lmyv7w/exec';
  
  try {
    const response = await fetch(targetUrl);
    const data = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).send('Erro no proxy');
  }
}