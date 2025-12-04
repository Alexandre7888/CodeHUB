# Guia de Configuração do Backend CodeHUB

## O que foi criado?

Um backend completo em Node.js + Express com:
- ✅ Gerenciamento de projetos
- ✅ CRUD de arquivos
- ✅ Preview de projetos em tempo real
- ✅ Integração com Firebase Realtime Database
- ✅ CORS habilitado para acesso do frontend
- ✅ Health check para monitoramento

## Passo 1: Instalar dependências

```bash
cd backend
npm install
```

## Passo 2: Configurar Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Vá para Configurações do Projeto → Contas de serviço
3. Clique em "Gerar nova chave privada"
4. Copie o conteúdo JSON
5. Edite o arquivo `backend/.env` e adicione:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"html-15e80",...}
```

## Passo 3: Iniciar o servidor

```bash
npm run dev
```

Você verá:
```
╔════════════════════════════════════════════╗
║  CodeHUB Backend iniciado com sucesso! 🚀  ║
╠════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:3000    ║
║  API disponível em: http://localhost:3000/api  ║
╚════════════════════════════════════════════╝
```

## Passo 4: Testar o backend

```bash
# Health check
curl http://localhost:3000/api/health

# Criar um projeto (substitua USER_ID pelo seu uid do Firebase)
curl -X POST http://localhost:3000/api/projects/USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Projeto",
    "slug": "meu-projeto",
    "owner": "seu-nome"
  }'
```

## Endpoints disponíveis

### 📦 Projetos

#### Obter todos os projetos
```
GET /api/projects/:userId
```

#### Obter um projeto
```
GET /api/projects/:userId/:projectId
```

#### Criar projeto
```
POST /api/projects/:userId
Body: {
  "name": "Nome do Projeto",
  "slug": "nome-do-projeto",
  "owner": "seu-nome"
}
```

#### Atualizar projeto
```
PUT /api/projects/:userId/:projectId
Body: { campos a atualizar }
```

#### Deletar projeto
```
DELETE /api/projects/:userId/:projectId
```

### 📄 Arquivos

#### Obter arquivo
```
GET /api/projects/:userId/:projectId/files/:fileName
```

#### Salvar arquivo
```
POST /api/projects/:userId/:projectId/files/:fileName
Body: {
  "content": "conteúdo do arquivo",
  "language": "html" (ou css, js, etc)
}
```

#### Deletar arquivo
```
DELETE /api/projects/:userId/:projectId/files/:fileName
```

### 👁️ Preview

#### Ver projeto em tempo real
```
GET /preview/:userId/:projectId
```

Abre no navegador: `http://localhost:3000/preview/USER_ID/PROJECT_ID`

## Estrutura de pastas

```
backend/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env               # Variáveis de ambiente
├── .env.example       # Exemplo de .env
└── README.md          # Documentação da API
```

## Próximas melhorias

- [ ] Autenticação JWT
- [ ] Upload de arquivos
- [ ] Compressão de respostas
- [ ] Rate limiting
- [ ] Logs estruturados
- [ ] Testes automatizados
- [ ] Deploy no Vercel/Heroku

## Troubleshooting

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro de conexão com Firebase
- Verifique se a chave do Firebase está correta em `.env`
- Verifique se você tem acesso ao projeto Firebase

### Porta já em uso
```bash
# Mudar porta
PORT=3001 npm run dev
```

## Suporte

Para dúvidas, abra uma issue no repositório!
