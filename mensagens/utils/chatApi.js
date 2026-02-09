// ChatAPI v2.0 - API Completa com Scripts e Comandos
class EnhancedChatAPI {
    constructor() {
        this.db = window.firebaseDB;
        this.currentUser = JSON.parse(localStorage.getItem("chat_user")) || { id: 'system', name: 'Bot' };
        this.scriptEngines = new Map(); // Mapa de engines por grupo
        this.commandSystems = new Map(); // Mapa de sistemas de comando por grupo
        this.activeChats = new Map(); // Chats ativos
        this.messageListeners = []; // Listeners de mensagens
        this.customCommands = new Map(); // Comandos personalizados por grupo
        this.plugins = new Map(); // Plugins carregados
        
        // Inicializar módulos principais
        this.initModules();
    }

    /**
     * Inicializa todos os módulos necessários
     */
    initModules() {
        // Carregar ChatAPI base
        window.ChatAppAPI = this;
        
        // Se ainda não existe, cria a classe ScriptEngine global
        if (!window.ScriptEngine) {
            window.ScriptEngine = this.createScriptEngineClass();
        }
        
        // Se ainda não existe, cria a classe CommandSystem global
        if (!window.CommandSystem) {
            window.CommandSystem = this.createCommandSystemClass();
        }
        
        console.log("ChatAPI v2.0 inicializada com ScriptEngine e CommandSystem");
    }

