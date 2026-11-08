// ==============================================================================
// Campus Mart – Hinglish Voice Ordering Assistant
// File: js/voice-assistant.js
// Description: Hands-free Hinglish voice orders (e.g. "Bhai 2 chai aur 1 sandwich laga do")
// ==============================================================================

(function() {
    'use strict';

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    const NUMBER_MAP = {
        'ek': 1, '1': 1, 'one': 1, 'a': 1, 'an': 1,
        'do': 2, '2': 2, 'two': 2,
        'teen': 3, 'tin': 3, '3': 3, 'three': 3,
        'chaar': 4, 'char': 4, '4': 4, 'four': 4,
        'paanch': 5, 'panch': 5, '5': 5, 'five': 5,
        'chhe': 6, 'che': 6, '6': 6, 'six': 6,
        'saat': 7, 'sat': 7, '7': 7, 'seven': 7,
        'aath': 8, 'ath': 8, '8': 8, 'eight': 8,
        'nau': 9, 'no': 9, '9': 9, 'nine': 9,
        'das': 10, '10': 10, 'ten': 10
    };

    const FILLER_PHRASES = [
        'bhaiya', 'bhai', 'bro', 'plz', 'please', 'laga do bhai', 'laga do',
        'de do bhai', 'de do', 'chahiye', 'add kar do', 'add karo', 'daal do',
        'order kar do', 'order karo', 'pack kar do', 'pack karo', 'bhejo',
        'kardo', 'karo', 'jaldi se', 'jaldi'
    ];

    let recognition = null;
    let isListening = false;
    let menuCache = [];

    // Helper: Normalize String
    function cleanText(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Load Menu Items Cache
    async function getFoodCatalog() {
        if (window.allFoodItems && window.allFoodItems.length > 0) {
            return window.allFoodItems;
        }
        if (menuCache.length > 0) {
            return menuCache;
        }
        if (window.api && typeof window.api.getMenu === 'function') {
            try {
                const res = await window.api.getMenu();
                if (res.success && res.items) {
                    menuCache = res.items;
                    return menuCache;
                }
            } catch (e) {}
        }
        return [];
    }

    // Hinglish Intent & Dish Matching Parser
    function parseHinglishOrder(rawTranscript, catalog) {
        let text = cleanText(rawTranscript);

        // Remove filler phrases
        FILLER_PHRASES.forEach(filler => {
            text = text.replace(new RegExp(`\\b${filler}\\b`, 'gi'), ' ');
        });
        text = text.replace(/\s+/g, ' ').trim();

        // Split multiple items by conjunctions ("aur", "and", "or", "saath me")
        const chunks = text.split(/\b(?:aur|and|saath me|or|\+)\b/i);
        const matches = [];

        chunks.forEach(chunk => {
            const trimmed = chunk.trim();
            if (!trimmed) return;

            const words = trimmed.split(' ');
            let quantity = 1;
            const remainingWords = [];

            words.forEach(word => {
                if (NUMBER_MAP[word]) {
                    quantity = NUMBER_MAP[word];
                } else {
                    remainingWords.push(word);
                }
            });

            const query = remainingWords.join(' ').trim();
            if (!query) return;

            // Search catalog for best matching dish
            let bestMatch = null;
            let bestScore = 0;

            catalog.forEach(item => {
                const itemName = (item.name || '').toLowerCase();
                const itemCat = (item.category || '').toLowerCase();
                let score = 0;

                // Exact phrase inclusion
                if (itemName.includes(query)) score += 10;
                if (itemCat.includes(query)) score += 4;

                // Word-by-word token matching
                remainingWords.forEach(w => {
                    if (w.length > 2 && itemName.includes(w)) score += 3;
                });

                // Common Hinglish synonyms
                if (query.includes('chai') && (itemName.includes('chai') || itemName.includes('tea'))) score += 15;
                if (query.includes('coffee') && itemName.includes('coffee')) score += 15;
                if (query.includes('maggi') && (itemName.includes('maggi') || itemName.includes('noodle'))) score += 15;
                if (query.includes('sandwich') && itemName.includes('sandwich')) score += 15;
                if (query.includes('burger') && itemName.includes('burger')) score += 15;
                if (query.includes('samosa') && itemName.includes('samosa')) score += 15;
                if (query.includes('patty') && itemName.includes('patty')) score += 15;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = item;
                }
            });

            if (bestMatch && bestScore >= 5) {
                matches.push({
                    item: bestMatch,
                    quantity: quantity
                });
            }
        });

        return matches;
    }

    // Speak Confirmation Back in Hinglish
    function speakReply(text) {
        if (!('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'hi-IN';
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    }

    // Modal UI Creation
    function createVoiceModal() {
        let modal = document.getElementById('voice-order-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'voice-order-modal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 440px; text-align: center; padding: 1.75rem 1.5rem; position: relative;">
                    <button type="button" onclick="window.voiceOrder.stopListening()" style="position: absolute; top: 14px; right: 16px; background: none; border: none; font-size: 1.3rem; color: #94a3b8; cursor: pointer;">&times;</button>
                    
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 0.5rem; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.25);">
                        <i class="fa-solid fa-microphone-lines"></i>
                    </div>

                    <h3 id="voice-modal-title" style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">Hinglish Voice Order</h3>
                    <p id="voice-modal-subtitle" style="font-size: 0.82rem; color: #64748b; margin-bottom: 0.85rem;">Listening... Bolo: <em>"Bhai 2 chai aur 1 sandwich laga do"</em></p>

                    <!-- Animated Soundwaves -->
                    <div id="voice-soundwave-wrap" class="voice-soundwave-wrap">
                        <div class="voice-wave-bar active"></div>
                        <div class="voice-wave-bar active"></div>
                        <div class="voice-wave-bar active"></div>
                        <div class="voice-wave-bar active"></div>
                        <div class="voice-wave-bar active"></div>
                    </div>

                    <!-- Live Transcript Bubble -->
                    <div id="voice-transcript-bubble" class="voice-transcript-bubble">
                        <span style="color: #94a3b8;">Listening to your voice...</span>
                    </div>

                    <!-- Recognized Matches Box -->
                    <div id="voice-matches-box" class="voice-matches-box" style="display: none;"></div>

                    <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.25rem;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="window.voiceOrder.stopListening()">
                            <i class="fa-solid fa-circle-stop"></i> Cancel
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Floating Button Creation
    function injectFloatingMicButton() {
        if (document.getElementById('voice-floating-mic-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'voice-floating-mic-btn';
        btn.className = 'voice-floating-btn';
        btn.type = 'button';
        btn.title = 'Order with Hinglish Voice (Mic)';
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        btn.onclick = () => window.voiceOrder.toggleListening();
        document.body.appendChild(btn);
    }

    // Main Voice Assistant Engine
    const voiceOrder = {
        init() {
            injectFloatingMicButton();
        },

        async startListening() {
            if (!SpeechRec) {
                if (typeof showToast === 'function') {
                    showToast('Voice Recognition is not supported on this browser. Please use Chrome.', 'warning', 'Mic Unavailable');
                }
                return;
            }

            const modal = createVoiceModal();
            modal.classList.add('active');

            const subtitle = document.getElementById('voice-modal-subtitle');
            const bubble = document.getElementById('voice-transcript-bubble');
            const matchesBox = document.getElementById('voice-matches-box');
            const micBtn = document.getElementById('voice-floating-mic-btn');

            if (subtitle) subtitle.innerHTML = 'Listening... Bolo: <em>"Bhai 2 chai aur 1 sandwich laga do"</em>';
            if (bubble) bubble.innerHTML = '<span style="color: #ea580c; font-weight: 600;"><i class="fa-solid fa-microphone-lines fa-fade"></i> Listening to you...</span>';
            if (matchesBox) {
                matchesBox.style.display = 'none';
                matchesBox.innerHTML = '';
            }
            if (micBtn) micBtn.classList.add('listening');

            const catalog = await getFoodCatalog();

            try {
                if (recognition) {
                    try { recognition.abort(); } catch(e) {}
                }
                recognition = new SpeechRec();
                recognition.lang = 'hi-IN';
                recognition.continuous = false;
                recognition.interimResults = true;

                recognition.onstart = () => {
                    isListening = true;
                };

                recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (bubble) {
                        bubble.innerHTML = `&ldquo;${transcript}&rdquo;`;
                    }
                };

                recognition.onerror = (event) => {
                    console.warn('Speech error:', event.error);
                    if (event.error === 'not-allowed') {
                        if (typeof showToast === 'function') {
                            showToast('Microphone access denied. Please allow microphone in browser settings.', 'error', 'Permission Required');
                        }
                    }
                    this.stopListening();
                };

                recognition.onend = async () => {
                    isListening = false;
                    if (micBtn) micBtn.classList.remove('listening');

                    const rawText = bubble ? bubble.textContent.replace(/[“”"]/g, '').trim() : '';
                    if (!rawText || rawText.includes('Listening to')) {
                        this.stopListening();
                        return;
                    }

                    // Process speech transcript
                    const parsedMatches = parseHinglishOrder(rawText, catalog);
                    if (parsedMatches.length > 0) {
                        this.handleSuccessfulMatches(parsedMatches);
                    } else {
                        if (bubble) {
                            bubble.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Could not find items for: &ldquo;${rawText}&rdquo;</span>`;
                        }
                        if (typeof showToast === 'function') {
                            showToast(`Could not match items for: "${rawText}". Try saying "2 Chai" or "1 Sandwich".`, 'warning');
                        }
                        setTimeout(() => this.stopListening(), 2800);
                    }
                };

                recognition.start();
            } catch (err) {
                console.error('Recognition error:', err);
                this.stopListening();
            }
        },

        handleSuccessfulMatches(matches) {
            const matchesBox = document.getElementById('voice-matches-box');
            const subtitle = document.getElementById('voice-modal-subtitle');
            
            if (subtitle) {
                subtitle.innerHTML = '🎉 Items Recognized &amp; Added to Cart!';
            }

            if (matchesBox) {
                matchesBox.style.display = 'flex';
                matchesBox.innerHTML = matches.map(m => `
                    <div class="voice-match-item">
                        <span><i class="fa-solid fa-circle-check"></i> ${m.quantity} &times; ${m.item.name}</span>
                        <span>₹${Number(m.item.price) * m.quantity}</span>
                    </div>
                `).join('');
            }

            // Add matched items to cart or squad
            matches.forEach(m => {
                for (let i = 0; i < m.quantity; i++) {
                    if (typeof window.addToCart === 'function') {
                        window.addToCart(m.item._id || m.item.id);
                    } else {
                        this.addDirectlyToCartStorage(m.item);
                    }
                }
            });

            // Sensory Feedback: Web Audio celebration & Dynamic Island
            if (window.soundEngine) {
                window.soundEngine.playCelebration();
            }
            if (window.dynamicIsland) {
                const summaryNames = matches.map(m => `${m.quantity} ${m.item.name}`).join(', ');
                window.dynamicIsland.notifyCartAdded(summaryNames, matches.reduce((sum, m) => sum + (Number(m.item.price) * m.quantity), 0));
            }

            // Hinglish Spoken Confirmation
            const spokenSummary = matches.map(m => `${m.quantity} ${m.item.name}`).join(' aur ');
            speakReply(`Done bhai! ${spokenSummary} cart me add kar diya!`);

            if (typeof showToast === 'function') {
                showToast(`Added ${spokenSummary} to cart via voice!`, 'success', 'Voice Order Added');
            }

            setTimeout(() => {
                this.stopListening();
            }, 2500);
        },

        addDirectlyToCartStorage(item) {
            let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
            const itemId = item._id || item.id;
            const existingIndex = cart.findIndex(i => (i.id === itemId || i._id === itemId));

            if (existingIndex > -1) {
                cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
            } else {
                cart.push({
                    id: itemId,
                    _id: itemId,
                    name: item.name,
                    price: Number(item.price),
                    category: item.category || 'General',
                    shopId: item.shopId || 'shop-1',
                    shopName: item.shopName || 'TMU Canteen',
                    image: item.image || item.imageUrl || '',
                    quantity: 1
                });
            }
            localStorage.setItem('canteen_cart', JSON.stringify(cart));
            if (typeof updateGlobalCartBadge === 'function') {
                updateGlobalCartBadge();
            }
        },

        stopListening() {
            if (recognition) {
                try { recognition.abort(); } catch(e) {}
            }
            isListening = false;
            const modal = document.getElementById('voice-order-modal');
            if (modal) modal.classList.remove('active');
            const micBtn = document.getElementById('voice-floating-mic-btn');
            if (micBtn) micBtn.classList.remove('listening');
        },

        toggleListening() {
            if (isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        }
    };

    window.voiceOrder = voiceOrder;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => voiceOrder.init());
    } else {
        voiceOrder.init();
    }
})();
