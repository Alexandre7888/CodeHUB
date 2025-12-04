import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurações
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (Object.keys(serviceAccount).length > 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

// ==================== ROTAS DE PROJETOS ====================

// Obter todos os projetos do usuário
app.get('/api/projects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.ref(`projects/${userId}`).get();
    const projects = snapshot.val() || {};
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Erro ao obter projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter projetos',
      error: error.message
    });
  }
});

// Obter um projeto específico
app.get('/api/projects/:userId/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    const snapshot = await db.ref(`projects/${userId}/${projectId}`).get();
    const project = snapshot.val();
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Erro ao obter projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter projeto',
      error: error.message
    });
  }
});

// Criar novo projeto
app.post('/api/projects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, slug } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Nome e slug são obrigatórios'
      });
    }
    
    const projectId = uuidv4();
    const projectData = {
      id: projectId,
      name,
      slug,
      owner: req.body.owner || 'usuário',
      ownerId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: {
        'index.html': {
          content: `<!DOCTYPE html>
<html>
<head>
  <title>${name}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <p>Comece a editar seu código aqui!</p>
</body>
</html>`,
          language: 'html',
          createdAt: new Date().toISOString(),
          originalName: 'index.html'
        }
      }
    };
    
    await db.ref(`projects/${userId}/${projectId}`).set(projectData);
    
    res.status(201).json({
      success: true,
      message: 'Projeto criado com sucesso',
      data: { projectId, ...projectData }
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar projeto',
      error: error.message
    });
  }
});

// Atualizar projeto
app.put('/api/projects/:userId/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await db.ref(`projects/${userId}/${projectId}`).update(updateData);
    
    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      data: updateData
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar projeto',
      error: error.message
    });
  }
});

// Deletar projeto
app.delete('/api/projects/:userId/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    await db.ref(`projects/${userId}/${projectId}`).remove();
    
    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar projeto',
      error: error.message
    });
  }
});

// ==================== ROTAS DE ARQUIVOS ====================

// Obter arquivo específico
app.get('/api/projects/:userId/:projectId/files/:fileName', async (req, res) => {
  try {
    const { userId, projectId, fileName } = req.params;
    const snapshot = await db.ref(`projects/${userId}/${projectId}/files/${fileName}`).get();
    const file = snapshot.val();
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Erro ao obter arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter arquivo',
      error: error.message
    });
  }
});

// Salvar/Atualizar arquivo
app.post('/api/projects/:userId/:projectId/files/:fileName', async (req, res) => {
  try {
    const { userId, projectId, fileName } = req.params;
    const { content, language } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Conteúdo do arquivo é obrigatório'
      });
    }
    
    const fileData = {
      content,
      language: language || 'html',
      updatedAt: new Date().toISOString(),
      originalName: fileName
    };
    
    await db.ref(`projects/${userId}/${projectId}/files/${fileName}`).set(fileData);
    
    // Atualizar updatedAt do projeto
    await db.ref(`projects/${userId}/${projectId}`).update({
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Arquivo salvo com sucesso',
      data: fileData
    });
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar arquivo',
      error: error.message
    });
  }
});

// Deletar arquivo
app.delete('/api/projects/:userId/:projectId/files/:fileName', async (req, res) => {
  try {
    const { userId, projectId, fileName } = req.params;
    
    // Não permitir deletar o arquivo principal
    if (fileName === 'index.html') {
      return res.status(400).json({
        success: false,
        message: 'Não é permitido deletar o arquivo principal'
      });
    }
    
    await db.ref(`projects/${userId}/${projectId}/files/${fileName}`).remove();
    
    res.json({
      success: true,
      message: 'Arquivo deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar arquivo',
      error: error.message
    });
  }
});

// ==================== ROTAS DE PREVIEW ====================

// Preview do projeto (servir HTML/CSS/JS)
app.get('/preview/:userId/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    const snapshot = await db.ref(`projects/${userId}/${projectId}/files/index.html`).get();
    const file = snapshot.val();
    
    if (!file) {
      return res.status(404).send('Arquivo não encontrado');
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(file.content);
  } catch (error) {
    console.error('Erro ao renderizar preview:', error);
    res.status(500).send('Erro ao renderizar preview');
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend está rodando',
    timestamp: new Date().toISOString()
  });
});

// ==================== TRATAMENTO DE ERROS ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  CodeHUB Backend iniciado com sucesso! 🚀  ║
╠════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:${PORT}    ║
║  API disponível em: http://localhost:${PORT}/api  ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
