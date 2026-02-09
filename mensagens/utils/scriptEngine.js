class ScriptEngine {
    constructor(groupId, chatApiImplementation) {
        this.groupId = groupId;
        this.api = chatApiImplementation; // { deleteMessage, sendMessage, kickMember }

        // Comandos disponíveis para os scripts
        this.commands = {
            // Mensagens
            send: (text) => this.api.sendMessage(this.groupId, text),
            reply: (message, text) => this.api.sendMessage(this.groupId, `@${message.sender}: ${text}`),
            delete: (messageId) => this.api.deleteMessage(messageId),
            edit: (messageId, newText) => this.api.editMessage && this.api.editMessage(messageId, newText), // se suportar

            // Membros
            kick: (memberId) => this.api.kickMember(this.groupId, memberId),
            warn: (memberId, reason) => this.api.sendMessage(this.groupId, `⚠️ Membro ${memberId} advertido: ${reason}`),
            mute: (memberId, durationSec) => this.api.muteMember && this.api.muteMember(this.groupId, memberId, durationSec), // se suportar
            ban: (memberId) => this.api.banMember && this.api.banMember(this.groupId, memberId),

            // Informações
            getMemberInfo: (memberId) => this.api.getMemberInfo ? this.api.getMemberInfo(memberId) : null,
            listMembers: () => this.api.listMembers ? this.api.listMembers(this.groupId) : [],

            // Logs / Debug
            log: (text) => console.log(`[ScriptEngine LOG] ${text}`),
            error: (text) => console.error(`[ScriptEngine ERROR] ${text}`),

            // Funções de utilidade
            contains: (text, keyword) => text.toLowerCase().includes(keyword.toLowerCase()),
            randomChoice: (array) => array[Math.floor(Math.random() * array.length)]
        };
    }

    execute(scriptCode, context) {
        try {
            // Context: { message, member }
            const safeFunction = new Function('cmds', 'message', 'member', `
                try {
                    ${scriptCode}
                } catch(e) {
                    console.error("Erro no script do usuário:", e);
                }
            `);

            safeFunction(this.commands, context.message, context.member);
        } catch (error) {
            console.error("Falha ao executar regra:", error);
        }
    }
}

window.ScriptEngine = ScriptEngine;