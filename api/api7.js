// api/storj.js - API completa para Storj na Vercel (sem dependências)
export default async function handler(req, res) {
  // Configurações CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Credenciais do Storj
    const ACCESS_KEY = 'jwziounwmbysciqqfpu3ouvzjbza';
    const SECRET_KEY = 'j3qfpkmgqo2x56k3w6jhzvzthcimje47rwliselstcppgsdignsm';
    const ENDPOINT = 'https://gateway.storjshare.io';
    const BUCKET = 'assets';
    
    // Pegar parâmetros da URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const projectId = url.searchParams.get('projectId');
    const action = url.searchParams.get('action') || req.body?.action;
    const fileName = url.searchParams.get('fileName') || req.body?.fileName;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId é obrigatório' });
    }

    // ==================== LISTAR ARQUIVOS ====================
    if (req.method === 'GET' && !action) {
      const prefix = `${projectId}/`;
      const listUrl = `${ENDPOINT}/${BUCKET}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
      
      const response = await fetch(listUrl, {
        headers: {
          'Host': 'gateway.storjshare.io'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao listar arquivos');
      }

      const xml = await response.text();
      const files = parseXML(xml);
      
      return res.status(200).json({ 
        success: true, 
        files: files,
        projectSize: files.reduce((sum, f) => sum + f.size, 0),
        maxSize: 40 * 1024 * 1024
      });
    }

    // ==================== DELETAR ARQUIVO ====================
    if (req.method === 'DELETE' || action === 'delete') {
      if (!fileName) {
        return res.status(400).json({ error: 'fileName é obrigatório' });
      }

      const key = `${projectId}/${fileName}`;
      const deleteUrl = `${ENDPOINT}/${BUCKET}/${key}`;
      
      const date = new Date();
      const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);

      const headers = {
        'Host': 'gateway.storjshare.io',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      };

      headers['Authorization'] = generateSignature(
        'DELETE',
        `/${BUCKET}/${key}`,
        headers,
        SECRET_KEY,
        ACCESS_KEY,
        dateStamp,
        amzDate
      );

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar arquivo');
      }

      return res.status(200).json({ success: true });
    }

    // ==================== SALVAR ARQUIVO TEXTO ====================
    if ((req.method === 'POST' && action === 'save') || (req.method === 'POST' && req.body?.content !== undefined)) {
      const content = req.body?.content || '';
      const safeFileName = (fileName || 'index.html').replace(/[^a-zA-Z0-9._-]/g, '');
      const extension = safeFileName.split('.').pop().toLowerCase();
      
      // Lista de extensões bloqueadas
      const BLOCKED = ['php','phtml','php3','php4','php5','php7','phps','phar','htaccess','htpasswd','cgi','pl','py','rb','asp','aspx','sh','bash','bat','cmd','exe','dll','so','bin'];
      
      if (BLOCKED.includes(extension)) {
        return res.status(400).json({ error: 'Extensão não permitida' });
      }

      const key = `${projectId}/${safeFileName}`;
      const contentBuffer = Buffer.from(content, 'utf-8');
      
      const date = new Date();
      const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);

      const headers = {
        'Host': 'gateway.storjshare.io',
        'Content-Type': 'text/plain',
        'Content-Length': contentBuffer.length,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': hash(contentBuffer),
        'x-amz-acl': 'public-read'
      };

      headers['Authorization'] = generateSignature(
        'PUT',
        `/${BUCKET}/${key}`,
        headers,
        SECRET_KEY,
        ACCESS_KEY,
        dateStamp,
        amzDate
      );

      const response = await fetch(`${ENDPOINT}/${BUCKET}/${key}`, {
        method: 'PUT',
        headers: headers,
        body: contentBuffer
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar arquivo');
      }

      return res.status(200).json({
        success: true,
        fileName: safeFileName,
        url: `${ENDPOINT}/${BUCKET}/${key}`,
        projectSize: await getProjectSize(projectId)
      });
    }

    // ==================== UPLOAD DE ARQUIVO ====================
    if (req.method === 'POST' && !action) {
      // Parse do multipart manual
      const contentType = req.headers['content-type'];
      const boundary = contentType?.split('boundary=')[1];
      
      if (!boundary) {
        return res.status(400).json({ error: 'Boundary não encontrado' });
      }

      // Coletar dados
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Parse do multipart
      const parts = parseMultipart(buffer, boundary);
      const filePart = parts.find(p => p.filename);
      
      if (!filePart) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const safeFileName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '');
      const extension = safeFileName.split('.').pop().toLowerCase();
      
      // Verificações de segurança
      const BLOCKED = ['php','phtml','php3','php4','php5','php7','phps','phar','htaccess','htpasswd','cgi','pl','py','rb','asp','aspx','sh','bash','bat','cmd','exe','dll','so','bin'];
      
      if (BLOCKED.includes(extension)) {
        return res.status(400).json({ error: 'Extensão não permitida' });
      }

      if (filePart.data.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB' });
      }

      // Verificar limite do projeto (40MB)
      const currentSize = await getProjectSize(projectId);
      if (currentSize + filePart.data.length > 40 * 1024 * 1024) {
        return res.status(400).json({ error: 'Limite de 40MB por projeto atingido' });
      }

      const key = `${projectId}/${safeFileName}`;
      
      const date = new Date();
      const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);

      const headers = {
        'Host': 'gateway.storjshare.io',
        'Content-Type': filePart.contentType || 'application/octet-stream',
        'Content-Length': filePart.data.length,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': hash(filePart.data),
        'x-amz-acl': 'public-read'
      };

      headers['Authorization'] = generateSignature(
        'PUT',
        `/${BUCKET}/${key}`,
        headers,
        SECRET_KEY,
        ACCESS_KEY,
        dateStamp,
        amzDate
      );

      const response = await fetch(`${ENDPOINT}/${BUCKET}/${key}`, {
        method: 'PUT',
        headers: headers,
        body: filePart.data
      });

      if (!response.ok) {
        throw new Error('Erro no upload');
      }

      const textExtensions = ['html', 'css', 'js', 'txt', 'json', 'xml', 'svg'];
      const isText = textExtensions.includes(extension);

      return res.status(200).json({
        success: true,
        file: {
          name: safeFileName,
          originalName: safeFileName,
          url: `${ENDPOINT}/${BUCKET}/${key}`,
          type: isText ? 'text' : 'binary',
          extension: extension,
          content: isText ? filePart.data.toString('utf-8') : null,
          size: filePart.data.length
        },
        projectSize: currentSize + filePart.data.length,
        maxSize: 40 * 1024 * 1024
      });
    }

    return res.status(405).json({ error: 'Método não suportado' });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno' 
    });
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

// Função para obter tamanho do projeto
async function getProjectSize(projectId) {
  const ENDPOINT = 'https://gateway.storjshare.io';
  const BUCKET = 'assets';
  const prefix = `${projectId}/`;
  
  const listUrl = `${ENDPOINT}/${BUCKET}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
  const response = await fetch(listUrl);
  
  if (!response.ok) return 0;
  
  const xml = await response.text();
  const files = parseXML(xml);
  return files.reduce((sum, f) => sum + f.size, 0);
}

