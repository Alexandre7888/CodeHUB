// api6.js - API completa com Firebase oculto
// Uso: api6.js?token=TOKEN&action=list

(function() {
    'use strict';
    
    // Configurações internas (Firebase escondido)
    const INTERNAL_CONFIG = {
        apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
        projectId: "html-15e80",
        databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
        storageBucket: "html-15e80.firebasestorage.app"
    };
    
    let firebaseApp = null;
    let database = null;
    let storage = null;
    
    // Inicialização interna do Firebase
    function initInternalFirebase() {
        if (typeof firebase === 'undefined') {
            // Carregar Firebase dinamicamente se não estiver disponível
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
                script.onload = () => {
                    const script2 = document.createElement('script');
                    script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
                    script2.onload = () => {
                        try {
                            firebaseApp = firebase.initializeApp(INTERNAL_CONFIG, 'TokenAPI_Internal');
                            database = firebase.database();
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    document.head.appendChild(script2);
                };
                document.head.appendChild(script);
            });
        } else {
            try {
                firebaseApp = firebase.initializeApp(INTERNAL_CONFIG, 'TokenAPI_Internal');
                database = firebase.database();
                return Promise.resolve();
            } catch (error) {
                // App já existe, usar o existente
                firebaseApp = firebase.app('TokenAPI_Internal') || firebase.app();
                database = firebase.database();
                return Promise.resolve();
            }
        }
    }
    
    // Classe principal da API
    class SecretTokenAPI {
        constructor() {
            this.initialized = false;
            this.currentToken = null;
            this.ready = this.init();
        }
        
        async init() {
            if (!this.initialized) {
                await initInternalFirebase();
                this.initialized = true;
            }
            return this;
        }
        
        // Processar requisição
        async process(params) {
            await this.ready;
            
            const { token, action = 'info', ...rest } = params;
            
            if (!token) {
                return this.error('Token não fornecido', 'TOKEN_REQUIRED');
            }
            
            this.currentToken = token;
            
            try {
                switch(action) {
                    case 'list': return await this._listFiles(rest.path);
                    case 'upload': return await this._uploadFile(rest);
                    case 'download': return await this._downloadFile(rest.fileId);
                    case 'delete': return await this._deleteFile(rest.fileId);
                    case 'info': return await this._getInfo();
                    case 'create': return await this._createFolder(rest.name);
                    case 'search': return await this._search(rest.query);
                    case 'raw': return await this._getRawData();
                    case 'stats': return await this._getStats();
                    case 'exists': return await this._checkToken();
                    default: return this.error('Ação inválida', 'INVALID_ACTION');
                }
            } catch (error) {
                return this.error(error.message, 'API_ERROR');
            }
        }
        
        // Métodos internos (Firebase escondido)
        async _listFiles(path = '/') {
            const ref = database.ref(`files/${this.currentToken}${path}`);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) {
                return this.success({
                    path: path,
                    items: [],
                    count: 0
                });
            }
            
            const data = snapshot.val();
            const items = Object.entries(data).map(([id, item]) => ({
                id: id,
                name: item.name,
                type: item.type || 'file',
                size: item.size || 0,
                date: item.uploadedAt || item.createdAt,
                mime: item.mimeType
            }));
            
            return this.success({
                path: path,
                items: items,
                count: items.length
            });
        }
        
        async _uploadFile({ data, name, type = 'file' }) {
            if (!data) {
                throw new Error('Dados do arquivo não fornecidos');
            }
            
            const fileId = this._generateId();
            const ref = database.ref(`files/${this.currentToken}/${fileId}`);
            
            await ref.set({
                name: name || `file_${Date.now()}`,
                type: 'file',
                content: data,
                size: data.length,
                mimeType: type,
                uploadedAt: new Date().toISOString(),
                encrypted: false
            });
            
            return this.success({
                id: fileId,
                name: name,
                size: data.length,
                uploaded: true,
                url: `api6.js?token=${this.currentToken}&action=download&id=${fileId}`
            });
        }
        
        async _downloadFile(fileId) {
            const ref = database.ref(`files/${this.currentToken}/${fileId}`);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) {
                throw new Error('Arquivo não encontrado');
            }
            
            const file = snapshot.val();
            
            return this.success({
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                data: file.content,
                mimeType: file.mimeType,
                date: file.uploadedAt
            });
        }
        
        async _deleteFile(fileId) {
            const ref = database.ref(`files/${this.currentToken}/${fileId}`);
            await ref.remove();
            
            return this.success({
                id: fileId,
                deleted: true
            });
        }
        
        async _createFolder(name) {
            if (!name) {
                throw new Error('Nome da pasta não fornecido');
            }
            
            const folderId = this._generateId('folder');
            const ref = database.ref(`files/${this.currentToken}/${folderId}`);
            
            await ref.set({
                name: name,
                type: 'folder',
                createdAt: new Date().toISOString(),
                items: 0
            });
            
            return this.success({
                id: folderId,
                name: name,
                type: 'folder',
                created: true
            });
        }
        
        async _search(query) {
            const ref = database.ref(`files/${this.currentToken}`);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) {
                return this.success({
                    query: query,
                    results: [],
                    count: 0
                });
            }
            
            const data = snapshot.val();
            const results = [];
            
            Object.entries(data).forEach(([id, item]) => {
                if (item.name && item.name.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        id: id,
                        name: item.name,
                        type: item.type,
                        size: item.size,
                        date: item.uploadedAt || item.createdAt
                    });
                }
            });
            
            return this.success({
                query: query,
                results: results,
                count: results.length
            });
        }
        
        async _getInfo() {
            const ref = database.ref(`tokens/${this.currentToken}`);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) {
                throw new Error('Token não encontrado');
            }
            
            const tokenData = snapshot.val();
            
            // Calcular uso de armazenamento
            const filesRef = database.ref(`files/${this.currentToken}`);
            const filesSnapshot = await filesRef.once('value');
            
            let used = 0;
            let fileCount = 0;
            let folderCount = 0;
            
            if (filesSnapshot.exists()) {
                const files = filesSnapshot.val();
                Object.values(files).forEach(file => {
                    if (file.type === 'file') {
                        fileCount++;
                        used += file.size || 0;
                    } else if (file.type === 'folder') {
                        folderCount++;
                    }
                });
            }
            
            return this.success({
                token: this.currentToken,
                app: tokenData.appName || 'Unknown',
                redirect: tokenData.redirectURL || '',
                storage: {
                    used: used,
                    total: 1073741824, // 1GB
                    percent: Math.round((used / 1073741824) * 100),
                    free: 1073741824 - used
                },
                files: {
                    total: fileCount + folderCount,
                    files: fileCount,
                    folders: folderCount
                },
                created: tokenData.createdAt
            });
        }
        
        async _getRawData() {
            const ref = database.ref(`files/${this.currentToken}`);
            const snapshot = await ref.once('value');
            
            return this.success({
                token: this.currentToken,
                data: snapshot.exists() ? snapshot.val() : null,
                timestamp: new Date().toISOString()
            });
        }
        
        async _getStats() {
            const ref = database.ref(`files/${this.currentToken}`);
            const snapshot = await ref.once('value');
            
            let stats = {
                totalSize: 0,
                fileCount: 0,
                folderCount: 0,
                byType: {}
            };
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                Object.values(data).forEach(item => {
                    if (item.type === 'file') {
                        stats.fileCount++;
                        stats.totalSize += item.size || 0;
                        
                        // Agrupar por tipo MIME
                        const mime = item.mimeType || 'unknown';
                        const type = mime.split('/')[0];
                        stats.byType[type] = (stats.byType[type] || 0) + 1;
                    } else if (item.type === 'folder') {
                        stats.folderCount++;
                    }
                });
            }
            
            return this.success(stats);
        }
        
        async _checkToken() {
            const ref = database.ref(`tokens/${this.currentToken}`);
            const snapshot = await ref.once('value');
            
            return this.success({
                exists: snapshot.exists(),
                valid: snapshot.exists(),
                token: this.currentToken
            });
        }
        
        // Utilitários
        _generateId(prefix = 'file') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        success(data) {
            return {
                success: true,
                data: data,
                timestamp: new Date().toISOString(),
                api: 'TokenAPI v2.0'
            };
        }
        
        error(message, code = 'ERROR') {
            return {
                success: false,
                error: {
                    code: code,
                    message: message
                },
                timestamp: new Date().toISOString()
            };
        }
        
        // Método para converter File/Blob para Base64
        async fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        // Método para converter Base64 para Blob
        base64ToBlob(base64, mimeType) {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        }
    }
    
    // Criar instância global
    window.TokenAPI = SecretTokenAPI;
    window.tokenAPI = new SecretTokenAPI();
    
    // Auto-processar se chamado via URL
    if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('token')) {
            // Processar requisição automática
            const request = {
                token: params.get('token'),
                action: params.get('action') || 'info'
            };
            
            // Adicionar outros parâmetros
            params.forEach((value, key) => {
                if (!['token', 'action'].includes(key)) {
                    request[key] = value;
                }
            });
            
            // Executar e mostrar resultado
            window.addEventListener('DOMContentLoaded', async () => {
                try {
                    const result = await tokenAPI.process(request);
                    
                    const format = params.get('format') || 'json';
                    const callback = params.get('callback');
                    
                    if (callback && typeof window[callback] === 'function') {
                        // JSONP
                        window[callback](result);
                    } else if (format === 'json') {
                        // JSON puro
                        document.body.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                    } else if (format === 'download' && result.data && result.data.data) {
                        // Download
                        const blob = tokenAPI.base64ToBlob(result.data.data, result.data.mimeType);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = result.data.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                } catch (error) {
                    document.body.innerHTML = `<pre>${JSON.stringify({
                        error: true,
                        message: error.message
                    }, null, 2)}</pre>`;
                }
            });
        }
    }
    
})();
