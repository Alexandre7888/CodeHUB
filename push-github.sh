#!/bin/bash

# Script para fazer push do CodeHUB para GitHub

echo "╔════════════════════════════════════════════╗"
echo "║  Enviando CodeHUB para GitHub 🚀            ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Configurar Git (se necessário)
echo "📝 Configurando Git..."
git config --global user.name "GitHub Copilot" 2>/dev/null || true
git config --global user.email "copilot@github.com" 2>/dev/null || true

echo ""
echo "📊 Status atual:"
git status

echo ""
echo "➕ Adicionando todos os arquivos..."
git add -A

echo ""
echo "💬 Fazendo commit..."
git commit -m "✨ Update: Novo sistema de código direto, links compartilháveis e terminal integrado

- 🎯 Removido sistema de upload de arquivo
- 💻 Adicionado modal para inserir código direto
- 🔗 Novo sistema de links compartilháveis
- 🖥️ Terminal Xterm.js integrado
- 🎨 Interface melhorada
- 📚 Documentação atualizada
- 🔧 Backend Node.js + Express criado

Commit automático via GitHub Copilot"

echo ""
echo "🚀 Fazendo push para GitHub..."
git push origin main

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✓ Enviado com sucesso! 🎉                 ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📌 Verifique em: https://github.com/Alexandre7888/CodeHUB"
