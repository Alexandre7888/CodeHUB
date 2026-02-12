function ChatInterface({ user, onLogout, pendingJoinGroupId, onClearJoin }) {
    const [activeChat, setActiveChat] = React.useState(null);
    const [messageInput, setMessageInput] = React.useState("");
    const [chats, setChats] = React.useState([]); // Contacts
    const [messages, setMessages] = React.useState([]);
    const [showAudioRecorder, setShowAudioRecorder] = React.useState(false);
    
    // Bot & Media States
    const [showBotCreator, setShowBotCreator] = React.useState(false);
    const fileInputRef = React.useRef(null);
    
    // Modal States with History Management
    const [showAddContact, setShowAddContact] = React.useState(false);
    const [showGroupInfo, setShowGroupInfo] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    
    // Permissions (Group)
    const [groupPermissions, setGroupPermissions] = React.useState(null);

    // --- Navigation History Fix ---
    React.useEffect(() => {
        const handlePopState = (event) => {
            // If any modal is open, close it and prevent browser back
            if (showSettings || showGroupInfo || showAddContact || activeChat) {
                if (showSettings) setShowSettings(false);
                else if (showGroupInfo) setShowGroupInfo(false);
                else if (showAddContact) setShowAddContact(false);
                else if (activeChat) setActiveChat(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showSettings, showGroupInfo, showAddContact, activeChat]);

    const pushHistoryState = (view) => {
        window.history.pushState({ view }, '', window.location.pathname);
    };

    // Helper wrappers to set state AND push history
    const openSettings = () => { pushHistoryState('settings'); setShowSettings(true); };
    const openGroupInfo = () => { pushHistoryState('groupInfo'); setShowGroupInfo(true); };
    const openAddContact = () => { pushHistoryState('addContact'); setShowAddContact(true); };
    const openChat = (chat) => { pushHistoryState('chat'); setActiveChat(chat); };

    // Call States
    const [incomingCall, setIncomingCall] = React.useState(null);
    const [callStatus, setCallStatus] = React.useState(null); // 'calling', 'connected', 'ended'
    const [isVideoCall, setIsVideoCall] = React.useState(false);
    const [activeGroupCall, setActiveGroupCall] = React.useState(false);
    const [peer, setPeer] = React.useState(null);
    const [activeCalls, setActiveCalls] = React.useState({}); // Map of calls for group
    const [remoteStreams, setRemoteStreams] = React.useState({}); // Map of streams
    const [isCallMinimized, setIsCallMinimized] = React.useState(false);
    
    // Recording
    const [isRecordingCall, setIsRecordingCall] = React.useState(false);
    const [callDuration, setCallDuration] = React.useState(0);
    const recorderRef = React.useRef(null);
    const audioContextRef = React.useRef(null);
    const mixedDestRef = React.useRef(null);
    const callTimerRef = React.useRef(null);
    
    // Status & Presence
    const [onlineUsers, setOnlineUsers] = React.useState({});
    const [backgroundMode, setBackgroundMode] = React.useState(false);

    const messagesEndRef = React.useRef(null);
    const localVideoRef = React.useRef(null);
    const remoteVideoRef = React.useRef(null);
    const currentAudioRef = React.useRef(null); // Track currently playing audio
    const backgroundAudioRef = React.useRef(null); // Silent loop
    const db = window.firebaseDB;

    // --- Audio Exclusive Play ---
    const handleAudioPlay = (audioElement) => {
        if (currentAudioRef.current && currentAudioRef.current !== audioElement) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0; // Optional: reset or just pause
        }
        currentAudioRef.current = audioElement;
    };

    // --- Background Mode (Silent Audio Loop) ---
    const toggleBackgroundMode = () => {
        if (!backgroundAudioRef.current) {
            // Create a silent audio element
            const audio = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
            audio.loop = true;
            audio.volume = 0.01; // Almost silent but active
            backgroundAudioRef.current = audio;
        }

        if (backgroundMode) {
            backgroundAudioRef.current.pause();
            setBackgroundMode(false);
        } else {
            backgroundAudioRef.current.play().then(() => {
                setBackgroundMode(true);
                alert("Modo Segundo Plano Ativado: O app continuará ativo mesmo se você trocar de aba (áudio silencioso rodando).");
            }).catch(e => {
                console.error("Erro ao ativar background:", e);
                alert("Toque na página primeiro para ativar o áudio.");
            });
        }
    };

    // --- PeerJS Setup & Presence System ---
    React.useEffect(() => {
        // Ensure ID is safe for PeerJS (alphanumeric only)
        const cleanId = user.id.replace(/[^a-zA-Z0-9]/g, ''); 
        const newPeer = new window.Peer(cleanId);

        newPeer.on('open', (id) => console.log('PeerJS ID:', id));

        newPeer.on('call', (call) => {
            setIncomingCall({
                callerId: call.peer,
                callObj: call,
                isVideo: call.metadata?.isVideo
            });
            window.NotificationSystem.playRingtone();
            window.NotificationSystem.show("Chamada Recebida", `Chamada de ${call.peer}`);
        });

        newPeer.on('error', (err) => {
            console.error('PeerJS Error:', err);
            // Ignore trivial errors, alert on critical ones
            if (err.type === 'peer-unavailable') {
                // peer unavailable is common in mesh network, ignore or show toast
            } else {
                // alert(`Erro na conexão P2P: ${err.type}`);
            }
        });

        setPeer(newPeer);

        // Presence Logic
        const connectedRef = db.ref(".info/connected");
        const userStatusRef = db.ref(`users/${user.id}/status`);

        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                userStatusRef.onDisconnect().set({ state: 'offline', lastChanged: window.firebase.database.ServerValue.TIMESTAMP });
                userStatusRef.set({ state: 'online', lastChanged: window.firebase.database.ServerValue.TIMESTAMP });
            }
        });

        return () => {
            newPeer.destroy();
            connectedRef.off();
            userStatusRef.set({ state: 'offline', lastChanged: window.firebase.database.ServerValue.TIMESTAMP });
        };
    }, [user.id]);

    // --- Group Call Status Listener ---
    const [ongoingGroupCall, setOngoingGroupCall] = React.useState(null);

    React.useEffect(() => {
        if (!activeChat || activeChat.type !== 'group') {
            setOngoingGroupCall(null);
            return;
        }

        const callStatusRef = db.ref(`groups/${activeChat.id}/callStatus`);
        
        const handleStatus = (snap) => {
            const status = snap.val();
            if (status) {
                // Check if active
                if (status.state === 'active') {
                    // Check if I am already in it?
                    if (!activeGroupCall) {
                        setOngoingGroupCall(status);
                    } else {
                        setOngoingGroupCall(null);
                    }
                } else if (status.state === 'ended') {
                    setOngoingGroupCall(null);
                    if ((Date.now() - status.timestamp < 5000) && (callStatus === 'connected' || callStatus === 'calling')) {
                        endCall(true); 
                        alert("A chamada foi encerrada por um administrador.");
                    }
                }
            } else {
                setOngoingGroupCall(null);
            }
        };

        callStatusRef.on('value', handleStatus);
        return () => callStatusRef.off();
    }, [activeChat, callStatus, activeGroupCall]);

    // --- Global Message Listener (Notifications) ---
    React.useEffect(() => {
        if (!chats.length) return;

        // Listen to last message of ALL chats to trigger notification
        const listeners = [];

        chats.forEach(chat => {
            let messagesRef;
            if (chat.type === 'group') {
                messagesRef = db.ref(`groups/${chat.id}/messages`);
            } else {
                const chatId = [user.id, chat.id].sort().join('_');
                messagesRef = db.ref(`chats/${chatId}/messages`);
            }

            const listener = messagesRef.limitToLast(1).on('child_added', (snapshot) => {
                const msg = snapshot.val();
                if (!msg) return;

                // Check if new (compare roughly with now - 5s to avoid flood on load)
                // In a real app, track 'lastRead' timestamp. Here we use a simple time check
                const isRecent = (Date.now() - msg.timestamp) < 10000; 
                const isFromMe = msg.senderId === user.id;
                
                // If it's NOT from me, IS recent, and I am NOT looking at this chat (or window hidden)
                if (!isFromMe && isRecent) {
                    const isChatActive = activeChat && activeChat.id === chat.id;
                    if (!isChatActive || document.hidden) {
                        window.NotificationSystem.show(
                            `Nova mensagem de ${msg.senderName}`,
                            msg.type === 'audio' ? '🎵 Mensagem de áudio' : msg.text,
                            chat.avatar
                        );
                    }
                }
            });
            listeners.push({ ref: messagesRef, fn: listener });
        });

        return () => {
            listeners.forEach(l => l.ref.off('child_added', l.fn));
        };
    }, [chats, activeChat]); // Re-run when chat list changes or active chat changes

    // --- Call Logic (P2P & Mesh) ---

    // Init Audio Context for Recording
    const initAudioContext = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            mixedDestRef.current = audioContextRef.current.createMediaStreamDestination();
        }
    };

    const addToMix = (stream) => {
        if (!audioContextRef.current) initAudioContext();
        if (stream.getAudioTracks().length > 0) {
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(mixedDestRef.current);
        }
    };

    const startRecordingCall = () => {
        if (!mixedDestRef.current) return;
        
        try {
            const stream = mixedDestRef.current.stream;
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    // Auto send to chat or download?
                    // Let's send to chat as a "Call Recording"
                    const durationStr = formatDuration(callDuration);
                    if (confirm(`Gravação finalizada (${durationStr}). Deseja enviar no chat?`)) {
                        handleSendMessage(base64Audio, 'audio', durationStr);
                    }
                };
            };

            recorder.start();
            recorderRef.current = recorder;
            setIsRecordingCall(true);
            
            // Timer
            setCallDuration(0);
            callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);

        } catch (e) {
            console.error("Erro ao gravar:", e);
            alert("Erro ao iniciar gravação.");
        }
    };

    const stopRecordingCall = () => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }
        setIsRecordingCall(false);
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Join Request Handling ---
    const handleJoinSuccess = (groupData) => {
        alert(`Você entrou no grupo ${groupData.name}!`);
        setActiveChat({ ...groupData, id: pendingJoinGroupId, type: 'group' });
        onClearJoin();
    };

    // --- Call Handlers ---

    // Listen for external start call triggers (e.g. from GroupInfo)
    React.useEffect(() => {
        const handleStartGroupCall = (e) => {
            const { groupId, video } = e.detail;
            if (activeChat && activeChat.id === groupId) {
                startGroupCall(video);
            } else {
                alert("Abra o chat do grupo primeiro para iniciar a chamada.");
            }
        };
        window.addEventListener('start-group-call', handleStartGroupCall);
        return () => window.removeEventListener('start-group-call', handleStartGroupCall);
    }, [activeChat]);

    // New: Handle incoming signal to join a multi-user call
    React.useEffect(() => {
        const signalRef = db.ref(`users/${user.id}/call_signal`);
        signalRef.on('child_added', snapshot => {
            const signal = snapshot.val();
            if (signal && signal.type === 'connect_peer' && signal.targetPeer && callStatus === 'connected') {
                // We are in a call, and requested to connect to a new peer
                // Check if already connected (checking sanitized ID)
                const targetSanitized = signal.targetPeer.replace(/[^a-zA-Z0-9]/g, '');
                if (!activeCalls[targetSanitized]) {
                    console.log("Sinal recebido para conectar com:", signal.targetPeer);
                    connectToNewPeer(signal.targetPeer, isVideoCall);
                    // Remove signal
                    snapshot.ref.remove();
                }
            }
        });
        return () => signalRef.off();
    }, [callStatus, activeCalls, isVideoCall]);

    const connectToNewPeer = async (peerId, video) => {
        try {
            const stream = localVideoRef.current?.srcObject 
                || await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            
            // Sanitize ID
            const targetPeerId = peerId.replace(/[^a-zA-Z0-9]/g, '');

            const call = peer.call(targetPeerId, stream, { 
                metadata: { isVideo: video, isGroup: true, inviterId: user.id } 
            });
            
            if (call) {
                handleCallStream(call, video);
                setActiveCalls(prev => ({ ...prev, [targetPeerId]: call }));
            }
        } catch(e) {
            console.error("Erro ao conectar novo peer:", e);
        }
    };

    const handleAddParticipantToCall = async (newId) => {
        if (!newId) return;
        
        // 1. Call the new person myself
        await connectToNewPeer(newId, isVideoCall);

        // 2. Tell all CURRENTLY connected peers to call the new person too
        Object.keys(activeCalls).forEach(connectedPeerId => {
            // We need to send signal to ORIGINAL ID if possible, but we stored sanitized.
            // But firebase needs original ID. 
            // Limitation: If sanitized ID clashes or we can't reverse it, this is tricky.
            // Assumption: IDs are numeric or simple enough that sanitized == original usually, 
            // OR we iterate members list to find who matches sanitized ID.
            // For now, let's try to use connectedPeerId as the key for firebase signal, hoping it matches enough.
            // Ideally we should store { id: original, call: callObj } in activeCalls.
            
            // NOTE: For robustness, we are using sanitized ID for PeerJS. 
            // Firebase paths might need original ID. 
            // If user IDs are just numbers (from our generator), sanitized == original.
            db.ref(`users/${connectedPeerId}/call_signal`).push({
                type: 'connect_peer',
                targetPeer: newId,
                timestamp: Date.now()
            });
        });

        alert(`Convidando ${newId} para a chamada...`);
        setShowAddContact(false); 
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (remoteVideoRef.current && remoteVideoRef.current.readyState >= 1) {
                await remoteVideoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error("Erro ao ativar PiP:", error);
        }
    };

    const answerCall = () => {
        window.NotificationSystem.stopRingtone();
        if (!incomingCall || !incomingCall.callObj) return;
        
        const isVideo = incomingCall.isVideo;
        setIsVideoCall(isVideo);
        setIncomingCall(null);
        setCallStatus('connected');

        navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo }).then((stream) => {
            // Local Stream
            if (isVideo && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream); // Record my voice

            const call = incomingCall.callObj;
            call.answer(stream);
            
            handleCallStream(call, isVideo);
            
            // call.peer is already sanitized (it comes from peerjs)
            setActiveCalls(prev => ({ ...prev, [call.peer]: call }));

        }).catch(err => {
            console.error("Erro ao acessar midia:", err);
            alert("Erro ao acessar dispositivos.");
        });
    };

    const startCall = async (video = false) => {
        if (!activeChat) return;
        
        // Group Logic
        if (activeChat.type === 'group') {
             startGroupCall(video);
             return;
        }

        // Private Logic
        setCallStatus('calling');
        setIsVideoCall(video);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

            // Sanitize target ID
            const targetPeerId = activeChat.id.replace(/[^a-zA-Z0-9]/g, '');
            const call = peer.call(targetPeerId, stream, { metadata: { isVideo: video } });
            
            if (!call) {
                throw new Error("Falha ao iniciar conexão com Peer.");
            }

            handleCallStream(call, video);
            setActiveCalls({ [targetPeerId]: call });

        } catch(err) {
            console.error("Erro ao ligar:", err);
            setCallStatus(null);
            alert("Erro ao acessar microfone/câmera ou iniciar chamada.");
        }
    };

    const startGroupCall = async (video) => {
        // Permission Check
        if (groupPermissions) {
            if (video && !groupPermissions.sendVideo) { alert("Vídeo chamadas desativadas neste grupo."); return; }
            if (!video && !groupPermissions.sendAudio) { alert("Chamadas de áudio desativadas neste grupo."); return; }
        }

        // Fetch all group members
        const groupRef = db.ref(`groups/${activeChat.id}/members`);
        const snapshot = await groupRef.once('value');
        const members = snapshot.val();
        if (!members) return;

        const memberIds = Object.keys(members).filter(id => id !== user.id); // Exclude self
        
        if (memberIds.length === 0) {
            alert("Grupo vazio ou só você está nele.");
            return;
        }

        setCallStatus('connected'); // Immediately show UI
        setIsVideoCall(video);
        setActiveGroupCall(true);
        setOngoingGroupCall(null); // Clear banner
        
        // Set Group Call Status to active
        db.ref(`groups/${activeChat.id}/callStatus`).set({
            state: 'active',
            startedBy: user.id,
            timestamp: Date.now()
        });

        // Notify group via system message
        handleSendMessage(`📞 Iniciou uma chamada de ${video ? 'vídeo' : 'voz'} em grupo.`, 'system');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

            // Mesh: Call everyone
            memberIds.forEach(id => {
                // Sanitize ID
                const targetPeerId = id.replace(/[^a-zA-Z0-9]/g, '');
                const call = peer.call(targetPeerId, stream, { metadata: { isVideo: video, isGroup: true, groupId: activeChat.id } });
                if (call) {
                    handleCallStream(call, video);
                    setActiveCalls(prev => ({ ...prev, [targetPeerId]: call }));
                }
            });

        } catch (err) {
            console.error("Erro grupo:", err);
            endCall();
            alert("Erro ao acessar dispositivos.");
        }
    };

    const joinGroupCall = async () => {
        if (!ongoingGroupCall) return;
        
        const video = false; // Default to audio when joining
        setIsVideoCall(video);
        setCallStatus('connected');
        setActiveGroupCall(true);
        setOngoingGroupCall(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

            // Signal to everyone in the group that I am joining
            const groupRef = db.ref(`groups/${activeChat.id}/members`);
            const snapshot = await groupRef.once('value');
            const members = snapshot.val();
            if (members) {
                 const memberIds = Object.keys(members).filter(id => id !== user.id);
                 memberIds.forEach(id => {
                    const targetPeerId = id.replace(/[^a-zA-Z0-9]/g, '');
                    const call = peer.call(targetPeerId, stream, { metadata: { isVideo: video, isGroup: true, groupId: activeChat.id } });
                    if (call) {
                        handleCallStream(call, video);
                        setActiveCalls(prev => ({ ...prev, [targetPeerId]: call }));
                    }
                });
            }

        } catch (e) {
            console.error("Erro ao entrar:", e);
            alert("Erro ao entrar na chamada: " + e.message);
        }
    };

    const endGroupCallForEveryone = () => {
        if (!activeChat || activeChat.type !== 'group') return;
        if (!confirm("Isso encerrará a chamada para TODOS os participantes. Tem certeza?")) return;

        db.ref(`groups/${activeChat.id}/callStatus`).set({
            state: 'ended',
            endedBy: user.id,
            timestamp: Date.now()
        });
        endCall();
    };

    const handleCallStream = (call, isVideo) => {
        call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
            addToMix(remoteStream); // Record remote
            
            if (!isVideo) {
                 const audio = new Audio();
                 audio.srcObject = remoteStream;
                 audio.play();
            } else {
                 if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        call.on('close', () => {
             setActiveCalls(prev => {
                 const newCalls = { ...prev };
                 delete newCalls[call.peer];
                 if (Object.keys(newCalls).length === 0) endCall(true); // true = remote ended
                 return newCalls;
             });
             setRemoteStreams(prev => {
                 const newSt = { ...prev };
                 delete newSt[call.peer];
                 return newSt;
             });
        });

        call.on('error', (err) => {
            console.error(`Erro com ${call.peer}:`, err);
        });
    };

    const endCall = (remoteEnded = false) => {
        window.NotificationSystem.stopRingtone();
        stopRecordingCall();

        // Log Call Message if I was connected
        if (callStatus === 'connected' && activeChat) {
             const durationStr = formatDuration(callDuration);
             const type = isVideoCall ? 'video' : 'audio';
             if (!remoteEnded) { // I hung up
                 handleSendMessage(`Chamada de ${type} encerrada • ${durationStr}`, 'system');
             }
        }

        Object.values(activeCalls).forEach(call => call.close());
        
        if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }

        setActiveCalls({});
        setRemoteStreams({});
        setCallStatus(null);
        setIncomingCall(null);
        setIsVideoCall(false);
        setActiveGroupCall(false);
        setIsCallMinimized(false);
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const deleteMessage = (msgKey) => {
        if (!activeChat) return;
        // Check Admin permission if group
        if (activeChat.type === 'group') {
             if (!confirm("Excluir esta mensagem para todos?")) return;
             db.ref(`groups/${activeChat.id}/messages/${msgKey}`).remove();
        } else {
             if (!confirm("Excluir mensagem?")) return;
             const chatId = [user.id, activeChat.id].sort().join('_');
             db.ref(`chats/${chatId}/messages/${msgKey}`).remove();
        }
    };

    // --- Data Loading (Privacy Fix) ---

    // Load Permissions if Group
    React.useEffect(() => {
        if (activeChat && activeChat.type === 'group') {
             db.ref(`groups/${activeChat.id}/permissions`).on('value', s => setGroupPermissions(s.val()));
        } else {
            setGroupPermissions(null);
        }
    }, [activeChat]);

    // Load CONTACTS only (Privacy Fix)
    React.useEffect(() => {
        const contactsRef = db.ref(`users/${user.id}/contacts`);
        const groupsRef = db.ref(`users/${user.id}/groups`); // User's groups

        const loadContacts = (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            
            const contactIds = Object.keys(data);
            Promise.all(contactIds.map(async id => {
                const ref = data[id].type === 'group' ? `groups/${id}` : `users/${id}`;
                const s = await db.ref(ref).once('value');
                const val = s.val();
                
                // Fetch status for private contacts
                let status = 'offline';
                let privacy = {};
                if (data[id].type !== 'group' && val) {
                     const statusSnap = await db.ref(`users/${id}/status`).once('value');
                     const settingsSnap = await db.ref(`users/${id}/settings`).once('value');
                     if (statusSnap.val()) status = statusSnap.val().state;
                     if (settingsSnap.val()) privacy = settingsSnap.val();
                }

                return {
                    ...val,
                    type: data[id].type,
                    status: status,
                    privacy: privacy
                };
            })).then(loadedChats => {
                setChats(prev => {
                     const map = new Map(prev.map(c => [c.id, c]));
                     loadedChats.forEach(c => map.set(c.id, c));
                     return Array.from(map.values());
                });
            });
        };

        contactsRef.on('value', loadContacts);

        return () => {
            contactsRef.off();
        };
    }, [user.id]);

    // 2. Carregar Mensagens
    React.useEffect(() => {
        if (!activeChat) return;

        let messagesRef;
        if (activeChat.type === 'group') {
            messagesRef = db.ref(`groups/${activeChat.id}/messages`);
        } else {
            const chatId = [user.id, activeChat.id].sort().join('_');
            messagesRef = db.ref(`chats/${chatId}/messages`);
        }

        // Mark as Read Logic & Privacy Check
        const markAsRead = (msgId, senderId) => {
             // Check my privacy settings first: Do I allow sending read receipts?
             db.ref(`users/${user.id}/settings`).once('value').then(s => {
                 const settings = s.val() || {};
                 let allowReadReceipt = settings.readReceipts !== false; // default true
                 
                 // Exception List Check
                 if (settings.readReceiptExceptions && settings.readReceiptExceptions[senderId]) {
                      allowReadReceipt = !allowReadReceipt;
                 }

                 if (allowReadReceipt) {
                      if (activeChat.type === 'group') {
                           db.ref(`groups/${activeChat.id}/messages/${msgId}/readBy/${user.id}`).set(Date.now());
                      } else {
                           const chatId = [user.id, activeChat.id].sort().join('_');
                           db.ref(`chats/${chatId}/messages/${msgId}/status`).set('read');
                      }
                 }
             });
        };

        messagesRef.limitToLast(50).on('child_added', (snapshot) => {
            const msg = snapshot.val();
            setMessages(prev => [...prev, { ...msg, key: snapshot.key }]);
            
            // If I am receiving this message and I am looking at it, mark read
            if (msg.senderId !== user.id) {
                 markAsRead(snapshot.key, msg.senderId);
            }
        });

        // Listen for status changes (Read Receipts updates)
        messagesRef.limitToLast(50).on('child_changed', (snapshot) => {
             const val = snapshot.val();
             setMessages(prev => prev.map(m => m.key === snapshot.key ? { ...val, key: snapshot.key } : m));
        });

        // --- SCRIPT ENGINE EXECUTION ---
        if (activeChat.type === 'group') {
            const scriptsRef = db.ref(`groups/${activeChat.id}/scripts`);
            scriptsRef.once('value').then(scriptsSnap => {
                const scripts = scriptsSnap.val();
                if (scripts) {
                    messagesRef.limitToLast(1).on('child_added', (snapshot) => {
                        const msg = snapshot.val();
                        // Run only for new messages (timestamp check)
                        if (Date.now() - msg.timestamp < 2000) {
                            const engine = new window.ScriptEngine(activeChat.id, {
                                deleteMessage: (msgId) => db.ref(`groups/${activeChat.id}/messages/${msgId}`).remove(),
                                sendMessage: (text) => handleSendMessage(text, 'text'), // Bots speak as the user running them in this architecture
                                kickMember: (uid) => db.ref(`groups/${activeChat.id}/members/${uid}`).remove(),
                                alert: (txt) => alert(`[BOT]: ${txt}`)
                            });
                            
                            // Get Member Info
                            const senderId = msg.senderId;
                            // We need member role. Simplified here:
                            const memberContext = { id: senderId, name: msg.senderName };

                            Object.values(scripts).forEach(script => {
                                if (script.active) {
                                    engine.execute(script.code, { message: { ...msg, id: snapshot.key }, member: memberContext });
                                }
                            });
                        }
                    });
                }
            });
        }

        return () => {
            messagesRef.off();
            setMessages([]);
        };
    }, [activeChat]);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    const handleSendMessage = (content, type = 'text', duration = null, msgType = 'text') => {
        if (!activeChat) return;
        
        // Permission Check
        if (activeChat.type === 'group' && groupPermissions && type !== 'system') {
            if (type === 'text' && !groupPermissions.sendText) { alert("Envio de texto bloqueado neste grupo."); return; }
            if (type === 'audio' && !groupPermissions.sendAudio) { alert("Envio de áudio bloqueado neste grupo."); return; }
        }

        if (type === 'audio') {
            window.ChatAppAPI.sendAudio(activeChat.id, content, duration, activeChat.type);
        } else if (type === 'system') {
             // System message injection
             const msgData = {
                senderId: 'system',
                senderName: 'Sistema',
                text: content,
                type: 'system',
                timestamp: window.firebase.database.ServerValue.TIMESTAMP,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            const ref = activeChat.type === 'group' 
                ? db.ref(`groups/${activeChat.id}/messages`)
                : db.ref(`chats/${[user.id, activeChat.id].sort().join('_')}/messages`);
            ref.push(msgData);
        } else {
            // Support Image/Text types
            window.ChatAppAPI.sendMessage(activeChat.id, content, activeChat.type, msgType);
        }
        setMessageInput("");
        setShowAudioRecorder(false);
    };

    const handleCreateGroup = () => {
        const groupName = prompt("Nome do Grupo:");
        if (groupName) {
            const groupId = Math.floor(1000 + Math.random() * 9000).toString();
            // Create Group
            db.ref(`groups/${groupId}`).set({
                id: groupId,
                name: groupName,
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`,
                members: { [user.id]: 'admin' },
                permissions: {
                    sendText: true,
                    sendAudio: true,
                    sendVideo: true,
                    sendMedia: true,
                    changeInfo: false
                }
            });
            // Add to my contacts/groups list
            db.ref(`users/${user.id}/contacts/${groupId}`).set({ type: 'group', joinedAt: Date.now() });
        }
    };

    const handleAddContact = async (inputId) => {
        if (!inputId) return;

        const cleanInput = inputId.trim();

        // Bot Creation Trigger
        if (cleanInput.toLowerCase() === 'bot') {
            setShowAddContact(false);
            setShowBotCreator(true);
            return;
        }
        
        try {
            // 1. Try to find as Group
            const groupSnap = await db.ref(`groups/${inputId}`).once('value');
            if (groupSnap.exists()) {
                 const groupData = groupSnap.val();
                 // Add to user contacts as group
                 await db.ref(`users/${user.id}/contacts/${inputId}`).set({ type: 'group', joinedAt: Date.now() });
                 // Add user to group members (default role: member)
                 await db.ref(`groups/${inputId}/members/${user.id}`).set('member');
                 
                 setActiveChat({ ...groupData, type: 'group' });
                 setShowAddContact(false);
                 alert(`Você entrou no grupo "${groupData.name}"!`);
                 return;
            }

            // 2. Try to find as User
            const userSnap = await db.ref(`users/${inputId}`).once('value');
            if (userSnap.exists()) {
                const userData = userSnap.val();
                await db.ref(`users/${user.id}/contacts/${inputId}`).set({ type: 'private', addedAt: Date.now() });
                setActiveChat({ ...userData, type: 'private' });
                setShowAddContact(false);
                return;
            }
            
            alert("ID não encontrado (nem usuário, nem grupo).");

        } catch (error) {
            console.error("Erro ao buscar ID:", error);
            alert("Erro ao buscar.");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">
            
            {/* System Status Banner */}
            {user && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] w-full max-w-lg pointer-events-auto">
                 <SystemStatus />
            </div>}

            {/* Join Request Modal */}
            {pendingJoinGroupId && (
                <JoinRequestModal 
                    groupId={pendingJoinGroupId} 
                    user={user} 
                    onClose={onClearJoin}
                    onJoinSuccess={handleJoinSuccess}
                />
            )}

            {/* Bot Creator Modal */}
            {showBotCreator && (
                <BotCreator 
                    onClose={() => setShowBotCreator(false)} 
                    onCreated={() => { setShowBotCreator(false); openAddContact(); }}
                />
            )}

            {/* Modal Layer */}
            {showSettings && <Settings user={user} onClose={() => setShowSettings(false)} chats={chats} />}
            
            {showAddContact && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-80 shadow-xl animate-fade-in flex flex-col max-h-[80vh]">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            {callStatus ? 'Adicionar à Chamada' : 'Adicionar / Entrar'}
                        </h3>
                        
                        {/* Tab or simple switch if in call */}
                        {callStatus ? (
                            <div className="flex-1 overflow-y-auto mb-4">
                                <p className="text-sm text-gray-500 mb-2">Escolha dos seus contatos:</p>
                                {chats.filter(c => c.type !== 'group').map(c => (
                                    <div key={c.id} onClick={() => handleAddParticipantToCall(c.id)} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded">
                                        <img src={c.avatar} className="w-8 h-8 rounded-full mr-2" />
                                        <span>{c.name}</span>
                                        <div className="ml-auto icon-plus-circle text-green-500"></div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <p className="text-sm text-gray-500 mb-2">Digite ID do Usuário, Grupo ou "bot"</p>
                        <input 
                            type="text" 
                            id="newContactId"
                            placeholder="Ex: 12345 ou bot" 
                            className="w-full border border-gray-300 rounded p-2 mb-4 outline-none focus:border-[#00a884]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.target.value;
                                    if (callStatus) handleAddParticipantToCall(val);
                                    else handleAddContact(val);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddContact(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={() => {
                                const val = document.getElementById('newContactId').value;
                                if (callStatus) handleAddParticipantToCall(val);
                                else handleAddContact(val);
                            }} className="px-4 py-2 bg-[#00a884] text-white rounded hover:bg-[#008f6f]">
                                {callStatus ? 'Convidar' : 'Ir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showGroupInfo && activeChat?.type === 'group' && (
                <GroupInfo 
                    activeChat={activeChat} 
                    user={user} 
                    onClose={() => setShowGroupInfo(false)} 
                />
            )}

            {/* Call Modal / Mini Player */}
            {(incomingCall || callStatus) && (
                <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden
                    ${isCallMinimized 
                        ? 'bottom-4 right-4 w-48 h-64 rounded-xl border-2 border-white' 
                        : 'inset-0 bg-black/95 flex flex-col items-center justify-center'
                    }
                `}>
                    {/* Background / Video Area */}
                    <div className={`absolute inset-0 ${isCallMinimized ? 'bg-gray-800' : ''}`}>
                         {/* Only render video elements if it IS a video call */}
                         <div className={`w-full h-full relative ${!isVideoCall && 'hidden'}`}>
                             {/* Remote Video */}
                             <video 
                                ref={remoteVideoRef} 
                                autoPlay 
                                className={`w-full h-full object-cover ${isCallMinimized ? 'opacity-100' : ''}`} 
                             />
                             
                             {/* Local Video - PiP style in Fullscreen, Hidden in Mini (too small) */}
                             {!isCallMinimized && (
                                 <div className="w-32 h-48 absolute top-4 right-4 md:w-1/4 md:h-1/3 bg-gray-900 border border-gray-700 shadow-lg rounded-lg overflow-hidden">
                                    <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                                 </div>
                             )}
                         </div>

                         {/* Avatar for Audio Calls */}
                         {!isVideoCall && (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                                <img 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall?.callerId || (activeChat?.id || 'unknown')}`} 
                                    className={`${isCallMinimized ? 'w-16 h-16' : 'w-32 h-32'} rounded-full mb-4 border-2 border-white/20 animate-pulse`}
                                />
                                {!isCallMinimized && (
                                    <>
                                        <h2 className="text-2xl font-bold text-white mb-2">{incomingCall ? 'Recebendo...' : 'Conectado'}</h2>
                                        <p className="text-gray-400">{incomingCall?.callerId || activeChat?.name || 'Desconhecido'}</p>
                                    </>
                                )}
                             </div>
                         )}
                    </div>

                    {/* Controls Overlay */}
                    <div className={`relative z-10 flex ${isCallMinimized ? 'w-full h-full opacity-0 hover:opacity-100 bg-black/60 items-center justify-center gap-2' : 'flex-col items-center mt-auto mb-12'}`}>
                         
                         {/* Header Controls (Minimize/PiP) - Only in Fullscreen */}
                         {!isCallMinimized && !incomingCall && (
                             <div className="absolute top-8 left-8 flex gap-4 z-20">
                                <button onClick={() => setIsCallMinimized(true)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white" title="Minimizar">
                                    <div className="icon-minimize-2 text-xl"></div>
                                </button>
                                {isVideoCall && (
                                    <button onClick={togglePiP} className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white" title="Picture-in-Picture">
                                        <div className="icon-monitor-play text-xl"></div>
                                    </button>
                                )}
                                <button onClick={() => {
                                    const id = prompt("Digite o ID do usuário para adicionar à chamada:");
                                    if(id) handleAddParticipantToCall(id);
                                }} className="p-3 bg-[#00a884] rounded-full hover:bg-[#008f6f] text-white shadow-lg flex items-center gap-2" title="Adicionar Pessoa">
                                    <div className="icon-user-plus text-xl"></div>
                                    <span className="text-sm font-semibold hidden md:inline">Adicionar</span>
                                </button>
                                <button onClick={() => setShowAddContact(true)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white" title="Escolher dos Contatos">
                                    <div className="icon-book-user text-xl"></div>
                                </button>
                             </div>
                         )}

                         {/* Restore Button (Mini Mode) */}
                         {isCallMinimized && (
                             <button onClick={() => setIsCallMinimized(false)} className="absolute top-2 right-2 text-white p-1">
                                 <div className="icon-maximize-2 text-sm"></div>
                             </button>
                         )}
                         
                         {/* Main Action Buttons */}
                         <div className={`flex items-center ${isCallMinimized ? 'gap-2' : 'gap-6'}`}>
                             {/* Recording Button */}
                             {!incomingCall && !isCallMinimized && (
                                 <button 
                                    onClick={isRecordingCall ? stopRecordingCall : startRecordingCall}
                                    className={`p-3 rounded-full shadow-lg flex items-center justify-center gap-2 ${isRecordingCall ? 'bg-white text-red-500 animate-pulse' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                                    title={isRecordingCall ? "Parar Gravação" : "Gravar Chamada"}
                                 >
                                     <div className={`icon-circle-stop ${isRecordingCall ? '' : 'hidden'}`}></div>
                                     <div className={`icon-circle-play ${!isRecordingCall ? '' : 'hidden'}`}></div>
                                     {isRecordingCall && <span className="text-xs font-mono font-bold">{formatDuration(callDuration)}</span>}
                                 </button>
                             )}

                             {incomingCall ? (
                                 !isCallMinimized && (
                                     <>
                                        <button onClick={() => setIncomingCall(null)} className="p-4 bg-red-600 rounded-full hover:bg-red-700 shadow-lg animate-pulse">
                                            <div className="icon-phone-off text-3xl"></div>
                                        </button>
                                        <button onClick={answerCall} className="p-4 bg-green-500 rounded-full hover:bg-green-600 shadow-lg animate-bounce">
                                            <div className="icon-phone text-3xl"></div>
                                        </button>
                                     </>
                                 )
                             ) : (
                                <div className="flex items-center gap-4">
                                     <button onClick={() => endCall(false)} className={`${isCallMinimized ? 'p-3' : 'p-5'} bg-red-600 rounded-full hover:bg-red-700 shadow-lg`} title="Sair da Chamada">
                                        <div className={`icon-phone-off ${isCallMinimized ? 'text-xl' : 'text-3xl'}`}></div>
                                     </button>
                                     
                                     {/* Force End Button for Admins/Permitted Roles */}
                                     {!isCallMinimized && activeGroupCall && (groupPermissions?.manageCalls || activeChat?.members?.[user.id] === 'admin') && (
                                        <button onClick={endGroupCallForEveryone} className="p-5 bg-orange-600 rounded-full hover:bg-orange-700 shadow-lg" title="Encerrar para Todos">
                                            <div className="icon-trash-2 text-3xl"></div>
                                        </button>
                                     )}
                                </div>
                             )}
                         </div>

                         {/* Multi-User List (If Group Call) */}
                         {!isCallMinimized && Object.keys(activeCalls).length > 1 && (
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                {Object.keys(activeCalls).map(pid => (
                                    <div key={pid} className="flex items-center gap-2 bg-black/50 p-2 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-white text-xs">{pid}</span>
                                    </div>
                                ))}
                            </div>
                         )}
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={`bg-white w-full md:w-[400px] border-r border-gray-200 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Header Sidebar */}
                <div className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center h-16 border-b border-gray-300">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={openSettings}>
                        <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-300" />
                        <span className="font-semibold text-gray-700 text-sm">{user.name}</span>
                    </div>
                    <div className="flex gap-4 text-gray-600 items-center">
                        <div 
                            className={`icon-zap cursor-pointer p-1.5 rounded-full transition ${backgroundMode ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`} 
                            title="Ativar Segundo Plano (Áudio Constante)" 
                            onClick={toggleBackgroundMode}
                        ></div>
                        <div className="icon-users cursor-pointer hover:bg-gray-200 p-1.5 rounded-full transition" title="Criar Grupo" onClick={handleCreateGroup}></div>
                        <div className="icon-message-square-plus cursor-pointer hover:bg-gray-200 p-1.5 rounded-full transition" title="Novo Contato" onClick={openAddContact}></div>
                        <div className="icon-settings cursor-pointer hover:bg-gray-200 p-1.5 rounded-full transition" onClick={openSettings}></div>
                        <div className="icon-log-out cursor-pointer text-red-500 hover:bg-red-50 p-1.5 rounded-full transition" onClick={onLogout}></div>
                    </div>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-gray-200">
                    <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5">
                        <div className="icon-search text-gray-500 text-sm"></div>
                        <input type="text" placeholder="Pesquisar contatos..." className="bg-transparent border-none outline-none ml-3 w-full text-sm py-1" />
                    </div>
                </div>

                {/* Chat List (Contacts Only) */}
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => openChat(chat)} className={`flex items-center p-3 cursor-pointer hover:bg-[#f5f6f6] ${activeChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''}`}>
                            <img src={chat.avatar} className="w-12 h-12 rounded-full mr-3" />
                            <div className="flex-1 border-b border-gray-100 pb-3 h-full flex flex-col justify-center">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-900 font-medium">{chat.name}</span>
                                </div>
                                <div className="text-sm text-gray-500 truncate w-48">{chat.type === 'group' ? 'Grupo' : 'Privado'}</div>
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm mt-4 flex flex-col items-center">
                            <div className="icon-book-user text-4xl mb-2 opacity-30"></div>
                            Sua lista de contatos está vazia.<br/>
                            Adicione um ID ou crie um grupo!
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            {activeChat ? (
                <div className={`flex-1 flex flex-col h-full bg-[#efeae2] ${activeChat ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Chat Header */}
                    <div className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center h-16 border-b border-gray-300 cursor-pointer" 
                         onClick={() => activeChat.type === 'group' && openGroupInfo()}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-600"><div className="icon-arrow-left"></div></button>
                            <img src={activeChat.avatar} className="w-10 h-10 rounded-full" />
                            <div className="flex flex-col">
                                <span className="text-gray-800 font-medium">{activeChat.name}</span>
                                {activeChat.type === 'group' 
                                    ? <span className="text-xs text-gray-500">Toque para info do grupo</span>
                                    : (activeChat.privacy?.showOnline !== false && activeChat.status === 'online') 
                                        ? <span className="text-xs text-green-500 font-bold">Online</span>
                                        : <span className="text-xs text-gray-500">Offline</span>
                                }
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600" onClick={(e) => e.stopPropagation()}>
                            {/* Unified Call Buttons (Works for both Private and Group) */}
                            <div 
                                className={`p-2 rounded-full cursor-pointer transition-colors ${activeChat.type === 'group' ? 'text-[#00a884] bg-green-50 hover:bg-green-100' : 'hover:bg-gray-200'}`}
                                onClick={() => startCall(true)} 
                                title={activeChat.type === 'group' ? "Iniciar Vídeo Chamada em Grupo" : "Vídeo Chamada"}
                            >
                                <div className="icon-video text-xl"></div>
                            </div>

                            <div 
                                className={`p-2 rounded-full cursor-pointer transition-colors ${activeChat.type === 'group' ? 'text-[#00a884] bg-green-50 hover:bg-green-100' : 'hover:bg-gray-200'}`}
                                onClick={() => startCall(false)} 
                                title={activeChat.type === 'group' ? "Iniciar Chamada de Voz em Grupo" : "Chamada de Voz"}
                            >
                                <div className="icon-phone text-xl"></div>
                            </div>
                            
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <div className="icon-search cursor-pointer hover:bg-gray-200 p-2 rounded-full"></div>
                            <div className="icon-more-vertical cursor-pointer hover:bg-gray-200 p-2 rounded-full"></div>
                        </div>
                    </div>
                    
                    {/* Ongoing Call Banner */}
                    {ongoingGroupCall && !activeGroupCall && (
                        <div className="bg-green-100 p-3 flex justify-between items-center px-6 animate-slide-in-right cursor-pointer shadow-inner" onClick={joinGroupCall}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500 rounded-full text-white animate-pulse">
                                    <div className="icon-phone-incoming text-xl"></div>
                                </div>
                                <div>
                                    <p className="font-bold text-green-800">Chamada em andamento</p>
                                    <p className="text-xs text-green-600">Toque para participar</p>
                                </div>
                            </div>
                            <button className="bg-green-600 text-white px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-green-700 shadow">
                                Entrar
                            </button>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-chat-pattern relative">
                        <div className="flex flex-col gap-2">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === user.id;
                                const isSystem = msg.type === 'system';
                                
                                if (isSystem) {
                                    return (
                                        <div key={idx} className="flex justify-center my-2 group relative">
                                            <div className="bg-[#e1f3fb] text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                                                <div className="icon-info"></div>
                                                {msg.text}
                                            </div>
                                            {/* Admin Delete Button for System Msgs */}
                                            {activeChat.type === 'group' && (
                                                <button 
                                                    onClick={() => deleteMessage(msg.key)}
                                                    className="hidden group-hover:block absolute right-4 text-red-400 hover:text-red-600"
                                                    title="Apagar Log"
                                                >
                                                    <div className="icon-trash text-xs"></div>
                                                </button>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                        <div className={`max-w-[80%] md:max-w-[60%] rounded-lg p-2 px-3 shadow-sm relative text-sm ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                            {/* Message Content */}
                                            {!isMe && activeChat.type === 'group' && <p className="text-xs text-orange-500 font-bold mb-1">{msg.senderName}</p>}
                                            {msg.type === 'text' && (() => {
                                                // Check for #url= pattern in groups
                                                const urlMatch = activeChat.type === 'group' ? msg.text.match(/#url=(https?:\/\/[^\s]+)/) : null;
                                                
                                                if (urlMatch) {
                                                    const originalUrl = urlMatch[1];
                                                    const separator = originalUrl.includes('?') ? '&' : '?';
                                                    // Appends Sender ID as requested ("ID dele")
                                                    const finalUrl = `${originalUrl}${separator}userid=${msg.senderId}`;
                                                    
                                                    return (
                                                        <div className="flex flex-col gap-2 mt-1">
                                                            {msg.text.replace(urlMatch[0], '').trim() && (
                                                                <p className="text-gray-800 leading-relaxed">{msg.text.replace(urlMatch[0], '').trim()}</p>
                                                            )}
                                                            <div className="w-full h-[350px] md:w-[360px] bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative shadow-sm">
                                                                <div className="bg-gray-100 px-3 py-1 text-[10px] text-gray-500 flex justify-between items-center border-b border-gray-200">
                                                                    <span className="truncate max-w-[200px]">{originalUrl}</span>
                                                                    <span className="font-mono">Embed</span>
                                                                </div>
                                                                <iframe 
                                                                    src={finalUrl} 
                                                                    className="w-full h-full border-0 bg-white" 
                                                                    title="Embed"
                                                                    loading="lazy"
                                                                    allow="camera; microphone; geolocation; payment"
                                                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                                                />
                                                                <a href={finalUrl} target="_blank" className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors" title="Abrir em nova aba">
                                                                    <div className="icon-external-link text-xs"></div>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return <p className="text-gray-800 mb-1 leading-relaxed">{msg.text}</p>;
                                            })()}
                                            {msg.type === 'image' && (
                                                <div className="mb-1">
                                                    <img src={msg.text.replace('[IMAGEM] ', '')} className="rounded-lg max-w-full md:max-w-sm cursor-pointer" onClick={() => window.open(msg.text.replace('[IMAGEM] ', ''), '_blank')} />
                                                </div>
                                            )}
                                            {msg.type === 'audio' && (
                                                <div className="flex items-center gap-3 min-w-[200px] py-2">
                                                    <div className="icon-circle-play text-gray-500 text-3xl cursor-pointer hover:text-[#00a884] transition" 
                                                        onClick={(e) => { 
                                                            const audioEl = e.target.parentElement.querySelector('audio');
                                                            if (audioEl) {
                                                                handleAudioPlay(audioEl);
                                                                audioEl.play();
                                                            }
                                                        }}
                                                    ></div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <div className="h-1 bg-gray-300 rounded-full w-full mb-1 overflow-hidden">
                                                            <div className="h-full bg-gray-500 w-0 transition-all duration-300" style={{width: '0%'}}></div> 
                                                            {/* We'd need state for progress bar to be real, simplistic here */}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{msg.duration}</span>
                                                    </div>
                                                    <audio 
                                                        src={msg.audio} 
                                                        className="hidden" 
                                                        onPlay={(e) => handleAudioPlay(e.target)}
                                                        onEnded={() => { /* maybe auto play next? */ }}
                                                    /> 
                                                </div>
                                            )}

                                            {/* Metadata & Status */}
                                            <div className="flex justify-end items-center gap-1 mt-1">
                                                <span className="text-[10px] text-gray-500">{msg.time}</span>
                                                {isMe && (
                                                    msg.status === 'read' 
                                                    ? <div className="icon-check-check text-[14px] text-blue-500" title="Lido"></div>
                                                    : <div className="icon-check text-[14px] text-gray-400" title="Enviado"></div>
                                                )}
                                            </div>

                                            {/* Delete Button (Context Menu style) */}
                                            <button 
                                                onClick={() => deleteMessage(msg.key)}
                                                className={`absolute top-0 -right-8 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'block' : (activeChat.type === 'group' ? 'block' : 'hidden')}`}
                                                title="Apagar mensagem"
                                            >
                                                <div className="icon-trash text-sm"></div>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#f0f2f5] p-3 px-4 flex items-center gap-3">
                        {!showAudioRecorder ? (
                            <>
                                <div className="icon-smile text-2xl text-gray-500 cursor-pointer"></div>
                                <div 
                                    className="icon-plus text-2xl text-gray-500 cursor-pointer"
                                    onClick={() => fileInputRef.current.click()}
                                    title="Enviar Foto/Vídeo"
                                ></div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,video/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            if (file.size > 2 * 1024 * 1024) return alert("Arquivo muito grande! Máximo 2MB.");
                                            
                                            // Handle Image
                                            if (file.type.startsWith('image/')) {
                                                const base64 = await window.compressImage(file, 800, 0.7);
                                                // Send as image message
                                                // NOTE: We need to handle 'image' type in handleSendMessage, currently only text/audio/system.
                                                // Let's implement basic image type support inline here or modify handleSendMessage
                                                window.ChatAppAPI.sendMessage(activeChat.id, `[IMAGEM] ${base64}`, activeChat.type, 'image');
                                            } 
                                            // Handle Video
                                            else if (file.type.startsWith('video/')) {
                                                alert("Envio de vídeo ainda experimental.");
                                            }
                                        }
                                    }}
                                />
                                <div className="flex-1 bg-white rounded-lg px-4 py-2 flex items-center">
                                    <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(messageInput)} placeholder="Mensagem" className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-sm"/>
                                </div>
                                {messageInput.trim() ? (
                                    <div onClick={() => handleSendMessage(messageInput)} className="icon-send text-2xl text-gray-500 cursor-pointer"></div>
                                ) : (
                                    <div onClick={() => setShowAudioRecorder(true)} className="icon-mic text-2xl text-gray-500 cursor-pointer"></div>
                                )}
                            </>
                        ) : (
                            <AudioRecorder onSendAudio={(base64, duration) => handleSendMessage(base64, 'audio', duration)} onCancel={() => setShowAudioRecorder(false)} />
                        )}
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 bg-[#f0f2f5] flex-col items-center justify-center border-b-8 border-[#25d366]">
                    <div className="w-64 h-64 mb-8 text-gray-300 flex items-center justify-center">
                         <div className="icon-lock text-9xl text-gray-200"></div>
                    </div>
                    <h1 className="text-3xl font-light text-gray-600 mb-4">Privacidade & Segurança</h1>
                    <p className="text-gray-500 text-sm text-center max-w-md">
                        Agora suas mensagens são privadas.<br/>
                        Adicione contatos pelo ID para começar a conversar.
                    </p>
                </div>
            )}
        </div>
    );
}