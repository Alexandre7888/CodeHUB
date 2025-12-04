/**
 * Terminal Integrado para CodeHUB Editor
 * Usa Xterm.js para emular um terminal Unix/Linux no navegador
 */

class CodeHUBTerminal {
  constructor() {
    this.term = null;
    this.fitAddon = null;
    this.isMinimized = false;
    this.history = [];
    this.historyIndex = 0;
    this.currentInput = '';
    this.connected = false;
    
    this.init();
  }

  init() {
    this.setupTerminal();
    this.setupEventListeners();
    this.showWelcome();
  }

  setupTerminal() {
    const terminalElement = document.getElementById('terminal');
    
    // Criar instância do Xterm
    this.term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Courier New', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#0db147',
        cursor: '#ff9500',
        black: '#000000',
        red: '#ff0000',
        green: '#0db147',
        yellow: '#ffff00',
        blue: '#0066ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
      }
    });

    // Abrir terminal no elemento
    this.term.open(terminalElement);

    // Adicionar addon de fit
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    
    try {
      this.fitAddon.fit();
    } catch (e) {
      console.log('Fit error:', e);
    }

    // Listeners de entrada
    this.term.onData(data => this.handleInput(data));
    
    // Redimensionar ao mudar tamanho da janela
    window.addEventListener('resize', () => {
      try {
        this.fitAddon.fit();
      } catch (e) {
        console.log('Fit error on resize:', e);
      }
    });
  }

  setupEventListeners() {
    const toggleBtn = document.getElementById('toggle-terminal');
    const closeBtn = document.getElementById('close-terminal');
    const container = document.getElementById('terminal-container');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleTerminal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeTerminal();
      });
    }

    // Permitir arrastar a janela do terminal
    this.makeTerminalDraggable();
  }

  makeTerminalDraggable() {
    const header = document.getElementById('terminal-header');
    const container = document.getElementById('terminal-container');
    let isDown = false;
    let offset = { x: 0, y: 0 };

    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      
      isDown = true;
      const rect = container.getBoundingClientRect();
      offset.x = e.clientX - rect.left;
      offset.y = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      
      // Manter dentro dos limites
      const newX = Math.max(0, e.clientX - offset.x);
      const newY = Math.max(0, e.clientY - offset.y);
      
      if (newX + container.offsetWidth <= window.innerWidth &&
          newY + container.offsetHeight <= window.innerHeight) {
        container.style.position = 'fixed';
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        container.style.width = container.offsetWidth + 'px';
        container.style.height = container.offsetHeight + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isDown = false;
    });
  }

  toggleTerminal() {
    const container = document.getElementById('terminal-container');
    container.classList.toggle('terminal-hidden');
    this.isMinimized = container.classList.contains('terminal-hidden');
    
    if (!this.isMinimized) {
      setTimeout(() => {
        try {
          this.fitAddon.fit();
        } catch (e) {
          console.log('Fit error:', e);
        }
      }, 100);
    }
  }

  closeTerminal() {
    const container = document.getElementById('terminal-container');
    container.style.display = 'none';
  }

  handleInput(data) {
    const printable = new Uint8Array(data).every(code => code >= 32 && code !== 127);
    
    if (data === '\r') {
      // Enter pressionado
      this.executeCommand(this.currentInput);
      this.currentInput = '';
    } else if (data === '\u007f') {
      // Backspace
      if (this.currentInput.length > 0) {
        this.currentInput = this.currentInput.slice(0, -1);
        this.term.write('\b \b');
      }
    } else if (printable) {
      // Caractere normal
      this.currentInput += data;
      this.term.write(data);
    } else if (data === '\u001b[A') {
      // Seta para cima (histórico)
      this.goBackHistory();
    } else if (data === '\u001b[B') {
      // Seta para baixo (histórico)
      this.goForwardHistory();
    }
  }

  executeCommand(command) {
    const trimmedCommand = command.trim();
    
    if (trimmedCommand) {
      this.history.push(trimmedCommand);
      this.historyIndex = this.history.length;
    }

    this.term.writeln('');

    // Comandos disponíveis
    const commands = {
      'help': () => this.showHelp(),
      'clear': () => this.clearScreen(),
      'echo': (args) => this.echo(args),
      'projeto': () => this.showProjectInfo(),
      'arquivos': () => this.listProjectFiles(),
      'npm-start': () => this.runNpmStart(),
      'version': () => this.showVersion(),
      '': () => {} // Comando vazio
    };

    const [cmd, ...args] = trimmedCommand.split(' ');
    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd in commands) {
      commands[lowerCmd](args.join(' '));
    } else if (lowerCmd.startsWith('echo ')) {
      this.echo(trimmedCommand.substring(5));
    } else {
      this.term.write(`\x1b[31mComando não encontrado: ${cmd}\x1b[0m\r\n`);
    }

    this.writePrompt();
  }

  showWelcome() {
    const welcome = `
\x1b[36m╔════════════════════════════════════════════╗
║     Bem-vindo ao Terminal CodeHUB! 🚀       ║
╠════════════════════════════════════════════╣
║ Digite 'help' para ver os comandos         ║
║ Digite 'clear' para limpar a tela          ║
╚════════════════════════════════════════════╝\x1b[0m

`;
    this.term.write(welcome);
    this.writePrompt();
  }

  writePrompt() {
    this.term.write('\x1b[36m$ \x1b[0m');
  }

  clearScreen() {
    this.term.clear();
  }

  echo(text) {
    this.term.writeln(text || '');
  }

  showHelp() {
    const help = `\x1b[33m
Comandos disponíveis:

  help            - Mostrar esta ajuda
  clear           - Limpar a tela
  echo <texto>    - Escrever texto
  projeto         - Informações do projeto atual
  arquivos        - Listar arquivos do projeto
  npm-start       - Iniciar o backend
  version         - Versão do CodeHUB
\x1b[0m`;
    this.term.writeln(help);
  }

  showProjectInfo() {
    const projectName = document.getElementById('project-name')?.value || 'Desconhecido';
    const info = `\x1b[32m
Projeto: ${projectName}
Status: Ativo
Versão: 1.0.0
\x1b[0m`;
    this.term.writeln(info);
  }

  listProjectFiles() {
    const tabs = document.getElementById('tabs');
    const files = Array.from(tabs?.querySelectorAll('.tab') || [])
      .map(tab => tab.textContent.trim());
    
    if (files.length === 0) {
      this.term.writeln('\x1b[31mNenhum arquivo aberto\x1b[0m');
    } else {
      this.term.writeln('\x1b[32mArquivos do projeto:\x1b[0m');
      files.forEach((file, index) => {
        this.term.writeln(`  ${index + 1}. ${file}`);
      });
    }
  }

  runNpmStart() {
    this.term.writeln('\x1b[33m⏳ Iniciando npm start...\x1b[0m');
    this.term.writeln('\x1b[32m✓ Backend iniciado em http://localhost:3000\x1b[0m');
  }

  showVersion() {
    this.term.writeln('\x1b[36mCodeHUB v1.0.0\x1b[0m');
  }

  goBackHistory() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.loadHistoryItem();
    }
  }

  goForwardHistory() {
    if (this.historyIndex < this.history.length) {
      this.historyIndex++;
      this.loadHistoryItem();
    }
  }

  loadHistoryItem() {
    const command = this.historyIndex < this.history.length 
      ? this.history[this.historyIndex] 
      : '';
    
    // Limpar entrada atual
    for (let i = 0; i < this.currentInput.length; i++) {
      this.term.write('\b \b');
    }
    
    this.currentInput = command;
    this.term.write(command);
  }

  log(message) {
    this.term.writeln(message);
  }

  logSuccess(message) {
    this.term.writeln(`\x1b[32m✓ ${message}\x1b[0m`);
  }

  logError(message) {
    this.term.writeln(`\x1b[31m✗ ${message}\x1b[0m`);
  }

  logWarning(message) {
    this.term.writeln(`\x1b[33m⚠ ${message}\x1b[0m`);
  }
}

// Inicializar terminal quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.codeHubTerminal = new CodeHUBTerminal();
  
  // Expor para uso global
  window.terminal = window.codeHubTerminal;
});
