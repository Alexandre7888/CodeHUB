# Documentação da API de Scripts (MensagensHUB)

Este documento descreve as funções e eventos disponíveis para criar regras automatizadas (Bots/Moderação) dentro dos grupos.

## Eventos Disponíveis

### `onMessage(message, member)`
Executado toda vez que uma nova mensagem é enviada no grupo.
- `message`: Objeto da mensagem.
  - `id`: ID da mensagem.
  - `text`: Conteúdo de texto.
  - `senderId`: ID de quem enviou.
  - `type`: Tipo ('text', 'audio', 'image').
- `member`: Dados do membro que enviou.
  - `role`: Cargo ('admin', 'member', etc).

## Funções Disponíveis (chatAPI)

Use o objeto global `chat` para interagir com o grupo.

### `chat.deleteMessage(messageId)`
Apaga uma mensagem específica.
```javascript
if (message.text.includes("palavrão")) {
    chat.deleteMessage(message.id);
}
```

### `chat.sendMessage(text)`
Envia uma mensagem no grupo como o sistema/bot.
```javascript
if (message.text === "!ajuda") {
    chat.sendMessage("Comandos disponíveis: !regras, !info");
}
```

### `chat.kickMember(userId)`
Remove um membro do grupo.
```javascript
// Exemplo: Banir quem falar "spam"
if (message.text === "spam") {
    chat.kickMember(message.senderId);
}
```

### `chat.alert(text)`
Mostra um alerta (toast) apenas para o usuário local (bom para debug).

## Exemplos Práticos

### 1. Filtro de Palavrões
```javascript
const badWords = ['feio', 'bobo', 'chato'];
if (badWords.some(word => message.text.toLowerCase().includes(word))) {
    chat.deleteMessage(message.id);
    chat.sendMessage(`@${member.name} por favor, mantenha o respeito!`);
}
```

### 2. Bot de Boas Vindas (no evento onJoin - Futuro)
*Atualmente suportamos apenas onMessage.*
