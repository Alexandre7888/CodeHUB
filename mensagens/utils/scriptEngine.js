class ScriptEngine {
    constructor(groupId, chatApiImplementation) {
        this.groupId = groupId;
        this.api = chatApiImplementation; // { deleteMessage, sendMessage, kickMember }
    }

    execute(scriptCode, context) {
        try {
            // Context contains: message, member
            const safeFunction = new Function('chat', 'message', 'member', `
                try {
                    ${scriptCode}
                } catch(e) {
                    console.error("Erro no script do usuário:", e);
                }
            `);
            
            safeFunction(this.api, context.message, context.member);
        } catch (error) {
            console.error("Falha ao executar regra:", error);
        }
    }
}

window.ScriptEngine = ScriptEngine;