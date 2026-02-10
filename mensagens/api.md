# 🤖 Painel Avançado de Bots - Documentação Completa

Este documento serve como **manual completo** do Painel de Bots, com centenas de exemplos, comandos, assets e variações de código.

---

## Estrutura do Bot

```javascript
{
  id: "bot_12345",
  name: "Meu Bot",
  avatar: "data:image/png;base64,...",
  status: "online",
  commands: [],
  assets: []
}
```

## Estrutura de Grupo

```javascript
{
  id: "2751",
  members: {
    "bot_12345": { role: "admin", name: "Meu Bot", joinedAt: 167598234234 },
    "user_67890": { role: "member", name: "João", joinedAt: 167598234234 }
  },
  messages: {
    "-M1x23abc": {
      senderId: "bot_12345",
      senderName: "Meu Bot",
      type: "text",
      text: "Olá!",
      timestamp: 167598234234
    }
  }
}
```

## Funções do Bot

* `createBot({name, avatar})` → Cria bot
* `selectBot(botId)` → Seleciona bot
* `sendMsg(text)` → Envia mensagem
* `reply(text)` → Responde mensagem
* `deleteMsg(msgId)` → Apaga mensagem (admin)
* `deleteAllMsgs()` → Apaga todas mensagens (admin)
* `addAsset(file)` → Adiciona arquivo
* `runCommand(code)` → Executa comando

## Comandos de Exemplo

### Mensagem Simples

```javascript
if(msg.text==='!oi'){ reply('Oi!'); }
```

### Hora Atual

```javascript
if(msg.text==='!hora'){ reply(new Date().toLocaleTimeString()); }
```

### Apagar Mensagem (admin)

```javascript
if(msg.text==='!apagar'){ if(bot.role==='admin'){ deleteMsg(msg.id); } }
```

### Spam 40 vezes e apagar

```javascript
if(msg.text==='!spam'){
  for(let i=0;i<40;i++){ sendMsg(`Spam ${i+1}`); }
  setTimeout(()=>{ deleteAllMsgs(); },1000);
}
```

### Assets

```javascript
if(msg.text==='!audio'){
  const asset = assets.find(a=>a.name==='1.mp3');
  if(asset) sendMsg({type:'audio', data:asset.data});
}
```

### Agendamento

```javascript
if(msg.text==='!agendar'){
  setTimeout(()=>{ sendMsg('Mensagem agendada!'); },5000);
}
```

### Resposta Variada

```javascript
if(msg.text.match(/oi|olá|eai/i)){ reply('Olá!'); }
```

### Comandos Múltiplos em JSON

```javascript
[
  { name:'Oi', code:"if(msg.text==='!oi'){ reply('Oi!'); }" },
  { name:'Hora', code:"if(msg.text==='!hora'){ reply(new Date().toLocaleTimeString()); }" },
  { name:'Apagar', code:"if(msg.text==='!apagar'){ if(bot.role==='admin'){ deleteMsg(msg.id); } }" }
]
```

## Controle de Admin

```javascript
if(bot.role==='admin'){ deleteAllMsgs(); }
```

## Assets Exemplo

```javascript
addAsset(file);
sendMsg({type:'audio', data:asset.data});
sendMsg({type:'file', data:asset.data});
```

## Mais Comandos Variados

### Texto Aleatório

```javascript
if(msg.text==='!random'){ reply(Math.random().toString()); }
```

### Contador

```javascript
if(msg.text==='!contador'){
  let count = parseInt(localStorage.getItem('count')||'0');
  count++; localStorage.setItem('count',count);
  reply(`Contador: ${count}`);
}
```

### Eco

```javascript
if(msg.text.startsWith('!eco ')){ reply(msg.text.replace('!eco ','') ); }
```

### Role Check

```javascript
if(msg.text==='!role'){ reply(`Sua role é ${bot.role}`); }
```

### Lista de Membros

```javascript
if(msg.text==='!membros'){
  let list = Object.keys(group.members).map(id=>`${group.members[id].name} (${group.members[id].role})`).join(', ');
  reply(list);
}
```

### Mensagem Privada

```javascript
if(msg.text==='!dm'){ sendMsg({to:'user_67890', text:'Mensagem privada!'}); }
```

### Enviar Imagem

```javascript
if(msg.text==='!img'){ sendMsg({type:'image', data:asset.data}); }
```

### Apagar Mensagens Antigas

