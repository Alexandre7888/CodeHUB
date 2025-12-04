#!/bin/bash

# Script para iniciar o backend CodeHUB

echo "╔════════════════════════════════════════════╗"
echo "║  Iniciando Backend CodeHUB 🚀               ║"
echo "╚════════════════════════════════════════════╝"

cd "$(dirname "$0")/backend"

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Instalando dependências..."
    npm install
fi

echo ""
echo "🚀 Iniciando servidor..."
node server.js
