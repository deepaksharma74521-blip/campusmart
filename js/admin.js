// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/admin.js
// Description: Admin Dashboard, Food & Mart Products CRUD, Live Order Management & Seeder
// ==========================================================================

let adminFoodItems = [];
let adminOrders = [];
let adminFeedbacks = [];
let adminShops = [];
let adminParcels = [];
let scannedItemsCache = [];
let currentOrderFilter = 'all';
let currentUserTypeFilter = 'all';
let currentFoodFilter = 'all';
let currentFeedbackFilter = 'all';
let currentParcelFilter = 'all';
let currentAdminTab = 'orders';
let adminPollInterval = null;

// Multi-Shop / Multi-Counter Scope
let activeShopScope = 'All';
let adminMenuShopFilter = 'All';
let currentUserProfile = null;

// --- Real-Time Order Notification & Alert State ---
let adminSoundEnabled = localStorage.getItem('adminSoundEnabled') !== 'false'; // default true
let knownAdminOrderIds = new Set();
let isInitialOrdersLoaded = false;
let activeOrderAlertQueue = [];
let currentAlertModalOrder = null;

function toggleAdminOrderSound() {
    adminSoundEnabled = !adminSoundEnabled;
    localStorage.setItem('adminSoundEnabled', adminSoundEnabled ? 'true' : 'false');
    updateAdminSoundUI();
    if (adminSoundEnabled) {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        playCanteenOrderBellSound();
        showToast('🔔 Order Sound & Voice alerts are now ON!', 'success');
    } else {
        showToast('🔕 Order alerts are now MUTED.', 'info');
    }
}

function updateAdminSoundUI() {
    const btn = document.getElementById('admin-sound-toggle-btn');
    const text = document.getElementById('admin-sound-status-text');
    if (!btn || !text) return;

    if (adminSoundEnabled) {
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#a7f3d0';
        text.innerHTML = 'Alerts: ON 🔊';
    } else {
        btn.style.background = 'rgba(239, 68, 68, 0.2)';
        btn.style.borderColor = '#ef4444';
        btn.style.color = '#fca5a5';
        text.innerHTML = 'Alerts: MUTED 🔕';
    }
}

let adminAudioCtx = null;

function getAdminAudioContext() {
    try {
        if (!adminAudioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                adminAudioCtx = new AudioContextClass();
            }
        }
        if (adminAudioCtx && adminAudioCtx.state === 'suspended') {
            adminAudioCtx.resume().catch(() => {});
        }
        return adminAudioCtx;
    } catch (e) {
        return null;
    }
}

// Global unlock on first user gesture anywhere
['click', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
        getAdminAudioContext();
    }, { passive: true, capture: true });
});

// Multi-tone Canteen Chime Bell (Web Audio API)
function playCanteenOrderBellSound() {
    if (!adminSoundEnabled) return;
    try {
        const ctx = getAdminAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [
            { freq: 587.33, start: 0, dur: 0.35, vol: 0.8 },      // D5 (Ding!)
            { freq: 880.00, start: 0.12, dur: 0.45, vol: 0.9 },   // A5 (Dong!)
            { freq: 1174.66, start: 0.28, dur: 0.55, vol: 1.0 },  // D6 (Chime!)
            { freq: 880.00, start: 0.6, dur: 0.35, vol: 0.75 },   // A5
            { freq: 1174.66, start: 0.75, dur: 0.5, vol: 0.9 },   // D6
            { freq: 1760.00, start: 0.92, dur: 0.75, vol: 1.0 }   // A6 (High ring)
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            gain.gain.setValueAtTime(0, now + n.start);
            gain.gain.linearRampToValueAtTime(n.vol * 0.4, now + n.start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });
    } catch (e) {
        console.warn('Audio alert error:', e);
    }
}

// Sweet Speech Voice Announcement
function speakOrderAnnouncement(order) {
    if (!adminSoundEnabled) return;
    try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const customer = order.customerName || order.studentName || 'Student';
        const token = order.tokenNumber || (order.orderId ? order.orderId.slice(-4) : 'New');
        const total = order.totalAmount || order.finalAmount || 0;

        const text = `Attention! New order received from ${customer}. Token number ${token}. Total ${total} Rupees.`;
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

// Mobile Vibration Pattern
function vibrateDeviceForNewOrder() {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate([300, 150, 300, 150, 400]);
        }
    } catch (e) {}
}