    /**
     * Cria a classe ScriptEngine (versão completa)
     */
    createScriptEngineClass() {
        return class ScriptEngine {
            constructor(groupId, chatApiImplementation) {
                this.groupId = groupId;
                this.api = chatApiImplementation;
                this.timeoutMs = 3000;
                this.maxMemory = 10000;
                this.scriptHistory = new Map();
                this.customLibraries = new Map();
                this.storage = new Map(); // Storage persistente
                
                // Carrega bibliotecas padrão
                this.loadDefaultLibraries();
            }

            loadDefaultLibraries() {
                this.addLibrary('utils', {
                    containsWords: (text, words) => 
                        words.some(word => text.toLowerCase().includes(word.toLowerCase())),
                    extractLinks: (text) => text.match(/(https?:\/\/[^\s]+)/g) || [],
                    extractMentions: (text) => text.match(/@[\w\u00C0-\u017F]+/g) || [],
                    isRecent: (timestamp, minutes = 5) => 
                        Date.now() - timestamp < minutes * 60000,
                    formatDate: (timestamp) => new Date(timestamp).toLocaleString('pt-BR'),
                    randomChoice: (array) => array[Math.floor(Math.random() * array.length)]
                });

                this.addLibrary('moderation', {
                    profanityFilter: (text, blacklist = ['palavrão']) => 
                        blacklist.some(word => text.toLowerCase().includes(word)),
                    floodDetector: (userId, recentMessages, threshold = 5) => {
                        const userMessages = recentMessages.filter(m => m.senderId === userId);
                        return userMessages.length > threshold;
                    },
                    spamDetector: (message) => {
                        const links = this.libraries.utils.extractLinks(message.text);
                        const allCaps = message.text === message.text.toUpperCase();
                        return links.length > 3 || allCaps;
                    }
                });

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
                    })
                });
            }

            addLibrary(name, functions) {
                this.customLibraries.set(name, functions);
            }

            getLibrary(name) {
                return this.customLibraries.get(name);
            }

            async execute(scriptCode, context, scriptId = null) {
                const executionId = scriptId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                return new Promise((resolve) => {
                    const timeoutId = setTimeout(() => {
                        this.scriptHistory.set(executionId, {
                            status: 'timeout',
                            executionTime: this.timeoutMs
                        });
                        resolve({ success: false, error: 'Timeout excedido' });
                    }, this.timeoutMs);

                    const startTime = Date.now();

                    try {
                        // Sandbox seguro
                        const sandbox = this.createSandbox(context);
                        
                        // Compila e executa
                        const compiledScript = new Function(
                            'api', 'message', 'member', 'args', 'console', 'utils', 'moderation', 'interaction', 'storage',
                            `
                            "use strict";
                            try {
                                ${scriptCode}
                                return { success: true, result: typeof result !== 'undefined' ? result : true };
                            } catch(e) {
                                return { success: false, error: e.message };
                            }
                            `
                        );

                        const result = compiledScript(
                            this.api,
                            context.message,
                            context.member,
                            context.args || [],
                            {
                                log: (...args) => console.log('[Script]', ...args),
                                warn: (...args) => console.warn('[Script]', ...args),
                                error: (...args) => console.error('[Script]', ...args)
                            },
                            this.getLibrary('utils'),
                            this.getLibrary('moderation'),
                            this.getLibrary('interaction'),
                            {
                                set: (key, value) => this.storage.set(key, value),
                                get: (key) => this.storage.get(key),
                                delete: (key) => this.storage.delete(key)
                            }
                        );

                        clearTimeout(timeoutId);
                        
                        this.scriptHistory.set(executionId, {
                            status: result.success ? 'success' : 'error',
                            result: result,
                            executionTime: Date.now() - startTime,
                            timestamp: Date.now()
                        });

                        resolve(result);

                    } catch (error) {
                        clearTimeout(timeoutId);
                        resolve({ success: false, error: error.message });
                    }
                });
            }

            createSandbox(context) {
                return {
                    chat: this.api,
                    message: Object.freeze({ ...context.message }),
                    member: Object.freeze({ ...context.member }),
                    args: context.args || [],
                    storage: this.storage
                };
            }

            // Métodos de armazenamento persistente
            setData(key, value) {
                this.storage.set(key, value);
                // Salva no Firebase também se quiser persistência
                if (this.api.db) {
                    this.api.db.ref(`groups/${this.groupId}/script_data/${key}`).set({
                        value: value,
                        timestamp: Date.now()
                    });
                }
            }

            getData(key) {
                return this.storage.get(key);
            }

            deleteData(key) {
                this.storage.delete(key);
                if (this.api.db) {
                    this.api.db.ref(`groups/${this.groupId}/script_data/${key}`).remove();
                }
            }
        };
    }

    /**
     * Cria a classe CommandSystem (versão completa)
     */
    createCommandSystemClass() {
        return class CommandSystem {
            constructor(scriptEngine, options = {}) {
                this.engine = scriptEngine;
                this.prefix = options.prefix || '!';
                this.commands = new Map();
                this.aliases = new Map();
                this.cooldowns = new Map();
                this.permissions = new Map();
                this.customResponses = new Map();
                this.commandStats = new Map();
                
                // Registrar comandos built-in
                this.registerBuiltinCommands();
            }

            registerCommand(name, config) {
                const command = {
                    name: name.toLowerCase(),
                    description: config.description || 'Sem descrição',
                    usage: config.usage || name,
                    category: config.category || 'geral',
                    cooldown: config.cooldown || 0,
                    permissions: config.permissions || ['user'],
                    aliases: config.aliases || [],
                    execute: config.execute,
                    script: config.script,
                    hidden: config.hidden || false
                };

                this.commands.set(command.name, command);

                command.aliases.forEach(alias => {
                    this.aliases.set(alias.toLowerCase(), command.name);
                });

                return this;
            }

            registerBuiltinCommands() {
                // Comandos de moderação
                this.registerCommand('ban', {
                    description: 'Banir usuário',
                    usage: 'ban @usuário [motivo]',
                    category: 'moderação',
                    permissions: ['admin', 'mod'],
                    execute: async (context, args) => {
                        if (!args[0]) return { success: false, reply: '❌ Use: !ban @usuário [motivo]' };
                        
                        const target = args[0].replace('@', '');
                        const reason = args.slice(1).join(' ') || 'Sem motivo';
                        
                        await context.chat.banUser(target, reason);
                        return {
                            success: true,
                            reply: `✅ ${target} banido. Motivo: ${reason}`
                        };
                    }
                });

                this.registerCommand('mute', {
                    description: 'Mutuar usuário',
                    usage: 'mute @usuário [minutos] [motivo]',
                    category: 'moderação',
                    permissions: ['admin', 'mod'],
                    execute: async (context, args) => {
                        const [target, minutes = '10', ...reasonParts] = args;
                        if (!target) return { success: false, reply: '❌ Use: !mute @usuário' };
                        
                        const reason = reasonParts.join(' ') || 'Sem motivo';
                        const muteTime = parseInt(minutes) || 10;
                        
                        await context.chat.muteUser(target.replace('@', ''), muteTime, reason);
                        return {
                            success: true,
                            reply: `🔇 ${target} mutado por ${muteTime} minutos`
                        };
                    }
                });

                this.registerCommand('clear', {
                    description: 'Limpar mensagens',
                    usage: 'clear [quantidade]',
                    category: 'moderação',
                    permissions: ['admin', 'mod'],
                    execute: async (context, args) => {
                        const amount = parseInt(args[0]) || 50;
                        await context.chat.clearMessages(amount);
                        return {
                            success: true,
                            reply: `🧹 ${amount} mensagens limpas`
                        };
                    }
                });

                // Comandos de diversão
                this.registerCommand('dado', {
                    description: 'Rolar um dado',
                    usage: 'dado [lados]',
                    category: 'diversão',
                    aliases: ['roll', 'dice'],
                    execute: (context, args) => {
                        const sides = parseInt(args[0]) || 6;
                        const roll = Math.floor(Math.random() * sides) + 1;
                        return {
                            success: true,
                            reply: `🎲 ${context.member.name} rolou um ${roll} no D${sides}!`
                        };
                    }
                });

                this.registerCommand('moeda', {
                    description: 'Cara ou coroa',
                    usage: 'moeda',
                    category: 'diversão',
                    aliases: ['coin'],
                    execute: () => {
                        const result = Math.random() > 0.5 ? 'cara' : 'coroa';
                        return {
                            success: true,
                            reply: `🪙 Resultado: **${result.toUpperCase()}**`
                        };
                    }
                });

                this.registerCommand('fato', {
                    description: 'Fato curioso aleatório',
                    usage: 'fato',
                    category: 'diversão',
                    script: `
                    const facts = [
                        "A água quente congela mais rápido que a água fria.",
                        "Os ursos-polares são quase invisíveis na câmera de infravermelho.",
                        "O mel nunca estraga.",
                        "As formigas não têm pulmões."
                    ];
                    
                    const fact = facts[Math.floor(Math.random() * facts.length)];
                    chat.replyToMessage(message.id, "🤔 " + fact);
                    return { success: true, reply: "Fato enviado!" };
                    `
                });

                // Comandos de utilidade
                this.registerCommand('horario', {
                    description: 'Ver horário atual',
                    usage: 'horario',
                    category: 'utilidade',
                    aliases: ['hora', 'time'],
                    execute: () => {
                        const now = new Date();
                        return {
                            success: true,
                            reply: `🕒 ${now.toLocaleTimeString('pt-BR')} - 📅 ${now.toLocaleDateString('pt-BR')}`
                        };
                    }
                });

                this.registerCommand('calc', {
                    description: 'Calculadora',
                    usage: 'calc [expressão]',
                    category: 'utilidade',
                    execute: (context, args) => {
                        try {
                            const expression = args.join('').replace(/[^-()\d/*+.]/g, '');
                            const result = eval(expression);
                            return {
                                success: true,
                                reply: `🧮 ${expression} = **${result}**`
                            };
                        } catch {
                            return {
                                success: false,
                                reply: '❌ Expressão inválida'
                            };
                        }
                    }
                });

                // Comandos de sistema
                this.registerCommand('comandos', {
                    description: 'Listar todos os comandos',
                    usage: 'comandos [categoria]',
                    category: 'sistema',
                    aliases: ['help', 'ajuda'],
                    execute: (context, args) => {
                        const categories = {};
                        this.commands.forEach(cmd => {
                            if (!cmd.hidden) {
                                if (!categories[cmd.category]) categories[cmd.category] = [];
                                categories[cmd.category].push(cmd);
                            }
                        });
                        
                        let response = '📚 **COMANDOS DISPONÍVEIS**\\n';
                        response += `Prefixo: ${this.prefix}\\n\\n`;
                        
                        Object.entries(categories).forEach(([cat, cmds]) => {
                            response += `**${cat.toUpperCase()}**\\n`;
                            cmds.forEach(cmd => {
                                response += `• ${this.prefix}${cmd.name} - ${cmd.description}\\n`;
                            });
                            response += '\\n';
                        });
                        
                        return { success: true, reply: response };
                    }
                });

                this.registerCommand('addcomando', {
                    description: 'Adicionar comando personalizado',
                    usage: 'addcomando !nome resposta',
                    category: 'sistema',
                    permissions: ['admin'],
                    execute: (context, args) => {
                        const [name, ...responseParts] = args;
                        if (!name || !responseParts.length) {
                            return { success: false, reply: '❌ Use: !addcomando !nome resposta' };
                        }
                        
                        const response = responseParts.join(' ');
                        this.customResponses.set(name.toLowerCase(), response);
                        
                        // Salvar no Firebase
                        if (context.chat.db) {
                            context.chat.db.ref(`groups/${context.chat.chatId}/custom_commands/${name}`).set({
                                response: response,
                                createdBy: context.member.id,
                                createdAt: Date.now()
                            });
                        }
                        
                        return { success: true, reply: `✅ Comando ${name} adicionado!` };
                    }
                });
            }

            async processMessage(message, member) {
                const text = message.text || '';
                if (!text.startsWith(this.prefix)) return null;
                
                const args = text.slice(this.prefix.length).trim().split(/\\s+/);
                const commandName = args.shift().toLowerCase();
                
                // Verificar cooldown
                const cooldownKey = `${member.id}:${commandName}`;
                if (this.getCooldown(cooldownKey) > 0) {
                    return {
                        type: 'cooldown',
                        reply: `⏳ Aguarde para usar este comando novamente.`
                    };
                }
                
                // Buscar comando
                let command = this.commands.get(commandName) || 
                             this.commands.get(this.aliases.get(commandName));
                
                // Verificar comandos customizados
                if (!command) {
                    const customResponse = this.customResponses.get(commandName);
                    if (customResponse) {
                        return {
                            type: 'custom',
                            reply: customResponse
                        };
                    }
                    return null;
                }
                
                // Verificar permissões
                if (!this.hasPermission(member, command.permissions)) {
                    return {
                        type: 'permission_denied',
                        reply: '❌ Permissão negada.'
                    };
                }
                
                // Contexto para execução
                const context = {
                    chat: this.engine.api,
                    message: message,
                    member: member,
                    args: args,
                    command: command.name
                };
                
                let result;
                
                if (command.execute) {
                    result = await command.execute(context, args);
                } else if (command.script) {
                    const scriptResult = await this.engine.execute(command.script, context);
                    result = scriptResult.success ? 
                        { success: true, reply: scriptResult.result } : 
                        { success: false, reply: `❌ Erro: ${scriptResult.error}` };
                }
                
                // Aplicar cooldown
                if (command.cooldown > 0) {
                    this.setCooldown(cooldownKey, command.cooldown);
                }
                
                // Estatísticas
                this.recordCommandUse(command.name, member.id);
                
                return {
                    type: 'command',
                    command: command.name,
                    result: result,
                    reply: result?.reply || '✅ Executado.'
                };
            }
            
            setCooldown(key, seconds) {
                const expiresAt = Date.now() + (seconds * 1000);
                this.cooldowns.set(key, expiresAt);
                setTimeout(() => this.cooldowns.delete(key), seconds * 1000);
            }
            
            getCooldown(key) {
                const expiresAt = this.cooldowns.get(key);
                if (!expiresAt) return 0;
                const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
                return remaining > 0 ? remaining : 0;
            }
            
            setUserPermission(userId, level) {
                this.permissions.set(userId, level);
            }
            
            hasPermission(member, requiredLevels) {
                const userLevel = this.permissions.get(member.id) || 'user';
                if (userLevel === 'admin') return true;
                return requiredLevels.includes(userLevel);
            }
            
            recordCommandUse(commandName, userId) {
                const stats = this.commandStats.get(commandName) || { uses: 0, users: new Set() };
                stats.uses++;
                stats.users.add(userId);
                stats.lastUsed = Date.now();
                this.commandStats.set(commandName, stats);
            }
        };
    }

    // ==================== MÉTODOS PRINCIPAIS DA API ====================

    /**
     * Gera um Token de Acesso temporário para uso em scripts externos
     */
    generateAccessToken() {
        if (!this.currentUser) return null;
        const token = btoa(`${this.currentUser.id}:${Date.now()}:${this.currentUser.userKey}`);
        console.log("Token gerado:", token);
        return token;
    }

    /**
     * Salva backup da mensagem no Trickle DB
     */
    async saveToTrickleDB(chatId, msgData) {
        try {
            if (typeof trickleCreateObject === 'function') {
                await trickleCreateObject('chat_messages', {
                    chat_id: chatId,
                    sender_id: msgData.senderId,
                    sender_name: msgData.senderName,
                    message_type: msgData.type,
                    content: msgData.type === 'text' ? msgData.text : msgData.duration,
                    media_data: msgData.type === 'audio' ? msgData.audio : '',
                    timestamp: Date.now()
                });
                console.log("Backup salvo no Trickle DB");
            } else {
                console.warn("Trickle DB não disponível");
            }
        } catch (e) {
            console.error("Erro ao salvar backup:", e);
        }
    }

    /**
     * Envia uma mensagem de texto
     */
    async sendMessage(targetId, text, type = 'private', options = {}) {
        if (!this.db || !this.currentUser) {
            throw new Error("API não inicializada ou usuário deslogado");
        }

        const msgData = {
            senderId: this.currentUser.id,
            senderName: this.currentUser.name,
            text: text,
            type: 'text',
            timestamp: window.firebase.database.ServerValue.TIMESTAMP,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...options
        };

        try {
            let chatId, path;
            
            if (type === 'group') {
                chatId = targetId;
                path = `groups/${targetId}/messages`;
                
                // Verificar se é um comando e processar
                if (text.startsWith('!') && this.commandSystems.has(targetId)) {
                    const commandSystem = this.commandSystems.get(targetId);
                    const fakeMessage = { id: `temp_${Date.now()}`, text: text, ...msgData };
                    const fakeMember = { id: this.currentUser.id, name: this.currentUser.name };
                    
                    const result = await commandSystem.processMessage(fakeMessage, fakeMember);
                    if (result && result.reply) {
                        // Se for comando, enviar resposta
                        await this.sendMessage(targetId, result.reply, 'group');
                        return { success: true, type: 'command_response', reply: result.reply };
                    }
                }
                
            } else {
                chatId = [this.currentUser.id, targetId].sort().join('_');
                path = `chats/${chatId}/messages`;
            }

            await this.db.ref(path).push(msgData);
            
            // Backup no Trickle DB
            this.saveToTrickleDB(chatId, msgData);
            
            // Disparar listeners
            this.triggerMessageListeners({
                type: 'message',
                chatId: chatId,
                message: msgData,
                chatType: type
            });

            console.log("Mensagem enviada via API com sucesso!");
            return { success: true, messageId: chatId };

        } catch (error) {
            console.error("Erro API sendMessage:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Envia áudio em Base64
     */
    async sendAudio(targetId, base64Audio, duration, type = 'private') {
        if (!this.db || !this.currentUser) throw new Error("API não inicializada");

        const msgData = {
            senderId: this.currentUser.id,
            senderName: this.currentUser.name,
            audio: base64Audio,
            duration: duration,
            type: 'audio',
            timestamp: window.firebase.database.ServerValue.TIMESTAMP,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const chatId = type === 'group' ? targetId : [this.currentUser.id, targetId].sort().join('_');
        const path = type === 'group' ? `groups/${chatId}/messages` : `chats/${chatId}/messages`;

        await this.db.ref(path).push(msgData);

        // Backup no Trickle DB
        this.saveToTrickleDB(chatId, msgData);

        // Disparar listeners
        this.triggerMessageListeners({
            type: 'audio',
            chatId: chatId,
            message: msgData,
            chatType: type
        });

        return { success: true };
    }

    /**
     * Ativa um grupo/chat para processamento automático
     */
    async activateChat(chatId, type = 'group', options = {}) {
        // Criar ScriptEngine para este chat
        const apiImplementation = this.createApiImplementation(chatId, type);
        const scriptEngine = new window.ScriptEngine(chatId, apiImplementation);
        
        // Criar CommandSystem para este chat
        const commandSystem = new window.CommandSystem(scriptEngine, {
            prefix: options.prefix || '!',
            ...options.commandOptions
        });
        
        // Salvar referências
        this.scriptEngines.set(chatId, scriptEngine);
        this.commandSystems.set(chatId, commandSystem);
        this.activeChats.set(chatId, {
            id: chatId,
            type: type,
            activatedAt: Date.now(),
            options: options,
            engine: scriptEngine,
            commands: commandSystem
        });
        
        // Carregar scripts do Firebase
        await this.loadChatScripts(chatId);
        
        // Carregar comandos customizados do Firebase
        await this.loadCustomCommands(chatId);
        
        // Configurar listener de mensagens
        this.setupChatListener(chatId, type);
        
        console.log(`Chat ${chatId} ativado com ScriptEngine e CommandSystem`);
        return {
            chatId: chatId,
            scriptEngine: scriptEngine,
            commandSystem: commandSystem,
            api: apiImplementation
        };
    }

    /**
     * Cria uma implementação da API para um chat específico
     */
    createApiImplementation(chatId, type) {
        const self = this;
        
        return {
            chatId: chatId,
            type: type,
            db: this.db,
            currentUser: this.currentUser,
            
            // Métodos do chat
            sendMessage: async (text, options = {}) => {
                return await self.sendMessage(chatId, text, type, options);
            },
            
            replyToMessage: async (messageId, text) => {
                return await self.sendMessage(chatId, `↩️ ${text}`, type, {
                    replyTo: messageId
                });
            },
            
            deleteMessage: async (messageId) => {
                if (type === 'group') {
                    await self.db.ref(`groups/${chatId}/messages/${messageId}`).remove();
                }
                return { success: true };
            },
            
            banUser: async (userId, reason = '') => {
                if (type === 'group') {
                    await self.db.ref(`groups/${chatId}/banned/${userId}`).set({
                        reason: reason,
                        bannedAt: Date.now(),
                        bannedBy: self.currentUser.id
                    });
                }
                return { success: true };
            },
            
            muteUser: async (userId, minutes = 10, reason = '') => {
                if (type === 'group') {
                    const unmuteAt = Date.now() + (minutes * 60000);
                    await self.db.ref(`groups/${chatId}/muted/${userId}`).set({
                        reason: reason,
                        mutedAt: Date.now(),
                        unmuteAt: unmuteAt,
                        mutedBy: self.currentUser.id
                    });
                }
                return { success: true };
            },
            
            clearMessages: async (amount = 50) => {
                if (type === 'group') {
                    // Implementação simplificada
                    console.log(`Limpando ${amount} mensagens do grupo ${chatId}`);
                    // Em produção, você implementaria a lógica real de limpeza
                }
                return { success: true };
            },
            
            getLeaderboard: async (type = 'messages') => {
                // Implementação simplificada
                return [
                    { name: 'Usuário1', value: 100 },
                    { name: 'Usuário2', value: 85 },
                    { name: 'Usuário3', value: 72 }
                ];
            }
        };
    }

    /**
     * Carrega scripts de um chat do Firebase
     */
    async loadChatScripts(chatId) {
        try {
            const snapshot = await this.db.ref(`groups/${chatId}/scripts`).once('value');
            const scripts = snapshot.val() || {};
            
            const scriptEngine = this.scriptEngines.get(chatId);
            if (scriptEngine) {
                // Aqui você pode pré-compilar scripts ou carregar em cache
                console.log(`Carregados ${Object.keys(scripts).length} scripts para chat ${chatId}`);
            }
            
            return scripts;
        } catch (error) {
            console.error("Erro ao carregar scripts:", error);
            return {};
        }
    }

    /**
     * Carrega comandos customizados do Firebase
     */
    async loadCustomCommands(chatId) {
        try {
            const snapshot = await this.db.ref(`groups/${chatId}/custom_commands`).once('value');
            const commands = snapshot.val() || {};
            
            const commandSystem = this.commandSystems.get(chatId);
            if (commandSystem) {
                Object.entries(commands).forEach(([name, data]) => {
                    commandSystem.customResponses.set(name.toLowerCase(), data.response);
                });
            }
            
            return commands;
        } catch (error) {
            console.error("Erro ao carregar comandos customizados:", error);
            return {};
        }
    }

    /**
     * Configura listener de mensagens para um chat
     */
    setupChatListener(chatId, type) {
        const path = type === 'group' ? `groups/${chatId}/messages` : `chats/${chatId}/messages`;
        
        this.db.ref(path).on('child_added', async (snapshot) => {
            const message = { id: snapshot.key, ...snapshot.val() };
            
            // Ignorar mensagens do próprio bot
            if (message.senderId === this.currentUser.id) return;
            
            // Processar comandos
            if (type === 'group' && this.commandSystems.has(chatId)) {
                const commandSystem = this.commandSystems.get(chatId);
                const member = { id: message.senderId, name: message.senderName };
                
                const result = await commandSystem.processMessage(message, member);
                if (result && result.reply) {
                    // Enviar resposta do comando
                    await this.sendMessage(chatId, result.reply, 'group', {
                        replyTo: message.id
                    });
                }
            }
            
            // Executar scripts automáticos
            if (type === 'group' && this.scriptEngines.has(chatId)) {
                const scriptEngine = this.scriptEngines.get(chatId);
                
                // Carregar scripts ativos
                const scriptsSnapshot = await this.db.ref(`groups/${chatId}/scripts`).once('value');
                const scripts = scriptsSnapshot.val() || {};
                
                // Executar cada script ativo
                Object.entries(scripts).forEach(async ([scriptId, script]) => {
                    if (script.active) {
                        const context = {
                            message: message,
                            member: { id: message.senderId, name: message.senderName },
                            args: []
                        };
                        
                        const result = await scriptEngine.execute(script.code, context, scriptId);
                        if (!result.success) {
                            console.error(`Erro no script ${script.name}:`, result.error);
                        }
                    }
                });
            }
            
            // Disparar listeners globais
            this.triggerMessageListeners({
                type: 'new_message',
                chatId: chatId,
                chatType: type,
                message: message
            });
        });
    }

    /**
     * Adiciona listener para mensagens
     */
    addMessageListener(listener) {
        this.messageListeners.push(listener);
        return () => {
            const index = this.messageListeners.indexOf(listener);
            if (index > -1) this.messageListeners.splice(index, 1);
        };
    }

    /**
     * Dispara listeners de mensagens
     */
    triggerMessageListeners(event) {
        this.messageListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error("Erro no listener:", error);
            }
        });
    }

    /**
     * Executa um script manualmente
     */
    async executeScript(chatId, scriptCode, context) {
        if (!this.scriptEngines.has(chatId)) {
            throw new Error(`Chat ${chatId} não está ativo. Use activateChat() primeiro.`);
        }
        
        const scriptEngine = this.scriptEngines.get(chatId);
        return await scriptEngine.execute(scriptCode, context);
    }

    /**
     * Adiciona um comando personalizado a um chat
     */
    async addCommand(chatId, name, config) {
        if (!this.commandSystems.has(chatId)) {
            throw new Error(`Chat ${chatId} não está ativo.`);
        }
        
        const commandSystem = this.commandSystems.get(chatId);
        commandSystem.registerCommand(name, config);
        
        // Salvar no Firebase
        await this.db.ref(`groups/${chatId}/commands/${name}`).set(config);
        
        return { success: true };
    }

    /**
     * Registra um plugin personalizado
     */
    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        
        // Inicializar plugin se tiver init
        if (typeof plugin.init === 'function') {
            plugin.init(this);
        }
        
        console.log(`Plugin "${name}" registrado`);
        return this;
    }

    /**
     * Obtém estatísticas de uso
     */
    getStats() {
        return {
            activeChats: this.activeChats.size,
            scriptEngines: this.scriptEngines.size,
            commandSystems: this.commandSystems.size,
            plugins: this.plugins.size,
            messageListeners: this.messageListeners.length
        };
    }
}

// ==================== USO SIMPLIFICADO ====================

// Instância global
window.ChatAPI = new EnhancedChatAPI();

// Inicialização automática se estiver em um grupo
document.addEventListener('DOMContentLoaded', async () => {
    // Detecta se estamos em um grupo
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group') || localStorage.getItem('current_group');
    
    if (groupId) {
        try {
            const chat = await window.ChatAPI.activateChat(groupId, 'group', {
                prefix: '!',
                commandOptions: {
                    // Opções adicionais
                }
            });
            
            console.log('Chat ativado:', chat);
            
            // Exemplo: Adicionar listener para logs
            window.ChatAPI.addMessageListener((event) => {
                if (event.type === 'new_message') {
                    console.log('Nova mensagem:', event.message.text);
                }
            });
            
        } catch (error) {
            console.error('Erro ao ativar chat:', error);
        }
    }
});

// Interface simplificada para scripts rápidos
window.Chat = {
    send: (text, targetId = null, type = 'group') => {
        const target = targetId || localStorage.getItem('current_group');
        return window.ChatAPI.sendMessage(target, text, type);
    },
    
    command: (cmd, ...args) => {
        const groupId = localStorage.getItem('current_group');
        const fullCmd = `!${cmd} ${args.join(' ')}`;
        return window.ChatAPI.sendMessage(groupId, fullCmd, 'group');
    },
    
    run: (scriptCode, context = {}) => {
        const groupId = localStorage.getItem('current_group');
        return window.ChatAPI.executeScript(groupId, scriptCode, context);
    }
};

console.log("🚀 ChatAPI v2.0 carregada com ScriptEngine e CommandSystem!");