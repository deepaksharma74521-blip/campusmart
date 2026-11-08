// ==============================================================================
// Campus Mart – Hinglish AI & Voice Assistant Engine
// File: js/voice-assistant.js
// Description: Web Speech recognition & Hinglish vocal search for TMU campus canteen & mart
// ==============================================================================

(function() {
    'use strict';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const voiceAssistant = {
        recognition: null,
        isListening: false,
        activeInput: null,

        init() {
            this.injectStyles();
            this.setupRecognition();
            this.mountVoiceButtons();
        },

        injectStyles() {
            if (document.getElementById('cm-voice-styles')) return;
            const style = document.createElement('style');
            style.id = 'cm-voice-styles';
            style.textContent = `
                .voice-search-btn {
                    background: transparent;
                    border: none;
                    color: var(--primary, #ea580c);
                    font-size: 1.1rem;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .voice-search-btn:hover {
                    background: rgba(234, 88, 12, 0.1);
                    transform: scale(1.1);
                }
                .voice-search-btn.listening {
                    color: #ef4444;
                    animation: micPulse 1.2s infinite ease-in-out;
                    background: #fee2e2;
                }
                @keyframes micPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }
            `;
            document.head.appendChild(style);
        },

        setupRecognition() {
            if (!SpeechRecognition) {
                console.info('[VoiceAssistant] Web Speech API not supported on this platform.');
                return;
            }

            try {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'hi-IN'; // Optimized for Hindi / Hinglish accent

                this.recognition.onstart = () => {
                    this.isListening = true;
                    this.updateButtonsState(true);
                    if (window.soundEngine) window.soundEngine.playPop();
                    if (window.dynamicIsland) {
                        window.dynamicIsland.flashIsland('Listening... Bol kar bataiye 🎙️', '#ef4444');
                    }
                    if (typeof showToast === 'function') {
                        showToast('🎙️ Bol kar bataiye (e.g. "Chai", "Chole Bhature", "Maggi")...', 'info', 'Listening...');
                    }
                };

                this.recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    this.handleSpeechResult(transcript);
                };

                this.recognition.onerror = (event) => {
                    console.warn('[VoiceAssistant] Speech error:', event.error);
                    this.stopListening();
                    if (event.error === 'not-allowed') {
                        if (typeof showToast === 'function') {
                            showToast('Microphone permission required for voice search.', 'warning');
                        }
                    }
                };

                this.recognition.onend = () => {
                    this.stopListening();
                };
            } catch (e) {
                console.warn('[VoiceAssistant] Init failed:', e);
            }
        },

        mountVoiceButtons() {
            // Find search containers
            const searchInputs = [
                document.getElementById('menu-search'),
                document.getElementById('shop-search-input')
            ].filter(Boolean);

            searchInputs.forEach(input => {
                if (input.parentElement.querySelector('.voice-search-btn')) return;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'voice-search-btn';
                btn.title = 'Bol kar search karein (Hinglish Voice Search)';
                btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.activeInput = input;
                    this.toggleListening();
                });

                // Position inside or beside the search box wrap
                input.parentElement.style.position = 'relative';
                input.parentElement.appendChild(btn);
            });
        },

        toggleListening() {
            if (!this.recognition) {
                if (typeof showToast === 'function') {
                    showToast('Voice Search is not supported on this browser version.', 'warning');
                }
                return;
            }

            if (this.isListening) {
                this.recognition.stop();
                this.stopListening();
            } else {
                try {
                    this.recognition.start();
                } catch (e) {
                    this.recognition.stop();
                }
            }
        },

        stopListening() {
            this.isListening = false;
            this.updateButtonsState(false);
        },

        updateButtonsState(listening) {
            document.querySelectorAll('.voice-search-btn').forEach(btn => {
                if (listening) {
                    btn.classList.add('listening');
                    btn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
                } else {
                    btn.classList.remove('listening');
                    btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                }
            });
        },

        handleSpeechResult(rawText) {
            if (!rawText) return;
            const cleanText = rawText.trim();
            console.log('[VoiceAssistant] Spoken text:', cleanText);

            if (this.activeInput) {
                // Remove filler words (chahiye, la do, bhaiya)
                let cleanedQuery = cleanText
                    .replace(/mujhe|chahiye|la do|ek|do|bhaiya|kripya|order karo|search|dikhao/gi, '')
                    .trim();

                if (!cleanedQuery) cleanedQuery = cleanText;

                this.activeInput.value = cleanedQuery;
                this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.activeInput.focus();

                if (window.soundEngine) window.soundEngine.playCelebration();
                if (window.dynamicIsland) {
                    window.dynamicIsland.flashIsland(`Found: "${cleanedQuery}" 🔍`, '#10b981');
                }

                if (typeof showToast === 'function') {
                    showToast(`🔍 Searching for "${cleanedQuery}"`, 'success', 'Voice Understood');
                }

                this.speakFeedback(`Dhundh rahe hain ${cleanedQuery}`);
            }
        },

        speakFeedback(text) {
            if (!window.speechSynthesis) return;
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.rate = 1.05;
                utter.pitch = 1.0;
                utter.lang = 'hi-IN';
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }
    };

    window.voiceAssistant = voiceAssistant;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => voiceAssistant.init());
    } else {
        voiceAssistant.init();
    }
})();