// Browser Push Notification
function showDesktopPushNotification(order) {
    try {
        if ('Notification' in window && Notification.permission === 'granted') {
            const customer = order.customerName || order.studentName || 'Customer';
            const token = order.tokenNumber || (order.orderId ? order.orderId.slice(-4) : 'New');
            const total = order.totalAmount || order.finalAmount || 0;
            const itemsSummary = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');

            new Notification(`🔔 New Order Token #${token} (₹${total})`, {
                body: `Customer: ${customer}\nItems: ${itemsSummary}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
                tag: 'order-' + (order.orderId || order._id || Date.now()),
                requireInteraction: true
            });
        }
    } catch (e) {}
}

// Display Interactive New Order Popup Modal
function displayNewOrderModal(order) {
    const modal = document.getElementById('new-order-alert-modal');
    const body = document.getElementById('new-order-alert-body');
    const footer = document.getElementById('new-order-alert-footer');
    const shopHeader = document.getElementById('order-alert-shop-header');
    if (!modal || !body || !footer) return;

    currentAlertModalOrder = order;

    const token = order.tokenNumber || (order.orderId ? order.orderId.slice(-4) : 'N/A');
    const customer = order.customerName || order.studentName || 'Student';
    const phone = order.customerPhone || order.studentPhone || order.phone || 'N/A';
    const userType = order.customerType || 'Student';
    const total = order.totalAmount || order.finalAmount || 0;
    const payment = order.paymentMethod || 'Pay at Counter / UPI';
    const orderId = order.orderId || order._id || order.id;

    if (shopHeader) {
        shopHeader.textContent = activeShopScope !== 'All' ? `New Order for ${activeShopScope}!` : 'New Order Received!';
    }

    const itemsHtml = (order.items || []).map(item => `
        <div class="order-alert-item-row">
            <div style="font-weight: 600; color: var(--secondary);">
                <span style="display: inline-block; background: #ea580c; color: white; border-radius: 6px; padding: 1px 7px; font-size: 0.78rem; font-weight: 800; margin-right: 0.35rem;">${item.quantity}x</span>
                ${item.name}
            </div>
            <div style="font-weight: 700; color: #15803d;">
                ₹${(item.price || 0) * (item.quantity || 1)}
            </div>
        </div>
    `).join('');

    body.innerHTML = `
        <div class="order-alert-token-box">
            <div class="order-alert-token-title">Token / Order Number</div>
            <div class="order-alert-token-val">#${token}</div>
            <div style="font-size: 0.8rem; font-weight: 600; color: #7c2d12;">
                Order ID: <code>${orderId}</code>
            </div>
        </div>

        <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 1rem; margin-bottom: 0.85rem;">
            <div class="order-alert-info-row">
                <span style="color: var(--text-muted);"><i class="fa-solid fa-user"></i> Customer:</span>
                <strong>${customer} <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${userType}</span></strong>
            </div>
            <div class="order-alert-info-row">
                <span style="color: var(--text-muted);"><i class="fa-solid fa-phone"></i> Mobile:</span>
                <strong><a href="tel:${phone}" style="color: var(--primary); text-decoration: none;">${phone}</a></strong>
            </div>
            <div class="order-alert-info-row">
                <span style="color: var(--text-muted);"><i class="fa-solid fa-credit-card"></i> Payment:</span>
                <strong style="color: #0284c7;">${payment}</strong>
            </div>
            <div class="order-alert-info-row" style="border-bottom: none;">
                <span style="color: var(--text-muted);"><i class="fa-solid fa-location-crosshairs" style="color: #16a34a;"></i> Live Spot:</span>
                <div style="text-align: right;">
                    <strong style="color: #0f172a; font-size: 0.85rem;">${order.campusBlock || order.deliveryLocation || order.cabinNumber || 'Campus Point'} ${order.roomOrCabin && !order.deliveryLocation?.includes(order.roomOrCabin) ? `(${order.roomOrCabin})` : ''}</strong>
                    ${(order.googleMapsUrl || (order.lat && order.lng)) ? `
                        <div style="margin-top: 2px;">
                            <a href="${order.googleMapsUrl || `https://www.google.com/maps?q=${order.lat},${order.lng}`}" target="_blank" style="font-size: 0.72rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
                                <i class="fa-solid fa-map-location-dot"></i> Live Map Pin 📍
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div style="font-size: 0.85rem; font-weight: 700; color: #475569; margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-utensils"></i> Ordered Items:</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${(order.items || []).length} Item(s)</span>
        </div>

        <div class="order-alert-items-list">
            ${itemsHtml || '<p style="color: var(--text-muted); font-size: 0.82rem;">No items listed.</p>'}
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.6rem; margin-top: 0.4rem; border-top: 2px solid #e2e8f0;">
                <span style="font-weight: 800; color: var(--secondary); font-size: 1rem;">Total Amount:</span>
                <span style="font-weight: 900; color: #ea580c; font-size: 1.25rem;">₹${total}</span>
            </div>
        </div>
    `;

    footer.innerHTML = `
        <button type="button" onclick="closeNewOrderAlertModal()" class="btn btn-outline btn-sm" style="border-color: #cbd5e1; color: #64748b;">
            <i class="fa-solid fa-xmark"></i> Dismiss
        </button>
        <button type="button" onclick="viewOrderDetailsFromAlert('${orderId}')" class="btn btn-secondary btn-sm" style="background: #334155; color: white;">
            <i class="fa-solid fa-eye"></i> Full Details
        </button>
        <button type="button" onclick="acceptOrderFromAlert('${orderId}')" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #ea580c, #c2410c); border: none; font-weight: 700; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);">
            <i class="fa-solid fa-fire-burner"></i> Accept & Cook 👨‍🍳
        </button>
    `;

    modal.classList.add('active');
}

function closeNewOrderAlertModal() {
    const modal = document.getElementById('new-order-alert-modal');
    if (modal) modal.classList.remove('active');
    currentAlertModalOrder = null;

    // Check if there are other pending orders in queue
    if (activeOrderAlertQueue.length > 0) {
        const nextOrder = activeOrderAlertQueue.shift();
        setTimeout(() => {
            displayNewOrderModal(nextOrder);
        }, 300);
    }
}

async function acceptOrderFromAlert(orderId) {
    closeNewOrderAlertModal();
    await updateOrderStatus(orderId, 'Preparing');
    showToast(`Order #${orderId} accepted! In Preparation 👨‍🍳`, 'success');
}

function viewOrderDetailsFromAlert(orderId) {
    closeNewOrderAlertModal();
    viewOrderDetailsModal(orderId);
}

// Master Handler for New Incoming Orders
function handleNewIncomingOrdersAlert(newOrders) {
    if (!newOrders || newOrders.length === 0) return;

    // 1. Play Sound Chime
    playCanteenOrderBellSound();

    // 2. Speak voice announcement for the latest order
    const latestOrder = newOrders[newOrders.length - 1];
    speakOrderAnnouncement(latestOrder);

    // 3. Vibrate device
    vibrateDeviceForNewOrder();

    // 4. Desktop/Mobile push notification
    showDesktopPushNotification(latestOrder);

    // 5. Toast alert
    const customer = latestOrder.customerName || latestOrder.studentName || 'Customer';
    const total = latestOrder.totalAmount || latestOrder.finalAmount || 0;
    showToast(`🔔 NEW ORDER: ${customer} (₹${total})`, 'warning');

    // 6. Push to modal queue and display
    newOrders.forEach(ord => {
        if (!activeOrderAlertQueue.some(q => (q.orderId === ord.orderId || q._id === ord._id))) {
            activeOrderAlertQueue.push(ord);
        }
    });

    if (!currentAlertModalOrder && activeOrderAlertQueue.length > 0) {
        const firstOrder = activeOrderAlertQueue.shift();
        displayNewOrderModal(firstOrder);
    }
}

// 1-Click Test Alert for Shop Owner
function testNewOrderAlertPopup() {
    const sampleOrder = {
        orderId: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        tokenNumber: String(Math.floor(10 + Math.random() * 90)),
        customerName: 'Deepak Sharma',
        customerPhone: '+91 63953 22813',
        customerType: 'Student',
        paymentMethod: 'UPI / Online Paid',
        items: [
            { name: 'Special Burger 🍔', quantity: 2, price: 60 },
            { name: 'Thick Cold Coffee 🥤', quantity: 1, price: 80 }
        ],
        totalAmount: 200,
        status: 'Pending'
    };

    handleNewIncomingOrdersAlert([sampleOrder]);
}

function getShopIconAndLabel(shopName) {
    switch (shopName) {
        case 'Canteen Food': return { icon: 'fa-burger', label: '🍔 Canteen Food & Hot Meals Counter' };
        case 'Stationery': return { icon: 'fa-book-open', label: '📚 Stationery & Study Supplies Shop' };
        case 'Chocolates & Candies': return { icon: 'fa-cookie-bite', label: '🍫 Chocolates & Sweets Counter' };
        case 'Snacks & Chips': return { icon: 'fa-cookie', label: '🍿 Packaged Snacks & Chips Counter' };
        case 'Drinks & Juices': return { icon: 'fa-glass-water', label: '🥤 Cold Drinks & Juices Counter' };
        case 'Hostel Essentials': return { icon: 'fa-pump-soap', label: '🧴 Daily & Hostel Essentials Shop' };
        default: return { icon: 'fa-store', label: '🏪 All Shops & Counters (Master View)' };
    }
}

function getShopEmoji(cat) {
    switch (cat) {
        case 'Canteen Food': return '🍔';
        case 'Snacks & Chips': return '🍿';
        case 'Chocolates & Candies': return '🍫';
        case 'Drinks & Juices': return '🥤';
        case 'Stationery': return '📚';
        case 'Hostel Essentials': return '🧴';
        default: return '🏪';
    }
}

function itemBelongsToShop(item, shopScope) {
    if (shopScope === 'All' || !shopScope) return true;
    if (item.category === shopScope || item.shopId === shopScope || item.shopName === shopScope) return true;
    const catalogItem = adminFoodItems.find(f => f.name && f.name.toLowerCase() === (item.name || '').toLowerCase());
    if (catalogItem && (catalogItem.category === shopScope || catalogItem.shopId === shopScope)) return true;
    return false;
}

function orderContainsShopItems(order, shopScope) {
    if (shopScope === 'All' || !shopScope) return true;
    return (order.items || []).some(item => itemBelongsToShop(item, shopScope));
}

function feedbackBelongsToShop(fb, shopScope) {
    if (shopScope === 'All' || !shopScope) return true;
    if (fb.shopCategory && fb.shopCategory === shopScope) return true;

    if (fb.orderId && fb.orderId !== 'General') {
        const order = adminOrders.find(o => (o.orderId === fb.orderId || o._id === fb.orderId || o.id === fb.orderId));
        if (order) {
            return orderContainsShopItems(order, shopScope);
        }
    }

    const text = ((fb.comment || '') + ' ' + ((fb.tags || []).join(' '))).toLowerCase();
    if (shopScope === 'Stationery' && (text.includes('pen') || text.includes('register') || text.includes('file') || text.includes('stationery') || text.includes('notebook'))) return true;
    if (shopScope === 'Canteen Food' && (text.includes('samosa') || text.includes('dosa') || text.includes('sandwich') || text.includes('paratha') || text.includes('thali') || text.includes('tasty') || text.includes('delicious') || text.includes('food') || text.includes('meal'))) return true;
    if (shopScope === 'Drinks & Juices' && (text.includes('coffee') || text.includes('juice') || text.includes('redbull') || text.includes('coke') || text.includes('drink'))) return true;
    if (shopScope === 'Chocolates & Candies' && (text.includes('chocolate') || text.includes('silk') || text.includes('kitkat') || text.includes('snickers'))) return true;
    if (shopScope === 'Snacks & Chips' && (text.includes('chips') || text.includes('lays') || text.includes('kurkure') || text.includes('maggi'))) return true;
    if (shopScope === 'Hostel Essentials' && (text.includes('sanitizer') || text.includes('soap') || text.includes('shampoo') || text.includes('paste') || text.includes('essential'))) return true;

    return false;
}

// Admin Verification & Initializer
async function initAdminPage() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=admin.html';
        return;
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
        alert('Access Restricted: This dashboard is reserved for Canteen Administrators only.');
        window.location.href = 'menu.html';
        return;
    }

    currentUserProfile = user;
    const isSuperAdmin = (user.role === 'superadmin' || user.email === 'deepaksharma74521@gmail.com' || user.email === 'admin@canteen.edu');

    // Super Admin Exclusivity: Staff Approvals Tab Visibility
    const staffTabBtn = document.getElementById('tab-btn-staff');
    if (staffTabBtn) {
        staffTabBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    }

    const assignedShop = user.assignedShop || 'All';
    const shopSelect = document.getElementById('admin-active-shop-select');
    const badge = document.getElementById('admin-counter-badge');

    if (!isSuperAdmin && assignedShop !== 'All') {
        activeShopScope = assignedShop;
        if (shopSelect) {
            shopSelect.value = assignedShop;
            shopSelect.disabled = true;
        }
        if (badge) {
            badge.textContent = `🏪 ${assignedShop} Staff`;
        }
    } else if (isSuperAdmin) {
        activeShopScope = 'All';
        if (badge) {
            badge.textContent = `👑 Super Admin (All Shops)`;
        }
    } else {
        activeShopScope = 'All';
    }

    updateShopScopeUI();
    updateAdminSoundUI();
    document.getElementById('admin-user-name').textContent = user.name || 'Admin';

    loadAdminDashboardData();

    // Auto poll admin dashboard every 3.5 seconds
    if (adminPollInterval) clearInterval(adminPollInterval);
    adminPollInterval = setInterval(loadAdminDashboardData, 3500);
}

function handleShopScopeChange(shopVal) {
    activeShopScope = shopVal || 'All';
    adminMenuShopFilter = shopVal || 'All';
    const menuShopFilter = document.getElementById('admin-menu-shop-filter');
    if (menuShopFilter) menuShopFilter.value = adminMenuShopFilter;
    updateShopScopeUI();
    renderAdminOrdersTable();
    renderAdminFoodTable();
    updateDashboardStats();
    loadFeedbackData();
    if (currentAdminTab === 'shop') {
        populateShopProfileForm();
    }
}

function updateShopScopeUI() {
    const meta = getShopIconAndLabel(activeShopScope);
    const titleEl = document.getElementById('shop-scope-title');
    const iconEl = document.getElementById('shop-scope-icon');
    if (titleEl) titleEl.textContent = meta.label;
    if (iconEl) iconEl.className = `fa-solid ${meta.icon}`;
}

// Fetch Shops, Orders, Stats & Menu Dishes from MongoDB
async function loadAdminDashboardData() {
    try {
        // 1. Fetch Shops
        await loadAdminShops();

        // 2. Fetch Orders & Detect New Incoming Orders
        const ordersRes = await api.getOrders();
        if (ordersRes.success && ordersRes.orders) {
            const incomingOrders = ordersRes.orders;

            if (!isInitialOrdersLoaded) {
                // First load: seed all existing order IDs into known set
                incomingOrders.forEach(o => {
                    const id = String(o._id || o.id || o.orderId);
                    knownAdminOrderIds.add(id);
                });
                isInitialOrdersLoaded = true;
            } else {
                // Subsequent polls: check for genuinely brand new orders
                const brandNewOrders = incomingOrders.filter(o => {
                    const id = String(o._id || o.id || o.orderId);
                    return !knownAdminOrderIds.has(id);
                });

                if (brandNewOrders.length > 0) {
                    // Mark as known
                    brandNewOrders.forEach(o => {
                        const id = String(o._id || o.id || o.orderId);
                        knownAdminOrderIds.add(id);
                    });

                    // Check if they belong to current shop owner scope
                    const matchingNewOrders = brandNewOrders.filter(o => {
                        return orderContainsShopItems(o, activeShopScope) && (o.status === 'Pending' || o.status === 'Placed' || !o.status);
                    });

                    if (matchingNewOrders.length > 0) {
                        handleNewIncomingOrdersAlert(matchingNewOrders);
                    }
                }
            }

            adminOrders = incomingOrders;
            renderAdminOrdersTable();
        }

        // 3. Fetch Menu Items (Guard: Do NOT wipe table if user is currently typing)
        const menuRes = await api.getMenu();
        if (menuRes.success && menuRes.items) {
            adminFoodItems = menuRes.items;
            const activeEl = document.activeElement;
            const isUserEditing = activeEl && (
                activeEl.id?.startsWith('quick-price') || 
                activeEl.id === 'admin-food-search' || 
                (document.getElementById('admin-food-table-body') && document.getElementById('admin-food-table-body').contains(activeEl))
            );
            if (!isUserEditing) {
                renderAdminFoodTable();
            }
        }

        // 4. Update Metrics & Statistics
        updateDashboardStats();

        // 5. Fetch Feedbacks & Ratings
        loadFeedbackData();

        // 6. Fetch Gate Parcels
        await loadAdminParcels();

        // 7. Fetch Delivery Fleet Dashboard
        await loadAdminDeliveryDashboard();
    } catch (err) {
        console.error('Error fetching admin data:', err);
    }
}

function countItemsForShop(sid, sname) {
    if (!adminFoodItems || adminFoodItems.length === 0) return 0;
    return adminFoodItems.filter(item => {
        return item.shopId === sid || (sname && item.shopName && item.shopName.toLowerCase() === sname.toLowerCase());
    }).length;
}

async function loadAdminShops() {
    try {
        const res = await api.getShops();
        if (res.success && res.shops) {
            adminShops = res.shops;

            // 1. Populate top switcher if present
            const shopSelect = document.getElementById('admin-active-shop-select');
            if (shopSelect && (!shopSelect.disabled || activeShopScope === 'All')) {
                const currentVal = shopSelect.value || activeShopScope;
                shopSelect.innerHTML = `
                    <option value="All" ${currentVal === 'All' ? 'selected' : ''}>🏪 All Shops & Counters (Master View)</option>
                    ${adminShops.map(s => {
                        const sid = s.shopId || s._id;
                        const count = countItemsForShop(sid, s.name);
                        return `<option value="${sid}" ${currentVal === sid ? 'selected' : ''}>${getShopEmoji(s.category)} ${s.name} ${count > 0 ? `(${count} items)` : ''} ${!s.isOpen ? '(CLOSED)' : ''}</option>`;
                    }).join('')}
                `;
            }

            // 2. Populate food form shop select
            const foodShopSelect = document.getElementById('food-form-shop');
            if (foodShopSelect) {
                const currentFVal = foodShopSelect.value;
                foodShopSelect.innerHTML = adminShops.map(s => {
                    const sid = s.shopId || s._id;
                    return `<option value="${sid}">${getShopEmoji(s.category)} ${s.name} (${s.category})</option>`;
                }).join('');
                if (currentFVal) foodShopSelect.value = currentFVal;
            }

            // 3. Populate scanner target shop select
            const scannerShopSelect = document.getElementById('scanner-target-shop');
            if (scannerShopSelect) {
                const currentSVal = scannerShopSelect.value;
                scannerShopSelect.innerHTML = adminShops.map(s => {
                    const sid = s.shopId || s._id;
                    return `<option value="${sid}">${getShopEmoji(s.category)} ${s.name}</option>`;
                }).join('');
                if (currentSVal) scannerShopSelect.value = currentSVal;
            }

            // 4. Populate Shop Profile Tab Select
            const profileShopSelect = document.getElementById('shop-profile-select');
            if (profileShopSelect) {
                const currentEditId = document.getElementById('shop-form-id')?.value || (adminShops[0]?.shopId || adminShops[0]?._id);
                profileShopSelect.innerHTML = adminShops.map(s => {
                    const sid = s.shopId || s._id;
                    const count = countItemsForShop(sid, s.name);
                    return `<option value="${sid}" ${currentEditId === sid ? 'selected' : ''}>${getShopEmoji(s.category)} ${s.name} (${count} items) ${!s.isOpen ? '🔴 CLOSED' : '🟢 OPEN'}</option>`;
                }).join('');
            }

            // 5. Populate Menu Tab Dedicated Shop Filter Dropdown
            const menuShopFilter = document.getElementById('admin-menu-shop-filter');
            if (menuShopFilter) {
                const currentMVal = menuShopFilter.value || adminMenuShopFilter || 'All';
                menuShopFilter.innerHTML = `
                    <option value="All" ${currentMVal === 'All' ? 'selected' : ''}>🏪 All Shops & Counters (All 23 Outlets - ${adminFoodItems.length || 1963} Dishes)</option>
                    ${adminShops.map(s => {
                        const sid = s.shopId || s._id;
                        const count = countItemsForShop(sid, s.name);
                        return `<option value="${sid}" ${currentMVal === sid ? 'selected' : ''}>${getShopEmoji(s.category)} ${s.name} (${count} dishes)</option>`;
                    }).join('')}
                `;
            }

            // 6. If currently on shop profile tab and user is NOT typing, fill form
            if (currentAdminTab === 'shop') {
                const shopForm = document.getElementById('shop-profile-form');
                const isUserInteracting = shopForm && document.activeElement && shopForm.contains(document.activeElement);
                const isCreatingNew = document.getElementById('shop-form-id')?.value === 'new';
                if (!isUserInteracting && !isCreatingNew) {
                    populateShopProfileForm();
                }
            }
        }
    } catch (err) {
        console.error('Error loading admin shops:', err);
    }
}

function startAddNewShop() {
    const idInput = document.getElementById('shop-form-id');
    const nameInput = document.getElementById('shop-form-name');
    const ownerInput = document.getElementById('shop-form-owner');
    const phoneInput = document.getElementById('shop-form-phone');
    const locInput = document.getElementById('shop-form-location');
    const timingInput = document.getElementById('shop-form-timing');
    const catInput = document.getElementById('shop-form-category');
    const imgInput = document.getElementById('shop-form-image');
    const descInput = document.getElementById('shop-form-desc');
    const openCheckbox = document.getElementById('shop-form-isopen');
    const heading = document.getElementById('shop-form-heading');
    const saveBtnText = document.getElementById('save-shop-btn-text');

    if (idInput) idInput.value = 'new';
    if (nameInput) { nameInput.value = ''; nameInput.placeholder = 'e.g. Campus Juice & Waffle Hub'; nameInput.focus(); }
    if (ownerInput) { ownerInput.value = ''; ownerInput.placeholder = 'e.g. Mr. Rahul Verma'; }
    if (phoneInput) { phoneInput.value = ''; ownerInput.placeholder = '+91 98765 43210'; }
    if (locInput) { locInput.value = ''; locInput.placeholder = 'e.g. Canteen Block 2, Counter 5'; }
    if (timingInput) { timingInput.value = '8:00 AM - 8:30 PM'; }
    if (catInput) { catInput.value = 'Canteen Food'; }
    if (imgInput) { imgInput.value = ''; }
    if (descInput) { descInput.value = ''; }
    if (openCheckbox) openCheckbox.checked = true;

    if (heading) {
        heading.innerHTML = '✨ <span style="color: var(--primary);">Register Brand New Campus Shop / Counter</span>';
    }
    if (saveBtnText) {
        saveBtnText.textContent = 'Create & Register New Shop';
    }
    updateShopStatusBadge(true);
    showToast('Ready to register a new shop! Fill in the name and details below.', 'info');
}

function onShopProfileSelectChange(selectedShopId) {
    const targetShop = adminShops.find(s => (s.shopId === selectedShopId || s._id === selectedShopId));
    if (targetShop) {
        populateShopProfileForm(targetShop);
    }
}

function populateShopProfileForm(specificShop = null) {
    if (!adminShops || adminShops.length === 0) return;

    let targetShop = specificShop;
    if (!targetShop) {
        const currentEditId = document.getElementById('shop-form-id')?.value;
        if (currentEditId && currentEditId !== 'new') {
            targetShop = adminShops.find(s => (s.shopId === currentEditId || s._id === currentEditId));
        }
        if (!targetShop && activeShopScope !== 'All') {
            targetShop = adminShops.find(s => s.category === activeShopScope || s.shortName === activeShopScope || s.shopId === activeShopScope);
        }
        if (!targetShop) {
            targetShop = adminShops[0];
        }
    }
    if (!targetShop) return;

    const sid = targetShop.shopId || targetShop._id;
    const idInput = document.getElementById('shop-form-id');
    const nameInput = document.getElementById('shop-form-name');
    const ownerInput = document.getElementById('shop-form-owner');
    const phoneInput = document.getElementById('shop-form-phone');
    const locInput = document.getElementById('shop-form-location');
    const timingInput = document.getElementById('shop-form-timing');
    const catInput = document.getElementById('shop-form-category');
    const imgInput = document.getElementById('shop-form-image');
    const descInput = document.getElementById('shop-form-desc');
    const openCheckbox = document.getElementById('shop-form-isopen');
    const heading = document.getElementById('shop-form-heading');
    const saveBtnText = document.getElementById('save-shop-btn-text');
    const profileSelect = document.getElementById('shop-profile-select');

    if (idInput) idInput.value = sid;
    if (nameInput) nameInput.value = targetShop.name || '';
    if (ownerInput) ownerInput.value = targetShop.ownerName || '';
    if (phoneInput) phoneInput.value = targetShop.phone || '';
    if (locInput) locInput.value = targetShop.location || '';
    if (timingInput) timingInput.value = targetShop.timing || '';
    if (catInput) catInput.value = targetShop.category || 'Canteen Food';
    if (imgInput) imgInput.value = targetShop.image || '';
    if (descInput) descInput.value = targetShop.description || '';

    // Populate UPI QR Settings
    const upiInput = document.getElementById('shop-form-upi-id');
    const payeeInput = document.getElementById('shop-form-payee-name');
    const qrNoteInput = document.getElementById('shop-form-qr-note');
    const qrImgHidden = document.getElementById('shop-form-qr-image');
    const previewImg = document.getElementById('shop-qr-preview-img');
    const placeholder = document.getElementById('shop-qr-placeholder');
    const removeBtn = document.getElementById('shop-qr-remove-btn');
    const vpaDisplay = document.getElementById('shop-qr-preview-vpa');

    const defaultUpi = targetShop.upiId || `${(targetShop.shortName || targetShop.name || 'canteen').toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`;
    if (upiInput) upiInput.value = targetShop.upiId || defaultUpi;
    if (payeeInput) payeeInput.value = targetShop.payeeName || targetShop.ownerName || targetShop.name || '';
    if (qrNoteInput) qrNoteInput.value = targetShop.qrNote || 'Scan using any UPI App (GPay/PhonePe/Paytm).';
    if (qrImgHidden) qrImgHidden.value = targetShop.qrCodeImage || '';
    
    if (vpaDisplay) vpaDisplay.textContent = targetShop.upiId || defaultUpi;

    if (targetShop.qrCodeImage) {
        if (previewImg) {
            previewImg.src = targetShop.qrCodeImage;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
    } else {
        const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${defaultUpi}&pn=${encodeURIComponent(targetShop.name || 'Campus Mart')}&cu=INR`)}`;
        if (previewImg) {
            previewImg.src = autoQrUrl;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
    }

    const isOpen = targetShop.isOpen !== false;
    if (openCheckbox) openCheckbox.checked = isOpen;
    updateShopStatusBadge(isOpen);

    if (heading) {
        heading.innerHTML = `🏪 Edit Shop Profile: <strong style="color: var(--primary);">${targetShop.name}</strong>`;
    }
    if (saveBtnText) {
        saveBtnText.textContent = 'Update & Save Shop Profile';
    }
    if (profileSelect && profileSelect.value !== sid) {
        profileSelect.value = sid;
    }
}

function onShopUpiChanged() {
    const upiVal = document.getElementById('shop-form-upi-id')?.value.trim() || 'campusmart@upi';
    const vpaDisplay = document.getElementById('shop-qr-preview-vpa');
    if (vpaDisplay) vpaDisplay.textContent = upiVal;
    
    const qrImgHidden = document.getElementById('shop-form-qr-image');
    if (!qrImgHidden || !qrImgHidden.value) {
        const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiVal}&cu=INR`)}`;
        const previewImg = document.getElementById('shop-qr-preview-img');
        const placeholder = document.getElementById('shop-qr-placeholder');
        if (previewImg) {
            previewImg.src = autoQrUrl;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
    }
}

function handleShopQrFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, JPEG).', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        const qrImgHidden = document.getElementById('shop-form-qr-image');
        const previewImg = document.getElementById('shop-qr-preview-img');
        const placeholder = document.getElementById('shop-qr-placeholder');
        const removeBtn = document.getElementById('shop-qr-remove-btn');

        if (qrImgHidden) qrImgHidden.value = base64Data;
        if (previewImg) {
            previewImg.src = base64Data;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';

        showToast('✅ QR Code Image loaded! Click "Update & Save Shop Profile" to save.', 'success');
    };
    reader.readAsDataURL(file);
}

function generateAutoUpiQr() {
    const upiVal = document.getElementById('shop-form-upi-id')?.value.trim();
    const payeeName = document.getElementById('shop-form-payee-name')?.value.trim() || 'Campus Counter';
    if (!upiVal) {
        showToast('Please enter your UPI ID first.', 'warning');
        document.getElementById('shop-form-upi-id')?.focus();
        return;
    }
    const upiUrl = `upi://pay?pa=${upiVal}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
    const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;
    
    const qrImgHidden = document.getElementById('shop-form-qr-image');
    const previewImg = document.getElementById('shop-qr-preview-img');
    const placeholder = document.getElementById('shop-qr-placeholder');
    const removeBtn = document.getElementById('shop-qr-remove-btn');

    if (qrImgHidden) qrImgHidden.value = autoQrUrl;
    if (previewImg) {
        previewImg.src = autoQrUrl;
        previewImg.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-block';

    showToast('✨ Auto-generated official UPI QR from your VPA!', 'success');
}

function removeShopQrImage() {
    const qrImgHidden = document.getElementById('shop-form-qr-image');
    const previewImg = document.getElementById('shop-qr-preview-img');
    const placeholder = document.getElementById('shop-qr-placeholder');
    const removeBtn = document.getElementById('shop-qr-remove-btn');
    const fileInput = document.getElementById('shop-qr-file-input');

    if (qrImgHidden) qrImgHidden.value = '';
    if (fileInput) fileInput.value = '';
    if (removeBtn) removeBtn.style.display = 'none';

    // Reset to fallback preview
    const upiVal = document.getElementById('shop-form-upi-id')?.value.trim() || 'campusmart@upi';
    const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiVal}&cu=INR`)}`;
    if (previewImg) previewImg.src = autoQrUrl;

    showToast('Custom QR removed. Default smart QR will be used.', 'info');
}

function updateShopStatusBadge(isOpen) {
    const badge = document.getElementById('shop-open-status-badge');
    const label = document.getElementById('shop-form-status-label');
    if (badge) {
        badge.textContent = isOpen ? '🟢 OPEN FOR PRE-ORDERS' : '🔴 CLOSED CURRENTLY';
        badge.style.background = isOpen ? '#dcfce7' : '#fee2e2';
        badge.style.color = isOpen ? '#166534' : '#991b1b';
        badge.style.borderColor = isOpen ? '#86efac' : '#fca5a5';
    }
    if (label) {
        label.textContent = isOpen ? 'Open for Orders' : 'Closed (Orders Paused)';
        label.style.color = isOpen ? '#166534' : '#991b1b';
    }
}

function updateShopBannerPreview(url) {
    // Live feedback
}

async function handleSaveShopProfile(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-shop-btn');
    const shopId = document.getElementById('shop-form-id').value;
    const name = document.getElementById('shop-form-name').value.trim();
    const ownerName = document.getElementById('shop-form-owner').value.trim();
    const phone = document.getElementById('shop-form-phone').value.trim();
    const location = document.getElementById('shop-form-location').value.trim();
    const timing = document.getElementById('shop-form-timing').value.trim();
    const category = document.getElementById('shop-form-category').value;
    const image = document.getElementById('shop-form-image').value.trim();
    const description = document.getElementById('shop-form-desc').value.trim();
    const isOpen = document.getElementById('shop-form-isopen').checked;

    // Payment fields
    const upiId = document.getElementById('shop-form-upi-id')?.value.trim() || '';
    const payeeName = document.getElementById('shop-form-payee-name')?.value.trim() || ownerName || name;
    const qrCodeImage = document.getElementById('shop-form-qr-image')?.value.trim() || '';
    const qrNote = document.getElementById('shop-form-qr-note')?.value.trim() || '';

    if (!name || !ownerName) {
        showToast('Please provide Shop Name and Owner Name.', 'warning');
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Shop Profile...';
    }

    try {
        const payload = {
            name,
            ownerName,
            phone,
            location,
            timing,
            category,
            image: image || undefined,
            description,
            isOpen,
            upiId,
            payeeName,
            qrCodeImage,
            qrNote
        };

        if (shopId === 'new' || !shopId) {
            // Create brand new shop
            const res = await api.createShop(payload);
            if (res.success) {
                showToast(`🎉 Brand new shop "${name}" registered successfully!`, 'success');
                await loadAdminShops();
                const newShopId = res.shop?.shopId || res.shop?._id;
                if (newShopId) {
                    const newTarget = adminShops.find(s => (s.shopId === newShopId || s._id === newShopId));
                    if (newTarget) populateShopProfileForm(newTarget);
                }
                updateShopScopeUI();
            } else {
                showToast(res.message || 'Failed to create new shop.', 'error');
            }
        } else {
            // Update existing shop
            const res = await api.updateShop(shopId, payload);
            if (res.success) {
                showToast(`🎉 Shop profile & Payment QR for "${name}" updated successfully!`, 'success');
                await loadAdminShops();
                updateShopScopeUI();
            } else {
                showToast(res.message || 'Failed to update shop profile.', 'error');
            }
        }
    } catch (err) {
        console.error('Error saving shop:', err);
        showToast('Error saving shop profile: ' + err.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            const isNew = document.getElementById('shop-form-id')?.value === 'new';
            saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span id="save-shop-btn-text">${isNew ? 'Create & Register New Shop' : 'Update & Save Shop Profile'}</span>`;
        }
    }
}

function updateDashboardStats() {
    if (activeShopScope === 'All') {
        const total = adminOrders.length;
        const pending = adminOrders.filter(o => o.status === 'Pending').length;
        const activePrep = adminOrders.filter(o => ['Preparing', 'Ready'].includes(o.status)).length;
        const completed = adminOrders.filter(o => o.status === 'Completed').length;
        const revenue = adminOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        const catalogCount = adminFoodItems.length;

        document.getElementById('stat-total-orders').textContent = total;
        document.getElementById('stat-pending-orders').textContent = pending;
        document.getElementById('stat-active-prep').textContent = activePrep;
        document.getElementById('stat-completed-orders').textContent = completed;
        document.getElementById('stat-total-revenue').textContent = `₹${revenue}`;
        document.getElementById('stat-total-items').textContent = catalogCount;
    } else {
        // Filter metrics for the active shop counter
        const shopOrders = adminOrders.filter(o => orderContainsShopItems(o, activeShopScope));
        const total = shopOrders.length;
        const pending = shopOrders.filter(o => o.status === 'Pending').length;
        const activePrep = shopOrders.filter(o => ['Preparing', 'Ready'].includes(o.status)).length;
        const completed = shopOrders.filter(o => o.status === 'Completed').length;

        let shopRevenue = 0;
        shopOrders.filter(o => o.status === 'Completed').forEach(o => {
            (o.items || []).forEach(it => {
                if (itemBelongsToShop(it, activeShopScope)) {
                    shopRevenue += (Number(it.price) * Number(it.quantity || 1));
                }
            });
        });

        const shopItemsCount = adminFoodItems.filter(f => f.category === activeShopScope).length;

        document.getElementById('stat-total-orders').textContent = total;
        document.getElementById('stat-pending-orders').textContent = pending;
        document.getElementById('stat-active-prep').textContent = activePrep;
        document.getElementById('stat-completed-orders').textContent = completed;
        document.getElementById('stat-total-revenue').textContent = `₹${shopRevenue}`;
        document.getElementById('stat-total-items').textContent = shopItemsCount;
    }
}

// --------------------------------------------------------------------------
// 1. ORDERS MANAGEMENT (SHOP-FILTERED)
// --------------------------------------------------------------------------

