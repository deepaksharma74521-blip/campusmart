// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB API Client)
// File: js/api.js
// Description: Centralized REST API client for MongoDB Backend
// ==========================================================================

const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? '' 
    : 'http://localhost:5000';

const api = {
    // 1. Auth & Mobile OTP Methods
    async sendOtp(otpPayload) {
        const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(otpPayload)
        });
        return await res.json();
    },

    async verifyOtp(verifyPayload) {
        const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verifyPayload)
        });
        return await res.json();
    },

    async register(userData) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await res.json();
    },

    async login(email, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.user) {
            localStorage.setItem('canteen_user', JSON.stringify(data.user));
        }
        return data;
    },

    logout() {
        localStorage.removeItem('canteen_user');
        window.location.href = 'login.html';
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('canteen_user') || 'null');
        } catch (e) {
            return null;
        }
    },

    // 2. Menu Methods
    async getMenu() {
        const res = await fetch(`${API_BASE}/api/menu`);
        return await res.json();
    },

    async saveFoodItem(itemData, itemId = null) {
        const url = itemId ? `${API_BASE}/api/menu/${itemId}` : `${API_BASE}/api/menu`;
        const method = itemId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        return await res.json();
    },

    async deleteFoodItem(itemId) {
        const res = await fetch(`${API_BASE}/api/menu/${itemId}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    async toggleStock(itemId, available) {
        const res = await fetch(`${API_BASE}/api/menu/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available, isAvailable: available })
        });
        return await res.json();
    },

    async bulkImportMenu(items, shopId = 'shop-1', shopName = '', replaceExisting = false) {
        const res = await fetch(`${API_BASE}/api/menu/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, shopId, shopName, replaceExisting })
        });
        return await res.json();
    },

    async smartParseMenu(text, shopId = 'shop-1', category = '') {
        const res = await fetch(`${API_BASE}/api/menu/smart-parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, shopId, category })
        });
        return await res.json();
    },

    // 2.5 Shops & Vendors Methods
    async getShops() {
        const res = await fetch(`${API_BASE}/api/shops`);
        return await res.json();
    },

    async getShop(shopId) {
        const res = await fetch(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}`);
        return await res.json();
    },

    async updateShop(shopId, shopData) {
        const res = await fetch(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shopData)
        });
        return await res.json();
    },

    async createShop(shopData) {
        const res = await fetch(`${API_BASE}/api/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shopData)
        });
        return await res.json();
    },

    async seedDishes() {
        const res = await fetch(`${API_BASE}/api/menu/seed`, {
            method: 'POST'
        });
        return await res.json();
    },

    // 2.6 Shop Payment & UPI QR Methods
    async getShopPaymentInfo(shopIdOrName) {
        try {
            const res = await fetch(`${API_BASE}/api/shops/${encodeURIComponent(shopIdOrName || 'default')}/payment-info`);
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async updateShopPaymentInfo(shopIdOrName, paymentData) {
        try {
            const res = await fetch(`${API_BASE}/api/shops/${encodeURIComponent(shopIdOrName || 'default')}/payment-info`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    // 3. Orders Methods
    async placeOrder(orderPayload) {
        const res = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        return await res.json();
    },

    async getOrders(userId = null) {
        const url = userId ? `${API_BASE}/api/orders?userId=${encodeURIComponent(userId)}` : `${API_BASE}/api/orders`;
        const res = await fetch(url);
        return await res.json();
    },

    async cancelOrder(orderId) {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    },

    // 3.2 Instant Split Payment Gateway & Commissions Ledger Methods
    async createSplitPaymentOrder(splitData) {
        try {
            const res = await fetch(`${API_BASE}/api/payment/create-split-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(splitData)
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async getCommissionsLedger() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/commissions-ledger`);
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async getGatewaySettings() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/gateway-settings`);
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async updateGatewaySettings(settingsData) {
        try {
            const res = await fetch(`${API_BASE}/api/admin/gateway-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async settleCashLedger(shopId, note = '') {
        try {
            const res = await fetch(`${API_BASE}/api/admin/settle-cash-ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId, note })
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    // 3.4 Delivery Partner & Runner Fleet Methods
    async getDeliveryOrders(status = 'all') {
        try {
            const res = await fetch(`${API_BASE}/api/delivery/orders?status=${encodeURIComponent(status)}`);
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async completeDelivery(deliveryData) {
        try {
            const res = await fetch(`${API_BASE}/api/delivery/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deliveryData)
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    async getDeliveryStats() {
        try {
            const res = await fetch(`${API_BASE}/api/delivery/stats`);
            return await res.json();
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    // 3.5 Gate Parcel Concierge Methods (Gate No. 2 to Hostel)
    async createParcelRequest(parcelPayload) {
        const res = await fetch(`${API_BASE}/api/parcels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parcelPayload)
        });
        return await res.json();
    },

    async getParcels(userId = null) {
        const url = userId ? `${API_BASE}/api/parcels?userId=${encodeURIComponent(userId)}` : `${API_BASE}/api/parcels`;
        const res = await fetch(url);
        return await res.json();
    },

    async getParcel(parcelId) {
        const res = await fetch(`${API_BASE}/api/parcels/${encodeURIComponent(parcelId)}`);
        return await res.json();
    },

    async updateParcelStatus(parcelId, status, extraData = {}) {
        const res = await fetch(`${API_BASE}/api/parcels/${encodeURIComponent(parcelId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, ...extraData })
        });
        return await res.json();
    },

    async verifyParcelPin(parcelId, pin) {
        const res = await fetch(`${API_BASE}/api/parcels/${encodeURIComponent(parcelId)}/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        return await res.json();
    },

    async updateOrderStatus(orderId, status) {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await res.json();
    },

    async updateOrderPrepTime(orderId, estimatedPrepTime, prepTimeMinutes) {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/prep-time`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimatedPrepTime, prepTimeMinutes })
        });
        return await res.json();
    },

    // 4. Profile & Stats
    async getProfile(userId) {
        const res = await fetch(`${API_BASE}/api/profile/${userId}`);
        return await res.json();
    },

    async updateProfile(userId, data) {
        const res = await fetch(`${API_BASE}/api/profile/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            const current = this.getCurrentUser();
            if (current) {
                const updated = { ...current, ...data };
                localStorage.setItem('canteen_user', JSON.stringify(updated));
            }
        }
        return result;
    },

    async getAdminStats() {
        const res = await fetch(`${API_BASE}/api/admin/stats`);
        return await res.json();
    },

    // 5. Staff Permission Management (Super Admin)
    async getStaffList() {
        const res = await fetch(`${API_BASE}/api/admin/staff`);
        return await res.json();
    },

    async manageStaff(userId, action, assignedShop = null) {
        const currentUser = this.getCurrentUser();
        const payload = { 
            action,
            requesterId: currentUser?._id || currentUser?.uid || null,
            requesterEmail: currentUser?.email || null
        };
        if (assignedShop) payload.assignedShop = assignedShop;
        const res = await fetch(`${API_BASE}/api/admin/staff/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    },

    // 6. Feedback & Rating Methods
    async submitFeedback(feedbackData) {
        const res = await fetch(`${API_BASE}/api/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });
        return await res.json();
    },

    async getFeedbacks(userId = null) {
        const url = userId ? `${API_BASE}/api/feedback?userId=${encodeURIComponent(userId)}` : `${API_BASE}/api/feedback`;
        const res = await fetch(url);
        return await res.json();
    },

    async getFeedbackStats() {
        const res = await fetch(`${API_BASE}/api/feedback/stats`);
        return await res.json();
    },

    async deleteFeedback(feedbackId) {
        const res = await fetch(`${API_BASE}/api/feedback/${feedbackId}`, {
            method: 'DELETE'
        });
        return await res.json();
    }
};

// Toast notification helper for UI feedback
function showToast(message, type = 'info', title = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-body">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 400);
    }, 3800);
}

// Global Cart Badge updater
function updateGlobalCartBadge() {
    try {
        const cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(b => {
            b.textContent = totalItems;
            b.style.display = totalItems > 0 ? 'inline-flex' : 'none';
        });
    } catch (e) {
        console.error('Error updating cart badge:', e);
    }
}

// --------------------------------------------------------------------------
// Real-Time Order Ready Alert Engine (Audio Chime, Vibration & Pop-up Modal)
// --------------------------------------------------------------------------

let globalAudioCtx = null;
let isAudioEngineUnlocked = false;

function unlockAudioEngine() {
    try {
        if (!globalAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                globalAudioCtx = new AudioCtx();
            }
        }
        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume().then(() => {
                isAudioEngineUnlocked = true;
            }).catch(() => {});
        } else if (globalAudioCtx && globalAudioCtx.state === 'running') {
            isAudioEngineUnlocked = true;
        }
    } catch (e) {}
}

// Attach to all user gesture events so the first click anywhere unlocks sound
['click', 'touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudioEngine, { passive: true, capture: true });
});

function playOrderReadyChime() {
    try {
        if (!globalAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) globalAudioCtx = new AudioCtx();
        }

        if (!globalAudioCtx) return false;

        if (globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume().catch(() => {});
        }

        const now = globalAudioCtx.currentTime;
        
        // 4 Loud High-Energy Bell Chimes (E5 -> G#5 -> B5 -> High E6)
        const notes = [
            { freq: 659.25, time: 0.0, dur: 0.5 },
            { freq: 830.61, time: 0.15, dur: 0.5 },
            { freq: 987.77, time: 0.30, dur: 0.6 },
            { freq: 1318.51, time: 0.45, dur: 0.9 }
        ];

        notes.forEach(n => {
            const osc = globalAudioCtx.createOscillator();
            const gain = globalAudioCtx.createGain();

            // Triangle wave for bright, rich bell resonance
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, now + n.time);

            gain.gain.setValueAtTime(0, now + n.time);
            gain.gain.linearRampToValueAtTime(0.65, now + n.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

            osc.connect(gain);
            gain.connect(globalAudioCtx.destination);

            osc.start(now + n.time);
            osc.stop(now + n.time + n.dur + 0.05);
        });

        return true;
    } catch (err) {
        console.warn('Audio chime playback error:', err);
        return false;
    }
}

// ==========================================================================
// Option 2: Campus Mart Pleasant Melodic Chime + Sweet Voice Greeting
// ==========================================================================

function playWelcomeSoundAndVoice(force = false) {
    try {
        if (!force && sessionStorage.getItem('campus_mart_welcome_played')) {
            return;
        }

        if (!globalAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) globalAudioCtx = new AudioCtx();
        }

        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume().catch(() => {});
        }

        // 1. Play Soft Melodic Welcome Chime (Ascending C-Major with Sparkle)
        if (globalAudioCtx) {
            const now = globalAudioCtx.currentTime;
            const notes = [
                { freq: 523.25, time: 0.00, dur: 0.55, type: 'sine', gain: 0.35 },    // C5
                { freq: 659.25, time: 0.10, dur: 0.55, type: 'triangle', gain: 0.30 },// E5
                { freq: 783.99, time: 0.20, dur: 0.65, type: 'sine', gain: 0.35 },    // G5
                { freq: 1046.50, time: 0.32, dur: 0.90, type: 'triangle', gain: 0.40 } // C6 (Sparkle)
            ];

            notes.forEach(n => {
                const osc = globalAudioCtx.createOscillator();
                const gain = globalAudioCtx.createGain();

                osc.type = n.type;
                osc.frequency.setValueAtTime(n.freq, now + n.time);

                gain.gain.setValueAtTime(0, now + n.time);
                gain.gain.linearRampToValueAtTime(n.gain, now + n.time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

                osc.connect(gain);
                gain.connect(globalAudioCtx.destination);

                osc.start(now + n.time);
                osc.stop(now + n.time + n.dur + 0.05);
            });
        }

        // 2. Play Sweet Voice Greeting ("Welcome to Campus Mart!")
        if ('speechSynthesis' in window) {
            setTimeout(() => {
                try {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance("Welcome to Campus Mart!");
                    utterance.rate = 0.95;
                    utterance.pitch = 1.1;
                    utterance.volume = 0.95;

                    const voices = window.speechSynthesis.getVoices();
                    if (voices && voices.length > 0) {
                        const preferredVoice = voices.find(v => 
                            v.lang.startsWith('en') && (
                                v.name.includes('Female') || 
                                v.name.includes('Zira') || 
                                v.name.includes('Samantha') || 
                                v.name.includes('Google') || 
                                v.name.includes('Jenny') || 
                                v.name.includes('Natural')
                            )
                        ) || voices.find(v => v.lang.startsWith('en'));
                        
                        if (preferredVoice) {
                            utterance.voice = preferredVoice;
                        }
                    }

                    window.speechSynthesis.speak(utterance);
                } catch (e) {
                    console.warn('Speech synthesis greeting error:', e);
                }
            }, 300);
        }

        sessionStorage.setItem('campus_mart_welcome_played', 'true');

        if (force) {
            showToast('🎵 Welcome to Campus Mart!', 'info', 'Welcome Greeting');
        }
    } catch (err) {
        console.warn('Welcome sound playback error:', err);
    }
}

// Auto-trigger welcome sound on page load / first user interaction
function initWelcomeAudioTrigger() {
    if (sessionStorage.getItem('campus_mart_welcome_played')) {
        return;
    }

    const triggerWelcome = () => {
        playWelcomeSoundAndVoice(false);
        ['click', 'touchstart', 'keydown'].forEach(evt => {
            document.removeEventListener(evt, triggerWelcome, { capture: true });
        });
    };

    ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, triggerWelcome, { passive: true, capture: true });
    });

    setTimeout(() => {
        if (!sessionStorage.getItem('campus_mart_welcome_played')) {
            playWelcomeSoundAndVoice(false);
        }
    }, 700);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeAudioTrigger);
} else {
    initWelcomeAudioTrigger();
}

function triggerDeviceVibration() {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate([250, 150, 250, 150, 400]);
        } catch (e) {
            console.warn('Vibration API not supported/permitted:', e);
        }
    }
}

function sendSystemNotification(order) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notif = new Notification(`🎉 Order Ready for Pickup! (${order.orderId})`, {
                body: `Your order is packed & ready at the counter. Please collect it!`,
                icon: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=128&auto=format&fit=crop&q=80',
                badge: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=128&auto=format&fit=crop&q=80',
                tag: `order-ready-${order.orderId || order._id}`,
                renotify: true
            });
            notif.onclick = function() {
                window.focus();
                window.location.href = 'orders.html';
            };
        } catch (e) {
            console.warn('Native notification failed:', e);
        }
    }
}

function showOrderReadyModal(order) {
    let backdrop = document.getElementById('global-order-ready-modal');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'global-order-ready-modal';
        backdrop.className = 'order-ready-modal-backdrop';
        document.body.appendChild(backdrop);
    }

    const itemsSummary = (order.items || []).map(i => `<strong>${i.name}</strong> &times; ${i.quantity}`).join(', ') || 'Your ordered items';

    backdrop.innerHTML = `
        <div class="order-ready-modal-card">
            <div class="order-ready-modal-header">
                <div class="order-ready-icon-wrap" onclick="playOrderReadyChime(); triggerDeviceVibration();" style="cursor: pointer;" title="Tap to Ring Chime Again">
                    <i class="fa-solid fa-bell-concierge"></i>
                </div>
                <h3 style="font-size: 1.5rem; margin-bottom: 0.35rem; font-weight: 800;">Your Order is Ready!</h3>
                <p style="font-size: 0.92rem; opacity: 0.92; margin: 0;">Packed & ready for pickup at the counter</p>
                
                <button type="button" onclick="playOrderReadyChime(); triggerDeviceVibration();" style="background: rgba(255,255,255,0.22); color: white; border: 1px solid rgba(255,255,255,0.45); border-radius: 9999px; padding: 4px 12px; font-size: 0.78rem; font-weight: 700; margin-top: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-volume-high"></i> Tap to Ring Bell Sound 🔔
                </button>
            </div>

            <div class="order-ready-modal-body">
                <div class="order-ready-token-box">
                    <div>
                        <div style="font-size: 0.78rem; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pickup Token ID</div>
                        <div style="font-size: 1.45rem; font-weight: 800; color: #15803d; font-family: var(--font-heading);">${order.orderId || 'ORD-#'}</div>
                    </div>
                    <span style="background: #16a34a; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-circle-check"></i> READY
                    </span>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.75rem; font-size: 0.86rem; line-height: 1.6;">
                    <div style="color: #334155; margin-bottom: 0.25rem;">
                        <i class="fa-solid fa-box" style="color: var(--primary); margin-right: 4px;"></i> <strong>Items:</strong> ${itemsSummary}
                    </div>
                    <div style="color: #475569;">
                        <i class="fa-solid fa-clock" style="color: var(--primary); margin-right: 4px;"></i> <strong>Slot:</strong> ${order.pickupSlot || 'Immediate'}
                    </div>
                    ${order.cabinNumber ? `
                        <div style="color: #6b21a8; font-weight: 600; margin-top: 0.2rem;">
                            <i class="fa-solid fa-door-open" style="margin-right: 4px;"></i> <strong>Cabin Delivery:</strong> ${order.cabinNumber}
                        </div>
                    ` : ''}
                </div>

                ${(order.dueAmount && Number(order.dueAmount) > 0) ? `
                    <div style="background: #fffbeb; border: 1.5px solid #fde68a; color: #92400e; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.84rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span><i class="fa-solid fa-hand-holding-dollar" style="color: #b45309; margin-right: 6px;"></i> <strong>Pay at Counter:</strong></span>
                        <strong style="font-size: 1rem; color: #b45309; background: white; padding: 2px 8px; border-radius: 6px; border: 1px solid #fde68a;">₹${order.dueAmount}</strong>
                    </div>
                ` : `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.82rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <i class="fa-solid fa-circle-check" style="color: #16a34a;"></i>
                        <span><strong>100% Fully Paid:</strong> Zero payment due at counter!</span>
                    </div>
                `}

                <!-- Food Freshness Window Alert -->
                <div style="background: linear-gradient(135deg, #fff7ed, #ffedd5); border: 1.5px solid #fdba74; color: #9a3412; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.82rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-fire" style="font-size: 1.25rem; color: #ea580c;"></i>
                    <div style="flex: 1; text-align: left;">
                        <div style="font-weight: 700; color: #9a3412;">♨️ 20-Minute Hot Food Freshness Window</div>
                        <div style="font-size: 0.75rem; color: #c2410c;">Please collect within 20 mins to enjoy your meal piping hot before it cools down!</div>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.82rem; display: flex; align-items: center; gap: 0.6rem;">
                    <i class="fa-solid fa-location-dot" style="font-size: 1.1rem; color: var(--primary);"></i>
                    <span>Please head over to the counter and show this Token ID to collect your items.</span>
                </div>

                <div class="order-ready-actions">
                    <a href="orders.html" class="btn btn-primary btn-block" style="justify-content: center; font-weight: 700;">
                        <i class="fa-solid fa-receipt"></i> View Pickup Token
                    </a>
                    <button class="btn btn-outline btn-block" onclick="dismissOrderReadyModal('${order.orderId || order._id}')" style="justify-content: center;">
                        <i class="fa-solid fa-check"></i> Got It / Dismiss
                    </button>
                </div>
            </div>
        </div>
    `;

    backdrop.classList.add('active');
    
    // Attempt chime play immediately
    playOrderReadyChime();
}

function dismissOrderReadyModal(orderId) {
    const backdrop = document.getElementById('global-order-ready-modal');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
    if (orderId) {
        try {
            const ackList = JSON.parse(localStorage.getItem('campusmart_acked_ready_orders') || '[]');
            if (!ackList.includes(orderId)) {
                ackList.push(orderId);
                localStorage.setItem('campusmart_acked_ready_orders', JSON.stringify(ackList));
            }
        } catch (e) {}
    }
}

let globalOrderMonitorInterval = null;

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
}

function speakOrderReadyAnnouncement(order) {
    try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const customer = order?.customerName || order?.studentName || '';
        const orderCode = order?.orderId ? order.orderId.slice(-4) : 'New';
        const shop = order?.shopName || 'Campus Counter';
        const text = `Attention ${customer}! Your order token number ${orderCode} is now READY at ${shop}! Please collect your fresh food.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.96;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        utterance.lang = 'en-IN';

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
            const indianOrEng = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
            if (indianOrEng) utterance.voice = indianOrEng;
        }

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Speech announcement error:', e);
    }
}

async function checkStudentActiveOrders() {
    // If on admin.html, admin.js handles its own sound alerts
    if (window.location.pathname.includes('admin.html')) return;

    const user = api.getCurrentUser();
    if (!user) return;

    try {
        const userId = user._id || user.uid || user.id;
        const res = await api.getOrders(userId);
        if (!res.success || !res.orders) return;

        let ackList = [];
        try {
            ackList = JSON.parse(localStorage.getItem('campusmart_acked_ready_orders') || '[]');
        } catch (e) {
            ackList = [];
        }

        const readyOrders = res.orders.filter(o => o.status === 'Ready' && !ackList.includes(o.orderId || o._id));

        if (readyOrders.length > 0) {
            const targetOrder = readyOrders[0];
            playOrderReadyChime();
            speakOrderReadyAnnouncement(targetOrder);
            triggerDeviceVibration();
            sendSystemNotification(targetOrder);
            showOrderReadyModal(targetOrder);
        }
    } catch (err) {
        // Silent catch for background polling
    }
}

function startGlobalOrderMonitor() {
    if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('delivery.html')) return;

    const user = api.getCurrentUser();
    if (!user) return;

    document.addEventListener('click', requestNotificationPermission, { once: true });
    
    const runMonitor = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        checkStudentActiveOrders();
    };

    runMonitor();

    if (globalOrderMonitorInterval) clearInterval(globalOrderMonitorInterval);
    globalOrderMonitorInterval = setInterval(runMonitor, 6000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            runMonitor();
        }
    });
}

// Coming Soon Features Modal System
function openSalonComingSoonModal() {
    let modal = document.getElementById('salon-coming-soon-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'salon-coming-soon-modal';
        modal.className = 'coming-soon-modal-backdrop';
        modal.onclick = (e) => { if (e.target === modal) closeComingSoonModal('salon-coming-soon-modal'); };
        modal.innerHTML = `
            <div class="coming-soon-modal-card" onclick="event.stopPropagation()">
                <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 1.5rem; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <div style="background: #ea580c; color: white; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; box-shadow: 0 4px 10px rgba(234,88,12,0.4);">
                                <i class="fa-solid fa-scissors"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; color: white; font-size: 1.15rem; font-weight: 800;">New Look MENS' PERSONAL CARE</h3>
                                <p style="margin: 0; color: #fdba74; font-size: 0.8rem; font-weight: 600;">Campus Salon & Grooming Lounge</p>
                            </div>
                        </div>
                        <button onclick="closeComingSoonModal('salon-coming-soon-modal')" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div style="margin-top: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(234,88,12,0.25); border: 1px solid #ea580c; color: #fed7aa; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                        <i class="fa-solid fa-rocket"></i> Coming Soon in Phase 2
                    </div>
                </div>
                
                <div style="padding: 1.25rem;">
                    <div style="background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 0.78rem; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Direct Salon Helpline:</div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: #ea580c; margin-top: 2px;"><i class="fa-solid fa-phone"></i> +91 9917301392</div>
                        </div>
                        <a href="tel:9917301392" class="btn btn-sm btn-primary" style="padding: 0.45rem 0.95rem; font-size: 0.82rem; font-weight: 700;">
                            <i class="fa-solid fa-phone-volume"></i> Call Salon
                        </a>
                    </div>

                    <h4 style="font-size: 0.92rem; color: #1e293b; margin-bottom: 0.6rem; font-weight: 700;">Upcoming Smart Features:</h4>
                    <ul style="list-style: none; padding: 0; margin: 0 0 1.2rem 0; display: flex; flex-direction: column; gap: 0.55rem; font-size: 0.86rem; color: #475569;">
                        <li style="display: flex; align-items: flex-start; gap: 0.5rem;">
                            <i class="fa-solid fa-circle-check" style="color: #10b981; margin-top: 0.2rem; font-size: 0.95rem;"></i>
                            <span><strong>Zero-Wait Virtual Queue:</strong> Book haircut & beard trim slot from classroom with live token number.</span>
                        </li>
                        <li style="display: flex; align-items: flex-start; gap: 0.5rem;">
                            <i class="fa-solid fa-circle-check" style="color: #10b981; margin-top: 0.2rem; font-size: 0.95rem;"></i>
                            <span><strong>AI Hairstyle Simulator:</strong> Test modern fades, pompadours & beard styles on selfie before haircut.</span>
                        </li>
                        <li style="display: flex; align-items: flex-start; gap: 0.5rem;">
                            <i class="fa-solid fa-circle-check" style="color: #10b981; margin-top: 0.2rem; font-size: 0.95rem;"></i>
                            <span><strong>Student Grooming Pass:</strong> Unlimited monthly haircut & grooming passes starting at ₹199/month.</span>
                        </li>
                    </ul>

                    <div style="display: flex; gap: 0.6rem;">
                        <button onclick="notifyMeUpcoming('New Look Men\\'s Salon'); closeComingSoonModal('salon-coming-soon-modal');" class="btn btn-primary" style="flex: 1; font-weight: 700;">
                            <i class="fa-solid fa-bell"></i> Notify Me When Live
                        </button>
                        <button onclick="closeComingSoonModal('salon-coming-soon-modal')" class="btn btn-outline" style="font-weight: 600;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeComingSoonModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function notifyMeUpcoming(featureName) {
    alert(`🎉 Thank you! You will be notified when "${featureName}" goes live on Campus Mart!`);
}

// Smart Automatic App Download & Install System
let deferredAppInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredAppInstallPrompt = e;
    showAutoApkPrompt();
});

function showAutoApkPrompt(force = false) {
    if (!force && sessionStorage.getItem('campusmart_apk_dismissed')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return; // Already installed as PWA

    let banner = document.getElementById('auto-apk-install-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'auto-apk-install-banner';
        banner.className = 'auto-apk-banner';
        banner.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.65rem; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <img src="/assets/icons/icon-192.png" alt="Campus Mart App Icon" style="width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 4px 10px rgba(234,88,12,0.25); border: 1.5px solid #fed7aa; object-fit: cover;">
                    <div>
                        <div style="font-weight: 800; font-size: 0.95rem; color: #0f172a; line-height: 1.2;">Campus Mart Android App</div>
                        <div style="font-size: 0.75rem; color: #16a34a; font-weight: 700; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                            <i class="fa-solid fa-circle-check"></i> Fast Pre-Orders & Sound Alerts
                        </div>
                    </div>
                </div>
                <button onclick="dismissAutoApkPrompt()" style="background: #f1f5f9; border: none; color: #64748b; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <p style="font-size: 0.82rem; color: #64748b; margin: 0 0 0.85rem 0; line-height: 1.4;">
                Download official Android App (.APK) or install with 1-click for zero-wait campus dining!
            </p>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <a href="/download/apk" download="CampusMart.apk" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; font-weight: 700; padding: 0.55rem 0.75rem; text-decoration: none; font-size: 0.82rem;" onclick="triggerApkDownloadFeedback()">
                    <i class="fa-brands fa-android"></i> Download APK
                </a>
                <button onclick="triggerPwaInstall()" class="btn btn-outline btn-sm" style="border-color: #0284c7; color: #0369a1; background: #f0f9ff; font-weight: 700; padding: 0.55rem 0.75rem; font-size: 0.82rem;">
                    <i class="fa-solid fa-bolt"></i> 1-Click Install
                </button>
            </div>
        `;
        document.body.appendChild(banner);
    }
    setTimeout(() => {
        banner.classList.add('active');
    }, 1800);
}

function dismissAutoApkPrompt() {
    const banner = document.getElementById('auto-apk-install-banner');
    if (banner) {
        banner.classList.remove('active');
    }
    sessionStorage.setItem('campusmart_apk_dismissed', 'true');
}

function triggerPwaInstall() {
    if (deferredAppInstallPrompt) {
        deferredAppInstallPrompt.prompt();
        deferredAppInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
            }
            deferredAppInstallPrompt = null;
            dismissAutoApkPrompt();
        });
    } else {
        // Direct download APK if PWA prompt not supported in browser
        window.location.href = '/download/apk';
    }
}

function triggerApkDownloadFeedback() {
    setTimeout(() => {
        alert('🚀 Campus Mart APK download started! Check your downloads notification bar to install.');
        dismissAutoApkPrompt();
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    // Instant local state render (0ms)
    updateGlobalCartBadge();
    
    // Defer non-critical background jobs so first frame renders in <30ms
    const deferInit = window.requestIdleCallback || ((cb) => setTimeout(cb, 400));
    
    deferInit(() => {
        startGlobalOrderMonitor();
        
        // Register Service Worker for instant offline cache & 20x fast re-open
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Fast Cache Active:', reg.scope))
                .catch(err => console.log('[PWA] SW register note:', err));
        }

        // Auto-trigger smart download banner after 3.5 seconds if on web
        setTimeout(() => {
            showAutoApkPrompt();
        }, 3500);
    });
});