// Parse de XML de listagem do S3
function parseXML(xml) {
  const files = [];
  const regex = /<Contents>.*?<Key>(.*?)<\/Key>.*?<Size>(.*?)<\/Size>.*?<LastModified>(.*?)<\/LastModified>.*?<\/Contents>/gs;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    files.push({
      key: match[1],
      name: match[1].split('/').pop(),
      size: parseInt(match[2]),
      lastModified: match[3]
    });
  }
  
  return files;
}

// Parse de multipart/form-data
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
  
  let pos = 0;
  while (pos < buffer.length) {
    const startBoundary = buffer.indexOf(boundaryBuffer, pos);
    if (startBoundary === -1) break;
    
    const endBoundary = buffer.indexOf(boundaryBuffer, startBoundary + boundaryBuffer.length);
    const endBoundaryPos = endBoundary === -1 ? buffer.indexOf(endBoundaryBuffer, startBoundary) : endBoundary;
    
    if (endBoundaryPos === -1) break;
    
    const partBuffer = buffer.slice(
      startBoundary + boundaryBuffer.length,
      endBoundaryPos
    );
    
    // Pular linhas em branco iniciais
    let headerEnd = 0;
    while (partBuffer[headerEnd] === 13 || partBuffer[headerEnd] === 10) {
      headerEnd++;
    }
    
    // Encontrar fim dos headers
    const headerEndIndex = partBuffer.indexOf('\r\n\r\n', headerEnd);
    if (headerEndIndex === -1) {
      pos = endBoundaryPos;
      continue;
    }
    
    const headerBuffer = partBuffer.slice(headerEnd, headerEndIndex);
    const contentBuffer = partBuffer.slice(headerEndIndex + 4);
    
    const headers = headerBuffer.toString('utf-8').split('\r\n');
    const part = { data: contentBuffer };
    
    for (const header of headers) {
      const [key, value] = header.split(': ');
      if (key?.toLowerCase() === 'content-disposition') {
        const filenameMatch = value.match(/filename="([^"]+)"/);
        if (filenameMatch) part.filename = filenameMatch[1];
        
        const nameMatch = value.match(/name="([^"]+)"/);
        if (nameMatch) part.name = nameMatch[1];
      } else if (key?.toLowerCase() === 'content-type') {
        part.contentType = value;
      }
    }
    
    parts.push(part);
    pos = endBoundaryPos;
  }
  
  return parts;
}

// Gerar hash SHA256
function hash(data) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Gerar assinatura S3 V4
function generateSignature(method, path, headers, secretKey, accessKey, dateStamp, amzDate) {
  const crypto = require('crypto');
  
  const service = 's3';
  const region = 'us-east-1';
  
  // Headers assinados
  const signedHeaders = Object.keys(headers)
    .map(h => h.toLowerCase())
    .sort()
    .join(';');
  
  // Canonical headers
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
    .join('');
  
  // Canonical request
  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    headers['x-amz-content-sha256']
  ].join('\n');
  
  const hashedCanonicalRequest = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');
  
  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');
  
  // Calcular assinatura
  const kDate = crypto
    .createHmac('sha256', `AWS4${secretKey}`)
    .update(dateStamp)
    .digest();
    
  const kRegion = crypto
    .createHmac('sha256', kDate)
    .update(region)
    .digest();
    
  const kService = crypto
    .createHmac('sha256', kRegion)
    .update(service)
    .digest();
    
  const kSigning = crypto
    .createHmac('sha256', kService)
    .update('aws4_request')
    .digest();
    
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');
  
  return `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export const config = {
  api: {
    bodyParser: false, // Desabilitar para multipart
  },
};