function renderAdminOrdersTable() {
    const tableBody = document.getElementById('admin-orders-table-body');
    const searchVal = document.getElementById('admin-order-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    let filtered = adminOrders.filter(order => {
        const matchesShop = orderContainsShopItems(order, activeShopScope);
        const matchesStatus = (currentOrderFilter === 'all') || (order.status === currentOrderFilter);
        
        const customerType = (order.customerType || 'Student').toLowerCase();
        const matchesUserType = (currentUserTypeFilter === 'all') || 
                                (currentUserTypeFilter.toLowerCase() === customerType);

        const matchesSearch = !searchVal || 
                              (order.orderId && order.orderId.toLowerCase().includes(searchVal)) ||
                              (order.customerName && order.customerName.toLowerCase().includes(searchVal)) ||
                              (order.studentName && order.studentName.toLowerCase().includes(searchVal)) ||
                              (order.studentRoll && order.studentRoll.toLowerCase().includes(searchVal)) ||
                              (order.cabinNumber && order.cabinNumber.toLowerCase().includes(searchVal)) ||
                              (order.customerType && order.customerType.toLowerCase().includes(searchVal));
        return matchesShop && matchesStatus && matchesUserType && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: var(--primary);"></i>
                    No orders in queue for <strong>${activeShopScope === 'All' ? 'All Shops' : activeShopScope}</strong> with this filter.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(order => {
        let formattedDate = 'Just now';
        if (order.createdAt) {
            try {
                formattedDate = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                formattedDate = order.createdAt;
            }
        }

        const status = order.status || 'Pending';
        const orderId = order._id || order.id;
        const isFaculty = (order.customerType === 'Faculty');
        const isDelivery = (order.fulfillmentType === 'delivery' || (order.deliveryLocation && order.deliveryLocation.trim() !== ''));

        // Separate items for Shop-Specific packing view
        const shopItems = (order.items || []).filter(i => itemBelongsToShop(i, activeShopScope));
        const otherItems = (order.items || []).filter(i => !itemBelongsToShop(i, activeShopScope));

        let itemsDisplayHtml = '';
        if (activeShopScope !== 'All') {
            const thisShopList = shopItems.map(i => `<span style="font-weight: 700; color: #0f172a;">${i.name} &times; ${i.quantity}</span>`).join(', ');
            itemsDisplayHtml = `
                <div style="font-size: 0.85rem;">
                    <span style="font-size: 0.72rem; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block; margin-bottom: 2px;">
                        <i class="fa-solid fa-box-archive"></i> Pack For Your Counter:
                    </span>
                    <div>${thisShopList}</div>
                    ${otherItems.length > 0 ? `<div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">+ ${otherItems.length} item(s) from other shops</div>` : ''}
                </div>
            `;
        } else {
            const allItemsList = (order.items || []).map(i => `${i.name} &times; ${i.quantity}`).join(', ');
            itemsDisplayHtml = `
                <div style="font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${allItemsList}">
                    ${allItemsList}
                </div>
            `;
        }

        const customerName = order.customerName || order.studentName || (isFaculty ? 'Faculty Member' : 'Student');
        const arrivalTime = order.customerArrivalTime || order.pickupSlot || 'Immediate';
        const prepTime = order.estimatedPrepTime || 'Reviewing (~15 mins)';

        return `
            <tr>
                <td>
                    <strong>${order.orderId || 'ORD-#'}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${formattedDate}</div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: #0f172a;">${customerName}</span>
                        ${isFaculty ? `
                            <span style="background: #f3e8ff; color: #7e22ce; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 9999px; border: 1px solid #d8b4fe; white-space: nowrap;">
                                👨‍🏫 FACULTY
                            </span>
                        ` : `
                            <span style="background: #dcfce7; color: #15803d; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 9999px; border: 1px solid #86efac; white-space: nowrap;">
                                🎓 STUDENT
                            </span>
                        `}
                    </div>
                    <div>
                        ${isDelivery ? `
                            <span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 0.73rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">
                                <i class="fa-solid fa-truck-fast"></i> ${order.deliveryLocation || order.cabinNumber || 'Campus Delivery'}
                            </span>
                        ` : `
                            <span style="background: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 0.73rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">
                                <i class="fa-solid fa-person-walking"></i> Pickup (${order.campusBlock || 'Campus'})
                            </span>
                        `}
                        ${(order.googleMapsUrl || (order.lat && order.lng)) ? `
                            <a href="${order.googleMapsUrl || `https://www.google.com/maps?q=${order.lat},${order.lng}`}" target="_blank" style="font-size: 0.7rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 6px; border-radius: 4px; text-decoration: none; font-weight: 700; display: inline-block; margin-top: 2px; margin-left: 4px;" title="Open Live GPS Location in Google Maps">
                                <i class="fa-solid fa-map-location-dot"></i> Live Map 📍
                            </a>
                        ` : ''}
                    </div>
                    <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                        <span>Roll/ID: ${order.studentRoll || 'N/A'}</span> &bull; <span>${order.studentPhone || ''}</span>
                    </div>
                </td>
                <td style="max-width: 240px;">
                    ${itemsDisplayHtml}
                    <div style="font-size: 0.78rem; color: #6b21a8; font-weight: 700; margin-top: 0.25rem; background: #faf5ff; border: 1px solid #e9d5ff; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                        <i class="fa-solid fa-stopwatch"></i> Slot: ${arrivalTime}
                    </div>
                </td>
                <td style="min-width: 135px;">
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        <select class="form-select no-icon" style="padding: 0.25rem 0.45rem; font-size: 0.78rem; border-radius: 6px; font-weight: 600; border-color: #93c5fd; background: #f0f9ff;"
                                onchange="handleOrderPrepTimeChange('${orderId}', this.value)">
                            <option value="">⏱️ Set Kitchen Time</option>
                            <option value="10" ${order.prepTimeMinutes === 10 ? 'selected' : ''}>⚡ 10 mins</option>
                            <option value="15" ${order.prepTimeMinutes === 15 ? 'selected' : ''}>⏳ 15 mins</option>
                            <option value="20" ${order.prepTimeMinutes === 20 ? 'selected' : ''}>⏱️ 20 mins</option>
                            <option value="30" ${order.prepTimeMinutes === 30 ? 'selected' : ''}>⏱️ 30 mins</option>
                            <option value="custom">✍️ Custom Time</option>
                        </select>
                        <span style="font-size: 0.74rem; color: #0284c7; font-weight: 700;">
                            <i class="fa-solid fa-fire-burner"></i> ${prepTime}
                        </span>
                    </div>
                </td>
                <td>
                    <strong style="color: var(--secondary); font-size: 1rem;">₹${order.totalAmount}</strong>
                    ${(order.dueAmount && Number(order.dueAmount) > 0) ? `
                        <div style="font-size: 0.74rem; color: #15803d; font-weight: 700; margin-top: 1px;">
                            <i class="fa-solid fa-check"></i> Adv: ₹${order.advanceAmount || Math.round(order.totalAmount * 0.5)} (${order.advancePercentage || 50}%)
                        </div>
                        <div style="font-size: 0.74rem; color: #b45309; font-weight: 700; background: #fef3c7; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 2px;">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Collect: ₹${order.dueAmount}
                        </div>
                    ` : `
                        <div style="font-size: 0.74rem; color: #15803d; font-weight: 700; margin-top: 1px;">
                            <i class="fa-solid fa-circle-check"></i> 100% Full Paid
                        </div>
                    `}
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${order.paymentMethod || 'Wallet'}</div>
                    ${order.paymentUtr ? `
                        <div style="font-size: 0.72rem; color: #047857; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 2px;">
                            <i class="fa-solid fa-receipt"></i> UTR: ${order.paymentUtr}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                </td>
                <td>
                    <select class="form-select no-icon" style="padding: 0.35rem 0.6rem; font-size: 0.85rem; border-radius: var(--radius-sm);" 
                            onchange="updateOrderStatus('${orderId}', this.value)">
                        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Preparing" ${status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="viewOrderDetailsModal('${orderId}')" title="View Full Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleOrderPrepTimeChange(orderId, val) {
    if (!val) return;
    let prepText = '';
    let prepMins = null;

    if (val === 'custom') {
        const customInput = prompt('Enter kitchen prep estimate (e.g. "Ready in 25 mins" or "Ready by 1:30 PM"):', 'Ready in 25 mins');
        if (!customInput) return;
        prepText = customInput.trim();
    } else {
        prepMins = Number(val);
        prepText = `Ready in ~${prepMins} mins`;
    }

    try {
        const res = await api.updateOrderPrepTime(orderId, prepText, prepMins);
        if (res.success) {
            showToast(`👨‍🍳 Kitchen Prep Time updated: "${prepText}"!`, 'success');
            loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to update prep time.', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function speakCustomText(text) {
    if (!adminSoundEnabled) return;
    try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = 1.08;
        utterance.volume = 1.0;
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Speech error:', e);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await api.updateOrderStatus(orderId, newStatus);
        if (res.success) {
            const shortCode = String(orderId).slice(-4);
            if (newStatus === 'Ready') {
                if (typeof playOrderReadyChime === 'function') {
                    playOrderReadyChime();
                } else if (typeof playCanteenOrderBellSound === 'function') {
                    playCanteenOrderBellSound();
                }
                speakCustomText(`Order ${shortCode} is now Ready for pickup!`);
                showToast(`🎉 Order #${orderId} marked READY! Real-time sound & alert sent to student.`, 'success', 'Order Ready');
            } else if (newStatus === 'Preparing') {
                if (typeof playCanteenOrderBellSound === 'function') playCanteenOrderBellSound();
                speakCustomText(`Order ${shortCode} accepted. Now preparing in kitchen.`);
                showToast(`👨‍🍳 Order #${orderId} marked Preparing!`, 'info', 'Kitchen Preparing');
            } else if (newStatus === 'Completed') {
                if (typeof playCanteenOrderBellSound === 'function') playCanteenOrderBellSound();
                speakCustomText(`Order ${shortCode} marked completed.`);
                showToast(`✅ Order #${orderId} marked Completed!`, 'success', 'Order Completed');
            } else {
                showToast(`Order status updated to "${newStatus}"!`, 'success');
            }

            loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to update status.', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status: ' + error.message, 'error');
    }
}

function viewOrderDetailsModal(orderId) {
    const order = adminOrders.find(o => (o._id === orderId || o.id === orderId));
    if (!order) return;

    const modal = document.getElementById('admin-order-modal');
    const content = document.getElementById('admin-order-modal-content');

    let formattedDate = 'Just now';
    if (order.createdAt) {
        try {
            formattedDate = new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
            formattedDate = order.createdAt;
        }
    }

    const isFaculty = (order.customerType === 'Faculty');
    const hasDue = order.dueAmount && Number(order.dueAmount) > 0;
    const isDelivery = (order.fulfillmentType === 'delivery' || (order.deliveryLocation && order.deliveryLocation.trim() !== ''));

    content.innerHTML = `
        <div style="margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="font-size: 1.2rem; color: var(--secondary);">${order.orderId}</h4>
                <span class="status-badge status-${(order.status || 'Pending').toLowerCase()}">${order.status || 'Pending'}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${formattedDate}</div>
        </div>

        <!-- Live GPS & Campus Delivery Point Banner -->
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.4rem;">
                <span style="font-weight: 700; color: #166534;">
                    <i class="fa-solid fa-satellite-dish" style="color: #15803d;"></i> Campus Location & GPS Pin:
                </span>
                ${(order.googleMapsUrl || (order.lat && order.lng)) ? `
                    <a href="${order.googleMapsUrl || `https://www.google.com/maps?q=${order.lat},${order.lng}`}" target="_blank" class="btn btn-sm" style="background: #15803d; color: white; border: none; font-size: 0.75rem; padding: 3px 9px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-location-arrow"></i> Open Google Maps Pin 📍
                    </a>
                ` : `
                    <span style="background: white; color: #15803d; font-weight: 800; padding: 2px 8px; border-radius: 9999px; border: 1px solid #86efac; font-size: 0.78rem;">
                        ${isDelivery ? 'CAMPUS DELIVERY' : 'COUNTER PICKUP'}
                    </span>
                `}
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.3rem;">
                🏢 ${order.campusBlock || 'Campus Block'} &bull; 🚪 ${order.roomOrCabin || order.deliveryLocation || order.cabinNumber || 'Pickup Counter'}
            </div>
            ${(order.lat && order.lng) ? `
                <div style="font-family: monospace; font-size: 0.78rem; color: #166534; margin-bottom: 0.35rem;">
                    📍 Live GPS: <strong>${order.lat}° N, ${order.lng}° E</strong> (Accuracy: ±${order.liveLocation?.accuracy || 8}m)
                </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.4rem; border-top: 1px dashed #bbf7d0; padding-top: 0.4rem;">
                <div>
                    <span style="font-size: 0.76rem; color: #475569;">Customer Arrival Slot:</span>
                    <div style="font-weight: 800; color: #6b21a8;">⏰ ${order.customerArrivalTime || order.pickupSlot || 'Immediate'}</div>
                </div>
                <div>
                    <span style="font-size: 0.76rem; color: #475569;">Kitchen Prep Time:</span>
                    <div style="font-weight: 800; color: #0284c7;">👨‍🍳 ${order.estimatedPrepTime || '15 mins'}</div>
                </div>
            </div>
        </div>

        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: 700; font-size: 0.9rem; color: var(--secondary);">Customer & Identity Details:</div>
                ${isFaculty ? `
                    <span style="background: #f3e8ff; color: #7e22ce; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; border: 1px solid #d8b4fe;">
                        👨‍🏫 Faculty / Staff Member
                    </span>
                ` : `
                    <span style="background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; border: 1px solid #86efac;">
                        🎓 Student
                    </span>
                `}
            </div>
            <div style="font-size: 0.88rem; line-height: 1.6;">
                <div><strong>Name:</strong> ${order.customerName || order.studentName || 'N/A'}</div>
                ${isFaculty ? `
                    <div><strong>Faculty ID:</strong> ${order.studentRoll || 'N/A'} &bull; <strong>Department:</strong> ${order.studentDept || 'N/A'}</div>
                ` : `
                    <div><strong>Roll No:</strong> ${order.studentRoll || 'N/A'} &bull; <strong>Department:</strong> ${order.studentDept || 'N/A'}</div>
                `}
                <div><strong>Phone:</strong> ${order.studentPhone || 'N/A'} &bull; <strong>Email:</strong> ${order.customerEmail || order.studentEmail || 'N/A'}</div>
            </div>
        </div>

        <!-- Payment Breakdown Card -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.88rem;">
            <div style="font-weight: 700; color: var(--secondary); margin-bottom: 0.4rem; display: flex; justify-content: space-between;">
                <span><i class="fa-solid fa-pie-chart" style="color: var(--primary);"></i> Payment Mode:</span>
                <span style="color: var(--primary); font-weight: 700;">${order.paymentSplit || '100% Full Payment'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.5rem; border-radius: 6px;">
                    <div style="font-size: 0.76rem; color: #166534; font-weight: 700;">ADVANCE PAID (${order.advancePercentage || 100}%):</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #15803d;">₹${order.advanceAmount || order.totalAmount}</div>
                    <div style="font-size: 0.72rem; color: #475569;">Via ${order.paymentMethod || 'Wallet'}</div>
                </div>
                <div style="background: ${hasDue ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${hasDue ? '#fde68a' : '#e2e8f0'}; padding: 0.5rem; border-radius: 6px;">
                    <div style="font-size: 0.76rem; color: ${hasDue ? '#92400e' : '#475569'}; font-weight: 700;">COLLECT AT COUNTER (${100 - (order.advancePercentage || 100)}%):</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: ${hasDue ? '#b45309' : '#15803d'};">₹${order.dueAmount || 0}</div>
                    <div style="font-size: 0.72rem; color: #475569;">${hasDue ? 'Cash / UPI at Counter' : 'Fully Paid'}</div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--secondary);">Ordered Items (Counter Breakdown):</div>
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                ${(order.items || []).map(item => {
                    const isTargetShop = itemBelongsToShop(item, activeShopScope);
                    const itemCat = item.category || 'General';
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.88rem; ${isTargetShop && activeShopScope !== 'All' ? 'background: #f0fdf4; border-left: 4px solid #10b981;' : ''}">
                            <div>
                                <span style="font-weight: 600;">
                                    <i class="fa-solid fa-circle" style="font-size: 0.45rem; color: ${item.type === 'nonveg' ? '#dc2626' : '#16a34a'};"></i>
                                    ${item.name} &times; ${item.quantity}
                                </span>
                                <span style="font-size: 0.72rem; background: #e2e8f0; color: #334155; padding: 1px 6px; border-radius: 4px; margin-left: 0.4rem;">
                                    ${itemCat}
                                </span>
                            </div>
                            <span style="font-weight: 700;">₹${Number(item.price) * Number(item.quantity)}</span>
                        </div>
                    `;
                }).join('')}
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: #f8fafc; font-weight: 700; font-size: 0.95rem;">
                    <span>Total Bill:</span>
                    <span style="color: var(--primary);">₹${order.totalAmount}</span>
                </div>
                <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-top: 1.5px dashed #86efac; padding: 0.65rem 1rem; font-size: 0.8rem; color: #166534;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>📦 Packaging Fee (₹${order.packagingFee || 5}):</span>
                        <span><strong>₹${order.vendorPackagingShare || 2.50}</strong> Shop Packing + <strong>₹${order.adminCommission || 2.50}</strong> Platform Fee</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 800; color: #15803d; border-top: 1px solid #bbf7d0; padding-top: 3px; margin-top: 3px;">
                        <span>🏪 Net Counter Payout:</span>
                        <span>₹${order.vendorNetPayout || (Number(order.subtotal || 0) + 2.50)} (${order.splitPaymentType === 'cash_counter' ? '💵 Cash at Counter' : '⚡ Instant Gateway Split'})</span>
                    </div>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 1rem;">
            <div>
                <strong>Pickup Slot:</strong><br>
                <span>${order.pickupSlot || 'Immediate'}</span>
            </div>
            <div>
                <strong>Payment Channel:</strong><br>
                <span>${order.paymentMethod || 'Campus Digital Wallet'}</span>
            </div>
        </div>

        ${order.specialNotes ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem;">
                <strong>Special Note:</strong> ${order.specialNotes}
            </div>
        ` : ''}
    `;

    modal.classList.add('active');
}

// --------------------------------------------------------------------------
// 2. FOOD MENU (CRUD) MANAGEMENT
// --------------------------------------------------------------------------

function matchSmartCategory(item, catKey) {
    if (!catKey || catKey === 'all') return true;
    const catLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const fullText = `${nameLower} ${catLower} ${descLower}`;

    switch (catKey.toLowerCase()) {
        case 'drinks':
        case 'drinks & juices':
        case 'drinks & shakes':
            return catLower.includes('drink') || catLower.includes('juice') ||
                   /\b(shake|tea|chai|coffee|mojito|soda|shikanji|lassi|frappe|water|lemonade|frooti|maaza|pepsi|sprite|coke|dew|tropicana|red bull)\b/i.test(fullText);
        case 'rolls':
        case 'rolls & wraps':
            return /\b(roll|wrap|kathi)\b/i.test(fullText);
        case 'sandwiches':
        case 'burgers & sandwiches':
            return /\b(sandwich|burger|sub|toast)\b/i.test(fullText);
        case 'pizzas':
        case 'pizzas & breads':
            return /\b(pizza|garlic bread)\b/i.test(fullText);
        case 'chinese':
        case 'pastas & chinese':
            return /\b(pasta|noodle|noodles|chowmein|manchurian|fried rice|singapuri|schezwan|chilli paneer|chilli mushroom|chilli potato|chopsuey|sizzler|bhel|ting ming)\b/i.test(fullText);
        case 'momos':
        case 'momos & starters':
            return /\b(momo|momos|spring roll|kurkure spring roll|crispy corn|satay)\b/i.test(fullText);
        case 'curries':
        case 'main course curries':
            return (catLower === 'canteen food' || catLower.includes('main course')) &&
                   /\b(paneer|chaap|dal|makhani|tadka|kofta|mushroom|aloo jeera|dum aloo|sev bhaji|chana masala|mix veg|bhurji|handi|kadhai|shahi|lababdar|mughlai|changezi|rogan josh)\b/i.test(fullText) &&
                   !/\b(roll|wrap|dosa|burger|sandwich|pizza|momo|pasta|noodle|biryani|pulao|thali|naan|roti|paratha|kulcha)\b/i.test(fullText);
        case 'breads':
        case 'naans, rotis & kulchas':
        case 'breads & paranthas':
            return /\b(roti|naan|paratha|kulcha|rumali|missi|laccha)\b/i.test(fullText);
        case 'thalis':
        case 'thalis & biryanis':
        case 'thalis & combos':
            return /\b(thali|biryani|pulao|khichdi|combo|chawal combo|jeera rice|plain rice)\b/i.test(fullText);
        case 'desserts':
        case 'waffles & sweets':
            return catLower.includes('chocolate') || catLower.includes('sweet') ||
                   /\b(waffle|brownie|cake|ice cream|gulab jamun|kheer|rasgulla|kulfi|halwa|ras malai|chhena poda|lava cake|sweet)\b/i.test(fullText);
        case 'south_indian':
        case 'south indian':
            return /\b(dosa|uttapam|uttappam|idli|sambhar|sambar|vada|curd rice)\b/i.test(fullText);
        case 'snacks':
        case 'snacks & maggi':
        case 'snacks & chips':
            return catLower.includes('snack') || catLower.includes('chip') ||
                   /\b(maggi|fries|nachos|pakoda|pakodi|chilla|vada pav|cutlet|moonglet|pav bhaji|chole bhature|aloo puri|corn|finger|chips|kurkure|lays)\b/i.test(fullText);
        case 'stationery':
        case 'stationery & mart':
        case 'hostel essentials':
            return catLower.includes('stationery') || catLower.includes('essential') || catLower.includes('hostel') ||
                   /\b(pen|pencil|register|notebook|copy|file|folder|sheet|paper|soap|shampoo|paste|brush|sanitizer)\b/i.test(fullText);
        default:
            return catLower === catKey.toLowerCase() || fullText.includes(catKey.toLowerCase());
    }
}

function handleAdminMenuShopFilterChange(val) {
    adminMenuShopFilter = val || 'All';
    renderAdminFoodTable();
}

async function quickSaveItemPrice(itemId, isHalfFull) {
    const item = adminFoodItems.find(i => (i._id === itemId || i.id === itemId));
    if (!item) {
        showToast('Item not found.', 'error');
        return;
    }

    const saveBtn = document.getElementById(`btn-quick-save-${itemId}`);
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        let newPrice = item.price;
        let newPriceHalf = item.priceHalf;
        let newPriceFull = item.priceFull;

        if (isHalfFull) {
            const halfInput = document.getElementById(`quick-price-half-${itemId}`);
            const fullInput = document.getElementById(`quick-price-full-${itemId}`);
            const halfVal = Number(halfInput?.value);
            const fullVal = Number(fullInput?.value);

            if (isNaN(halfVal) || halfVal <= 0 || isNaN(fullVal) || fullVal <= 0) {
                showToast('Please enter valid positive prices for both Half and Full.', 'warning');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Rate';
                }
                return;
            }

            newPriceHalf = halfVal;
            newPriceFull = fullVal;
            newPrice = halfVal;
        } else {
            const singleInput = document.getElementById(`quick-price-${itemId}`);
            const singleVal = Number(singleInput?.value);

            if (isNaN(singleVal) || singleVal <= 0) {
                showToast('Please enter a valid positive price.', 'warning');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save ₹';
                }
                return;
            }

            newPrice = singleVal;
        }

        // Prepare payload preserving all item fields
        const updatedItem = {
            ...item,
            price: newPrice,
            priceHalf: isHalfFull ? newPriceHalf : null,
            priceFull: isHalfFull ? newPriceFull : null,
            hasHalfFull: isHalfFull
        };

        const targetId = item._id || item.id;
        const res = await api.saveFoodItem(updatedItem, targetId);
        if (res && res.success) {
            // Update in-memory item
            item.price = newPrice;
            item.priceHalf = isHalfFull ? newPriceHalf : null;
            item.priceFull = isHalfFull ? newPriceFull : null;
            item.hasHalfFull = isHalfFull;

            const rateDisplay = isHalfFull ? `Half: ₹${newPriceHalf} / Full: ₹${newPriceFull}` : `₹${newPrice}`;
            showToast(`✅ Price for "${item.name}" updated to ${rateDisplay}!`, 'success');

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.background = '#15803d';
                saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
                setTimeout(() => {
                    if (saveBtn) {
                        saveBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
                        saveBtn.innerHTML = isHalfFull ? '<i class="fa-solid fa-floppy-disk"></i> Save Rate' : '<i class="fa-solid fa-floppy-disk"></i> Save ₹';
                    }
                }, 1800);
            }
        } else {
            showToast(res?.message || 'Failed to update price.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = isHalfFull ? '<i class="fa-solid fa-floppy-disk"></i> Save Rate' : '<i class="fa-solid fa-floppy-disk"></i> Save ₹';
            }
        }
    } catch (err) {
        console.error('Quick price save error:', err);
        showToast('Error saving price: ' + err.message, 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = isHalfFull ? '<i class="fa-solid fa-floppy-disk"></i> Save Rate' : '<i class="fa-solid fa-floppy-disk"></i> Save ₹';
        }
    }
}

function renderAdminFoodTable() {
    const tableBody = document.getElementById('admin-food-table-body');
    const searchVal = document.getElementById('admin-food-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    let filtered = adminFoodItems.filter(item => {
        // 1. Overall Admin Dashboard Scope Filter
        let matchesScope = true;
        if (activeShopScope !== 'All') {
            const targetShop = adminShops.find(s => (s.shopId === activeShopScope || s._id === activeShopScope || s.name === activeShopScope || s.category === activeShopScope));
            const targetSid = targetShop ? (targetShop.shopId || targetShop._id) : activeShopScope;
            const targetSname = targetShop ? targetShop.name : activeShopScope;

            matchesScope = (item.shopId === targetSid || 
                            item.shopId === activeShopScope || 
                            item.shopName === targetSname || 
                            item.shopName === activeShopScope ||
                            item.category === activeShopScope);
        }

        // 2. Menu Management Dedicated Shop Filter Dropdown
        let matchesMenuShop = true;
        if (adminMenuShopFilter && adminMenuShopFilter !== 'All') {
            const mShop = adminShops.find(s => (s.shopId === adminMenuShopFilter || s._id === adminMenuShopFilter || s.name === adminMenuShopFilter));
            const mSid = mShop ? (mShop.shopId || mShop._id) : adminMenuShopFilter;
            const mSname = mShop ? mShop.name : adminMenuShopFilter;

            matchesMenuShop = (
                item.shopId === mSid ||
                item.shopId === adminMenuShopFilter ||
                (mSname && item.shopName === mSname) ||
                item.shopName === adminMenuShopFilter ||
                (mShop && mShop.category && item.category === mShop.category)
            );
        }

        // 3. Category Filter Pills
        const matchesCategory = matchSmartCategory(item, currentFoodFilter);

        // 4. Search Filter
        const matchesSearch = !searchVal || 
                              (item.name && item.name.toLowerCase().includes(searchVal)) ||
                              (item.description && item.description.toLowerCase().includes(searchVal)) ||
                              (item.shopName && item.shopName.toLowerCase().includes(searchVal));

        return matchesScope && matchesMenuShop && matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        const activeShopLabel = (adminMenuShopFilter !== 'All' ? (adminShops.find(s=>s.shopId===adminMenuShopFilter||s._id===adminMenuShopFilter)?.name || adminMenuShopFilter) : (activeShopScope === 'All' ? 'All Counters' : activeShopScope));
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-store-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: var(--primary);"></i>
                    <strong style="font-size: 1.05rem; color: var(--secondary); display: block; margin-bottom: 0.35rem;">No dishes or products found</strong>
                    <span>No items match your filter in <strong>${activeShopLabel}</strong> (${currentFoodFilter === 'all' ? 'All Categories' : currentFoodFilter}).</span>
                </td>
            </tr>
        `;
        return;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

    tableBody.innerHTML = filtered.map(item => {
        const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
        const isVeg = item.type === 'veg' || !item.type;
        const itemId = item._id || item.id;
        const assignedShop = adminShops.find(s => s.shopId === item.shopId || s._id === item.shopId || s.name === item.shopName) || adminShops.find(s => s.category === item.category);
        const shopDisplay = item.shopName || (assignedShop ? assignedShop.name : 'TMU Campus Mart');

        return `
            <tr>
                <td>
                    <img src="${item.image || item.imageUrl || fallbackImg}" alt="${item.name}" 
                         style="width: 52px; height: 52px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid #e2e8f0;"
                         onerror="this.src='${fallbackImg}'">
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--secondary); font-size: 0.95rem;">${item.name}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.description || ''}
                    </div>
                    <div style="font-size: 0.74rem; color: #9a3412; margin-top: 3px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: #fff7ed; border: 1px solid #fed7aa; padding: 1px 6px; border-radius: 4px;">
                        <i class="fa-solid fa-store" style="color: var(--primary);"></i> ${shopDisplay}
                    </div>
                </td>
                <td>
                    <span style="font-size: 0.8rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: var(--radius-full); background: #f1f5f9; color: #334155; display: inline-block;">
                        ${item.category || 'General'}
                    </span>
                    <span style="font-size: 0.74rem; font-weight: 800; margin-left: 0.35rem; color: ${isVeg ? '#16a34a' : '#dc2626'}; background: ${isVeg ? '#dcfce7' : '#fee2e2'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isVeg ? '#86efac' : '#fca5a5'};">
                        ${isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
                    </span>
                </td>
                <td>
                    ${item.hasHalfFull ? `
                        <div style="display: flex; flex-direction: column; gap: 5px; min-width: 145px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                                <span style="font-size: 0.76rem; font-weight: 800; color: #0369a1; min-width: 38px;">🥣 Half:</span>
                                <div style="display: flex; align-items: center; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 6px; padding: 1px 4px;">
                                    <span style="font-weight: 700; color: #0284c7; font-size: 0.8rem; margin-right: 2px;">₹</span>
                                    <input type="number" id="quick-price-half-${itemId}" value="${item.priceHalf || item.price}" min="1" step="1"
                                           style="width: 50px; border: none; background: transparent; font-weight: 800; font-size: 0.85rem; color: #0369a1; outline: none; padding: 2px 0;"
                                           onkeydown="if(event.key==='Enter') quickSaveItemPrice('${itemId}', true)" title="Edit Half Price">
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                                <span style="font-size: 0.76rem; font-weight: 800; color: #15803d; min-width: 38px;">🍲 Full:</span>
                                <div style="display: flex; align-items: center; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 6px; padding: 1px 4px;">
                                    <span style="font-weight: 700; color: #16a34a; font-size: 0.8rem; margin-right: 2px;">₹</span>
                                    <input type="number" id="quick-price-full-${itemId}" value="${item.priceFull || item.price}" min="1" step="1"
                                           style="width: 50px; border: none; background: transparent; font-weight: 800; font-size: 0.85rem; color: #15803d; outline: none; padding: 2px 0;"
                                           onkeydown="if(event.key==='Enter') quickSaveItemPrice('${itemId}', true)" title="Edit Full Price">
                                </div>
                            </div>
                            <button class="btn btn-sm" id="btn-quick-save-${itemId}" onclick="quickSaveItemPrice('${itemId}', true)"
                                    style="padding: 2px 8px; font-size: 0.74rem; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 5px; font-weight: 700; width: 100%; margin-top: 2px; box-shadow: 0 1px 3px rgba(16,185,129,0.25); cursor: pointer;"
                                    title="Save Half & Full Price">
                                <i class="fa-solid fa-floppy-disk"></i> Save Rate
                            </button>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 120px;">
                            <div style="display: flex; align-items: center; background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 6px; padding: 2px 6px;">
                                <span style="font-weight: 800; color: var(--primary); font-size: 0.92rem; margin-right: 2px;">₹</span>
                                <input type="number" id="quick-price-${itemId}" value="${item.price}" min="1" step="1"
                                       style="width: 58px; border: none; background: transparent; font-weight: 800; font-size: 0.95rem; color: #9a3412; outline: none; padding: 2px 0;"
                                       onkeydown="if(event.key==='Enter') quickSaveItemPrice('${itemId}', false)" title="Edit Price">
                            </div>
                            <button class="btn btn-sm" id="btn-quick-save-${itemId}" onclick="quickSaveItemPrice('${itemId}', false)"
                                    style="padding: 2px 8px; font-size: 0.74rem; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 5px; font-weight: 700; width: 100%; box-shadow: 0 1px 3px rgba(16,185,129,0.25); cursor: pointer;"
                                    title="Save Price">
                                <i class="fa-solid fa-floppy-disk"></i> Save ₹
                            </button>
                        </div>
                    `}
                </td>
                <td>
                    <button class="btn btn-sm ${isAvailable ? 'btn-success' : 'btn-outline'}" 
                            onclick="toggleItemAvailability('${itemId}', ${!isAvailable})"
                            title="Click to toggle stock status">
                        <i class="fa-solid ${isAvailable ? 'fa-check' : 'fa-xmark'}"></i>
                        ${isAvailable ? 'In Stock' : 'Out of Stock'}
                    </button>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm" onclick="openEditFoodModal('${itemId}')" title="Edit Full Item (Name, Shop, Photo)">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="deleteFoodItem('${itemId}', '${item.name}')" title="Delete Item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleFoodFormHalfFull(isHalfFull) {
    const singleGroup = document.getElementById('food-form-single-price-group');
    const halfFullGroup = document.getElementById('food-form-halffull-price-group');
    const singleInput = document.getElementById('food-form-price');
    const halfInput = document.getElementById('food-form-price-half');
    const fullInput = document.getElementById('food-form-price-full');

    if (isHalfFull) {
        if (singleGroup) singleGroup.style.display = 'none';
        if (halfFullGroup) halfFullGroup.style.display = 'grid';
        if (singleInput) singleInput.required = false;
        if (halfInput) halfInput.required = true;
        if (fullInput) fullInput.required = true;
    } else {
        if (singleGroup) singleGroup.style.display = 'block';
        if (halfFullGroup) halfFullGroup.style.display = 'none';
        if (singleInput) singleInput.required = true;
        if (halfInput) halfInput.required = false;
        if (fullInput) fullInput.required = false;
    }
}

const PRESET_FOOD_PHOTOS = {
    samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    thali: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    silk: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
    kitkat: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80',
    lays: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    maggi: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
    coffee: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    redbull: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    register: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
    pen: 'https://images.unsplash.com/photo-1585336261026-7f576d338f0d?w=600&auto=format&fit=crop&q=80',
    sanitizer: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80'
};

const DEFAULT_FOOD_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

function switchImageTab(tabName) {
    document.getElementById('tab-btn-upload')?.classList.toggle('active', tabName === 'upload');
    document.getElementById('tab-btn-preset')?.classList.toggle('active', tabName === 'preset');
    document.getElementById('tab-btn-url')?.classList.toggle('active', tabName === 'url');

    const secUpload = document.getElementById('img-section-upload');
    const secPreset = document.getElementById('img-section-preset');
    const secUrl = document.getElementById('img-section-url');

    if (secUpload) secUpload.style.display = tabName === 'upload' ? 'block' : 'none';
    if (secPreset) secPreset.style.display = tabName === 'preset' ? 'block' : 'none';
    if (secUrl) secUrl.style.display = tabName === 'url' ? 'block' : 'none';
}

function selectPresetPhoto(presetKey) {
    selectPresetImage(presetKey);
}

function selectPresetImage(presetKey) {
    const url = PRESET_FOOD_PHOTOS[presetKey];
    if (url) {
        document.getElementById('food-form-img').value = url;
        if (document.getElementById('food-form-img-input')) document.getElementById('food-form-img-input').value = url;
        updateImagePreview(url, `Preset: ${presetKey.toUpperCase()}`);
    }
}

function updateImagePreviewFromUrl(url) {
    if (url && url.startsWith('http')) {
        document.getElementById('food-form-img').value = url;
        updateImagePreview(url, 'URL Photo Preview');
    }
}

function compressAndLoadImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDimension = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            callback(compressedBase64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFoodImageFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
        return;
    }

    compressAndLoadImage(file, function(base64Data) {
        const hiddenImg = document.getElementById('food-form-img');
        if (hiddenImg) hiddenImg.value = base64Data;
        updateImagePreview(base64Data, `Uploaded: ${file.name}`);
        showToast('📸 Photo uploaded & optimized successfully!', 'success');
    });
}

function updateImagePreview(src, title) {
    const previewImg = document.getElementById('food-img-preview') || document.getElementById('food-form-preview-img');
    const previewStatus = document.getElementById('food-img-preview-status') || document.getElementById('food-img-preview-title');
    const previewBox = document.getElementById('food-img-preview-box');

    if (previewImg) {
        previewImg.src = src || DEFAULT_FOOD_IMG;
    }
    if (previewStatus) {
        previewStatus.textContent = title || 'Preview: Ready';
    }
    if (previewBox) {
        previewBox.style.display = 'block';
    }
}

function resetFoodForm() {
    const idInput = document.getElementById('food-form-id');
    const nameInput = document.getElementById('food-form-name');
    const priceInput = document.getElementById('food-form-price');
    const priceHalfInput = document.getElementById('food-form-price-half');
    const priceFullInput = document.getElementById('food-form-price-full');
    const halfFullCheck = document.getElementById('food-form-has-halffull');
    const typeSelect = document.getElementById('food-form-type');
    const imgInput = document.getElementById('food-form-img');
    const imgUrlInput = document.getElementById('food-form-img-input');
    const fileInput = document.getElementById('food-form-file');
    const descInput = document.getElementById('food-form-desc');
    const availCheck = document.getElementById('food-form-available');

    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '';
    if (priceHalfInput) priceHalfInput.value = '';
    if (priceFullInput) priceFullInput.value = '';
    if (halfFullCheck) halfFullCheck.checked = false;
    if (typeSelect) typeSelect.value = 'veg';
    if (imgInput) imgInput.value = '';
    if (imgUrlInput) imgUrlInput.value = '';
    if (fileInput) fileInput.value = '';
    if (descInput) descInput.value = '';
    if (availCheck) availCheck.checked = true;

    toggleFoodFormHalfFull(false);
    switchImageTab('upload');
    updateImagePreview(DEFAULT_FOOD_IMG, 'Preview: Default Product Photo');
}

function populateShopDropdowns() {
    const foodShopSelect = document.getElementById('food-form-shop');
    if (foodShopSelect && adminShops && adminShops.length > 0) {
        const currentVal = foodShopSelect.value;
        foodShopSelect.innerHTML = adminShops.map(s => {
            const sid = s.shopId || s._id;
            return `<option value="${sid}">${getShopEmoji(s.category)} ${s.name} (${s.category})</option>`;
        }).join('');
        if (currentVal) foodShopSelect.value = currentVal;
    }

    const scannerShopSelect = document.getElementById('scanner-target-shop');
    if (scannerShopSelect && adminShops && adminShops.length > 0) {
        scannerShopSelect.innerHTML = adminShops.map(s => {
            const sid = s.shopId || s._id;
            return `<option value="${sid}">${getShopEmoji(s.category)} ${s.name}</option>`;
        }).join('');
    }

    const menuShopFilter = document.getElementById('admin-menu-shop-filter');
    if (menuShopFilter && adminShops && adminShops.length > 0) {
        const currentMVal = menuShopFilter.value || adminMenuShopFilter || 'All';
        menuShopFilter.innerHTML = `
            <option value="All" ${currentMVal === 'All' ? 'selected' : ''}>🏪 All Shops & Counters (All 23 Outlets)</option>
            ${adminShops.map(s => {
                const sid = s.shopId || s._id;
                return `<option value="${sid}" ${currentMVal === sid ? 'selected' : ''}>${getShopEmoji(s.category)} ${s.name} (${s.category})</option>`;
            }).join('')}
        `;
    }
}

function onFoodShopSelectChange(selectedShopId) {
    if (!adminShops || adminShops.length === 0) return;
    const target = adminShops.find(s => (s.shopId === selectedShopId || s._id === selectedShopId));
    if (target && target.category) {
        const categorySelect = document.getElementById('food-form-category');
        if (categorySelect) {
            categorySelect.value = target.category;
        }
    }
}

function handleLogout() {
    api.logout();
}

function openAddFoodModal() {
    populateShopDropdowns();
    resetFoodForm();

    const categorySelect = document.getElementById('food-form-category');
    const shopSelect = document.getElementById('food-form-shop');
    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');

    document.getElementById('food-modal-title').textContent = 'Add New Product / Item';
    document.getElementById('food-form-id').value = '';
    document.getElementById('food-form-name').value = '';
    
    if (activeShopScope !== 'All') {
        if (categorySelect) {
            categorySelect.value = activeShopScope;
            if (!isSuperAdmin) categorySelect.disabled = true;
            else categorySelect.disabled = false;
        }
        if (shopSelect) {
            const matchShop = adminShops.find(s => s.category === activeShopScope || s.shopId === activeShopScope);
            if (matchShop) shopSelect.value = matchShop.shopId || matchShop._id;
            if (!isSuperAdmin) shopSelect.disabled = true;
            else shopSelect.disabled = false;
        }
    } else {
        if (categorySelect) {
            categorySelect.value = 'Canteen Food';
            categorySelect.disabled = false;
        }
        if (shopSelect) {
            shopSelect.disabled = false;
        }
    }

    const hasHalfFullCheck = document.getElementById('food-form-has-halffull');
    if (hasHalfFullCheck) hasHalfFullCheck.checked = false;
    toggleFoodFormHalfFull(false);

    document.getElementById('food-form-price').value = '';
    document.getElementById('food-form-price-half').value = '';
    document.getElementById('food-form-price-full').value = '';
    document.getElementById('food-form-type').value = 'veg';
    document.getElementById('food-form-img').value = '';
    if (document.getElementById('food-form-img-input')) document.getElementById('food-form-img-input').value = '';
    document.getElementById('food-form-desc').value = '';
    document.getElementById('food-form-available').checked = true;
    switchImageTab('upload');
    updateImagePreview(DEFAULT_FOOD_IMG, 'Preview: Default Product Photo');

    document.getElementById('admin-food-modal').classList.add('active');
}

function openEditFoodModal(itemId) {
    populateShopDropdowns();
    const item = adminFoodItems.find(i => (i._id === itemId || i.id === itemId));
    if (!item) return;

    const currentImg = item.image || item.imageUrl || DEFAULT_FOOD_IMG;
    const categorySelect = document.getElementById('food-form-category');
    const shopSelect = document.getElementById('food-form-shop');
    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');

    document.getElementById('food-modal-title').textContent = 'Edit Product / Item';
    document.getElementById('food-form-id').value = item._id || item.id;
    document.getElementById('food-form-name').value = item.name || '';
    
    if (shopSelect) {
        if (item.shopId) {
            shopSelect.value = item.shopId;
        } else {
            const match = adminShops.find(s => s.category === item.category);
            if (match) shopSelect.value = match.shopId || match._id;
        }
        if (!isSuperAdmin && activeShopScope !== 'All') {
            shopSelect.disabled = true;
        } else {
            shopSelect.disabled = false;
        }
    }

    if (categorySelect) {
        categorySelect.value = item.category || 'Canteen Food';
        if (!isSuperAdmin && activeShopScope !== 'All') {
            categorySelect.disabled = true;
        } else {
            categorySelect.disabled = false;
        }
    }

    const hasHalfFull = !!item.hasHalfFull;
    const hasHalfFullCheck = document.getElementById('food-form-has-halffull');
    if (hasHalfFullCheck) hasHalfFullCheck.checked = hasHalfFull;
    toggleFoodFormHalfFull(hasHalfFull);

    document.getElementById('food-form-price').value = item.price || '';
    document.getElementById('food-form-price-half').value = item.priceHalf || item.price || '';
    document.getElementById('food-form-price-full').value = item.priceFull || '';
    document.getElementById('food-form-type').value = item.type || 'veg';
    document.getElementById('food-form-img').value = item.image || item.imageUrl || '';
    if (document.getElementById('food-form-img-input')) document.getElementById('food-form-img-input').value = (currentImg.startsWith('http') ? currentImg : '');
    document.getElementById('food-form-desc').value = item.description || '';
    document.getElementById('food-form-available').checked = (item.available !== undefined ? item.available : (item.isAvailable !== false));
    switchImageTab(currentImg.startsWith('data:') ? 'upload' : (currentImg.startsWith('http') ? 'url' : 'preset'));
    updateImagePreview(currentImg, 'Preview: Current Product Photo');

    document.getElementById('admin-food-modal').classList.add('active');
}

async function handleSaveFoodItem(event) {
    event.preventDefault();

    const docId = document.getElementById('food-form-id').value;
    const name = document.getElementById('food-form-name').value.trim();
    const categorySelect = document.getElementById('food-form-category');
    const shopSelect = document.getElementById('food-form-shop');
    const shopId = shopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === shopId || s._id === shopId));
    const category = categorySelect?.value || (targetShop ? targetShop.category : (activeShopScope !== 'All' ? activeShopScope : 'Canteen Food'));
    const shopName = targetShop ? targetShop.name : 'TMU Central Food Court';

    const hasHalfFull = document.getElementById('food-form-has-halffull')?.checked || false;
    let price = 0;
    let priceHalf = null;
    let priceFull = null;

    if (hasHalfFull) {
        priceHalf = Number(document.getElementById('food-form-price-half').value);
        priceFull = Number(document.getElementById('food-form-price-full').value);
        if (isNaN(priceHalf) || isNaN(priceFull) || priceHalf <= 0 || priceFull <= 0) {
            showToast('Please provide valid positive rates for both Half and Full portions.', 'warning');
            return;
        }
        price = priceHalf;
    } else {
        price = Number(document.getElementById('food-form-price').value);
        if (isNaN(price) || price <= 0) {
            showToast('Please provide a valid positive price.', 'warning');
            return;
        }
    }

    const type = document.getElementById('food-form-type').value;
    const imageUrl = document.getElementById('food-form-img').value.trim();
    const description = document.getElementById('food-form-desc').value.trim();
    const isAvailable = document.getElementById('food-form-available').checked;
    const saveBtn = document.getElementById('save-food-btn');

    if (!name) {
        showToast('Please enter the product/dish name.', 'warning');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const finalImg = imageUrl || DEFAULT_FOOD_IMG;
    const payload = {
        name,
        category,
        shopId,
        shopName,
        price,
        hasHalfFull,
        priceHalf: hasHalfFull ? priceHalf : null,
        priceFull: hasHalfFull ? priceFull : null,
        type,
        image: finalImg,
        imageUrl: finalImg,
        description: description || `Fresh ${name} available at ${shopName}.`,
        available: isAvailable,
        isAvailable: isAvailable
    };

    try {
        const res = await api.saveFoodItem(payload, docId || null);
        if (res.success) {
            showToast(`🎉 "${name}" saved successfully in MongoDB!`, 'success');
            closeModal('admin-food-modal');
            currentFoodFilter = 'all';
            document.querySelectorAll('.admin-food-filter-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-category') === 'all');
            });
            await loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to save food item.', 'error');
        }
    } catch (error) {
        console.error('Error saving food item:', error);
        showToast('Error saving food item: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Item';
    }
}

// --------------------------------------------------------------------------
// 2.15 DEDICATED BULK ADD ITEMS (+ PHOTOS) MANAGEMENT
// --------------------------------------------------------------------------

let bulkItemsCache = [];

function openBulkAddModal() {
    // 1. Populate Target Shop Dropdown
    const bulkShopSelect = document.getElementById('bulk-target-shop');
    if (bulkShopSelect && adminShops && adminShops.length > 0) {
        bulkShopSelect.innerHTML = adminShops.map(s => {
            const sid = s.shopId || s._id;
            return `<option value="${sid}">${getShopEmoji(s.category)} ${s.name} (${s.category})</option>`;
        }).join('');

        if (activeShopScope !== 'All') {
            const matchShop = adminShops.find(s => s.category === activeShopScope || s.shopId === activeShopScope || s._id === activeShopScope);
            if (matchShop) {
                bulkShopSelect.value = matchShop.shopId || matchShop._id;
            }
        }
    }

    // 2. Initialize empty rows if list is empty
    if (!bulkItemsCache || bulkItemsCache.length === 0) {
        bulkItemsCache = [];
        const currentCat = getSelectedBulkShopCategory();
        for (let i = 0; i < 3; i++) {
            bulkItemsCache.push({
                name: '',
                category: currentCat,
                type: 'veg',
                price: '',
                hasHalfFull: false,
                priceHalf: '',
                priceFull: '',
                image: '',
                description: ''
            });
        }
    }

    renderBulkTable();
    updateBulkSaveButtonText();
    document.getElementById('admin-bulk-add-modal').classList.add('active');
}

function getSelectedBulkShopCategory() {
    const bulkShopSelect = document.getElementById('bulk-target-shop');
    const selectedSid = bulkShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === selectedSid || s._id === selectedSid));
    return targetShop ? targetShop.category : 'Canteen Food';
}

function onBulkTargetShopChange(selectedShopId) {
    const targetShop = adminShops.find(s => (s.shopId === selectedShopId || s._id === selectedShopId));
    if (targetShop) {
        // Auto update categories for empty rows
        bulkItemsCache.forEach(item => {
            if (!item.name || item.name.trim() === '') {
                item.category = targetShop.category;
            }
        });
        renderBulkTable();
        updateBulkSaveButtonText();
    }
}

function updateBulkSaveButtonText() {
    const bulkShopSelect = document.getElementById('bulk-target-shop');
    const selectedSid = bulkShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === selectedSid || s._id === selectedSid));
    const shopName = targetShop ? targetShop.name : 'Selected Shop';
    const saveBtn = document.getElementById('save-bulk-btn');
    if (saveBtn) {
        saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Save All Items to ${shopName}`;
    }
}

function addBulkRow(count = 1, prefillData = null) {
    const defaultCat = getSelectedBulkShopCategory();
    for (let i = 0; i < count; i++) {
        bulkItemsCache.push(prefillData ? { ...prefillData } : {
            name: '',
            category: defaultCat,
            type: 'veg',
            price: '',
            hasHalfFull: false,
            priceHalf: '',
            priceFull: '',
            image: '',
            description: ''
        });
    }
    renderBulkTable();
}

function removeBulkRow(idx) {
    bulkItemsCache.splice(idx, 1);
    if (bulkItemsCache.length === 0) {
        addBulkRow(1);
    } else {
        renderBulkTable();
    }
}

function clearEmptyBulkRows() {
    bulkItemsCache = bulkItemsCache.filter(item => (item.name && item.name.trim() !== '') || item.price || item.image);
    if (bulkItemsCache.length === 0) {
        addBulkRow(1);
    } else {
        renderBulkTable();
    }
}

function updateBulkRowField(idx, field, val) {
    if (bulkItemsCache[idx]) {
        bulkItemsCache[idx][field] = val;
    }
}

function toggleBulkRowHalfFull(idx, makeHalfFull) {
    if (bulkItemsCache[idx]) {
        bulkItemsCache[idx].hasHalfFull = makeHalfFull;
        if (makeHalfFull) {
            const currPrice = Number(bulkItemsCache[idx].price) || 50;
            bulkItemsCache[idx].priceHalf = currPrice;
            bulkItemsCache[idx].priceFull = Math.round(currPrice * 1.6);
        } else {
            bulkItemsCache[idx].priceHalf = '';
            bulkItemsCache[idx].priceFull = '';
        }
        renderBulkTable();
    }
}

function handleBulkRowPhotoUpload(idx, event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
        return;
    }

    compressAndLoadImage(file, function(base64Data) {
        if (bulkItemsCache[idx]) {
            bulkItemsCache[idx].image = base64Data;
            renderBulkTable();
            showToast(`📸 Photo attached to Item #${idx + 1}!`, 'success');
        }
    });
}

function handleBatchPhotosSelected(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const defaultCat = getSelectedBulkShopCategory();
    let loadedCount = 0;

    // Filter out completely blank rows
    bulkItemsCache = bulkItemsCache.filter(item => item.name && item.name.trim() !== '');

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        // Clean filename into dish name: e.g. "special-masala-dosa_1.jpg" -> "Special Masala Dosa"
        const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim();

        compressAndLoadImage(file, function(base64Data) {
            bulkItemsCache.push({
                name: cleanName,
                category: defaultCat,
                type: 'veg',
                price: '',
                hasHalfFull: false,
                priceHalf: '',
                priceFull: '',
                image: base64Data,
                description: `Fresh ${cleanName} available at counter.`
            });

            loadedCount++;
            if (loadedCount === files.length) {
                renderBulkTable();
                showToast(`🎉 Added ${files.length} items from photos! Please specify prices.`, 'success');
            }
        });
    });

    event.target.value = '';
}

function renderBulkTable() {
    const tbody = document.getElementById('bulk-table-tbody');
    const counter = document.getElementById('bulk-items-counter');
    if (counter) counter.textContent = bulkItemsCache.length;
    if (!tbody) return;

    if (bulkItemsCache.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
                    No items in list. Click "+ Add 1 Row" or select photos to begin.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bulkItemsCache.map((item, idx) => {
        const isHalfFull = !!item.hasHalfFull;
        const photoSrc = item.image || DEFAULT_FOOD_IMG;
        const isCustomPhoto = !!item.image;

        return `
            <tr>
                <td style="text-align: center; font-weight: 700; color: #64748b;">
                    ${idx + 1}
                </td>
                <td style="text-align: center;">
                    <div style="position: relative; display: inline-block; cursor: pointer;" onclick="document.getElementById('bulk-file-${idx}').click()" title="Click to upload/change photo for this item">
                        <img src="${photoSrc}" alt="Photo" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1.5px solid ${isCustomPhoto ? '#10b981' : '#cbd5e1'};">
                        <div style="position: absolute; bottom: -4px; right: -4px; background: ${isCustomPhoto ? '#10b981' : '#475569'}; color: white; border-radius: 9999px; width: 18px; height: 18px; font-size: 0.62rem; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                            <i class="fa-solid fa-camera"></i>
                        </div>
                    </div>
                    <input type="file" id="bulk-file-${idx}" accept="image/*" style="display: none;" onchange="handleBulkRowPhotoUpload(${idx}, event)">
                </td>
                <td>
                    <input type="text" class="form-input no-icon" placeholder="e.g. Special Masala Dosa..." value="${item.name || ''}"
                           oninput="updateBulkRowField(${idx}, 'name', this.value)"
                           style="padding: 0.35rem 0.55rem; font-size: 0.85rem; font-weight: 700;">
                </td>
                <td>
                    <select class="form-select no-icon" onchange="updateBulkRowField(${idx}, 'category', this.value)" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; font-weight: 600;">
                        <option value="Canteen Food" ${item.category === 'Canteen Food' ? 'selected' : ''}>🍔 Food</option>
                        <option value="Drinks & Juices" ${item.category === 'Drinks & Juices' ? 'selected' : ''}>🥤 Drinks</option>
                        <option value="Snacks & Chips" ${item.category === 'Snacks & Chips' ? 'selected' : ''}>🍿 Snacks</option>
                        <option value="Chocolates & Candies" ${item.category === 'Chocolates & Candies' ? 'selected' : ''}>🍫 Chocolates</option>
                        <option value="Stationery" ${item.category === 'Stationery' ? 'selected' : ''}>📚 Stationery</option>
                        <option value="Hostel Essentials" ${item.category === 'Hostel Essentials' ? 'selected' : ''}>🧴 Essentials</option>
                    </select>
                </td>
                <td>
                    <select class="form-select no-icon" onchange="updateBulkRowField(${idx}, 'type', this.value)" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; font-weight: 700; color: ${item.type === 'nonveg' ? '#dc2626' : '#16a34a'};">
                        <option value="veg" ${item.type === 'veg' ? 'selected' : ''}>🟢 Veg</option>
                        <option value="nonveg" ${item.type === 'nonveg' ? 'selected' : ''}>🔴 Non-Veg</option>
                    </select>
                </td>
                <td>
                    ${isHalfFull ? `
                        <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 2px;">
                                <span style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 4px; font-weight: 700;">H: ₹</span>
                                <input type="number" min="1" class="form-input no-icon" placeholder="Half" value="${item.priceHalf || ''}"
                                       oninput="updateBulkRowField(${idx}, 'priceHalf', Number(this.value)); updateBulkRowField(${idx}, 'price', Number(this.value));"
                                       style="padding: 0.25rem 0.35rem; font-size: 0.8rem; font-weight: 700; width: 55px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 2px;">
                                <span style="font-size: 0.7rem; background: #dcfce7; color: #15803d; padding: 1px 4px; border-radius: 4px; font-weight: 700;">F: ₹</span>
                                <input type="number" min="1" class="form-input no-icon" placeholder="Full" value="${item.priceFull || ''}"
                                       oninput="updateBulkRowField(${idx}, 'priceFull', Number(this.value));"
                                       style="padding: 0.25rem 0.35rem; font-size: 0.8rem; font-weight: 700; width: 55px;">
                            </div>
                            <button type="button" onclick="toggleBulkRowHalfFull(${idx}, false)" class="btn btn-outline btn-sm" style="font-size: 0.65rem; padding: 1px 4px;" title="Switch to Single Price">Single</button>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-weight: 700; color: #059669;">₹</span>
                            <input type="number" min="1" class="form-input no-icon" placeholder="Price" value="${item.price || ''}"
                                   oninput="updateBulkRowField(${idx}, 'price', Number(this.value));"
                                   style="padding: 0.35rem 0.5rem; font-size: 0.85rem; font-weight: 700; width: 75px;">
                            <button type="button" class="btn btn-outline btn-sm" onclick="toggleBulkRowHalfFull(${idx}, true)" style="font-size: 0.7rem; padding: 2px 5px; border-color: #7dd3fc; color: #0284c7;" title="Set Half & Full rates">
                                + Half/Full
                            </button>
                        </div>
                    `}
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeBulkRow(${idx})" style="color: #ef4444; border-color: #fca5a5; padding: 0.25rem 0.45rem;" title="Delete row">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function submitBulkAddItems() {
    const bulkShopSelect = document.getElementById('bulk-target-shop');
    const targetShopId = bulkShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === targetShopId || s._id === targetShopId)) || { name: 'TMU Central Food Court', category: 'Canteen Food' };

    // Validate and collect non-empty items
    const validItems = [];
    for (let i = 0; i < bulkItemsCache.length; i++) {
        const itm = bulkItemsCache[i];
        const name = (itm.name || '').trim();
        const hasHalfFull = !!itm.hasHalfFull;
        let price = Number(itm.price);
        let priceHalf = Number(itm.priceHalf);
        let priceFull = Number(itm.priceFull);

        if (!name && !price && !itm.image) {
            // Completely empty row, ignore
            continue;
        }

        if (!name) {
            showToast(`Row #${i + 1}: Please enter the item name.`, 'warning');
            return;
        }

        if (hasHalfFull) {
            if (isNaN(priceHalf) || isNaN(priceFull) || priceHalf <= 0 || priceFull <= 0) {
                showToast(`Row #${i + 1} ("${name}"): Please enter valid positive rates for both Half and Full.`, 'warning');
                return;
            }
            price = priceHalf;
        } else {
            if (isNaN(price) || price <= 0) {
                showToast(`Row #${i + 1} ("${name}"): Please enter a valid positive price.`, 'warning');
                return;
            }
        }

        const finalImg = itm.image || DEFAULT_FOOD_IMG;
        validItems.push({
            name,
            category: itm.category || targetShop.category || 'Canteen Food',
            type: itm.type || 'veg',
            price,
            hasHalfFull,
            priceHalf: hasHalfFull ? priceHalf : null,
            priceFull: hasHalfFull ? priceFull : null,
            image: finalImg,
            imageUrl: finalImg,
            description: itm.description || `Fresh ${name} available at ${targetShop.name}.`,
            shopId: targetShopId,
            shopName: targetShop.name,
            available: true,
            isAvailable: true
        });
    }

    if (validItems.length === 0) {
        showToast('Please add at least 1 valid item with Name and Price before saving.', 'warning');
        return;
    }

    const saveBtn = document.getElementById('save-bulk-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving ${validItems.length} Items to ${targetShop.name}...`;
    }

    try {
        const res = await api.bulkImportMenu(validItems, targetShopId, targetShop.name, false);
        if (res.success) {
            showToast(`🎉 Successfully added ${res.count || validItems.length} items to "${targetShop.name}"!`, 'success');
            bulkItemsCache = [];
            closeModal('admin-bulk-add-modal');
            activeShopScope = targetShopId;
            const topSelect = document.getElementById('admin-active-shop-select');
            if (topSelect) topSelect.value = targetShopId;
            currentFoodFilter = 'all';
            document.querySelectorAll('.admin-food-filter-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-category') === 'all');
            });
            await loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to save bulk items.', 'error');
        }
    } catch (err) {
        console.error('Bulk save error:', err);
        showToast('Error saving items: ' + err.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            updateBulkSaveButtonText();
        }
    }
}

// --------------------------------------------------------------------------
// 2.2 AI / OCR MENU CARD PHOTO SCANNER & BULK IMPORTER
// --------------------------------------------------------------------------

function openMenuScannerModal() {
    resetScannerModal();
    const targetSelect = document.getElementById('scanner-target-shop');
    if (targetSelect && adminShops.length > 0) {
        let matching = adminShops.find(s => s.category === activeShopScope || s.shopId === activeShopScope);
        if (matching) {
            targetSelect.value = matching.shopId || matching._id;
        } else {
            targetSelect.value = adminShops[0].shopId || adminShops[0]._id;
        }
    }
    document.getElementById('admin-scanner-modal').classList.add('active');
}

function resetScannerModal() {
    scannedItemsCache = [];
    document.getElementById('scanner-step-upload').style.display = 'block';
    document.getElementById('scanner-step-loading').style.display = 'none';
    document.getElementById('scanner-step-review').style.display = 'none';
    const fileInput = document.getElementById('scanner-file-input');
    if (fileInput) fileInput.value = '';
    const textInput = document.getElementById('scanner-text-input');
    if (textInput) textInput.value = '';
    switchScannerMode('photo');
}

function switchScannerMode(mode) {
    const photoBtn = document.getElementById('scanner-tab-btn-photo');
    const textBtn = document.getElementById('scanner-tab-btn-text');
    const photoSection = document.getElementById('scanner-mode-photo');
    const textSection = document.getElementById('scanner-mode-text');

    if (photoBtn) photoBtn.classList.toggle('active', mode === 'photo');
    if (textBtn) textBtn.classList.toggle('active', mode === 'text');
    if (photoSection) photoSection.style.display = (mode === 'photo' ? 'block' : 'none');
    if (textSection) textSection.style.display = (mode === 'text' ? 'block' : 'none');
}

async function handleScanTextPasted() {
    const textarea = document.getElementById('scanner-text-input');
    const rawText = textarea ? textarea.value.trim() : '';
    if (!rawText) {
        showToast('Please paste or write your menu items and prices first.', 'warning');
        return;
    }

    const targetShopSelect = document.getElementById('scanner-target-shop');
    const targetShopId = targetShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === targetShopId || s._id === targetShopId)) || { name: 'TMU Central Food Court', category: 'Canteen Food' };

    document.getElementById('scanner-step-upload').style.display = 'none';
    document.getElementById('scanner-step-loading').style.display = 'block';
    document.getElementById('scanner-step-review').style.display = 'none';

    const progressBar = document.getElementById('scanner-progress-bar');
    const statusText = document.getElementById('scanner-status-text');

    if (statusText) statusText.textContent = '✨ Parsing menu list, prices & auto-assigning HD photos...';
    if (progressBar) progressBar.style.width = '75%';

    try {
        const parseRes = await api.smartParseMenu(rawText, targetShopId, targetShop.category);
        let items = [];
        if (parseRes.success && parseRes.items && parseRes.items.length > 0) {
            items = parseRes.items;
        } else {
            items = parseFallbackSample(targetShop.category || 'Canteen Food', targetShopId, targetShop.name);
        }

        scannedItemsCache = items;
        renderScannerPreviewTable(items, targetShop.name);
    } catch (err) {
        console.error('Error parsing text:', err);
        const fallbackItems = parseFallbackSample(targetShop.category || 'Canteen Food', targetShopId, targetShop.name);
        scannedItemsCache = fallbackItems;
        renderScannerPreviewTable(fallbackItems, targetShop.name);
    }
}

async function handleMenuPhotoUploaded(event) {
    const file = event.target.files[0];
    if (!file) return;

    const targetShopSelect = document.getElementById('scanner-target-shop');
    const targetShopId = targetShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === targetShopId || s._id === targetShopId)) || { name: 'TMU Central Food Court', category: 'Canteen Food' };

    document.getElementById('scanner-step-upload').style.display = 'none';
    document.getElementById('scanner-step-loading').style.display = 'block';
    document.getElementById('scanner-step-review').style.display = 'none';

    const progressBar = document.getElementById('scanner-progress-bar');
    const statusText = document.getElementById('scanner-status-text');

    if (statusText) statusText.textContent = '📸 Pre-processing menu photo & initializing AI OCR...';
    if (progressBar) progressBar.style.width = '25%';

    try {
        let extractedText = '';

        if (window.Tesseract) {
            if (statusText) statusText.textContent = '🔍 Reading dish names, prices & categories from photo...';
            if (progressBar) progressBar.style.width = '60%';

            const result = await Tesseract.recognize(file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text' && progressBar) {
                        const pct = Math.round(50 + (m.progress * 40));
                        progressBar.style.width = `${pct}%`;
                    }
                }
            });
            extractedText = result.data.text || '';
        }

        if (statusText) statusText.textContent = '✨ Parsing items, formatting clean text & matching HD photos...';
        if (progressBar) progressBar.style.width = '95%';

        let items = [];
        if (extractedText.trim().length > 5) {
            const parseRes = await api.smartParseMenu(extractedText, targetShopId, targetShop.category);
            if (parseRes.success && parseRes.items && parseRes.items.length > 0) {
                items = parseRes.items;
            }
        }

        if (items.length === 0) {
            items = parseFallbackSample(targetShop.category || 'Canteen Food', targetShopId, targetShop.name);
        }

        scannedItemsCache = items;
        renderScannerPreviewTable(items, targetShop.name);
    } catch (err) {
        console.error('OCR Error:', err);
        const fallbackItems = parseFallbackSample(targetShop.category || 'Canteen Food', targetShopId, targetShop.name);
        scannedItemsCache = fallbackItems;
        renderScannerPreviewTable(fallbackItems, targetShop.name);
    }
}