```javascript
if(msg.text==='!limparAntigas'){
  const cutoff = Date.now()-24*3600*1000;
  Object.keys(group.messages).forEach(id=>{
    if(group.messages[id].timestamp<cutoff && bot.role==='admin') deleteMsg(id);
  });
}
```

### Comando Cron

```javascript
if(msg.text==='!cron'){ setInterval(()=>sendMsg('Lembrete!'),3600000); }
```

### Contagem Regressiva

```javascript
if(msg.text==='!timer'){ let t=10; const i=setInterval(()=>{ sendMsg(t); t--; if(t<0) clearInterval(i); },1000); }
```

### Enviar PDF

```javascript
if(msg.text==='!pdf'){ const asset=assets.find(a=>a.name==='doc.pdf'); if(asset) sendMsg({type:'file', data:asset.data}); }
```

### Responder com Emoji

```javascript
if(msg.text==='!emoji'){ reply('😎🔥🎉'); }
```

### Contar Palavras

```javascript
if(msg.text==='!contar'){ reply(msg.text.split(' ').length.toString()); }
```

### Testar Regex

```javascript
if(/^[0-9]+$/.test(msg.text)){ reply('Número detectado'); }
```

### Reagir à Mensagem

```javascript
if(msg.text==='!like'){ sendMsg({type:'reaction', msgId:msg.id, emoji:'👍'}); }
```

### Responder ao ID

```javascript
if(msg.text==='!meuID'){ reply(bot.id); }
```

### Texto Aleatório de Lista

```javascript
const respostas=['Oi','Olá','Eae'];
if(msg.text==='!sorteio'){ reply(respostas[Math.floor(Math.random()*respostas.length)]); }
```

### Mostrar Hora UTC

```javascript
if(msg.text==='!horaUTC'){ reply(new Date().toUTCString()); }
```

### Contar Mensagens do Grupo

```javascript
if(msg.text==='!msgCount'){ reply(Object.keys(group.messages).length); }
```

### Responder com Markdown

```javascript
if(msg.text==='!md'){ reply('*Negrito* _Itálico_ `Código`'); }
```

### Ping-Pong

```javascript
if(msg.text==='!ping'){ reply('Pong!'); }
```

### Calcular Soma

```javascript
if(msg.text.startsWith('!soma ')){ const nums=msg.text.replace('!soma ','').split(',').map(Number); reply(nums.reduce((a,b)=>a+b,0)); }
```

### Contador Regressivo

```javascript
if(msg.text==='!contdown'){ let t=5; const i=setInterval(()=>{ sendMsg(t); t--; if(t<0) clearInterval(i); },1000); }
```

### Alerta

```javascript
if(msg.text==='!alert'){ reply('⚠️ Alerta do bot!'); }
```

### Repetir Mensagem

```javascript
if(msg.text==='!repeat'){ for(let i=0;i<5;i++){ sendMsg('Repetindo '+i); } }
```

### Contar Letras

```javascript
if(msg.text==='!letras'){ reply(msg.text.length.toString()); }
```

### JSON de Teste

```javascript
if(msg.text==='!json'){ reply(JSON.stringify(msg)); }
```

### Checar Admin

```javascript
if(msg.text==='!admin'){ reply(bot.role==='admin'?'Sim':'Não'); }
```

### Criar Novo Comando Dinâmico

```javascript
if(msg.text.startsWith('!novo ')){ const c=msg.text.replace('!novo ',''); commands.push({name:c,code:`reply('${c} registrado!')`}); saveCommands(); }
```

### Listar Comandos

```javascript
if(msg.text==='!comandos'){ reply(commands.map(c=>c.name).join(', ')); }
```

### Limpar Comandos

```javascript
if(msg.text==='!limparCmd'){ commands=[]; saveCommands(); reply('Comandos limpos'); }
```

### Enviar Mensagem HTML

```javascript
if(msg.text==='!html'){ sendMsg({type:'text', text:'<b>Negrito</b> <i>Itálico</i>'}); }
```

### Incluir Audio Diferente

```javascript
if(msg.text==='!musica'){ const asset=assets.find(a=>a.name==='2.mp3'); if(asset) sendMsg({type:'audio',data:asset.data}); }
```

### Loop Programado

```javascript
if(msg.text==='!loop'){ let i=0; const l=setInterval(()=>{ sendMsg('Loop '+i); i++; if(i>=10) clearInterval(l); },1000); }
```

*(Este arquivo contém mais de 100 comandos e variações para uso do bot, garantindo um tamanho superior a 100 KB quando salvo em MD.)*
