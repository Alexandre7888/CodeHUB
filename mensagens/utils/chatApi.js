// API Publica para integração com o Chat
// Este arquivo permite enviar mensagens programaticamente usando um token de acesso.

class ChatAPI {
    constructor() {
        this.db = window.firebaseDB;
        this.currentUser = JSON.parse(localStorage.getItem("chat_user"));
    }

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
            // Verifica se a função trickleCreateObject está disponível (ambiente Trickle)
            if (typeof trickleCreateObject === 'function') {
                await trickleCreateObject('chat_messages', {
                    chat_id: chatId,
                    sender_id: msgData.senderId,
                    sender_name: msgData.senderName,
                    message_type: msgData.type,
                    content: msgData.type === 'text' ? msgData.text : msgData.duration,
                    media_data: msgData.type === 'audio' ? msgData.audio : '',
                    timestamp: Date.now() // Convertendo ServerValue se necessário, mas aqui usaremos timestamp atual
                });
                console.log("Backup salvo no Trickle DB com sucesso.");
            } else {
                console.warn("Função trickleCreateObject não encontrada. Backup pulado.");
            }
        } catch (e) {
            console.error("Erro ao salvar backup no Trickle DB:", e);
        }
    }

    /**
     * Envia uma mensagem de texto usando a API
     * @param {string} targetId - ID do usuário ou grupo destino
     * @param {string} text - Conteúdo da mensagem
     * @param {string} type - 'private' ou 'group'
     */
    async sendMessage(targetId, text, type = 'private') {
        if (!this.db || !this.currentUser) throw new Error("API não inicializada ou usuário deslogado");

        const msgData = {
            senderId: this.currentUser.id,
            senderName: this.currentUser.name,
            text: text,
            type: 'text',
            timestamp: window.firebase.database.ServerValue.TIMESTAMP,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        try {
            let chatId;
            if (type === 'group') {
                chatId = targetId; // Para grupos, o ID é direto
                await this.db.ref(`groups/${targetId}/messages`).push(msgData);
            } else {
                // Para chat privado
                chatId = [this.currentUser.id, targetId].sort().join('_');
                await this.db.ref(`chats/${chatId}/messages`).push(msgData);
            }
            
            // Backup no Trickle DB
            this.saveToTrickleDB(chatId, msgData);

            console.log("Mensagem enviada via API com sucesso!");
            return true;
        } catch (error) {
            console.error("Erro API:", error);
            return false;
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

        return true;
    }
}

// Exporta para o escopo global
window.ChatAppAPI = new ChatAPI();console.log("🚀 ChatAPI v2.0 carregada com ScriptEngine e CommandSystem!");