function testScannerSample(sampleType) {
    const targetShopSelect = document.getElementById('scanner-target-shop');
    let targetShopId = targetShopSelect?.value || 'shop-1';
    let targetShop = adminShops.find(s => (s.shopId === targetShopId || s._id === targetShopId)) || { name: 'TMU Central Food Court', category: 'Canteen Food' };

    document.getElementById('scanner-step-upload').style.display = 'none';
    document.getElementById('scanner-step-loading').style.display = 'block';
    document.getElementById('scanner-step-review').style.display = 'none';

    const progressBar = document.getElementById('scanner-progress-bar');
    const statusText = document.getElementById('scanner-status-text');

    if (statusText) statusText.textContent = `🚀 Scanning sample ${sampleType.toUpperCase()} rate chart photo...`;
    if (progressBar) progressBar.style.width = '70%';

    setTimeout(() => {
        let items = [];
        if (sampleType === 'canteen') {
            targetShopId = 'shop-1';
            targetShop = adminShops.find(s => s.shopId === 'shop-1') || { name: 'TMU Central Food Court', category: 'Canteen Food' };
            items = [
                { name: 'Paneer Butter Masala', price: 90, category: 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.thali, description: 'Rich creamy paneer curry in butter gravy', available: true, shopId: 'shop-1', shopName: targetShop.name },
                { name: 'Crispy Veg Burger', price: 45, category: 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.sandwich, description: 'Golden potato patty with fresh coleslaw', available: true, shopId: 'shop-1', shopName: targetShop.name },
                { name: 'Hot Butter Aloo Paratha', price: 40, category: 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.dosa, description: 'Spiced potato stuffed whole wheat paratha', available: true, shopId: 'shop-1', shopName: targetShop.name },
                { name: 'Schezwan Veg Chowmein', price: 60, category: 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.maggi, description: 'Spicy wok tossed noodles with crunchy veggies', available: true, shopId: 'shop-1', shopName: targetShop.name },
                { name: 'Chicken Dum Biryani', price: 120, category: 'Canteen Food', type: 'nonveg', image: PRESET_FOOD_PHOTOS.thali, description: 'Fragrant basmati rice cooked with tender chicken', available: true, shopId: 'shop-1', shopName: targetShop.name }
            ];
        } else if (sampleType === 'chai') {
            targetShopId = 'shop-4';
            targetShop = adminShops.find(s => s.shopId === 'shop-4') || { name: 'Chai, Shakes & Juice Bar', category: 'Drinks & Juices' };
            items = [
                { name: 'Special Adrak Elaichi Chai', price: 15, category: 'Drinks & Juices', type: 'veg', image: PRESET_FOOD_PHOTOS.coffee, description: 'Freshly brewed strong ginger cardamom milk tea', available: true, shopId: 'shop-4', shopName: targetShop.name },
                { name: 'Thick Cold Coffee with Ice Cream', price: 50, category: 'Drinks & Juices', type: 'veg', image: PRESET_FOOD_PHOTOS.coffee, description: 'Creamy blended cold coffee with chocolate scoop', available: true, shopId: 'shop-4', shopName: targetShop.name },
                { name: 'Fresh Mosambi Sweet Lime Juice', price: 40, category: 'Drinks & Juices', type: 'veg', image: PRESET_FOOD_PHOTOS.coffee, description: '100% fresh cold pressed citrus juice', available: true, shopId: 'shop-4', shopName: targetShop.name },
                { name: 'Oreo Milkshake Jar', price: 60, category: 'Drinks & Juices', type: 'veg', image: PRESET_FOOD_PHOTOS.coffee, description: 'Crunchy crushed Oreo cookies with chocolate sauce', available: true, shopId: 'shop-4', shopName: targetShop.name }
            ];
        } else {
            targetShopId = 'shop-5';
            targetShop = adminShops.find(s => s.shopId === 'shop-5') || { name: 'University Stationery & Xerox Store', category: 'Stationery' };
            items = [
                { name: 'Classmate 300 Page Spiral Register', price: 65, category: 'Stationery', type: 'veg', image: PRESET_FOOD_PHOTOS.register, description: 'High quality smooth bright ruled pages', available: true, shopId: 'shop-5', shopName: targetShop.name },
                { name: 'Reynolds Jetter Blue Gel Pen (Set of 2)', price: 20, category: 'Stationery', type: 'veg', image: PRESET_FOOD_PHOTOS.pen, description: 'Smooth waterproof fast writing pens', available: true, shopId: 'shop-5', shopName: targetShop.name },
                { name: 'BCA Practical Lab File Folder', price: 25, category: 'Stationery', type: 'veg', image: PRESET_FOOD_PHOTOS.register, description: 'Sturdy transparent clip file for submissions', available: true, shopId: 'shop-5', shopName: targetShop.name },
                { name: 'A4 Laser Print Paper (Pack of 100)', price: 60, category: 'Stationery', type: 'veg', image: PRESET_FOOD_PHOTOS.register, description: '75 GSM bright white photocopy sheets', available: true, shopId: 'shop-5', shopName: targetShop.name }
            ];
        }

        if (targetShopSelect) targetShopSelect.value = targetShopId;
        scannedItemsCache = items;
        renderScannerPreviewTable(items, targetShop.name);
    }, 500);
}

