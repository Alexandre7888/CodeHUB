#!/usr/bin/env bash

# 🚀 Script para fazer Push Automático no GitHub
# Use: bash github-push.sh

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   🚀 CodeHUB - Push para GitHub                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Entrar na pasta
cd /workspaces/CodeHUB || exit

echo -e "${BLUE}📍 Localização: $(pwd)${NC}"
echo ""

# Verificar se é repositório git
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Não é um repositório git!${NC}"
    exit 1
fi

# Status atual
echo -e "${BLUE}📊 Status do repositório:${NC}"
git status --short
echo ""

# Adicionar arquivos
echo -e "${BLUE}➕ Adicionando arquivos...${NC}"
git add -A
echo -e "${GREEN}✓ Arquivos adicionados${NC}"
echo ""

# Commit
echo -e "${BLUE}💬 Fazendo commit...${NC}"
git commit -m "✨ Update: Inserção de código direto, links compartilháveis e terminal integrado

- 🎯 Removido: Sistema de upload de arquivo
- 💻 Adicionado: Modal para inserir código direto
- 🔗 Adicionado: Sistema de links compartilháveis
- 🖥️ Adicionado: Terminal Xterm.js integrado
- 🎨 Melhorado: Interface do editor
- 📚 Documentação: Atualizada com novas funcionalidades
- 🔧 Backend: Node.js + Express criado
- 🛠️ Config: .gitignore atualizado

Mudanças automáticas feitas pelo GitHub Copilot"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Commit realizado${NC}"
else
    echo -e "${YELLOW}⚠️  Nada novo para commitar${NC}"
fi
echo ""

# Push
echo -e "${BLUE}🚀 Fazendo push para origin/main...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Push realizado com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📌 Verifique em:${NC}"
    echo -e "${GREEN}https://github.com/Alexandre7888/CodeHUB${NC}"
else
    echo -e "${YELLOW}⚠️  Erro ao fazer push${NC}"
    echo "Certifique-se de que:"
    echo "1. Você tem acesso ao repositório"
    echo "2. GitHub CLI está configurado"
    echo "3. Sua chave SSH está configurada"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ✨ Obrigado por usar CodeHUB!              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
