# mapsHUB Project

Este projeto é um clone do Google Maps com foco em colaboração e visualização 360°, denominado **mapsHUB**.

## Funcionalidades Principais
- **Integração Firebase**: Persistência de dados em tempo real.
- **Visualização 360°**: Suporte a fotos panorâmicas via biblioteca Pannellum.
- **Painel Administrativo**: Página oculta (`admin.html`) para upload de panoramas e aprovações.
- **Maps Studio**: Nova página (`studio.html`) para criadores enviarem rotas e vídeos sem permissões de admin.
- **Vídeo para Rota**: Ferramenta que extrai frames de um vídeo para criar sequências de street view automaticamente.
- **Colaboração**: Usuários podem adicionar novos locais e fotos comuns.
- **Navegação Offline**: Rotas salvas localmente e TTS com nomes de ruas.

## Tecnologias
- **React 18**: Framework de UI
- **Leaflet**: Biblioteca de mapas
- **TailwindCSS**: Estilização
- **Pannellum**: Visualizador 360 WebGL
- **Firebase REST API**: Backend

## Estrutura de Páginas
- `index.html`: Aplicação principal (Mapa).
- `admin.html`: Painel de gerenciamento (Completo).
- `studio.html`: Painel de criação (Restrito).

## Manutenção
- A URL do Firebase está configurada em `utils/firebase.js`.
- O limite de compressão de imagens está em `utils/imageUtils.js`.