function parseFallbackSample(cat, shopId, shopName) {
    return [
        { name: 'Masala Samosa (2 Pcs)', price: 25, category: cat || 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.samosa, description: 'Crispy fried golden samosas with chutney', available: true, shopId, shopName },
        { name: 'Cheese Grilled Sandwich', price: 50, category: cat || 'Canteen Food', type: 'veg', image: PRESET_FOOD_PHOTOS.sandwich, description: 'Toasted vegetable sandwich with cheese slice', available: true, shopId, shopName },
        { name: 'Cold Beverage Can', price: 40, category: cat || 'Drinks & Juices', type: 'veg', image: PRESET_FOOD_PHOTOS.coffee, description: 'Chilled refreshing drink', available: true, shopId, shopName }
    ];
}

function renderScannerPreviewTable(items, shopName) {
    document.getElementById('scanner-step-upload').style.display = 'none';
    document.getElementById('scanner-step-loading').style.display = 'none';
    document.getElementById('scanner-step-review').style.display = 'block';

    const countBadge = document.getElementById('scanner-detected-count');
    const shopNameBadge = document.getElementById('scanner-review-shop-name');
    const tbody = document.getElementById('scanner-preview-tbody');

    if (countBadge) countBadge.textContent = items.length;
    if (shopNameBadge) shopNameBadge.textContent = shopName || 'Your Shop';

    if (!tbody) return;
    tbody.innerHTML = items.map((item, idx) => {
        const isHalfFull = !!item.hasHalfFull;
        return `
            <tr>
                <td>
                    <input type="text" class="form-input no-icon" value="${item.name}" 
                           onchange="updateScannedItemField(${idx}, 'name', this.value)" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; font-weight: 700;">
                </td>
                <td>
                    <select class="form-select no-icon" onchange="updateScannedItemField(${idx}, 'category', this.value)" style="padding: 0.35rem 0.5rem; font-size: 0.82rem;">
                        <option value="Canteen Food" ${item.category === 'Canteen Food' ? 'selected' : ''}>Food</option>
                        <option value="Drinks & Juices" ${item.category === 'Drinks & Juices' ? 'selected' : ''}>Drinks</option>
                        <option value="Snacks & Chips" ${item.category === 'Snacks & Chips' ? 'selected' : ''}>Snacks</option>
                        <option value="Chocolates & Candies" ${item.category === 'Chocolates & Candies' ? 'selected' : ''}>Chocolates</option>
                        <option value="Stationery" ${item.category === 'Stationery' ? 'selected' : ''}>Stationery</option>
                        <option value="Hostel Essentials" ${item.category === 'Hostel Essentials' ? 'selected' : ''}>Essentials</option>
                    </select>
                </td>
                <td>
                    <select class="form-select no-icon" onchange="updateScannedItemField(${idx}, 'type', this.value)" style="padding: 0.35rem 0.5rem; font-size: 0.82rem; font-weight: 700; color: ${item.type === 'nonveg' ? '#dc2626' : '#16a34a'};">
                        <option value="veg" ${item.type === 'veg' ? 'selected' : ''}>🟢 Veg</option>
                        <option value="nonveg" ${item.type === 'nonveg' ? 'selected' : ''}>🔴 Non-Veg</option>
                    </select>
                </td>
                <td style="min-width: 230px;">
                    ${isHalfFull ? `
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 2px;">
                                <span style="font-size: 0.72rem; background: #e0f2fe; color: #0369a1; padding: 2px 5px; border-radius: 4px; font-weight: 700;">Half</span>
                                <input type="number" min="1" class="form-input no-icon" value="${item.priceHalf || item.price}" 
                                       onchange="updateScannedItemField(${idx}, 'priceHalf', Number(this.value)); updateScannedItemField(${idx}, 'price', Number(this.value));" 
                                       style="padding: 0.25rem 0.4rem; font-size: 0.82rem; font-weight: 700; width: 62px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 2px;">
                                <span style="font-size: 0.72rem; background: #dcfce7; color: #15803d; padding: 2px 5px; border-radius: 4px; font-weight: 700;">Full</span>
                                <input type="number" min="1" class="form-input no-icon" value="${item.priceFull || item.price}" 
                                       onchange="updateScannedItemField(${idx}, 'priceFull', Number(this.value));" 
                                       style="padding: 0.25rem 0.4rem; font-size: 0.82rem; font-weight: 700; width: 62px;">
                            </div>
                            <button type="button" onclick="toggleScannedItemHalfFull(${idx}, false)" class="btn btn-outline btn-sm" style="font-size: 0.68rem; padding: 1px 4px;" title="Switch to Single Rate">Single</button>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-weight: 700; color: var(--primary);">₹</span>
                            <input type="number" min="1" class="form-input no-icon" value="${item.price}" 
                                   onchange="updateScannedItemField(${idx}, 'price', Number(this.value))" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; font-weight: 700; width: 75px;">
                            <button type="button" class="btn btn-outline btn-sm" onclick="toggleScannedItemHalfFull(${idx}, true)" style="font-size: 0.72rem; padding: 2px 6px; border-color: #7dd3fc; color: #0284c7;" title="Add Half and Full prices">
                                + Half/Full
                            </button>
                        </div>
                    `}
                </td>
                <td>
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeScannedItemRow(${idx})" style="color: #ef4444; border-color: #fca5a5; padding: 0.25rem 0.5rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateScannedItemField(idx, field, val) {
    if (scannedItemsCache[idx]) {
        scannedItemsCache[idx][field] = val;
    }
}

function toggleScannedItemHalfFull(idx, makeHalfFull) {
    if (scannedItemsCache[idx]) {
        scannedItemsCache[idx].hasHalfFull = makeHalfFull;
        if (makeHalfFull) {
            const currentPrice = Number(scannedItemsCache[idx].price) || 100;
            scannedItemsCache[idx].priceHalf = currentPrice;
            scannedItemsCache[idx].priceFull = Math.round(currentPrice * 1.5);
        } else {
            scannedItemsCache[idx].priceHalf = null;
            scannedItemsCache[idx].priceFull = null;
        }
        const targetShopSelect = document.getElementById('scanner-target-shop');
        const targetShop = adminShops.find(s => (s.shopId === targetShopSelect?.value || s._id === targetShopSelect?.value)) || { name: 'TMU Central Food Court' };
        renderScannerPreviewTable(scannedItemsCache, targetShop.name);
    }
}

function removeScannedItemRow(idx) {
    scannedItemsCache.splice(idx, 1);
    const targetShopSelect = document.getElementById('scanner-target-shop');
    const targetShop = adminShops.find(s => (s.shopId === targetShopSelect?.value || s._id === targetShopSelect?.value)) || { name: 'TMU Central Food Court' };
    renderScannerPreviewTable(scannedItemsCache, targetShop.name);
}

async function executeBulkImport() {
    if (!scannedItemsCache || scannedItemsCache.length === 0) {
        showToast('No items available to import.', 'warning');
        return;
    }

    const importBtn = document.getElementById('scanner-bulk-import-btn');
    const targetShopSelect = document.getElementById('scanner-target-shop');
    const targetShopId = targetShopSelect?.value || 'shop-1';
    const targetShop = adminShops.find(s => (s.shopId === targetShopId || s._id === targetShopId)) || { name: 'TMU Central Food Court' };
    const replaceExisting = document.getElementById('scanner-replace-menu-checkbox')?.checked || false;

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing Items to Database...';
    }

    try {
        const res = await api.bulkImportMenu(scannedItemsCache, targetShopId, targetShop.name, replaceExisting);
        if (res.success) {
            showToast(`🎉 Successfully imported ${res.count || scannedItemsCache.length} items to ${targetShop.name}!`, 'success');
            closeModal('admin-scanner-modal');
            loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to import items.', 'error');
        }
    } catch (err) {
        console.error('Bulk import error:', err);
        showToast('Bulk import error: ' + err.message, 'error');
    } finally {
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Import All Items to Shop Menu';
        }
    }
}

async function toggleItemAvailability(itemId, newStatus) {
    try {
        const res = await api.toggleStock(itemId, newStatus);
        if (res.success) {
            showToast('Stock status updated.', 'info');
            loadAdminDashboardData();
        } else {
            showToast('Could not update status.', 'error');
        }
    } catch (error) {
        console.error('Error updating availability:', error);
        showToast('Could not update status: ' + error.message, 'error');
    }
}

async function deleteFoodItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to permanently delete "${itemName}" from the canteen menu in MongoDB?`)) return;

    try {
        const res = await api.deleteFoodItem(itemId);
        if (res.success) {
            showToast(`"${itemName}" deleted from menu.`, 'info');
            loadAdminDashboardData();
        } else {
            showToast('Could not delete item: ' + res.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting food item:', error);
        showToast('Could not delete item: ' + error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// 3. 1-CLICK SAMPLE DATA SEEDER
// --------------------------------------------------------------------------
async function seedSampleDishes() {
    if (!confirm('This will load 10+ sample canteen dishes (Samosa, Aloo Paratha, Chowmein, etc.) into MongoDB. Proceed?')) return;

    const seedBtn = document.getElementById('seed-dishes-btn');
    if (seedBtn) {
        seedBtn.disabled = true;
        seedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding MongoDB...';
    }

    try {
        const res = await api.seedDishes();
        if (res.success) {
            showToast('10+ Sample dishes populated successfully in MongoDB!', 'success', 'Demo Ready');
            loadAdminDashboardData();
        } else {
            showToast('Failed to seed dishes.', 'error');
        }
    } catch (error) {
        console.error('Error seeding dishes:', error);
        showToast('Failed to seed dishes: ' + error.message, 'error');
    } finally {
        if (seedBtn) {
            seedBtn.disabled = false;
            seedBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Load 10+ Sample Dishes';
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

let pendingStaffList = [];
let activeStaffList = [];

// --------------------------------------------------------------------------
// 4. STAFF APPROVAL & PERMISSIONS (SUPER ADMIN)
// --------------------------------------------------------------------------
async function loadStaffData() {
    try {
        const res = await api.getStaffList();
        if (res.success) {
            pendingStaffList = res.pendingStaff || [];
            activeStaffList = res.activeStaff || [];
            renderStaffTables();
        }
    } catch (error) {
        console.error('Error loading staff data:', error);
    }
}

function renderStaffTables() {
    const pendingBody = document.getElementById('pending-staff-table-body');
    const activeBody = document.getElementById('active-staff-table-body');
    const badge = document.getElementById('pending-staff-badge');

    // Update Badge
    if (badge) {
        if (pendingStaffList.length > 0) {
            badge.textContent = pendingStaffList.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // 1. Render Pending Requests Table (7 Columns)
    if (pendingBody) {
        if (pendingStaffList.length === 0) {
            pendingBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fa-solid fa-circle-check" style="font-size: 1.8rem; color: #10b981; margin-bottom: 0.4rem; display: block;"></i>
                        No pending staff access requests. All applications are reviewed!
                    </td>
                </tr>
            `;
        } else {
            pendingBody.innerHTML = pendingStaffList.map(applicant => {
                const appId = applicant._id || applicant.uid;
                let formattedTime = 'Recent';
                if (applicant.createdAt) {
                    try {
                        formattedTime = new Date(applicant.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                    } catch (e) {
                        formattedTime = applicant.createdAt;
                    }
                }

                const currentShopChoice = applicant.assignedShop || 'All';

                return `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: var(--secondary);">${applicant.name}</div>
                            <span style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                                Pending Review
                            </span>
                        </td>
                        <td>
                            <div>${applicant.email}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${applicant.phone || 'N/A'}</div>
                        </td>
                        <td>
                            <div><strong>Roll:</strong> ${applicant.rollNo || 'N/A'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${applicant.department || 'BCA'}</div>
                        </td>
                        <td>
                            <strong style="color: var(--primary);">${applicant.staffDesignation || 'Counter Staff'}</strong>
                        </td>
                        <td>
                            <select id="staff-assign-shop-${appId}" class="form-select no-icon" style="padding: 0.35rem 0.5rem; font-size: 0.82rem; font-weight: 600; border-radius: 6px; border: 1.5px solid #cbd5e1; cursor: pointer;">
                                <option value="All" ${currentShopChoice === 'All' ? 'selected' : ''}>🏪 All Shops (Full Access)</option>
                                <option value="Canteen Food" ${currentShopChoice === 'Canteen Food' ? 'selected' : ''}>🍔 Canteen Food</option>
                                <option value="Stationery" ${currentShopChoice === 'Stationery' ? 'selected' : ''}>📚 Stationery</option>
                                <option value="Chocolates & Candies" ${currentShopChoice === 'Chocolates & Candies' ? 'selected' : ''}>🍫 Chocolates & Sweets</option>
                                <option value="Snacks & Chips" ${currentShopChoice === 'Snacks & Chips' ? 'selected' : ''}>🍿 Snacks & Chips</option>
                                <option value="Drinks & Juices" ${currentShopChoice === 'Drinks & Juices' ? 'selected' : ''}>🥤 Cold Drinks & Juices</option>
                                <option value="Hostel Essentials" ${currentShopChoice === 'Hostel Essentials' ? 'selected' : ''}>🧴 Hostel Essentials</option>
                            </select>
                        </td>
                        <td style="font-size: 0.82rem; color: var(--text-muted);">
                            ${formattedTime}
                        </td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-sm btn-success" onclick="approveStaffApplicant('${appId}', '${applicant.name}')">
                                    <i class="fa-solid fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;" onclick="handleStaffApproval('${appId}', 'reject', '${applicant.name}')">
                                    <i class="fa-solid fa-xmark"></i> Reject
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. Render Active Staff Table (7 Columns)
    if (activeBody) {
        if (activeStaffList.length === 0) {
            activeBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No staff members found.
                    </td>
                </tr>
            `;
        } else {
            activeBody.innerHTML = activeStaffList.map(staff => {
                const staffId = staff._id || staff.uid;
                const isMainSuper = staff.email === 'deepaksharma74521@gmail.com' || staff.email === 'admin@canteen.edu' || staff.role === 'superadmin';
                const assignedShopLabel = staff.assignedShop || (isMainSuper ? 'All Shops (Master)' : 'All Shops');

                return `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: var(--secondary);">${staff.name}</div>
                            ${isMainSuper ? '<span style="font-size: 0.72rem; background: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">SUPER ADMIN (OWNER)</span>' : ''}
                        </td>
                        <td>
                            <span style="font-weight: 700; color: #0f766e; background: #ccfbf1; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; border: 1px solid #99f6e4; display: inline-block;">
                                <i class="fa-solid fa-store" style="font-size: 0.72rem; margin-right: 3px;"></i> ${assignedShopLabel}
                            </span>
                        </td>
                        <td>${staff.email}</td>
                        <td>${staff.phone || 'N/A'}</td>
                        <td>
                            <span style="font-weight: 600; color: #334155;">${staff.staffDesignation || (isMainSuper ? 'System Super Admin' : 'Canteen Admin')}</span>
                        </td>
                        <td>
                            <span class="status-badge status-ready" style="font-size: 0.75rem;">Active &bull; Authorized</span>
                        </td>
                        <td>
                            ${isMainSuper ? `
                                <span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Protected Account</span>
                            ` : `
                                <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="handleStaffApproval('${staffId}', 'revoke', '${staff.name}')">
                                    <i class="fa-solid fa-user-minus"></i> Revoke Access
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function approveStaffApplicant(appId, staffName) {
    const shopSelect = document.getElementById(`staff-assign-shop-${appId}`);
    const selectedShop = shopSelect ? shopSelect.value : 'All';
    handleStaffApproval(appId, 'approve', staffName, selectedShop);
}

async function handleStaffApproval(userId, action, staffName, assignedShop = null) {
    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');
    if (!isSuperAdmin) {
        showToast('Permission Denied: Only Super Admin Deepak Sharma can approve or revoke staff permissions.', 'error', 'Access Restricted');
        return;
    }

    const actionText = action === 'approve' 
        ? `Approve ${staffName} as Admin for "${assignedShop || 'All Shops'}"?` 
        : (action === 'revoke' ? `Revoke Admin privileges from ${staffName}?` : `Reject ${staffName}'s staff request?`);
    if (!confirm(actionText)) return;

    try {
        const res = await api.manageStaff(userId, action, assignedShop);
        if (res.success) {
            showToast(res.message, action === 'approve' ? 'success' : 'info');
            loadStaffData();
        } else {
            showToast(res.message || 'Operation failed.', 'error');
        }
    } catch (error) {
        console.error('Staff action error:', error);
        showToast('Error updating staff permission: ' + error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// 5. STUDENT FEEDBACKS & RATINGS MANAGEMENT
// --------------------------------------------------------------------------

async function loadFeedbackData() {
    try {
        const feedbacksRes = await api.getFeedbacks();

        if (feedbacksRes.success && feedbacksRes.feedbacks) {
            adminFeedbacks = feedbacksRes.feedbacks;
            renderFeedbackTable();
        }

        // Calculate Analytics dynamically for current activeShopScope
        const scopedFeedbacks = adminFeedbacks.filter(fb => feedbackBelongsToShop(fb, activeShopScope));
        const total = scopedFeedbacks.length;
        
        let avg = "5.0";
        const dist = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
        
        if (total > 0) {
            const sum = scopedFeedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
            avg = (sum / total).toFixed(1);
            scopedFeedbacks.forEach(f => {
                const r = String(f.rating || 5);
                if (dist[r] !== undefined) dist[r]++;
                else dist["5"]++;
            });
        }

        // Update Average Score Display
        const avgEl = document.getElementById('feedback-avg-display');
        if (avgEl) avgEl.textContent = avg;

        const totalLabel = document.getElementById('feedback-total-reviews-label');
        if (totalLabel) totalLabel.textContent = total;

        const badge = document.getElementById('feedback-count-badge');
        if (badge) badge.textContent = total;

        // Render Star Icons Summary
        const starsContainer = document.getElementById('feedback-stars-summary');
        if (starsContainer) {
            const numericAvg = parseFloat(avg);
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (numericAvg >= i) {
                    starsHtml += '<i class="fa-solid fa-star"></i>';
                } else if (numericAvg >= i - 0.5) {
                    starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
                } else {
                    starsHtml += '<i class="fa-regular fa-star"></i>';
                }
            }
            starsContainer.innerHTML = starsHtml;
        }

        // Update Distribution Percentage Bars
        for (let star = 1; star <= 5; star++) {
            const count = dist[String(star)] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const barEl = document.getElementById(`bar-star-${star}`);
            const countEl = document.getElementById(`count-star-${star}`);

            if (barEl) barEl.style.width = `${pct}%`;
            if (countEl) countEl.textContent = `${count} (${pct}%)`;
        }
    } catch (err) {
        console.error('Error loading feedback data:', err);
    }
}

function renderFeedbackTable() {
    const tableBody = document.getElementById('admin-feedback-table-body');
    const searchVal = document.getElementById('admin-feedback-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');

    let filtered = adminFeedbacks.filter(fb => {
        const matchesScope = feedbackBelongsToShop(fb, activeShopScope);
        const matchesStar = (currentFeedbackFilter === 'all') || (String(fb.rating) === String(currentFeedbackFilter));
        const matchesSearch = !searchVal ||
                              (fb.userName && fb.userName.toLowerCase().includes(searchVal)) ||
                              (fb.userRoll && fb.userRoll.toLowerCase().includes(searchVal)) ||
                              (fb.orderId && fb.orderId.toLowerCase().includes(searchVal)) ||
                              (fb.comment && fb.comment.toLowerCase().includes(searchVal)) ||
                              (Array.isArray(fb.tags) && fb.tags.some(t => t.toLowerCase().includes(searchVal)));
        return matchesScope && matchesStar && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-comment-dots" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: #f59e0b;"></i>
                    No feedback reviews found for <strong>${activeShopScope === 'All' ? 'All Shops' : activeShopScope}</strong> with this filter.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(fb => {
        const fbId = fb._id || fb.id;
        const rating = fb.rating || 5;

        let formattedDate = 'Recent';
        if (fb.createdAt) {
            try {
                formattedDate = new Date(fb.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            } catch (e) {
                formattedDate = fb.createdAt;
            }
        }

        // Generate Rating Stars HTML
        let starsHtml = '';
        for (let s = 1; s <= 5; s++) {
            starsHtml += `<i class="fa-${s <= rating ? 'solid' : 'regular'} fa-star" style="color: #f59e0b; font-size: 0.85rem;"></i>`;
        }

        // Generate Tags HTML
        const tagsHtml = (fb.tags && fb.tags.length > 0)
            ? fb.tags.map(t => `<span class="feedback-tag-badge">${t}</span>`).join('')
            : '<span style="color: var(--text-muted); font-size: 0.78rem; font-style: italic;">No tags</span>';

        return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: var(--secondary);">${fb.userName || 'Student'}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${fb.userRoll || 'BCA / Campus'}</div>
                </td>
                <td>
                    <strong style="color: var(--primary); font-size: 0.88rem;">${fb.orderId || 'General'}</strong>
                </td>
                <td>
                    <div style="display: flex; gap: 0.15rem; margin-bottom: 0.2rem;">
                        ${starsHtml}
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #92400e; background: #fef3c7; padding: 1px 6px; border-radius: 4px;">
                        ${rating} / 5 Stars
                    </span>
                </td>
                <td style="max-width: 200px;">
                    <div>${tagsHtml}</div>
                </td>
                <td style="max-width: 320px;">
                    <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.5; font-style: italic;">
                        "${fb.comment || 'Smooth service!'}"
                    </div>
                </td>
                <td style="font-size: 0.82rem; color: var(--text-muted); white-space: nowrap;">
                    ${formattedDate}
                </td>
                <td>
                    ${isSuperAdmin ? `
                        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" 
                                onclick="deleteFeedbackItem('${fbId}', '${fb.userName || 'Student'}')" title="Delete feedback (Super Admin)">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : `
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Verified</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteFeedbackItem(feedbackId, studentName) {
    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');
    if (!isSuperAdmin) {
        showToast('Only Super Admin Deepak can remove customer feedback reviews.', 'warning', 'Permission Required');
        return;
    }

    if (!confirm(`Are you sure you want to delete this review from ${studentName}?`)) return;

    try {
        const res = await api.deleteFeedback(feedbackId);
        if (res.success) {
            showToast('Feedback removed successfully.', 'info');
            loadFeedbackData();
        } else {
            showToast(res.message || 'Failed to delete feedback.', 'error');
        }
    } catch (err) {
        console.error('Error deleting feedback:', err);
        showToast('Error deleting feedback: ' + err.message, 'error');
    }
}

function switchAdminTab(tabName) {
    const isSuperAdmin = currentUserProfile && (currentUserProfile.role === 'superadmin' || currentUserProfile.email === 'deepaksharma74521@gmail.com' || currentUserProfile.email === 'admin@canteen.edu');

    if (tabName === 'staff' && !isSuperAdmin) {
        showToast('Access Restricted: Only Super Admin Deepak Sharma can view Staff Approvals & Permissions.', 'warning', 'Permission Required');
        tabName = 'orders';
    }

    currentAdminTab = tabName;

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    const ordersSection = document.getElementById('admin-orders-section');
    const menuSection = document.getElementById('admin-menu-section');
    const shopSection = document.getElementById('admin-shop-section');
    const staffSection = document.getElementById('admin-staff-section');
    const feedbacksSection = document.getElementById('admin-feedbacks-section');
    const parcelsSection = document.getElementById('admin-parcels-section');
    const commissionsSection = document.getElementById('admin-commissions-section');
    const deliverySection = document.getElementById('admin-delivery-section');

    if (ordersSection) ordersSection.style.display = (tabName === 'orders' ? 'block' : 'none');
    if (menuSection) menuSection.style.display = (tabName === 'menu' ? 'block' : 'none');
    if (shopSection) shopSection.style.display = (tabName === 'shop' ? 'block' : 'none');
    if (staffSection) staffSection.style.display = (tabName === 'staff' ? 'block' : 'none');
    if (feedbacksSection) feedbacksSection.style.display = (tabName === 'feedbacks' ? 'block' : 'none');
    if (parcelsSection) parcelsSection.style.display = (tabName === 'parcels' ? 'block' : 'none');
    if (commissionsSection) commissionsSection.style.display = (tabName === 'commissions' ? 'block' : 'none');
    if (deliverySection) deliverySection.style.display = (tabName === 'delivery' ? 'block' : 'none');

    if (tabName === 'shop') {
        populateShopProfileForm();
    } else if (tabName === 'staff') {
        loadStaffData();
    } else if (tabName === 'feedbacks') {
        loadFeedbackData();
    } else if (tabName === 'parcels') {
        loadAdminParcels();
    } else if (tabName === 'commissions') {
        loadCommissionsLedger();
    } else if (tabName === 'delivery') {
        loadAdminDeliveryDashboard();
    }
}

// --------------------------------------------------------------------------
// 7. GATE NO. 2 PARCEL CONCIERGE MANAGEMENT (RUNNERS & TASKS)
// --------------------------------------------------------------------------

async function loadAdminParcels() {
    try {
        const res = await api.getParcels();
        if (res.success && res.parcels) {
            adminParcels = res.parcels;
            const activeCount = adminParcels.filter(p => !['Delivered', 'Cancelled'].includes(p.status)).length;
            const badge = document.getElementById('admin-parcels-badge');
            if (badge) {
                badge.textContent = activeCount;
                badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
            }
            renderAdminParcelsTable();
        }
    } catch (err) {
        console.error('Error loading admin parcels:', err);
    }
}

function filterAdminParcels(filter, el) {
    currentParcelFilter = filter;
    document.querySelectorAll('.parcel-filter-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    renderAdminParcelsTable();
}

function renderAdminParcelsTable() {
    const tableBody = document.getElementById('admin-parcels-table-body');
    const searchVal = document.getElementById('admin-parcel-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    let filtered = adminParcels.filter(parcel => {
        const status = parcel.status || 'Requested';
        const matchesFilter = (currentParcelFilter === 'all') || (status === currentParcelFilter);

        const matchesSearch = !searchVal ||
            (parcel.parcelId && parcel.parcelId.toLowerCase().includes(searchVal)) ||
            (parcel.studentName && parcel.studentName.toLowerCase().includes(searchVal)) ||
            (parcel.studentRoll && parcel.studentRoll.toLowerCase().includes(searchVal)) ||
            (parcel.platform && parcel.platform.toLowerCase().includes(searchVal)) ||
            (parcel.deliveryLocation && parcel.deliveryLocation.toLowerCase().includes(searchVal)) ||
            (parcel.courierPhone && parcel.courierPhone.includes(searchVal));

        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-truck-ramp-box" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: var(--primary);"></i>
                    No Gate Parcel pickup tasks found with this filter.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(parcel => {
        let formattedDate = 'Just now';
        if (parcel.createdAt) {
            try {
                formattedDate = new Date(parcel.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                formattedDate = parcel.createdAt;
            }
        }

        const parcelId = parcel.parcelId || parcel._id;
        const status = parcel.status || 'Requested';
        const isDelivered = (status === 'Delivered');

        return `
            <tr style="${isDelivered ? 'background: #f0fdf4;' : ''}">
                <td>
                    <div style="font-weight: 800; color: var(--secondary); font-size: 0.95rem;">${parcelId}</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${formattedDate}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${parcel.studentName || 'Student'}</div>
                    <div style="font-size: 0.76rem; color: #64748b;">Roll: ${parcel.studentRoll || 'N/A'} &bull; 📞 ${parcel.studentPhone || ''}</div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: #b91c1c; margin-top: 3px; background: #fef2f2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                        <i class="fa-solid fa-location-dot"></i> ${parcel.deliveryLocation}
                    </div>
                </td>
                <td>
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="${parcel.platformIcon || 'fa-solid fa-box'}"></i> ${parcel.platform}
                    </span>
                    <div style="font-size: 0.76rem; color: #475569; margin-top: 3px;">
                        <i class="fa-solid fa-door-open" style="color: #f97316;"></i> ${parcel.pickupGate || 'Gate No. 2'}
                    </div>
                    ${parcel.courierPhone ? `
                        <div style="font-size: 0.74rem; color: #0284c7; font-weight: 600;">
                            <i class="fa-solid fa-phone"></i> Courier: ${parcel.courierPhone}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <div style="font-size: 0.78rem; font-weight: 700; color: #6b21a8; background: #faf5ff; border: 1px solid #e9d5ff; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                        <i class="fa-regular fa-clock"></i> ${parcel.preferredSlot || 'Immediate'}
                    </div>
                    ${parcel.specialInstructions ? `
                        <div style="font-size: 0.74rem; color: #475569; margin-top: 3px; max-width: 180px;">
                            <i class="fa-solid fa-comment-dots"></i> ${parcel.specialInstructions}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        <select class="form-select no-icon" style="padding: 0.25rem 0.45rem; font-size: 0.78rem; border-radius: 6px; font-weight: 600; border-color: #cbd5e1;"
                                onchange="handleAssignRunner('${parcelId}', this.value)">
                            <option value="">👤 Assign Runner</option>
                            <option value="Vikas (Runner #1)" ${parcel.runnerName === 'Vikas (Runner #1)' ? 'selected' : ''}>Vikas (Runner #1)</option>
                            <option value="Deepak (Runner #2)" ${parcel.runnerName === 'Deepak (Runner #2)' ? 'selected' : ''}>Deepak (Runner #2)</option>
                            <option value="Ramesh (Gate Runner #3)" ${parcel.runnerName === 'Ramesh (Gate Runner #3)' ? 'selected' : ''}>Ramesh (Gate Runner #3)</option>
                            <option value="custom">✍️ Custom Runner Name</option>
                        </select>
                        <span style="font-size: 0.74rem; color: #1e40af; font-weight: 700;">
                            ${parcel.runnerName || 'Unassigned'}
                        </span>
                    </div>
                </td>
                <td>
                    <strong style="color: #16a34a; font-size: 0.95rem;">₹${parcel.runnerFee || 10}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${parcel.paymentStatus || 'Paid'}</div>
                </td>
                <td>
                    <span class="status-badge" style="${getParcelStatusBadgeStyle(status)}">
                        <i class="fa-solid ${getParcelStatusIcon(status)}"></i> ${status}
                    </span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                        <select class="form-select no-icon" style="padding: 0.35rem 0.55rem; font-size: 0.82rem; border-radius: var(--radius-sm); font-weight: 600;"
                                onchange="handleParcelStatusChange('${parcelId}', this.value, '${parcel.studentName}')">
                            <option value="Requested" ${status === 'Requested' ? 'selected' : ''}>🟡 Requested</option>
                            <option value="Runner Assigned" ${status === 'Runner Assigned' ? 'selected' : ''}>🟣 Runner Assigned</option>
                            <option value="Collected at Gate 2" ${status === 'Collected at Gate 2' ? 'selected' : ''}>🔵 Collected at Gate 2</option>
                            <option value="Out for Delivery" ${status === 'Out for Delivery' ? 'selected' : ''}>🛵 Out for Delivery</option>
                            <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>🟢 Delivered</option>
                            <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>🔴 Cancelled</option>
                        </select>

                        ${!isDelivered ? `
                            <button class="btn btn-sm btn-primary" onclick="openVerifyParcelPinModal('${parcelId}', '${parcel.studentName}')" style="background: #16a34a; border-color: #16a34a; padding: 0.35rem 0.65rem; font-size: 0.78rem; font-weight: 700;" title="Verify Handover PIN">
                                <i class="fa-solid fa-key"></i> Verify PIN
                            </button>
                        ` : `
                            <span style="color: #166534; font-size: 0.76rem; font-weight: 700;">
                                <i class="fa-solid fa-circle-check"></i> PIN Verified
                            </span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleAssignRunner(parcelId, val) {
    if (!val) return;
    let runnerName = val;
    let runnerPhone = '+91 98765 00112';

    if (val === 'custom') {
        runnerName = prompt('Enter Delivery Runner Full Name:');
        if (!runnerName) return;
        runnerPhone = prompt('Enter Runner Mobile Phone (Optional):') || '';
    }

    try {
        const res = await api.updateParcelStatus(parcelId, 'Runner Assigned', {
            runnerName,
            runnerPhone
        });
        if (res.success) {
            showToast(`Runner "${runnerName}" assigned to parcel #${parcelId}!`, 'success');
            loadAdminParcels();
        } else {
            showToast(res.message || 'Failed to assign runner.', 'error');
        }
    } catch (e) {
        showToast('Error assigning runner: ' + e.message, 'error');
    }
}

async function handleParcelStatusChange(parcelId, newStatus, studentName = '') {
    if (newStatus === 'Delivered') {
        openVerifyParcelPinModal(parcelId, studentName);
        return;
    }

    try {
        const res = await api.updateParcelStatus(parcelId, newStatus);
        if (res.success) {
            showToast(`Parcel #${parcelId} status updated to "${newStatus}"!`, 'success');
            loadAdminParcels();
        } else {
            showToast(res.message || 'Failed to update parcel status.', 'error');
        }
    } catch (e) {
        showToast('Error updating status: ' + e.message, 'error');
    }
}

function openVerifyParcelPinModal(parcelId, studentName = '') {
    const modal = document.getElementById('admin-parcel-pin-modal');
    const hiddenId = document.getElementById('verify-parcel-id-hidden');
    const titleEl = document.getElementById('verify-parcel-title');
    const pinInput = document.getElementById('verify-parcel-pin-input');

    if (hiddenId) hiddenId.value = parcelId;
    if (titleEl) titleEl.textContent = `Verify Handover for Parcel #${parcelId} (${studentName || 'Student'})`;
    if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
    }
    if (modal) modal.classList.add('active');
}

async function submitVerifyParcelPin() {
    const parcelId = document.getElementById('verify-parcel-id-hidden')?.value;
    const pin = document.getElementById('verify-parcel-pin-input')?.value.trim();

    if (!pin || pin.length < 4) {
        showToast('Please enter the 4-digit Handover PIN provided by the student.', 'warning');
        document.getElementById('verify-parcel-pin-input')?.focus();
        return;
    }

    try {
        const res = await api.verifyParcelPin(parcelId, pin);
        if (res.success) {
            showToast('🎉 Handover PIN Verified! Parcel marked as Delivered successfully.', 'success');
            closeModal('admin-parcel-pin-modal');
            loadAdminParcels();
        } else {
            showToast(res.message || 'Invalid PIN entered.', 'error');
        }
    } catch (e) {
        showToast('Error verifying PIN: ' + e.message, 'error');
    }
}

// --------------------------------------------------------------------------
// 8. PLATFORM REVENUE, INSTANT SPLIT GATEWAY & CASH LEDGER
// --------------------------------------------------------------------------

let adminCommissionsData = null;

async function loadCommissionsLedger() {
    try {
        const res = await fetch('/api/admin/commissions-ledger');
        const data = await res.json();
        if (data && data.success) {
            adminCommissionsData = data;
            renderCommissionsSummary(data.summary);
            renderCommissionsLedgerTable();
        }
    } catch (e) {
        console.error('Error loading commissions ledger:', e);
    }
}

function renderCommissionsSummary(sum) {
    if (!sum) return;
    const totalAdminEl = document.getElementById('comm-stat-total-admin');
    const totalOrdersEl = document.getElementById('comm-stat-total-orders');
    const onlineAdminEl = document.getElementById('comm-stat-online-admin');
    const onlineCountEl = document.getElementById('comm-stat-online-count');
    const autoDeductedEl = document.getElementById('comm-stat-auto-deducted');
    const cashPendingEl = document.getElementById('comm-stat-cash-pending');
    const cashCountEl = document.getElementById('comm-stat-cash-count');
    const vendorNetEl = document.getElementById('comm-stat-vendor-net');

    if (totalAdminEl) totalAdminEl.textContent = `₹${(sum.totalAdminCommissionEarned || 0).toFixed(2)}`;
    if (totalOrdersEl) totalOrdersEl.textContent = sum.totalOrdersCount || 0;
    if (onlineAdminEl) onlineAdminEl.textContent = `₹${(sum.onlineAdminCommissionEarned || 0).toFixed(2)}`;
    if (onlineCountEl) onlineCountEl.textContent = sum.onlineOrdersCount || 0;
    if (autoDeductedEl) autoDeductedEl.textContent = `₹${(sum.totalCashAutoDeducted || 0).toFixed(2)}`;
    if (cashPendingEl) cashPendingEl.textContent = `₹${(sum.netAdminCashPending || 0).toFixed(2)}`;
    if (cashCountEl) cashCountEl.textContent = sum.cashOrdersCount || 0;
    if (vendorNetEl) vendorNetEl.textContent = `₹${(sum.totalVendorNetPayable || 0).toFixed(2)}`;
}

function renderCommissionsLedgerTable() {
    const tbody = document.getElementById('commissions-ledger-tbody');
    if (!tbody || !adminCommissionsData || !adminCommissionsData.shopsLedger) return;

    const search = document.getElementById('comm-ledger-search')?.value.trim().toLowerCase() || '';
    const shops = adminCommissionsData.shopsLedger.filter(s => {
        return !search || 
            s.shopName.toLowerCase().includes(search) || 
            s.shopId.toLowerCase().includes(search) || 
            s.category.toLowerCase().includes(search) ||
            s.ownerName.toLowerCase().includes(search);
    });

    if (shops.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                    No campus counters match your search filter.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = shops.map(s => {
        const isSelectedShop = (activeShopScope !== 'All' && (s.shopId === activeShopScope || s.category === activeShopScope));
        const statusStyle = s.remainingCashDue > 0 ? 'color: #b45309; background: #fef3c7; border: 1px solid #fde68a;' : 'color: #15803d; background: #dcfce7; border: 1px solid #86efac;';

        return `
            <tr style="${isSelectedShop ? 'background: #f0fdf4;' : ''}">
                <td>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.92rem;">
                        ${s.shopName}
                    </div>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">
                        👤 ${s.ownerName} &bull; <code>${s.shopId}</code>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.92rem;">
                        ${s.totalOrders} Orders
                    </div>
                    <div style="font-size: 0.74rem; display: flex; gap: 4px; margin-top: 2px;">
                        <span style="color: #0284c7; font-weight: 700;">⚡ ${s.onlineOrders} Onl</span>
                        <span style="color: #64748b;">|</span>
                        <span style="color: #d97706; font-weight: 700;">💵 ${s.cashOrders} Cash</span>
                    </div>
                </td>
                <td>
                    <strong style="color: #0f172a; font-size: 0.95rem;">₹${(s.foodSales || 0).toFixed(2)}</strong>
                </td>
                <td>
                    <span style="font-weight: 700; color: #0369a1; font-size: 0.9rem;">
                        ₹${(s.vendorPackagingShare || 0).toFixed(2)}
                    </span>
                    <div style="font-size: 0.7rem; color: #64748b;">(₹2.50 &times; ${s.totalOrders})</div>
                </td>
                <td>
                    <span style="font-weight: 800; color: #059669; font-size: 0.95rem;">
                        ₹${(s.adminCommission || 0).toFixed(2)}
                    </span>
                    <div style="font-size: 0.7rem; color: #10b981;">(Deepak Share)</div>
                </td>
                <td>
                    <strong style="color: #0284c7; font-size: 0.95rem;">₹${(s.onlineGrossReceived || 0).toFixed(2)}</strong>
                </td>
                <td>
                    <span style="font-weight: 700; color: ${s.autoDeductedCashFee > 0 ? '#7c3aed' : '#94a3b8'};">
                        -${(s.autoDeductedCashFee || 0).toFixed(2)}
                    </span>
                    ${s.cashFeeOwed > 0 ? `<div style="font-size: 0.7rem; color: #d97706;">(Owed: ₹${(s.cashFeeOwed || 0).toFixed(2)})</div>` : ''}
                </td>
                <td>
                    <strong style="font-weight: 900; color: #15803d; font-size: 1.05rem;">
                        ₹${(s.netPayableToVendor || 0).toFixed(2)}
                    </strong>
                </td>
                <td>
                    <span style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; display: inline-block; ${statusStyle}">
                        ${s.settlementStatus}
                    </span>
                </td>
                <td style="text-align: center;">
                    ${s.remainingCashDue > 0 ? `
                        <button type="button" class="btn btn-sm" onclick="settleShopCashLedger('${s.shopId}', '${s.shopName}')" style="background: #f59e0b; color: white; border: none; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; font-weight: 700;">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Settle
                        </button>
                    ` : `
                        <button type="button" class="btn btn-sm btn-outline" onclick="filterOrdersByShop('${s.shopId}')" style="font-size: 0.75rem; padding: 3px 8px; border-color: #cbd5e1; color: #475569;">
                            <i class="fa-solid fa-list-check"></i> Orders
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

async function openGatewaySettingsModal() {
    try {
        const res = await fetch('/api/admin/gateway-settings');
        const data = await res.json();
        if (data.success && data.settings) {
            const s = data.settings;
            if (document.getElementById('gw-admin-commission')) document.getElementById('gw-admin-commission').value = s.adminCommissionPerOrder || 2.50;
            if (document.getElementById('gw-vendor-packaging')) document.getElementById('gw-vendor-packaging').value = s.vendorPackagingSharePerOrder || 2.50;
            if (document.getElementById('gw-mode')) document.getElementById('gw-mode').value = s.mode || 'test_simulator';
            if (document.getElementById('gw-provider')) document.getElementById('gw-provider').value = s.provider || 'Razorpay Route';
            if (document.getElementById('gw-admin-vpa')) document.getElementById('gw-admin-vpa').value = s.adminAccountVpa || 'deepaksharma74521@okaxis';
            if (document.getElementById('gw-admin-payee')) document.getElementById('gw-admin-payee').value = s.adminPayeeName || 'Deepak Sharma (Admin)';
            if (document.getElementById('gw-rzp-key')) document.getElementById('gw-rzp-key').value = s.razorpayKeyId || '';
            if (document.getElementById('gw-rzp-secret')) document.getElementById('gw-rzp-secret').value = s.razorpayKeySecret || '';
        }
        openModal('gateway-settings-modal');
    } catch (e) {
        showToast('Error opening gateway settings: ' + e.message, 'error');
    }
}

async function handleSaveGatewaySettings(event) {
    event.preventDefault();
    const btn = document.getElementById('gw-save-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Settings...';
    }

    try {
        const payload = {
            adminCommissionPerOrder: Number(document.getElementById('gw-admin-commission')?.value || 2.50),
            vendorPackagingSharePerOrder: Number(document.getElementById('gw-vendor-packaging')?.value || 2.50),
            mode: document.getElementById('gw-mode')?.value || 'test_simulator',
            provider: document.getElementById('gw-provider')?.value || 'Razorpay Route',
            adminAccountVpa: document.getElementById('gw-admin-vpa')?.value.trim() || 'deepaksharma74521@okaxis',
            adminPayeeName: document.getElementById('gw-admin-payee')?.value.trim() || 'Deepak Sharma (Admin)',
            razorpayKeyId: document.getElementById('gw-rzp-key')?.value.trim() || '',
            razorpayKeySecret: document.getElementById('gw-rzp-secret')?.value.trim() || ''
        };

        const res = await fetch('/api/admin/gateway-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Instant Split Gateway & Account Settings Saved!', 'success');
            closeModal('gateway-settings-modal');
            loadCommissionsLedger();
        } else {
            showToast(data.message || 'Failed to update settings.', 'error');
        }
    } catch (e) {
        showToast('Error saving gateway settings: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Gateway Settings';
        }
    }
}

async function settleShopCashLedger(shopId, shopName) {
    if (!confirm(`Settle all pending cash order platform fees for ${shopName}? This will mark cash fee records as settled in the ledger.`)) {
        return;
    }
    try {
        const res = await fetch('/api/admin/settle-cash-ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shopId, note: `Settled by Super Admin for ${shopName}` })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${shopName} cash ledger settled successfully! (${data.settledCount} records)`, 'success');
            loadCommissionsLedger();
        } else {
            showToast(data.message || 'Error settling ledger.', 'error');
        }
    } catch (e) {
        showToast('Error settling cash ledger: ' + e.message, 'error');
    }
}

function filterOrdersByShop(shopId) {
    switchAdminTab('orders');
    const shopSelect = document.getElementById('admin-active-shop-select');
    if (shopSelect) {
        shopSelect.value = shopId;
        handleShopScopeChange(shopId);
    }
}

function exportCommissionsLedgerCsv() {
    if (!adminCommissionsData || !adminCommissionsData.shopsLedger) {
        showToast('Ledger data loading, please wait a moment...', 'info');
        return;
    }

    const headers = [
        'Shop ID',
        'Shop Name',
        'Category',
        'Manager Name',
        'Manager Email',
        'Shop UPI ID',
        'Total Orders',
        'Online Orders',
        'Cash Orders',
        'Gross Food Sales (Rs)',
        'Shop Packaging Share (Rs)',
        'Deepak Admin Commission (Rs)',
        'Online Gross Received (Rs)',
        'Cash Fee Owed (Rs)',
        'Auto-Deducted Cash Fee (Rs)',
        'Net Payable to Vendor (Rs)',
        'Remaining Cash Fee Due (Rs)',
        'Settlement Status'
    ];

    const rows = adminCommissionsData.shopsLedger.map(s => [
        `"${s.shopId}"`,
        `"${(s.shopName || '').replace(/"/g, '""')}"`,
        `"${s.category || ''}"`,
        `"${(s.ownerName || '').replace(/"/g, '""')}"`,
        `"${s.ownerEmail || ''}"`,
        `"${s.upiId || ''}"`,
        s.totalOrders,
        s.onlineOrders,
        s.cashOrders,
        (s.foodSales || 0).toFixed(2),
        (s.vendorPackagingShare || 0).toFixed(2),
        (s.adminCommission || 0).toFixed(2),
        (s.onlineGrossReceived || 0).toFixed(2),
        (s.cashFeeOwed || 0).toFixed(2),
        (s.autoDeductedCashFee || 0).toFixed(2),
        (s.netPayableToVendor || 0).toFixed(2),
        (s.remainingCashDue || 0).toFixed(2),
        `"${s.settlementStatus || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CampusMart_Revenue_Split_Settlement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📊 Settlement CSV downloaded successfully!', 'success');
}

function setupAdminEventListeners() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchAdminTab(btn.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.user-type-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.user-type-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentUserTypeFilter = pill.getAttribute('data-type') || 'all';
            renderAdminOrdersTable();
        });
    });

    document.querySelectorAll('.order-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.order-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentOrderFilter = pill.getAttribute('data-filter');
            renderAdminOrdersTable();
        });
    });

    document.getElementById('admin-order-search')?.addEventListener('input', () => {
        renderAdminOrdersTable();
    });

    document.getElementById('admin-parcel-search')?.addEventListener('input', () => {
        renderAdminParcelsTable();
    });

    document.querySelectorAll('.admin-food-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.admin-food-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFoodFilter = pill.getAttribute('data-category');
            renderAdminFoodTable();
        });
    });

    document.getElementById('admin-food-search')?.addEventListener('input', () => {
        renderAdminFoodTable();
    });

    // Feedback Event Listeners
    document.querySelectorAll('.feedback-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.feedback-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFeedbackFilter = pill.getAttribute('data-star');
            renderFeedbackTable();
        });
    });

    document.getElementById('admin-feedback-search')?.addEventListener('input', () => {
        renderFeedbackTable();
    });
}

// --------------------------------------------------------------------------
// 8. DELIVERY PARTNER FLEET & SUPERADMIN DASHBOARD
// --------------------------------------------------------------------------

let adminDeliveryStatsData = {
    totalDeliveries: 0,
    activeDeliveries: 0,
    totalCashCollected: 0,
    totalOnlineCollected: 0,
    runners: [],
    recentDeliveryLogs: []
};
let currentAdminDeliveryPayModeFilter = 'all';

async function loadAdminDeliveryDashboard() {
    try {
        const res = await api.getDeliveryStats();
        if (res.success && res.stats) {
            adminDeliveryStatsData = res.stats;

            // 1. Update metric counters
            const completedEl = document.getElementById('admin-delivery-stat-completed');
            const cashEl = document.getElementById('admin-delivery-stat-cash');
            const onlineEl = document.getElementById('admin-delivery-stat-online');
            const pendingEl = document.getElementById('admin-delivery-stat-pending');
            const badgeEl = document.getElementById('admin-delivery-badge');

            if (completedEl) completedEl.textContent = res.stats.totalDeliveries || 0;
            if (cashEl) cashEl.textContent = `₹${(res.stats.totalCashCollected || 0).toFixed(2)}`;
            if (onlineEl) onlineEl.textContent = `₹${(res.stats.totalOnlineCollected || 0).toFixed(2)}`;
            if (pendingEl) pendingEl.textContent = res.stats.activeDeliveries || 0;

            if (badgeEl) {
                badgeEl.textContent = res.stats.activeDeliveries || 0;
                badgeEl.style.display = (res.stats.activeDeliveries > 0) ? 'inline-block' : 'none';
            }

            // 2. Render runner profile cards
            renderAdminDeliveryRunnersGrid(res.stats.runners || []);

            // 3. Render delivery logs audit table
            renderAdminDeliveryLogsTable();
        }
    } catch (err) {
        console.error('Error loading admin delivery stats:', err);
    }
}

function renderAdminDeliveryRunnersGrid(runners) {
    const container = document.getElementById('admin-delivery-runners-grid');
    if (!container) return;

    if (!runners || runners.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-person-biking" style="font-size: 2rem; color: #94a3b8; margin-bottom: 0.5rem; display: block;"></i>
                No delivery partners registered yet. Default runner is <strong>Ramesh Sharma (Campus Runner)</strong>.
            </div>
        `;
        return;
    }

    container.innerHTML = runners.map(runner => {
        return `
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow-xs);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <div>
                        <div style="font-weight: 800; font-size: 1rem; color: var(--secondary);">
                            <i class="fa-solid fa-motorcycle" style="color: #0284c7; margin-right: 4px;"></i> ${runner.name}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                            ${runner.phone ? `<a href="tel:${runner.phone}" style="color: #0284c7; text-decoration: none; font-weight: 600;"><i class="fa-solid fa-phone"></i> ${runner.phone}</a>` : runner.email}
                        </div>
                    </div>
                    <span style="font-size: 0.72rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 7px; border-radius: 9999px; font-weight: 700;">
                        ● Active Fleet
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <div style="background: white; border: 1px solid #fde68a; border-radius: 8px; padding: 0.5rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #92400e; font-weight: 700;">💵 CASH IN HAND</div>
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b45309;">₹${runner.cashInHand || 0}</div>
                    </div>
                    <div style="background: white; border: 1px solid #c7d2fe; border-radius: 8px; padding: 0.5rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #3730a3; font-weight: 700;">📲 ONLINE RECONCILED</div>
                        <div style="font-size: 1.15rem; font-weight: 800; color: #4338ca;">₹${runner.onlineCollected || 0}</div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;">
                    <span>Completed Deliveries:</span>
                    <strong style="color: #16a34a; font-weight: 800;">${runner.deliveriesCount || 0} Orders</strong>
                </div>
            </div>
        `;
    }).join('');
}

function filterAdminDeliveryLogs(payMode, btn) {
    currentAdminDeliveryPayModeFilter = payMode;
    document.querySelectorAll('.admin-delivery-filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminDeliveryLogsTable();
}

function renderAdminDeliveryLogsTable() {
    const tableBody = document.getElementById('admin-delivery-logs-tbody');
    const searchVal = (document.getElementById('admin-delivery-search')?.value || '').trim().toLowerCase();
    if (!tableBody) return;

    let logs = adminDeliveryStatsData.recentDeliveryLogs || [];

    let filtered = logs.filter(log => {
        const payMode = (log.paymentModeReceived || log.paymentMethod || '').toLowerCase();
        const isCash = payMode.includes('cash');

        if (currentAdminDeliveryPayModeFilter === 'cash' && !isCash) return false;
        if (currentAdminDeliveryPayModeFilter === 'online' && isCash) return false;

        if (searchVal) {
            const id = (log.orderId || log._id || '').toLowerCase();
            const runner = (log.deliveredBy || '').toLowerCase();
            const customer = (log.customerName || log.studentName || '').toLowerCase();
            const location = (log.campusBlock || log.deliveryLocation || log.roomOrCabin || log.cabinNumber || '').toLowerCase();
            return id.includes(searchVal) || runner.includes(searchVal) || customer.includes(searchVal) || location.includes(searchVal);
        }
        return true;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-person-biking" style="font-size: 2rem; color: #94a3b8; margin-bottom: 0.5rem; display: block;"></i>
                    No delivery audit logs recorded yet with this filter.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(log => {
        const orderId = log.orderId || log._id;
        const customer = log.customerName || log.studentName || 'Student';
        const location = log.campusBlock ? `${log.campusBlock} (${log.roomOrCabin || ''})` : (log.deliveryLocation || log.cabinNumber || 'Campus Block');
        const runner = log.deliveredBy || 'Campus Runner';
        
        let timeStr = 'Recently';
        if (log.deliveredAt || log.updatedAt || log.createdAt) {
            try {
                timeStr = new Date(log.deliveredAt || log.updatedAt || log.createdAt).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {}
        }

        const payMode = log.paymentModeReceived || (log.paymentMethod?.toLowerCase().includes('cash') ? 'Cash' : 'Online');
        const isCash = payMode === 'Cash';
        const amount = log.amountCollected || log.dueAmount || log.totalAmount || 0;

        return `
            <tr>
                <td>
                    <strong style="color: var(--primary); font-family: var(--font-heading);">
                        <i class="fa-solid fa-receipt"></i> ${orderId}
                    </strong>
                </td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${location}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color: #334155;">${customer}</div>
                    ${log.studentDept ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${log.studentDept}</div>` : ''}
                </td>
                <td>
                    <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-person-biking"></i> ${runner}
                    </span>
                </td>
                <td style="font-size: 0.82rem; color: #475569;">
                    <i class="fa-regular fa-clock" style="color: var(--primary);"></i> ${timeStr}
                </td>
                <td>
                    ${isCash ? `
                        <span style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Cash Received
                        </span>
                    ` : `
                        <span style="background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-bolt"></i> Online / UPI
                        </span>
                    `}
                </td>
                <td>
                    <strong style="font-size: 0.95rem; color: ${isCash ? '#b45309' : '#4338ca'};">
                        ₹${amount}
                    </strong>
                </td>
                <td>
                    <span class="status-badge status-completed" style="font-size: 0.75rem; padding: 2px 8px;">
                        <i class="fa-solid fa-check"></i> Delivered
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    setupAdminEventListeners();
    initAdminPage();
});



