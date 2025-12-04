# Backend CodeHUB

Backend em Node.js com Express para gerenciar projetos do CodeHUB.

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do backend:

```env
PORT=3000
NODE_ENV=development
FIREBASE_DATABASE_URL=https://html-15e80-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"html-15e80",...}
```

## Iniciar o servidor

Modo desenvolvimento (com hot reload):
```bash
npm run dev
```

Modo produção:
```bash
npm start
```

## API Endpoints

### Projetos

- `GET /api/projects/:userId` - Obter todos os projetos do usuário
- `GET /api/projects/:userId/:projectId` - Obter um projeto específico
- `POST /api/projects/:userId` - Criar novo projeto
- `PUT /api/projects/:userId/:projectId` - Atualizar projeto
- `DELETE /api/projects/:userId/:projectId` - Deletar projeto

### Arquivos

- `GET /api/projects/:userId/:projectId/files/:fileName` - Obter arquivo
- `POST /api/projects/:userId/:projectId/files/:fileName` - Salvar/atualizar arquivo
- `DELETE /api/projects/:userId/:projectId/files/:fileName` - Deletar arquivo

### Preview

- `GET /preview/:userId/:projectId` - Ver projeto em tempo real

### Health Check

- `GET /api/health` - Verificar se o servidor está rodando

## Exemplo de uso

```bash
# Health check
curl http://localhost:3000/api/health

# Criar projeto
curl -X POST http://localhost:3000/api/projects/user123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Meu Projeto","slug":"meu-projeto","owner":"usuario"}'
```
