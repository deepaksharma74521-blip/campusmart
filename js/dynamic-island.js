// ==============================================================================
// Campus Mart – Apple Dynamic Island & Ambient Time-of-Day Engine
// File: js/dynamic-island.js
// Description: VisionOS floating interactive live activity pill & ambient light morphing
// ==============================================================================

(function() {
    'use strict';

    // 1. Time-of-Day Ambient Canvas Engine (120 FPS GPU-Accelerated)
    function applyTimeOfDayTheme() {
        const hour = new Date().getHours();
        document.body.classList.remove('theme-morning', 'theme-afternoon', 'theme-night');
        
        if (hour >= 5 && hour < 11) {
            document.body.classList.add('theme-morning');
        } else if (hour >= 11 && hour < 17) {
            document.body.classList.add('theme-afternoon');
        } else {
            document.body.classList.add('theme-night');
        }
    }

    // 2. Dynamic Island Component State
    let isExpanded = false;
    let islandTimerInterval = null;

    function getActiveOrder() {
        try {
            const raw = localStorage.getItem('cm_active_order');
            if (!raw) return null;
            const order = JSON.parse(raw);
            const now = Date.now();
            // Valid if placed within last 45 minutes
            if (order.createdAt && (now - order.createdAt < 45 * 60 * 1000)) {
                return order;
            }
        } catch (e) {}
        return null;
    }

    function saveActiveOrder(orderData) {
        try {
            const payload = {
                orderId: orderData.orderId || 'ORD-' + Math.floor(100000 + Math.random() * 900000),
                pickupOtp: orderData.pickupOtp || orderData.pin || '4821',
                shopName: orderData.shopName || (orderData.items && orderData.items[0]?.shopName) || 'TMU Food Court',
                itemCount: orderData.items ? orderData.items.length : 1,
                itemName: orderData.items ? orderData.items[0]?.name : 'Snacks & Beverages',
                totalAmount: orderData.totalAmount || 0,
                status: orderData.status || 'Preparing in Kitchen',
                createdAt: Date.now(),
                durationSeconds: 15 * 60 // 15 mins prep standard
            };
            localStorage.setItem('cm_active_order', JSON.stringify(payload));
            renderDynamicIsland();
        } catch (e) {}
    }

    // 3. Inject Island DOM Structure
    function injectIslandHTML() {
        if (document.getElementById('dynamic-island-root')) return;

        const root = document.createElement('div');
        root.id = 'dynamic-island-root';
        root.innerHTML = `
            <div id="dynamic-island-pill" class="dynamic-island-pill hidden" onclick="window.dynamicIsland.toggleExpand(event)">
                <!-- Collapsed State -->
                <div class="island-collapsed-view">
                    <div class="island-left-group">
                        <span class="island-live-dot"></span>
                        <span class="island-emoji" id="island-collapsed-emoji">🥪</span>
                        <span class="island-title" id="island-collapsed-title">Order Live</span>
                    </div>
                    <div class="island-right-group">
                        <span class="island-timer" id="island-collapsed-timer">12:30</span>
                        <span class="island-pin-pill" id="island-collapsed-pin">PIN ----</span>
                    </div>
                </div>

                <!-- Expanded State -->
                <div class="island-expanded-view" id="island-expanded-view">
                    <div class="island-exp-header">
                        <div class="island-exp-shop">
                            <i class="fa-solid fa-utensils" style="color: #ea580c; margin-right: 5px;"></i>
                            <span id="island-exp-shop-name">TMU Food Counter</span>
                        </div>
                        <button type="button" class="island-exp-close" onclick="window.dynamicIsland.collapse(event)">&times;</button>
                    </div>

                    <div class="island-exp-body">
                        <div class="island-pin-showcase">
                            <span class="island-pin-subtitle">PICKUP PIN</span>
                            <span class="island-pin-digits" id="island-exp-pin">----</span>
                            <span class="island-pin-helper">Show at counter for direct handover</span>
                        </div>

                        <div class="island-status-progress">
                            <div class="island-status-row">
                                <span style="color: #94a3b8; font-size: 0.76rem;">STATUS:</span>
                                <strong id="island-exp-status-text" style="color: #4ade80; font-size: 0.82rem;">Preparing Fresh</strong>
                            </div>
                            <div class="island-bar-track">
                                <div class="island-bar-fill" id="island-exp-bar"></div>
                            </div>
                        </div>
                    </div>

                    <div class="island-exp-footer">
                        <a href="orders.html" class="island-exp-btn" onclick="event.stopPropagation()">
                            <i class="fa-solid fa-receipt"></i> View Live Receipt &amp; Token
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(root);
    }

    // 4. Render & Update Island
    function renderDynamicIsland() {
        const pill = document.getElementById('dynamic-island-pill');
        if (!pill) return;

        const activeOrder = getActiveOrder();

        if (activeOrder) {
            pill.classList.remove('hidden');

            // Collapsed values
            const pinStr = activeOrder.pickupOtp || '----';
            const shopStr = activeOrder.shopName || 'Canteen Counter';
            
            document.getElementById('island-collapsed-pin').textContent = `PIN ${pinStr}`;
            document.getElementById('island-collapsed-title').textContent = activeOrder.itemName || shopStr;
            document.getElementById('island-exp-pin').textContent = pinStr;
            document.getElementById('island-exp-shop-name').textContent = shopStr;

            // Timer update
            if (islandTimerInterval) clearInterval(islandTimerInterval);
            
            const updateTimer = () => {
                const elapsedSec = Math.floor((Date.now() - activeOrder.createdAt) / 1000);
                const remainSec = Math.max(0, activeOrder.durationSeconds - elapsedSec);
                const mins = String(Math.floor(remainSec / 60)).padStart(2, '0');
                const secs = String(remainSec % 60).padStart(2, '0');
                
                const timerEl = document.getElementById('island-collapsed-timer');
                if (timerEl) timerEl.textContent = `${mins}:${secs}`;

                const barEl = document.getElementById('island-exp-bar');
                if (barEl) {
                    const percent = Math.min(100, Math.floor((elapsedSec / activeOrder.durationSeconds) * 100));
                    barEl.style.width = `${percent}%`;
                }

                if (remainSec === 0) {
                    const statusEl = document.getElementById('island-exp-status-text');
                    if (statusEl) statusEl.textContent = 'Ready for Pickup!';
                    const collTitle = document.getElementById('island-collapsed-title');
                    if (collTitle) collTitle.textContent = 'Ready at Counter!';
                }
            };

            updateTimer();
            islandTimerInterval = setInterval(updateTimer, 1000);
        } else {
            // Check if cart has items to show mini quick-cart hint
            pill.classList.add('hidden');
            if (islandTimerInterval) clearInterval(islandTimerInterval);
        }
    }

    // Public API
    window.dynamicIsland = {
        init() {
            applyTimeOfDayTheme();
            injectIslandHTML();
            renderDynamicIsland();
        },

        setActiveOrder(orderData) {
            saveActiveOrder(orderData);
        },

        // Trigger flash notification on dynamic island when dish is added to cart
        notifyCartAdded(itemName, price) {
            injectIslandHTML();
            const pill = document.getElementById('dynamic-island-pill');
            if (!pill) return;

            const activeOrder = getActiveOrder();
            if (activeOrder) return; // Don't disrupt live order

            document.getElementById('island-collapsed-emoji').textContent = '🛍️';
            document.getElementById('island-collapsed-title').textContent = `${itemName} Added`;
            document.getElementById('island-collapsed-timer').textContent = `₹${price}`;
            document.getElementById('island-collapsed-pin').textContent = 'VIEW CART ➔';
            document.getElementById('island-collapsed-pin').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'cart.html';
            };

            pill.classList.remove('hidden');
            if (window.soundEngine) window.soundEngine.playPop();

            // Auto-hide cart hint after 4 seconds
            setTimeout(() => {
                if (!getActiveOrder()) {
                    pill.classList.add('hidden');
                }
            }, 4000);
        },

        toggleExpand(event) {
            if (event) event.stopPropagation();
            const pill = document.getElementById('dynamic-island-pill');
            if (!pill) return;
            isExpanded = !isExpanded;
            pill.classList.toggle('expanded', isExpanded);
            if (window.soundEngine) window.soundEngine.playTick();
        },

        collapse(event) {
            if (event) event.stopPropagation();
            const pill = document.getElementById('dynamic-island-pill');
            if (!pill) return;
            isExpanded = false;
            pill.classList.remove('expanded');
            if (window.soundEngine) window.soundEngine.playTick();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.dynamicIsland.init);
    } else {
        window.dynamicIsland.init();
    }
})();
