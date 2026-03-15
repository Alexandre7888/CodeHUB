function ChatInterface({ user, onLogout, pendingJoinGroupId, onClearJoin }) {
    const [activeChat, setActiveChat] = React.useState(null);
    const [messageInput, setMessageInput] = React.useState("");
    const [chats, setChats] = React.useState([]);
    const [messages, setMessages] = React.useState([]);
    const [showAudioRecorder, setShowAudioRecorder] = React.useState(false);

    // Bot & Media States
    const [showBotCreator, setShowBotCreator] = React.useState(false);
    const fileInputRef = React.useRef(null);

    // Modal States
    const [showAddContact, setShowAddContact] = React.useState(false);
    const [showGroupInfo, setShowGroupInfo] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);

    // Permissions
    const [groupPermissions, setGroupPermissions] = React.useState(null);

    // Professional Panel Activation
    const [professionalPanel, setProfessionalPanel] = React.useState(false);
    const [panelPassword, setPanelPassword] = React.useState("");
    const [showPanelLogin, setShowPanelLogin] = React.useState(false);

    // Check URL for panel activation
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('painel') === 'activado') {
            setProfessionalPanel(true);
            alert("✅ Painel Profissional ativado!");
        }
    }, []);

    // Navigation History
    React.useEffect(() => {
        const handlePopState = (event) => {
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

    const openSettings = () => { pushHistoryState('settings'); setShowSettings(true); };
    const openGroupInfo = () => { pushHistoryState('groupInfo'); setShowGroupInfo(true); };
    const openAddContact = () => { pushHistoryState('addContact'); setShowAddContact(true); };
    const openChat = (chat) => { pushHistoryState('chat'); setActiveChat(chat); };

    // Call States
    const [incomingCall, setIncomingCall] = React.useState(null);
    const [callStatus, setCallStatus] = React.useState(null);
    const [isVideoCall, setIsVideoCall] = React.useState(false);
    const [activeGroupCall, setActiveGroupCall] = React.useState(false);
    const [peer, setPeer] = React.useState(null);
    const [activeCalls, setActiveCalls] = React.useState({});
    const [remoteStreams, setRemoteStreams] = React.useState({});
    const [isCallMinimized, setIsCallMinimized] = React.useState(false);

    // Call Controls
    const [isMicMuted, setIsMicMuted] = React.useState(false);
    const [isCamMuted, setIsCamMuted] = React.useState(false);
    const [showSoundBoard, setShowSoundBoard] = React.useState(false);
    
    // Professional Panel Controls
    const [participantVolumes, setParticipantVolumes] = React.useState({});
    const [mutedAll, setMutedAll] = React.useState(false);
    const [adminOnlyMode, setAdminOnlyMode] = React.useState(false);
    const [globalAudioMessage, setGlobalAudioMessage] = React.useState(null);
    const [showGlobalAudio, setShowGlobalAudio] = React.useState(false);
    const [htmlInput, setHtmlInput] = React.useState("");
    const [showHtmlInput, setShowHtmlInput] = React.useState(false);
    const [screenSharing, setScreenSharing] = React.useState(false);
    const screenStreamRef = React.useRef(null);

    // Recording
    const [isRecordingCall, setIsRecordingCall] = React.useState(false);
    const [callDuration, setCallDuration] = React.useState(0);
    const recorderRef = React.useRef(null);
    const audioContextRef = React.useRef(null);
    const mixedDestRef = React.useRef(null);
    const callTimerRef = React.useRef(null);
    const localStreamRef = React.useRef(null);

    // Status
    const [onlineUsers, setOnlineUsers] = React.useState({});
    const [backgroundMode, setBackgroundMode] = React.useState(false);

    const messagesEndRef = React.useRef(null);
    const localVideoRef = React.useRef(null);
    const remoteVideoRef = React.useRef(null);
    const screenVideoRef = React.useRef(null);
    const currentAudioRef = React.useRef(null);
    const backgroundAudioRef = React.useRef(null);
    const db = window.firebaseDB;

    // Check if current user is admin
    const isCurrentUserAdmin = React.useMemo(() => {
        if (!activeChat || activeChat.type !== 'group') return false;
        return activeChat.members?.[user.id] === 'admin';
    }, [activeChat, user.id]);

    // Screen Sharing Function
    const startScreenShare = async () => {
        if (!professionalPanel || !isCurrentUserAdmin) {
            alert("Apenas administradores com painel profissional podem compartilhar tela.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: true 
            });
            
            screenStreamRef.current = stream;
            setScreenSharing(true);

            // Send screen to all participants
            Object.values(activeCalls).forEach(call => {
                // Add screen track to call
                const sender = call.peerConnection.addTrack(stream.getVideoTracks()[0], stream);
            });

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (error) {
            console.error("Erro ao compartilhar tela:", error);
            alert("Erro ao compartilhar tela. Certifique-se de estar no computador.");
        }
    };

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        setScreenSharing(false);
    };

    // Global Audio Message
    const sendGlobalAudio = (audioBase64, duration) => {
        if (!professionalPanel || !isCurrentUserAdmin) {
            alert("Apenas administradores com painel profissional podem enviar áudio global.");
            return;
        }

        setGlobalAudioMessage({ audio: audioBase64, duration });
        
        // Play for all participants
        Object.keys(activeCalls).forEach(participantId => {
            db.ref(`users/${participantId}/global_audio`).set({
                audio: audioBase64,
                duration: duration,
                timestamp: Date.now(),
                sender: user.id
            });
        });

        // Play locally
        const audio = new Audio(audioBase64);
        audio.play();
    };

    // Listen for global audio from admin
    React.useEffect(() => {
        const globalAudioRef = db.ref(`users/${user.id}/global_audio`);
        globalAudioRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.sender !== user.id) {
                const audio = new Audio(data.audio);
                audio.play();
                alert(`🔊 Mensagem global do administrador`);
            }
        });
        return () => globalAudioRef.off();
    }, [user.id]);

    // Volume Control
    const setParticipantVolume = (participantId, volume) => {
        if (!professionalPanel || !isCurrentUserAdmin) return;
        
        setParticipantVolumes(prev => ({
            ...prev,
            [participantId]: volume
        }));

        // Apply volume to remote stream
        const remoteStream = remoteStreams[participantId];
        if (remoteStream) {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(remoteStream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume / 100;
            source.connect(gainNode).connect(audioContext.destination);
        }
    };

    const muteAllParticipants = () => {
        if (!professionalPanel || !isCurrentUserAdmin) return;
        
        const newMutedState = !mutedAll;
        setMutedAll(newMutedState);

        Object.keys(activeCalls).forEach(participantId => {
            if (!mutedAll) {
                setParticipantVolume(participantId, 0);
                // Send mute signal
                db.ref(`users/${participantId}/call_control`).set({
                    action: 'mute',
                    adminId: user.id
                });
            }
        });
    };

    const setAdminOnlyVoice = () => {
        if (!professionalPanel || !isCurrentUserAdmin) return;
        
        const newMode = !adminOnlyMode;
        setAdminOnlyMode(newMode);

        Object.keys(activeCalls).forEach(participantId => {
            const isAdmin = activeChat?.members?.[participantId] === 'admin';
            if (!isAdmin) {
                setParticipantVolume(participantId, newMode ? 0 : 100);
                db.ref(`users/${participantId}/call_control`).set({
                    action: newMode ? 'admin_only' : 'normal',
                    adminId: user.id
                });
            }
        });
    };

    // HTML Injection (Admin only)
    const injectHTML = (htmlContent) => {
        if (!professionalPanel || !isCurrentUserAdmin) {
            alert("Apenas administradores com painel profissional podem injetar HTML.");
            return;
        }

        // Create iframe with HTML
        const iframe = document.createElement('iframe');
        iframe.srcdoc = htmlContent;
        iframe.style.position = 'fixed';
        iframe.style.top = '50%';
        iframe.style.left = '50%';
        iframe.style.transform = 'translate(-50%, -50%)';
        iframe.style.width = '80%';
        iframe.style.height = '80%';
        iframe.style.zIndex = '9999';
        iframe.style.backgroundColor = 'white';
        iframe.style.border = '2px solid #00a884';
        iframe.style.borderRadius = '10px';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.position = 'fixed';
        closeBtn.style.top = 'calc(50% - 40vh)';
        closeBtn.style.right = 'calc(50% - 38vw)';
        closeBtn.style.zIndex = '10000';
        closeBtn.style.padding = '10px 15px';
        closeBtn.style.backgroundColor = 'red';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '5px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
            iframe.remove();
            closeBtn.remove();
        };

        document.body.appendChild(iframe);
        document.body.appendChild(closeBtn);

        // Send to all participants
        Object.keys(activeCalls).forEach(participantId => {
            db.ref(`users/${participantId}/html_inject`).set({
                html: htmlContent,
                adminId: user.id,
                timestamp: Date.now()
            });
        });
    };

    // Listen for HTML injection from admin
    React.useEffect(() => {
        const htmlRef = db.ref(`users/${user.id}/html_inject`);
        htmlRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.adminId !== user.id && professionalPanel) {
                // Show HTML content
                const iframe = document.createElement('iframe');
                iframe.srcdoc = data.html;
                iframe.style.position = 'fixed';
                iframe.style.top = '50%';
                iframe.style.left = '50%';
                iframe.style.transform = 'translate(-50%, -50%)';
                iframe.style.width = '80%';
                iframe.style.height = '80%';
                iframe.style.zIndex = '9999';
                iframe.style.backgroundColor = 'white';
                iframe.style.border = '2px solid #00a884';
                iframe.style.borderRadius = '10px';
                
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.style.position = 'fixed';
                closeBtn.style.top = 'calc(50% - 40vh)';
                closeBtn.style.right = 'calc(50% - 38vw)';
                closeBtn.style.zIndex = '10000';
                closeBtn.style.padding = '10px 15px';
                closeBtn.style.backgroundColor = 'red';
                closeBtn.style.color = 'white';
                closeBtn.style.border = 'none';
                closeBtn.style.borderRadius = '5px';
                closeBtn.style.cursor = 'pointer';
                closeBtn.onclick = () => {
                    iframe.remove();
                    closeBtn.remove();
                };

                document.body.appendChild(iframe);
                document.body.appendChild(closeBtn);
            }
        });
        return () => htmlRef.off();
    }, [user.id, professionalPanel]);

    // Listen for call control from admin
    React.useEffect(() => {
        const controlRef = db.ref(`users/${user.id}/call_control`);
        controlRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.adminId !== user.id) {
                if (data.action === 'mute') {
                    toggleMic(); // Mute local mic
                } else if (data.action === 'admin_only') {
                    // Logic for admin only mode
                }
            }
        });
        return () => controlRef.off();
    }, [user.id]);

    const handleAudioPlay = (audioElement) => {
        if (currentAudioRef.current && currentAudioRef.current !== audioElement) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }
        currentAudioRef.current = audioElement;
    };

    const toggleBackgroundMode = () => {
        if (!backgroundAudioRef.current) {
            const audio = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
            audio.loop = true;
            audio.volume = 0.01;
            backgroundAudioRef.current = audio;
        }

        if (backgroundMode) {
            backgroundAudioRef.current.pause();
            setBackgroundMode(false);
        } else {
            backgroundAudioRef.current.play().then(() => {
                setBackgroundMode(true);
                alert("Modo Segundo Plano Ativado");
            }).catch(e => {
                console.error("Erro ao ativar background:", e);
            });
        }
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamMuted(!videoTrack.enabled);
            }
        }
    };

    // PeerJS Setup
    React.useEffect(() => {
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
        });

        setPeer(newPeer);

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

    // Group Call Status
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
                if (status.state === 'active') {
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

    // Notifications
    React.useEffect(() => {
        if (!chats.length) return;

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

                const isRecent = (Date.now() - msg.timestamp) < 10000; 
                const isFromMe = msg.senderId === user.id;

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
    }, [chats, activeChat]);

    // Audio Recording
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
                    const durationStr = formatDuration(callDuration);
                    if (confirm(`Gravação finalizada (${durationStr}). Deseja enviar no chat?`)) {
                        handleSendMessage(base64Audio, 'audio', durationStr);
                    }
                };
            };

            recorder.start();
            recorderRef.current = recorder;
            setIsRecordingCall(true);

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

    const handleJoinSuccess = (groupData) => {
        alert(`Você entrou no grupo ${groupData.name}!`);
        setActiveChat({ ...groupData, id: pendingJoinGroupId, type: 'group' });
        onClearJoin();
    };

    // Call Handlers
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

    React.useEffect(() => {
        const signalRef = db.ref(`users/${user.id}/call_signal`);
        signalRef.on('child_added', snapshot => {
            const signal = snapshot.val();
            if (signal && signal.type === 'connect_peer' && signal.targetPeer && callStatus === 'connected') {
                const targetSanitized = signal.targetPeer.replace(/[^a-zA-Z0-9]/g, '');
                if (!activeCalls[targetSanitized]) {
                    console.log("Sinal recebido para conectar com:", signal.targetPeer);
                    connectToNewPeer(signal.targetPeer, isVideoCall);
                    snapshot.ref.remove();
                }
            }
        });
        return () => signalRef.off();
    }, [callStatus, activeCalls, isVideoCall]);

    const connectToNewPeer = async (peerId, video) => {
        try {
            const stream = localStreamRef.current 
                || localVideoRef.current?.srcObject 
                || await navigator.mediaDevices.getUserMedia({ audio: true, video: video });

            if (!localStreamRef.current) localStreamRef.current = stream;

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

        await connectToNewPeer(newId, isVideoCall);

        Object.keys(activeCalls).forEach(connectedPeerId => {
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
        setIsMicMuted(false);
        setIsCamMuted(false);

        navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo }).then((stream) => {
            localStreamRef.current = stream;
            if (isVideo && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

            const call = incomingCall.callObj;
            call.answer(stream);

            handleCallStream(call, isVideo);

            setActiveCalls(prev => ({ ...prev, [call.peer]: call }));

        }).catch(err => {
            console.error("Erro ao acessar midia:", err);
            alert("Erro ao acessar dispositivos.");
        });
    };

    const startCall = async (video = false) => {
        if (!activeChat) return;

        if (activeChat.type === 'group') {
             startGroupCall(video);
             return;
        }

        setCallStatus('calling');
        setIsVideoCall(video);
        setIsMicMuted(false);
        setIsCamMuted(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            localStreamRef.current = stream;
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

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
        if (groupPermissions) {
            if (video && !groupPermissions.sendVideo) { alert("Vídeo chamadas desativadas neste grupo."); return; }
            if (!video && !groupPermissions.sendAudio) { alert("Chamadas de áudio desativadas neste grupo."); return; }
        }

        const groupRef = db.ref(`groups/${activeChat.id}/members`);
        const snapshot = await groupRef.once('value');
        const members = snapshot.val();
        if (!members) return;

        const memberIds = Object.keys(members).filter(id => id !== user.id);

        if (memberIds.length === 0) {
            alert("Grupo vazio ou só você está nele.");
            return;
        }

        setCallStatus('connected');
        setIsVideoCall(video);
        setIsMicMuted(false);
        setIsCamMuted(false);
        setActiveGroupCall(true);
        setOngoingGroupCall(null);

        db.ref(`groups/${activeChat.id}/callStatus`).set({
            state: 'active',
            startedBy: user.id,
            timestamp: Date.now()
        });

        handleSendMessage(`📞 Iniciou uma chamada de ${video ? 'vídeo' : 'voz'} em grupo.`, 'system');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            localStreamRef.current = stream;
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

            memberIds.forEach(id => {
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

        const video = false;
        setIsVideoCall(video);
        setCallStatus('connected');
        setIsMicMuted(false);
        setIsCamMuted(false);
        setActiveGroupCall(true);
        setOngoingGroupCall(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            localStreamRef.current = stream;
            if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
            addToMix(stream);

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
            addToMix(remoteStream);

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
                 if (Object.keys(newCalls).length === 0) endCall(true);
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
        stopScreenShare();

        if (callStatus === 'connected' && activeChat) {
             const durationStr = formatDuration(callDuration);
             const type = isVideoCall ? 'video' : 'audio';
             if (!remoteEnded) {
                 handleSendMessage(`Chamada de ${type} encerrada • ${durationStr}`, 'system');
             }
        }

        Object.values(activeCalls).forEach(call => call.close());

        if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        setActiveCalls({});
        setRemoteStreams({});
        setCallStatus(null);
        setIncomingCall(null);
        setIsVideoCall(false);
        setActiveGroupCall(false);
        setIsCallMinimized(false);
        setIsMicMuted(false);
        setIsCamMuted(false);
        if (document.pictureInPictureElement) document.exitPictureInPicture();

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const deleteMessage = (msgKey) => {
        if (!activeChat) return;
        if (activeChat.type === 'group') {
             if (!confirm("Excluir esta mensagem para todos?")) return;
             db.ref(`groups/${activeChat.id}/messages/${msgKey}`).remove();
        } else {
             if (!confirm("Excluir mensagem?")) return;
             const chatId = [user.id, activeChat.id].sort().join('_');
             db.ref(`chats/${chatId}/messages/${msgKey}`).remove();
        }
    };

    // Data Loading
    React.useEffect(() => {
        if (activeChat && activeChat.type === 'group') {
             db.ref(`groups/${activeChat.id}/permissions`).on('value', s => setGroupPermissions(s.val()));
        } else {
            setGroupPermissions(null);
        }
    }, [activeChat]);

    React.useEffect(() => {
        const contactsRef = db.ref(`users/${user.id}/contacts`);

        const loadContacts = (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const contactIds = Object.keys(data);
            Promise.all(contactIds.map(async id => {
                const ref = data[id].type === 'group' ? `groups/${id}` : `users/${id}`;
                const s = await db.ref(ref).once('value');
                const val = s.val();

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

    // Load Messages
    React.useEffect(() => {
        if (!activeChat) return;

        let messagesRef;
        if (activeChat.type === 'group') {
            messagesRef = db.ref(`groups/${activeChat.id}/messages`);
        } else {
            const chatId = [user.id, activeChat.id].sort().join('_');
            messagesRef = db.ref(`chats/${chatId}/messages`);
        }

        const markAsRead = (msgId, senderId) => {
             db.ref(`users/${user.id}/settings`).once('value').then(s => {
                 const settings = s.val() || {};
                 let allowReadReceipt = settings.readReceipts !== false;

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

            if (msg.senderId !== user.id) {
                 markAsRead(snapshot.key, msg.senderId);
            }
        });

        messagesRef.limitToLast(50).on('child_changed', (snapshot) => {
             const val = snapshot.val();
             setMessages(prev => prev.map(m => m.key === snapshot.key ? { ...val, key: snapshot.key } : m));
        });

        if (activeChat.type === 'group') {
            const scriptsRef = db.ref(`groups/${activeChat.id}/scripts`);
            scriptsRef.once('value').then(scriptsSnap => {
                const scripts = scriptsSnap.val();
                if (scripts) {
                    messagesRef.limitToLast(1).on('child_added', (snapshot) => {
                        const msg = snapshot.val();
                        if (Date.now() - msg.timestamp < 2000) {
                            const engine = new window.ScriptEngine(activeChat.id, {
                                deleteMessage: (msgId) => db.ref(`groups/${activeChat.id}/messages/${msgId}`).remove(),
                                sendMessage: (text) => handleSendMessage(text, 'text'),
                                kickMember: (uid) => db.ref(`groups/${activeChat.id}/members/${uid}`).remove(),
                                alert: (txt) => alert(`[BOT]: ${txt}`)
                            });

                            const senderId = msg.senderId;
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

        if (activeChat.type === 'group' && groupPermissions && type !== 'system') {
            if (type === 'text' && !groupPermissions.sendText) { alert("Envio de texto bloqueado neste grupo."); return; }
            if (type === 'audio' && !groupPermissions.sendAudio) { alert("Envio de áudio bloqueado neste grupo."); return; }
        }

        if (type === 'audio') {
            window.ChatAppAPI.sendAudio(activeChat.id, content, duration, activeChat.type);
        } else if (type === 'system') {
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
            window.ChatAppAPI.sendMessage(activeChat.id, content, activeChat.type, msgType);
        }
        setMessageInput("");
        setShowAudioRecorder(false);
    };

    const handleCreateGroup = () => {
        const groupName = prompt("Nome do Grupo:");
        if (groupName) {
            const groupId = Math.floor(1000 + Math.random() * 9000).toString();
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
            db.ref(`users/${user.id}/contacts/${groupId}`).set({ type: 'group', joinedAt: Date.now() });
        }
    };

    const handleAddContact = async (inputId) => {
        if (!inputId) return;

        const cleanInput = inputId.trim();

        if (cleanInput.toLowerCase() === 'bot') {
            setShowAddContact(false);
            setShowBotCreator(true);
            return;
        }

        try {
            const groupSnap = await db.ref(`groups/${inputId}`).once('value');
            if (groupSnap.exists()) {
                 const groupData = groupSnap.val();
                 await db.ref(`users/${user.id}/contacts/${inputId}`).set({ type: 'group', joinedAt: Date.now() });
                 await db.ref(`groups/${inputId}/members/${user.id}`).set('member');

                 setActiveChat({ ...groupData, type: 'group' });
                 setShowAddContact(false);
                 alert(`Você entrou no grupo "${groupData.name}"!`);
                 return;
            }

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

            {/* Panel Login Modal */}
            {showPanelLogin && (
                <div className="absolute inset-0 z-[70] bg-black/70 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-80 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Ativar Painel Profissional</h3>
                        <p className="text-sm text-gray-500 mb-2">Digite a senha:</p>
                        <input 
                            type="password"
                            value={panelPassword}
                            onChange={(e) => setPanelPassword(e.target.value)}
                            placeholder="Senha do painel"
                            className="w-full border border-gray-300 rounded p-2 mb-4 outline-none focus:border-[#00a884]"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowPanelLogin(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={() => {
                                if (panelPassword === "admin123") { // Change this password
                                    setProfessionalPanel(true);
                                    setShowPanelLogin(false);
                                    alert("✅ Painel Profissional ativado!");
                                } else {
                                    alert("❌ Senha incorreta!");
                                }
                                setPanelPassword("");
                            }} className="px-4 py-2 bg-[#00a884] text-white rounded hover:bg-[#008f6f]">
                                Ativar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Panel Button (only visible when not active) */}
            {!professionalPanel && (
                <button
                    onClick={() => setShowPanelLogin(true)}
                    className="absolute top-20 right-4 z-[65] bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse"
                >
                    ⚡ Ativar Painel Profissional
                </button>
            )}

            {/* Professional Panel Indicator */}
            {professionalPanel && (
                <div className="absolute top-20 right-4 z-[65] bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg">
                    ⚡ Painel Profissional Ativo
                </div>
            )}

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

            {/* Settings Modal */}
            {showSettings && <Settings user={user} onClose={() => setShowSettings(false)} chats={chats} />}

            {/* Add Contact Modal */}
            {showAddContact && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-80 shadow-xl animate-fade-in flex flex-col max-h-[80vh]">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            {callStatus ? 'Adicionar à Chamada' : 'Adicionar / Entrar'}
                        </h3>

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

            {/* Group Info Modal */}
            {showGroupInfo && activeChat?.type === 'group' && (
                <GroupInfo 
                    activeChat={activeChat} 
                    user={user} 
                    onClose={() => setShowGroupInfo(false)} 
                />
            )}

            {/* Call Modal with Professional Panel */}
            {(incomingCall || callStatus) && (
                <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden
                    ${isCallMinimized 
                        ? 'bottom-4 right-4 w-48 h-64 rounded-xl border-2 border-white' 
                        : 'inset-0 bg-black/95 flex flex-col items-center justify-center'
                    }
                `}>
                    {/* Screen Share Video */}
                    {screenSharing && (
                        <div className="absolute top-4 left-4 w-64 h-36 bg-black border-2 border-green-500 rounded-lg overflow-hidden z-20">
                            <video ref={screenVideoRef} autoPlay className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                Compartilhando Tela
                            </div>
                        </div>
                    )}

                    {/* Background / Video Area */}
                    <div className={`absolute inset-0 ${isCallMinimized ? 'bg-gray-800' : ''}`}>
                         <div className={`w-full h-full relative ${!isVideoCall && 'hidden'}`}>
                             <video 
                                ref={remoteVideoRef} 
                                autoPlay 
                                className={`w-full h-full object-cover ${isCallMinimized ? 'opacity-100' : ''}`} 
                             />

                             {!isCallMinimized && (
                                 <div className="w-32 h-48 absolute top-4 right-4 md:w-1/4 md:h-1/3 bg-gray-900 border border-gray-700 shadow-lg rounded-lg overflow-hidden">
                                    <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                                 </div>
                             )}
                         </div>

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

                    {/* Professional Panel Controls (Only visible in group calls and for admin with panel) */}
                    {professionalPanel && isCurrentUserAdmin && activeGroupCall && !isCallMinimized && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-gradient-to-r from-purple-900 to-blue-900 text-white p-4 rounded-xl shadow-2xl border border-purple-500 w-[600px]">
                            <h3 className="text-lg font-bold mb-3 text-center">🎮 Painel de Controle Profissional</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Volume Controls */}
                                <div className="bg-black/30 p-3 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-sm">🔊 Controle de Áudio</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {Object.keys(activeCalls).map(pid => {
                                            const isAdmin = activeChat?.members?.[pid] === 'admin';
                                            return (
                                                <div key={pid} className="flex items-center gap-2">
                                                    <span className="text-xs truncate w-20">{pid}</span>
                                                    {isAdmin && <span className="text-yellow-400 text-xs">👑</span>}
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={participantVolumes[pid] || 100}
                                                        onChange={(e) => setParticipantVolume(pid, parseInt(e.target.value))}
                                                        className="flex-1"
                                                        disabled={adminOnlyMode && !isAdmin}
                                                    />
                                                    <span className="text-xs w-8">{participantVolumes[pid] || 100}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Admin Controls */}
                                <div className="bg-black/30 p-3 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-sm">⚙️ Controles Admin</h4>
                                    <div className="space-y-2">
                                        <button 
                                            onClick={muteAllParticipants}
                                            className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${mutedAll ? 'bg-red-600' : 'bg-gray-600'}`}
                                        >
                                            <div className="icon-mic-off"></div>
                                            {mutedAll ? 'Ativar Todos' : 'Silenciar Todos'}
                                        </button>
                                        
                                        <button 
                                            onClick={setAdminOnlyVoice}
                                            className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${adminOnlyMode ? 'bg-purple-600' : 'bg-gray-600'}`}
                                        >
                                            <div className="icon-crown"></div>
                                            {adminOnlyMode ? 'Todos Podem Falar' : 'Só Admin Fala'}
                                        </button>

                                        <button 
                                            onClick={startScreenShare}
                                            className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${screenSharing ? 'bg-green-600' : 'bg-gray-600'}`}
                                        >
                                            <div className="icon-monitor"></div>
                                            {screenSharing ? 'Parar Compartilhamento' : 'Compartilhar Tela'}
                                        </button>
                                    </div>
                                </div>

                                {/* Global Audio & HTML */}
                                <div className="col-span-2 bg-black/30 p-3 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-sm">🌐 Mensagens Globais</h4>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowGlobalAudio(!showGlobalAudio)}
                                            className="flex-1 px-3 py-2 bg-blue-600 rounded-lg text-sm flex items-center justify-center gap-2"
                                        >
                                            <div className="icon-mic"></div>
                                            Enviar Áudio Global
                                        </button>
                                        <button 
                                            onClick={() => setShowHtmlInput(!showHtmlInput)}
                                            className="flex-1 px-3 py-2 bg-orange-600 rounded-lg text-sm flex items-center justify-center gap-2"
                                        >
                                            <div className="icon-code"></div>
                                            Injetar HTML
                                        </button>
                                    </div>

                                    {showGlobalAudio && (
                                        <div className="mt-3">
                                            <AudioRecorder 
                                                onSendAudio={(base64, duration) => {
                                                    sendGlobalAudio(base64, duration);
                                                    setShowGlobalAudio(false);
                                                }} 
                                                onCancel={() => setShowGlobalAudio(false)} 
                                            />
                                        </div>
                                    )}

                                    {showHtmlInput && (
                                        <div className="mt-3">
                                            <textarea
                                                value={htmlInput}
                                                onChange={(e) => setHtmlInput(e.target.value)}
                                                placeholder="Digite seu HTML aqui..."
                                                className="w-full h-24 p-2 bg-gray-800 text-white rounded-lg text-sm font-mono"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button 
                                                    onClick={() => {
                                                        injectHTML(htmlInput);
                                                        setShowHtmlInput(false);
                                                        setHtmlInput("");
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-green-600 rounded-lg text-sm"
                                                >
                                                    Injetar
                                                </button>
                                                <button 
                                                    onClick={() => setShowHtmlInput(false)}
                                                    className="flex-1 px-3 py-2 bg-red-600 rounded-lg text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    <div className={`relative z-10 flex ${isCallMinimized ? 'w-full h-full opacity-0 hover:opacity-100 bg-black/60 items-center justify-center gap-2' : 'flex-col items-center mt-auto mb-12'}`}>

                         {/* Header Controls */}
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

                         {/* Restore Button */}
                         {isCallMinimized && (
                             <button onClick={() => setIsCallMinimized(false)} className="absolute top-2 right-2 text-white p-1">
                                 <div className="icon-maximize-2 text-sm"></div>
                             </button>
                         )}

                         {/* Main Action Buttons */}
                         <div className={`flex items-center ${isCallMinimized ? 'gap-2' : 'gap-6'}`}>

                             {/* Mic/Cam Controls */}
                             {!incomingCall && !isCallMinimized && (
                                 <>
                                     <button 
                                        onClick={toggleMic}
                                        className={`p-3 rounded-full shadow-lg transition-colors ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                        title={isMicMuted ? "Ativar Microfone" : "Silenciar"}
                                     >
                                         <div className={isMicMuted ? "icon-mic-off text-xl" : "icon-mic text-xl"}></div>
                                     </button>

                                     {isVideoCall && (
                                         <button 
                                            onClick={toggleCam}
                                            className={`p-3 rounded-full shadow-lg transition-colors ${isCamMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                            title={isCamMuted ? "Ativar Câmera" : "Desativar Câmera"}
                                         >
                                             <div className={isCamMuted ? "icon-video-off text-xl" : "icon-video text-xl"}></div>
                                         </button>
                                     )}

                                    <button 
                                        onClick={() => setShowSoundBoard(!showSoundBoard)}
                                        className={`p-3 rounded-full shadow-lg transition-colors ${showSoundBoard ? 'bg-purple-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                        title="Efeitos Sonoros"
                                    >
                                        <div className="icon-music text-xl"></div>
                                    </button>
                                 </>
                             )}

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

                                     {/* Force End Button for Admins */}
                                     {!isCallMinimized && activeGroupCall && (groupPermissions?.manageCalls || isCurrentUserAdmin) && (
                                        <button onClick={endGroupCallForEveryone} className="p-5 bg-orange-600 rounded-full hover:bg-orange-700 shadow-lg" title="Encerrar para Todos">
                                            <div className="icon-trash-2 text-3xl"></div>
                                        </button>
                                     )}
                                </div>
                             )}
                         </div>

                         {/* Participant List with Admin Indicators */}
                         {!isCallMinimized && Object.keys(activeCalls).length > 1 && (
                            <div className="absolute top-4 left-4 flex flex-col gap-2 max-h-40 overflow-y-auto">
                                {Object.keys(activeCalls).map(pid => {
                                    const isAdmin = activeChat?.members?.[pid] === 'admin';
                                    return (
                                        <div key={pid} className="flex items-center gap-2 bg-black/50 p-2 rounded-lg">
                                            <img 
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${pid}`}
                                                className="w-6 h-6 rounded-full"
                                            />
                                            <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                            <span className="text-white text-xs">{pid}</span>
                                            {isAdmin && (
                                                <span className="text-yellow-400 text-xs ml-1" title="Administrador">👑</span>
                                            )}
                                            {professionalPanel && isCurrentUserAdmin && (
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={participantVolumes[pid] || 100}
                                                    onChange={(e) => setParticipantVolume(pid, parseInt(e.target.value))}
                                                    className="w-16 h-1 ml-2"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                         )}
                    </div>

                    {/* SoundBoard Overlay */}
                    {showSoundBoard && !isCallMinimized && (
                        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/80 p-4 rounded-xl border border-gray-700 w-64 animate-slide-in-right z-30">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white text-sm font-bold">Efeitos Sonoros</span>
                                <button onClick={() => setShowSoundBoard(false)} className="text-gray-400 hover:text-white"><div className="icon-x text-sm"></div></button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                {JSON.parse(localStorage.getItem("user_sounds") || "[]").length > 0 ? (
                                    JSON.parse(localStorage.getItem("user_sounds") || "[]").map(sound => (
                                        <button 
                                            key={sound.id}
                                            onClick={() => {
                                                const audio = new Audio(sound.src);
                                                audio.play();
                                            }}
                                            className="flex flex-col items-center justify-center p-2 bg-white/10 hover:bg-purple-600 rounded-lg transition"
                                            title={sound.name}
                                        >
                                            <div className="icon-volume-2 text-white mb-1"></div>
                                            <span className="text-[10px] text-gray-300 truncate w-full text-center">{sound.name}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-3 text-center text-gray-500 text-xs py-2">
                                        Vá na Loja para adicionar sons.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                            title="Ativar Segundo Plano" 
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

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => openChat(chat)} className={`flex items-center p-3 cursor-pointer hover:bg-[#f5f6f6] ${activeChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''}`}>
                            <img src={chat.avatar} className="w-12 h-12 rounded-full mr-3" />
                            <div className="flex-1 border-b border-gray-100 pb-3 h-full flex flex-col justify-center">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-900 font-medium">{chat.name}</span>
                                    {chat.type === 'group' && chat.members?.[user.id] === 'admin' && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">Admin</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 truncate w-48">
                                    {chat.type === 'group' ? 'Grupo' : 'Privado'}
                                </div>
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
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-800 font-medium">{activeChat.name}</span>
                                    {activeChat.type === 'group' && activeChat.members?.[user.id] === 'admin' && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Admin</span>
                                    )}
                                </div>
                                {activeChat.type === 'group' 
                                    ? <span className="text-xs text-gray-500">Toque para info do grupo</span>
                                    : (activeChat.privacy?.showOnline !== false && activeChat.status === 'online') 
                                        ? <span className="text-xs text-green-500 font-bold">Online</span>
                                        : <span className="text-xs text-gray-500">Offline</span>
                                }
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600" onClick={(e) => e.stopPropagation()}>
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

                                const renderEmbedIfMatch = (text, senderId) => {
                                    const urlMatch = (typeof text === 'string') 
                                        ? text.match(/#url=(https?:\/\/[^\s]+)/i) 
                                        : null;

                                    if (urlMatch) {
                                        const originalUrl = urlMatch[1];
                                        const senderIdParam = senderId || 'unknown';
                                        const separator = originalUrl.includes('?') ? '&' : '?';
                                        const finalUrl = `${originalUrl}${separator}userid=${senderIdParam}`;
                                        const cleanText = text.replace(urlMatch[0], '').trim();

                                        return (
                                            <div className="flex flex-col gap-2 mt-2 w-full">
                                                {cleanText && <p className="leading-relaxed break-words">{cleanText}</p>}
                                                <div className="w-full h-[350px] bg-white rounded-lg border border-gray-200 overflow-hidden relative shadow-sm mx-auto max-w-md">
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
                                    return null;
                                };

                                if (isSystem) {
                                    const embedContent = renderEmbedIfMatch(msg.text, msg.senderId);
                                    return (
                                        <div key={idx} className="flex flex-col items-center my-2 group relative w-full">
                                            <div className="bg-[#e1f3fb] text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-2 max-w-[90%] break-words text-center">
                                                <div className="icon-info shrink-0"></div>
                                                {msg.text}
                                            </div>
                                            {embedContent && <div className="w-full px-4">{embedContent}</div>}

                                            {activeChat.type === 'group' && isCurrentUserAdmin && (
                                                <button 
                                                    onClick={() => deleteMessage(msg.key)}
                                                    className="hidden group-hover:block absolute right-4 top-0 text-red-400 hover:text-red-600"
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
                                            {!isMe && activeChat.type === 'group' && (
                                                <div className="flex items-center gap-1 mb-1">
                                                    <p className="text-xs text-orange-500 font-bold">{msg.senderName}</p>
                                                    {activeChat.members?.[msg.senderId] === 'admin' && (
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">👑</span>
                                                    )}
                                                </div>
                                            )}
                                            {msg.type === 'text' && (() => {
                                                const embed = renderEmbedIfMatch(msg.text, msg.senderId);
                                                if (embed) return embed;
                                                return <p className="text-gray-800 mb-1 leading-relaxed break-words">{msg.text}</p>;
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
                                                        </div>
                                                        <span className="text-xs text-gray-500">{msg.duration}</span>
                                                    </div>
                                                    <audio 
                                                        src={msg.audio} 
                                                        className="hidden" 
                                                        onPlay={(e) => handleAudioPlay(e.target)}
                                                    /> 
                                                </div>
                                            )}

                                            <div className="flex justify-end items-center gap-1 mt-1">
                                                <span className="text-[10px] text-gray-500">{msg.time}</span>
                                                {isMe && (
                                                    msg.status === 'read' 
                                                    ? <div className="icon-check-check text-[14px] text-blue-500" title="Lido"></div>
                                                    : <div className="icon-check text-[14px] text-gray-400" title="Enviado"></div>
                                                )}
                                            </div>

                                            {(isMe || (activeChat.type === 'group' && isCurrentUserAdmin)) && (
                                                <button 
                                                    onClick={() => deleteMessage(msg.key)}
                                                    className={`absolute top-0 -right-8 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                                                    title="Apagar mensagem"
                                                >
                                                    <div className="icon-trash text-sm"></div>
                                                </button>
                                            )}
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

                                            if (file.type.startsWith('image/')) {
                                                const base64 = await window.compressImage(file, 800, 0.7);
                                                window.ChatAppAPI.sendMessage(activeChat.id, `[IMAGEM] ${base64}`, activeChat.type, 'image');
                                            } 
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