// NOTA: Este é um esboço da lógica. Você precisará adaptar as URLs e os nomes de campos conforme a estrutura real do seu Google Apps Script e Firebase.

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action;
  const baseScriptUrl = 'https://script.google.com/macros/s/AKfycbxKCEdhxFayijLW3GafXV5yN2dZ-vUeR4AcZdrpjeGT1eThFDBLlYF_C6wcpYa9Lmyv7w/exec';
  const firebaseUrl = 'https://html-785e3-default-rtdb.firebaseio.com/registros.json'; // URL do Firebase

  // Função para obter um identificador único do dispositivo (exemplo: IP + User-Agent)
  const getDeviceIdentifier = (req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    // Criar um hash simples (em produção, use um algoritmo mais robusto)
    const rawId = `${ip}-${userAgent}`;
    // Simular um hash (substitua por crypto.createHash em um ambiente Node.js real)
    const hashCode = rawId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return `device_${hashCode}`;
  };

  // --- Lógica para criar nova conta (action=newaccount) ---
  if (action === 'newaccount') {
    try {
      const deviceId = getDeviceIdentifier(req);

      // 1. Verificar no Firebase se este dispositivo já tem um registro
      const checkResponse = await fetch(`${firebaseUrl}?orderBy="deviceId"&equalTo="${deviceId}"`);
      const checkData = await checkResponse.json();

      const existingRegistration = Object.values(checkData || {}).length > 0;

      if (existingRegistration) {
        // Dispositivo já registrou uma conta
        return res.status(403).json({
          error: 'Apenas uma conta por dispositivo é permitida.',
          deviceId: deviceId
        });
      }

      // 2. Se for um POST, significa que o formulário foi enviado
      if (req.method === 'POST' && req.body) {
        // a. Enviar dados para o Google Apps Script (se necessário)
        const scriptResponse = await fetch(baseScriptUrl + '?action=newaccount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        const scriptResult = await scriptResponse.text();

        // b. Salvar o registro no Firebase
        const firebasePayload = {
          deviceId: deviceId,
          accountData: req.body,
          createdAt: new Date().toISOString(),
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        };

        await fetch(firebaseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firebasePayload)
        });

        // c. Retornar sucesso
        return res.status(200).json({
          message: 'Conta criada e dispositivo registrado com sucesso!',
          scriptResponse: scriptResult
        });

      } else {
        // 3. Se for GET, apenas mostrar o formulário (repassar do Google Apps Script)
        const formResponse = await fetch(baseScriptUrl + '?action=newaccount');
        const formHtml = await formResponse.text();
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(formHtml);
      }

    } catch (error) {
      console.error('Erro no processamento de newaccount:', error);
      return res.status(500).json({ error: 'Erro interno no servidor proxy.', details: error.message });
    }
  }

  // --- Para outras ações (newpassword, test), apenas repassar para o Google Apps Script ---
  try {
    const url = new URL(baseScriptUrl);
    Object.keys(req.query).forEach(key => url.searchParams.append(key, req.query[key]));

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      ...(req.method === 'POST' && req.body && { body: JSON.stringify(req.body) })
    });

    const data = await response.text();
    res.status(response.status).send(data);

  } catch (error) {
    console.error('Erro no proxy geral:', error);
    res.status(500).send('Erro no proxy');
  }
}