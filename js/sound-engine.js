// ==============================================================================
// Campus Mart – Procedural Web Audio API Sound & Haptics Engine
// File: js/sound-engine.js
// Description: Zero-latency, zero-dependency synthesizer for app & web micro-interactions
// ==============================================================================

(function() {
    'use strict';

    let audioCtx = null;
    let isMuted = localStorage.getItem('cm_sound_muted') === 'true';

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Auto-unlock AudioContext on first user interaction
    function unlockAudio() {
        const ctx = getAudioContext();
        if (ctx) {
            ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
                document.removeEventListener(evt, unlockAudio);
            });
        }
    }
    ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
        document.addEventListener(evt, unlockAudio, { passive: true, once: true });
    });

    const soundEngine = {
        isMuted() {
            return isMuted;
        },

        toggleMute() {
            isMuted = !isMuted;
            localStorage.setItem('cm_sound_muted', isMuted ? 'true' : 'false');
            return isMuted;
        },

        vibrate(pattern = 30) {
            try {
                if ('vibrate' in navigator) {
                    navigator.vibrate(pattern);
                }
            } catch (e) {}
        },

        // 1. Pop Sound on Cart Add / Pill Select
        playPop() {
            if (isMuted) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

                gain.gain.setValueAtTime(0.28, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.08);

                this.vibrate(25);
            } catch (e) {}
        },

        // 2. Micro Click / Tick on Quantity Increment or Switch
        playTick() {
            if (isMuted) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.03);

                this.vibrate(15);
            } catch (e) {}
        },

        // 3. Celebratory Chime on Pre-Order Placed & 4-Digit PIN Generated
        playCelebration() {
            if (isMuted) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const now = ctx.currentTime;
                // Harmonic Arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
                const notes = [
                    { freq: 523.25, time: 0.00, dur: 0.28, vol: 0.22 },
                    { freq: 659.25, time: 0.08, dur: 0.28, vol: 0.24 },
                    { freq: 783.99, time: 0.16, dur: 0.32, vol: 0.26 },
                    { freq: 1046.50, time: 0.24, dur: 0.55, vol: 0.30 }
                ];

                notes.forEach(n => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(n.freq, now + n.time);

                    gain.gain.setValueAtTime(n.vol, now + n.time);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(now + n.time);
                    osc.stop(now + n.time + n.dur);
                });

                this.vibrate([40, 60, 50, 40, 80]);
            } catch (e) {}
        },

        playOrderSuccessSound() {
            this.playCelebration();
        },

        playOrderPlaced() {
            this.playCelebration();
        },

        playItemAddedSound() {
            this.playPop();
        },

        // 4. Harmonic Rising Chime on Status Update (Received -> Preparing -> Ready)
        playStatusUpdated() {
            if (isMuted) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const now = ctx.currentTime;
                // Harmonic 3-tone: F5 (698Hz) -> A5 (880Hz) -> C6 (1046Hz)
                const notes = [
                    { freq: 698.46, time: 0.00, dur: 0.20, vol: 0.25 },
                    { freq: 880.00, time: 0.08, dur: 0.22, vol: 0.28 },
                    { freq: 1046.50, time: 0.16, dur: 0.38, vol: 0.30 }
                ];

                notes.forEach(n => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(n.freq, now + n.time);

                    gain.gain.setValueAtTime(n.vol, now + n.time);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(now + n.time);
                    osc.stop(now + n.time + n.dur);
                });

                this.vibrate([30, 40, 60]);
            } catch (e) {}
        },

        // 5. Dual Bell Chime on New Incoming Order at Shopkeeper Counter
        playIncomingOrderBell() {
            if (isMuted) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const now = ctx.currentTime;
                // Dual Counter Bell: 987Hz (B5) -> 1318Hz (High E6)
                const bells = [
                    { freq: 987.77, time: 0.00, dur: 0.32, vol: 0.32 },
                    { freq: 1318.51, time: 0.16, dur: 0.55, vol: 0.36 }
                ];

                bells.forEach(b => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(b.freq, now + b.time);

                    gain.gain.setValueAtTime(b.vol, now + b.time);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + b.time + b.dur);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(now + b.time);
                    osc.stop(now + b.time + b.dur);
                });

                this.vibrate([40, 80, 60]);
            } catch (e) {}
        }
    };

    window.soundEngine = soundEngine;
})();
