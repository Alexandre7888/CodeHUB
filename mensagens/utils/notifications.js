class NotificationManager {
    constructor() {
        this.permission = null;
        this.audio = new Audio('https://resource.trickle.so/upload/users/1384073373539827712/audios/1738676900000-notification.mp3'); // Generic pleasant sound
        this.checkPermission();
    }

    async checkPermission() {
        if (!("Notification" in window)) {
            console.warn("Este navegador não suporta notificações.");
            return;
        }
        
        if (Notification.permission === "granted") {
            this.permission = "granted";
        } else if (Notification.permission !== "denied") {
            this.permission = await Notification.requestPermission();
        }
    }

    playIncomingMessageSound() {
        // Simple beep or use a hosted resource if available. 
        // Using a data URI for a soft 'pop' sound to ensure it works without external deps issues
        // Short beep
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }

    playRingtone() {
        // Use an oscillator pattern for calling
        if (this.ringtoneInterval) return;
        
        const playNote = () => {
             const ctx = new (window.AudioContext || window.webkitAudioContext)();
             const osc = ctx.createOscillator();
             const gain = ctx.createGain();
             osc.connect(gain);
             gain.connect(ctx.destination);
             osc.frequency.setValueAtTime(600, ctx.currentTime);
             osc.frequency.setValueAtTime(800, ctx.currentTime + 0.4);
             gain.gain.value = 0.1;
             osc.start();
             osc.stop(ctx.currentTime + 0.8);
        }
        
        playNote();
        this.ringtoneInterval = setInterval(playNote, 2000);
    }

    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
    }

    show(title, body, icon = null, tag = null) {
        if (this.permission === "granted") {
            // Play sound
            this.playIncomingMessageSound();

            // Show system notification
            try {
                const notif = new Notification(title, {
                    body: body,
                    icon: icon || 'https://resource.trickle.so/coding_trickle/trickle_avatar.png',
                    tag: tag, // Tag lets us replace existing notifications (e.g. "5 new messages")
                    silent: true // We play our own sound
                });
                
                notif.onclick = function() {
                    window.focus();
                    notif.close();
                };
            } catch (e) {
                console.error("Erro ao exibir notificação:", e);
            }
        }
    }
}

window.NotificationSystem = new NotificationManager();