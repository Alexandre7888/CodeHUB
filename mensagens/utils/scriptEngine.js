class AdvancedScriptEngine {
    constructor(groupId, chatApiImplementation, options = {}) {
        this.groupId = groupId;
        this.api = chatApiImplementation;
        this.timeoutMs = options.timeout || 3000;
        this.maxMemory = options.maxMemory || 10000;
        this.scriptHistory = new Map();
        this.customLibraries = new Map();
        
        // Carrega bibliotecas padrão
        this.loadDefaultLibraries();
    }

    // 1. BIBLIOTECAS PRÉ-DEFINIDAS
    loadDefaultLibraries() {
        // Biblioteca de utilidades
        this.addLibrary('utils', {
            // Processamento de texto
            containsWords: (text, words) => 
                words.some(word => text.toLowerCase().includes(word.toLowerCase())),
            
            extractLinks: (text) => 
                text.match(/(https?:\/\/[^\s]+)/g) || [],
            
            extractMentions: (text) =>
                text.match(/@[\w\u00C0-\u017F]+/g) || [],
            
            // Análise de tempo
            isRecent: (timestamp, minutes = 5) => 
                Date.now() - timestamp < minutes * 60000,
            
            // Matemática de comunidade
            calculateFrequency: (messages) => {
                const freq = {};
                messages.forEach(msg => {
                    const hour = new Date(msg.timestamp).getHours();
                    freq[hour] = (freq[hour] || 0) + 1;
                });
                return freq;
            }
        });

        // Biblioteca de moderação
        this.addLibrary('moderation', {
            profanityFilter: (text) => {
                const blacklist = ['palavrão1', 'palavrão2'];
                return blacklist.some(word => 
                    text.toLowerCase().includes(word)
                );
            },
            
            floodDetector: (userId, recentMessages) => {
                const userMessages = recentMessages.filter(m => m.sender === userId);
                return userMessages.length > 5; // 5 mensagens em período curto
            },
            
            spamDetector: (message) => {
                const links = this.libraries.utils.extractLinks(message.text);
                const allCaps = message.text === message.text.toUpperCase();
                return links.length > 3 || allCaps;
            }
        });

        // Biblioteca de interações
        this.addLibrary('interaction', {
            createPoll: (question, options) => ({
                type: 'poll',
                question: question,
                options: options,
                votes: {}
            }),
            
            createQuiz: (question, answer, options) => ({
                type: 'quiz',
                question: question,
                answer: answer,
                options: options
            }),
            
            createLeaderboard: (users) => {
                const sorted = Object.entries(users)
                    .sort((a, b) => b[1].score - a[1].score)
                    .slice(0, 10);
                return sorted;
            }
        });
    }

    // 2. GERENCIAMENTO DE BIBLIOTECAS
    addLibrary(name, functions) {
        this.customLibraries.set(name, functions);
    }

    getLibrary(name) {
        return this.customLibraries.get(name);
    }

    // 3. EXECUTOR AVANÇADO COM SEGURANÇA
    async execute(scriptCode, context, scriptId = null) {
        const executionId = scriptId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                this.scriptHistory.set(executionId, {
                    status: 'timeout',
                    executionTime: this.timeoutMs,
                    timestamp: Date.now()
                });
                resolve({ success: false, error: 'Timeout excedido' });
            }, this.timeoutMs);

            const startTime = Date.now();
            let memoryStart = performance.memory?.usedJSHeapSize || 0;

            try {
                // Contexto seguro
                const sandbox = this.createSandbox(context);
                
                // Compila o script com módulos
                const compiledScript = this.compileScript(scriptCode, sandbox);
                
                // Executa
                const result = compiledScript();
                
                const executionTime = Date.now() - startTime;
                const memoryUsed = performance.memory ? 
                    (performance.memory.usedJSHeapSize - memoryStart) : 0;

                // Salva no histórico
                this.scriptHistory.set(executionId, {
                    status: 'success',
                    result: result,
                    executionTime: executionTime,
                    memoryUsed: memoryUsed,
                    timestamp: Date.now(),
                    context: context
                });

                clearTimeout(timeoutId);
                resolve({ 
                    success: true, 
                    result: result,
                    executionId: executionId,
                    metrics: { executionTime, memoryUsed }
                });

            } catch (error) {
                clearTimeout(timeoutId);
                
                this.scriptHistory.set(executionId, {
                    status: 'error',
                    error: error.message,
                    executionTime: Date.now() - startTime,
                    timestamp: Date.now(),
                    context: context
                });

                resolve({ 
                    success: false, 
                    error: error.message,
                    executionId: executionId
                });
            }
        });
    }

    // 4. SANDBOX SEGURO
    createSandbox(context) {
        const sandbox = {
            // API do chat
            chat: new Proxy(this.api, {
                get(target, prop) {
                    if (typeof target[prop] === 'function') {
                        return (...args) => {
                            console.log(`[Script] Chamando chat.${prop}`, args);
                            return target[prop](...args);
                        };
                    }
                    return target[prop];
                }
            }),

            // Dados da mensagem (somente leitura)
            message: Object.freeze(context.message),
            member: Object.freeze(context.member),

            // Bibliotecas
            utils: this.getLibrary('utils'),
            moderation: this.getLibrary('moderation'),
            interaction: this.getLibrary('interaction'),

            // Funções globais seguras
            console: {
                log: (...args) => console.log(`[Script:${this.groupId}]`, ...args),
                warn: (...args) => console.warn(`[Script:${this.groupId}]`, ...args),
                error: (...args) => console.error(`[Script:${this.groupId}]`, ...args),
                table: (data) => console.table(data)
            },

            // Globais permitidos
            Math: Math,
            Date: Date,
            JSON: JSON,
            Promise: Promise,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            RegExp: RegExp,
            
            // Temporizadores com limites
            setTimeout: (fn, delay, ...args) => {
                const safeDelay = Math.min(delay, 5000); // Máximo 5 segundos
                return setTimeout(fn, safeDelay, ...args);
            },
            
            clearTimeout: clearTimeout,

            // Storage por script
            _storage: new Map(),
            setData: (key, value) => this._storage.set(key, value),
            getData: (key) => this._storage.get(key),
            deleteData: (key) => this._storage.delete(key),

            // Utilitários avançados
            _import: async (moduleName) => {
                const modules = {
                    'crypto': {
                        hash: (text) => btoa(text),
                        randomId: () => Math.random().toString(36).substr(2, 9)
                    },
                    'validation': {
                        isEmail: (text) => /\S+@\S+\.\S+/.test(text),
                        isPhone: (text) => /^[\d\s\-\+\(\)]{10,}$/.test(text)
                    },
                    'format': {
                        formatDate: (timestamp) => new Date(timestamp).toLocaleString(),
                        truncate: (text, length) => 
                            text.length > length ? text.substr(0, length) + '...' : text
                    }
                };
                return modules[moduleName] || null;
            }
        };

        // Torna tudo somente leitura
        Object.keys(sandbox).forEach(key => {
            if (key !== 'chat' && key !== '_storage') {
                Object.freeze(sandbox[key]);
            }
        });

        return sandbox;
    }

    // 5. COMPILADOR DE SCRIPT
    compileScript(code, sandbox) {
        // Validações de segurança
        const blacklistedPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/i,
            /process\./i,
            /require\s*\(/i,
            /import\s*\(/i,
            /document\./i,
            /window\./i,
            /localStorage\./i,
            /indexedDB\./i,
            /fetch\s*\(/i,
            /XMLHttpRequest/i,
            /\.constructor/i,
            /__proto__/i,
            /prototype\./i
        ];

        blacklistedPatterns.forEach(pattern => {
            if (pattern.test(code)) {
                throw new Error(`Código contém padrão proibido: ${pattern}`);
            }
        });

        // Cria função segura
        const functionBody = `
            "use strict";
            const { ${Object.keys(sandbox).join(', ')} } = this;
            
            // Código do usuário
            ${code}
            
            // Retorno padrão se não houver return
            return typeof result !== 'undefined' ? result : true;
        `;

        try {
            return new Function(functionBody).bind(sandbox);
        } catch (syntaxError) {
            throw new Error(`Erro de sintaxe no script: ${syntaxError.message}`);
        }
    }

    // 6. EXECUTOR EM LOTE
    async executeBatch(scripts, context) {
        const results = [];
        
        for (const script of scripts) {
            if (!script.active) continue;
            
            const result = await this.execute(script.code, context, script.id);
            results.push({
                scriptName: script.name,
                scriptId: script.id,
                ...result
            });
            
            // Delay entre execuções para evitar flood
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }

    // 7. MONITORAMENTO E DEBUG
    getExecutionHistory(limit = 50) {
        const entries = Array.from(this.scriptHistory.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, limit);
        
        return Object.fromEntries(entries);
    }

    clearHistory() {
        this.scriptHistory.clear();
    }

    // 8. VALIDAÇÃO DE SCRIPT
    validateScript(code) {
        const validations = {
            hasValidSyntax: true,
            estimatedSize: code.length,
            lineCount: code.split('\n').length,
            functionCount: (code.match(/function\s+\w+|=>/g) || []).length,
            apiCalls: (code.match(/chat\.\w+/g) || []).map(call => call.replace('chat.', '')),
            warnings: []
        };

        // Verificações
        if (code.length > 10000) {
            validations.warnings.push('Script muito grande (>10KB)');
        }
        
        if (code.includes('while(true)') || code.includes('for(;;)')) {
            validations.warnings.push('Possível loop infinito detectado');
        }

        try {
            new Function(code); // Teste de sintaxe
        } catch (e) {
            validations.hasValidSyntax = false;
            validations.syntaxError = e.message;
        }

        return validations;
    }
}

// 9. EXPORTAÇÃO
window.ScriptEngine = AdvancedScriptEngine;

// 10. EXEMPLO DE USO AVANÇADO
/*
const api = new ChatApiImplementation('group123', firebaseRef);
const engine = new AdvancedScriptEngine('group123', api, {
    timeout: 5000,
    maxMemory: 50000
});

// Adicionar biblioteca personalizada
engine.addLibrary('finance', {
    calculateTax: (amount) => amount * 0.05,
    formatCurrency: (value) => `R$ ${value.toFixed(2)}`
});

// Executar script complexo
const complexScript = `
// Script avançado de moderação
const utils = _import('utils');
const moderation = _import('moderation');

if (moderation.profanityFilter(message.text)) {
    chat.deleteMessage(message.id);
    chat.warnMember(member.id, 'Linguagem inadequada');
    
    // Salvar no storage do script
    setData('warn_count', (getData('warn_count') || 0) + 1);
    
    // Se for a 3ª advertência, kick
    if (getData('warn_count') >= 3) {
        chat.kickMember(member.id, '3 advertências recebidas');
        deleteData('warn_count');
    }
    
    return 'mensagem moderada';
}

// Análise de horário de pico
const hour = new Date(message.timestamp).getHours();
if (hour >= 22 || hour <= 6) {
    chat.sendMessage('⚠️ Grupo em modo noturno. Mensagens serão moderadas.');
}

// Leaderboard automático
const leaderboard = interaction.createLeaderboard(chat.getMembers());
chat.sendMessage('🏆 Top 10 do dia:\\n' + 
    leaderboard.map(([user, data], i) => 
        \`\${i+1}. \${user}: \${data.score} pontos\`
    ).join('\\n')
);
`;

const context = {
    message: { id: 'msg123', text: 'Olá mundo!', timestamp: Date.now() },
    member: { id: 'user456', name: 'João' }
};

engine.execute(complexScript, context).then(result => {
    console.log('Resultado:', result);
});
*/
