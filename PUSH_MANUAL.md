## 🚀 INSTRUÇÕES PARA FAZER PUSH NO GITHUB

Mano, parece que o terminal está com um problema. Mas é fácil fazer push! Segue as instruções:

### 📱 OPÇÃO 1: Usando o Git Bash (Mais Fácil)

1. **Abra o terminal do VS Code:**
   - Pressione `Ctrl + ~` (backtick)
   - Ou vá em: Terminal > New Terminal

2. **Execute os comandos em ordem:**

```bash
# Entrar na pasta do projeto
cd /workspaces/CodeHUB

# Verificar status
git status

# Adicionar todos os arquivos
git add -A

# Fazer commit com mensagem
git commit -m "✨ Update: Inserção de código direto, links compartilháveis e terminal integrado"

# Fazer push
git push origin main
```

---

### 📱 OPÇÃO 2: Usando VS Code (Sem Digitar)

1. **Abra o Git Graph:**
   - Pressione `Ctrl + Shift + P`
   - Digite: "Git Graph: View Git Graph"
   - Enter

2. **Ou use o Source Control do VS Code:**
   - Clique em "Source Control" na barra lateral
   - Ou pressione `Ctrl + Shift + G`

3. **Então:**
   - Digite a mensagem de commit na caixa de texto
   - Clique em "✓ Commit"
   - Clique em "⇡ Push" (seta para cima)

---

### 🔐 OPÇÃO 3: Usando GitHub CLI (Se Configurado)

```bash
cd /workspaces/CodeHUB
gh repo sync
git push origin main
```

---

## 📋 O QUE SERÁ ENVIADO

### Novos Arquivos:
- ✅ `terminal.js` - Terminal integrado
- ✅ `backend/server.js` - API Node.js
- ✅ `backend/package.json` - Dependências
- ✅ `backend/package-lock.json` - Lock file
- ✅ `backend/.env.example` - Exemplo de env
- ✅ `backend/README.md` - Documentação API
- ✅ `backend/node_modules/` - Dependências (pesado)
- ✅ `start-backend.sh` - Script bash
- ✅ `push-github.sh` - Script push
- ✅ `ATUALIZACOES.md` - Documentação
- ✅ `GIT_COMMANDS.md` - Este arquivo

### Arquivos Modificados:
- ✅ `editor.html` - Botões novos
- ✅ `editor.js` - Funções novas
- ✅ `editor.css` - Estilos terminal
- ✅ `SETUP_BACKEND.md` - Criado
- ✅ `ATUALIZACOES.md` - Atualizado

---

## ⚠️ NOTA IMPORTANTE: node_modules

O `node_modules` é MUITO grande (~240MB). Se quiser evitar enviar:

### OPÇÃO A: Ignorar node_modules (Recomendado)

```bash
cd /workspaces/CodeHUB
echo "backend/node_modules/" >> .gitignore
git rm --cached -r backend/node_modules/
git add .gitignore
git commit -m "Remove node_modules from git"
git push
```

Depois, quem clonar o repositório faz:
```bash
cd backend
npm install
```

### OPÇÃO B: Enviar tudo (Não recomendado)

Se quiser enviar node_modules mesmo assim, apenas execute os comandos normais.

---

## ✨ DEPOIS DE FAZER PUSH

Você verá no GitHub:
- Branch `main` com todos os arquivos
- Histórico de commits
- Documentação atualizada

---

## 🎯 RESUMO RÁPIDO (Copie e Cole)

```bash
cd /workspaces/CodeHUB
git add -A
git commit -m "✨ Update: Inserção de código direto, links compartilháveis e terminal integrado"
git push origin main
```

---

**Se tiver problemas, segue os passos com calma que funciona! 🚀**
