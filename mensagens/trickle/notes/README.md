# ChatApp BR - Versão Real

Este projeto é um aplicativo de mensagens funcional inspirado no WhatsApp, integrando serviços reais para autenticação, banco de dados e comunicação P2P.

## Tecnologias Reais Integradas
- **CodeHUB Auth**: Autenticação oficial usando a API `userKeyAPI.js` com o token `5EsCci5szHJLCX7Lkgie`.
- **Firebase Realtime Database**: 
  - Armazenamento de mensagens, usuários, grupos e logs em tempo real.
  - Sincronização automática entre dispositivos.
- **Trickle Database**:
  - Tabela `chat_messages` para backup permanente de mensagens e arquivos de áudio (Base64).
  - Funciona em paralelo com o Firebase: Firebase sincroniza, Trickle arquiva.
- **PeerJS (WebRTC)**: Chamadas de voz reais ponto-a-ponto (P2P) usando o Firebase como sinalizador.
- **API Dedicada**: Arquivo `utils/chatApi.js` que expõe funções para envio de mensagens via token.

## Estrutura de Arquivos
- `index.html`: Carrega SDKs (Firebase, PeerJS, CodeHUB).
- `utils/chatApi.js`: API unificada que envia para Firebase e faz backup no Trickle DB.
- `components/Login.js`: Lógica de login real com redirecionamento CodeHUB.
- `components/ChatInterface.js`: Lógica de chat em tempo real ouvindo o Firebase.

## Configuração
As credenciais do Firebase estão hardcoded no `utils/firebaseConfig.js`. Certifique-se de que as regras de segurança do Firebase permitam leitura/escrita para testes.