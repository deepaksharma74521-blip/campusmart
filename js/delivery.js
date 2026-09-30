// ==========================================================================
// Campus Mart – Delivery Partner & Fleet Portal
// File: js/delivery.js
// Description: Delivery Runner Workflow, Live Dispatch Tasks, Cash/Online Hand-off
// ==========================================================================

let deliveryOrdersCache = [];
let currentDeliveryFilter = 'active';
let deliverySearchQuery = '';
let deliveryPollInterval = null;
let activeDeliveryOrder = null;

// 1. Authentication & Role Guard Check
function checkDeliveryAuth() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=delivery.html';
        return null;
    }

    const role = (user.role || '').toLowerCase();
    const isAuthorized = role === 'delivery_partner' || role === 'delivery' || role === 'admin' || role === 'superadmin';

    if (!isAuthorized) {
        showToast('Access denied! Delivery portal is only accessible to Delivery Partners & Admins.', 'error', 'Unauthorized');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return null;
    }

    // Populate user profile info in navbar
    const nameEl = document.getElementById('delivery-runner-name');
    const greetingEl = document.getElementById('runner-greeting');
    if (nameEl) nameEl.textContent = user.name || 'Campus Runner';
    if (greetingEl) greetingEl.textContent = `Hello, ${user.name || 'Runner'}! 🚴`;

    return user;
}

// 2. Fetch and render delivery dispatch tasks
async function fetchDeliveryOrders() {
    try {
        const res = await api.getDeliveryOrders('all');
        if (res.success && res.orders) {
            deliveryOrdersCache = res.orders;
            updateDeliveryStats(res.orders);
            renderDeliveryOrders();
        } else {
            deliveryOrdersCache = [];
            renderDeliveryOrders();
        }
    } catch (err) {
        console.error('Error fetching delivery orders:', err);
    }
}

// 3. Update top KPI metric cards
function updateDeliveryStats(orders) {
    let active = 0;
    let completed = 0;
    let cash = 0;
    let online = 0;

    const user = api.getCurrentUser();
    const userName = (user?.name || '').toLowerCase();
    const userEmail = (user?.email || '').toLowerCase();
    const isAdmin = (user?.role || '').toLowerCase().includes('admin');

    orders.forEach(o => {
        const status = (o.status || '').toLowerCase();
        const isCompleted = status === 'completed' || o.deliveryStatus === 'Delivered';

        if (isCompleted) {
            // If admin, count all; if runner, count their own or all completed
            const isRunnerMatch = isAdmin || !o.deliveredBy || o.deliveredBy.toLowerCase() === userName || o.deliveredBy.toLowerCase() === userEmail;
            
            if (isRunnerMatch) {
                completed++;
                const amt = parseFloat(o.amountCollected || o.dueAmount || o.totalAmount || 0);
                const payMode = (o.paymentModeReceived || o.paymentMethod || '').toLowerCase();
                if (payMode.includes('cash')) {
                    cash += amt;
                } else {
                    online += amt;
                }
            }
        } else if (status === 'pending' || status === 'preparing' || status === 'ready') {
            active++;
        }
    });

    const activeEl = document.getElementById('stat-active-deliveries');
    const completedEl = document.getElementById('stat-completed-deliveries');
    const cashEl = document.getElementById('stat-cash-collected');
    const onlineEl = document.getElementById('stat-online-collected');

    const countActiveEl = document.getElementById('count-active');
    const countDeliveredEl = document.getElementById('count-delivered');
    const countAllEl = document.getElementById('count-all');

    if (activeEl) activeEl.textContent = active;
    if (completedEl) completedEl.textContent = completed;
    if (cashEl) cashEl.textContent = `₹${Math.round(cash)}`;
    if (onlineEl) onlineEl.textContent = `₹${Math.round(online)}`;

    if (countActiveEl) countActiveEl.textContent = active;
    if (countDeliveredEl) countDeliveredEl.textContent = completed;
    if (countAllEl) countAllEl.textContent = orders.length;
}

// 4. Filter & Search handlers
function filterDeliveryOrders(filterName, btn) {
    currentDeliveryFilter = filterName;
    document.querySelectorAll('.filter-tab').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline');
    });
    if (btn) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary', 'active');
    }
    renderDeliveryOrders();
}

function handleDeliverySearch(query) {
    deliverySearchQuery = (query || '').toLowerCase().trim();
    renderDeliveryOrders();
}

// 5. Render order cards
function renderDeliveryOrders() {
    const container = document.getElementById('delivery-orders-list');
    if (!container) return;

    let filtered = deliveryOrdersCache.filter(order => {
        const status = (order.status || 'Pending').toLowerCase();
        const isDelivered = status === 'completed' || order.deliveryStatus === 'Delivered';

        if (currentDeliveryFilter === 'active' && isDelivered) return false;
        if (currentDeliveryFilter === 'delivered' && !isDelivered) return false;

        if (deliverySearchQuery) {
            const id = (order.orderId || order._id || '').toLowerCase();
            const name = (order.customerName || order.studentName || '').toLowerCase();
            const phone = (order.studentPhone || '').toLowerCase();
            const location = (order.campusBlock || order.deliveryLocation || order.roomOrCabin || '').toLowerCase();
            const shop = (order.shopName || '').toLowerCase();
            return id.includes(deliverySearchQuery) || name.includes(deliverySearchQuery) || phone.includes(deliverySearchQuery) || location.includes(deliverySearchQuery) || shop.includes(deliverySearchQuery);
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="background: white; border: 1px dashed #cbd5e1; border-radius: var(--radius-lg); padding: 3rem 1.5rem; text-align: center;">
                <i class="fa-solid fa-person-biking empty-icon" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.25rem; color: var(--secondary); margin-bottom: 0.5rem;">No Delivery Tasks Found</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    ${currentDeliveryFilter === 'active' ? 'Great job! All campus deliveries have been cleared.' : 'No orders match the selected filter.'}
                </p>
                <button onclick="fetchDeliveryOrders()" class="btn btn-outline btn-sm" style="margin-top: 0.5rem;">
                    <i class="fa-solid fa-rotate-right"></i> Refresh Tasks
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(order => {
        const orderDocId = order._id || order.id || order.orderId;
        const status = order.status || 'Pending';
        const isDelivered = status === 'Completed' || order.deliveryStatus === 'Delivered';
        const isReady = status === 'Ready';

        const customerName = order.customerName || order.studentName || 'Student';
        const customerPhone = order.studentPhone || '';
        const destination = order.campusBlock ? `${order.campusBlock} - ${order.roomOrCabin || ''}` : (order.deliveryLocation || order.cabinNumber || 'Campus Delivery Address');
        const items = order.items || [];
        const itemsText = items.map(i => `${i.name} (${i.quantity}x)`).join(', ') || 'Ordered Items';

        let dateStr = 'Just now';
        if (order.createdAt) {
            try {
                dateStr = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {}
        }

        return `
            <div class="order-card" style="background: white; border: 1.5px solid ${isReady ? '#86efac' : isDelivered ? '#e2e8f0' : '#bfdbfe'}; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); position: relative;">
                
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.05rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">
                            <i class="fa-solid fa-receipt"></i> ${order.orderId || 'ORD-#'}
                        </span>
                        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
                            <i class="fa-regular fa-clock"></i> ${dateStr}
                        </span>
                    </div>

                    <div>
                        <span class="status-badge status-${status.toLowerCase()}" style="font-size: 0.78rem; padding: 3px 10px;">
                            ${isDelivered ? '<i class="fa-solid fa-circle-check"></i> Delivered' : `<i class="fa-solid ${getStatusIcon(status)}"></i> ${status}`}
                        </span>
                    </div>
                </div>

                <!-- Destination & Customer Call Box -->
                <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1.5px solid #bae6fd; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <div style="font-size: 0.75rem; color: #0369a1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> Delivery Destination
                            </div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                                ${destination}
                            </div>
                            <div style="font-size: 0.84rem; color: #334155; font-weight: 600; margin-top: 2px;">
                                <i class="fa-solid fa-user" style="color: var(--primary);"></i> ${customerName} ${order.studentDept ? `(${order.studentDept})` : ''}
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            ${customerPhone ? `
                                <a href="tel:${customerPhone}" class="btn btn-sm btn-primary" style="background: #0284c7; border: none; padding: 5px 12px; font-weight: 700;">
                                    <i class="fa-solid fa-phone"></i> Call Customer
                                </a>
                            ` : ''}
                            ${(order.googleMapsUrl || (order.lat && order.lng)) ? `
                                <a href="${order.googleMapsUrl || `https://www.google.com/maps?q=${order.lat},${order.lng}`}" target="_blank" class="btn btn-sm btn-outline" style="border-color: #0284c7; color: #0369a1; padding: 5px 10px;">
                                    <i class="fa-solid fa-map-location-dot"></i> Map Pin 📍
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Items & Shop Details -->
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.85rem;">
                    <div>
                        <strong style="color: var(--secondary);">🏪 Shop:</strong> ${order.shopName || 'Campus Food Court'}
                    </div>
                    <div style="margin-top: 2px;">
                        <strong style="color: var(--secondary);">📦 Items:</strong> ${itemsText}
                    </div>
                    ${order.specialNotes ? `
                        <div style="margin-top: 4px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">
                            <i class="fa-solid fa-note-sticky"></i> <strong>Note:</strong> ${order.specialNotes}
                        </div>
                    ` : ''}
                </div>

                <!-- Financial Balance & Payment Status -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.9rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem;">
                    <div>
                        <span style="color: var(--text-muted);">Total Bill:</span>
                        <strong style="color: var(--secondary);">₹${order.totalAmount}</strong>
                        ${(order.advanceAmount && Number(order.advanceAmount) > 0) ? `
                            <span style="font-size: 0.75rem; color: #166534; background: #dcfce7; padding: 1px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">
                                ₹${order.advanceAmount} Advance Paid
                            </span>
                        ` : ''}
                    </div>

                    <div>
                        ${(order.dueAmount && Number(order.dueAmount) > 0) ? `
                            <span style="color: #92400e; font-weight: 700;">To Collect:</span>
                            <span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.95rem;">
                                ₹${order.dueAmount}
                            </span>
                        ` : `
                            <span style="color: #15803d; font-weight: 700; background: #dcfce7; padding: 2px 8px; border-radius: 6px; font-size: 0.82rem;">
                                <i class="fa-solid fa-check"></i> 100% Fully Paid Online
                            </span>
                        `}
                    </div>
                </div>

                <!-- Action Button or Completed Summary -->
                ${!isDelivered ? `
                    <div>
                        <button onclick="openDeliveryModal('${orderDocId}')" class="btn btn-primary btn-block" style="justify-content: center; font-weight: 700; padding: 0.75rem; font-size: 0.95rem; background: linear-gradient(135deg, #16a34a, #15803d); border: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
                            <i class="fa-solid fa-box-open"></i> Mark as Delivered & Record Payment
                        </button>
                    </div>
                ` : `
                    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.82rem; color: #166534; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
                        <div>
                            <i class="fa-solid fa-circle-check" style="color: #16a34a;"></i>
                            <strong>Delivered by:</strong> ${order.deliveredBy || 'Campus Runner'}
                            ${order.deliveredAt ? ` &bull; ${new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                        <div>
                            <span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
                                ${order.paymentModeReceived === 'Cash' ? '💵 Cash Collected' : '📲 Online Paid'}: ₹${order.amountCollected || order.dueAmount || order.totalAmount || 0}
                            </span>
                        </div>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

function getStatusIcon(status) {
    switch (status) {
        case 'Pending': return 'fa-clock';
        case 'Preparing': return 'fa-fire-burner';
        case 'Ready': return 'fa-bell-concierge';
        case 'Completed': return 'fa-circle-check';
        default: return 'fa-info-circle';
    }
}

// 6. Delivery Modal Open / Close Logic
function openDeliveryModal(orderDocId) {
    const order = deliveryOrdersCache.find(o => (o._id === orderDocId || o.id === orderDocId || o.orderId === orderDocId));
    if (!order) return;

    activeDeliveryOrder = order;

    const modal = document.getElementById('delivery-complete-modal');
    const orderIdDisplay = document.getElementById('modal-delivery-order-id');
    const orderDocIdInput = document.getElementById('modal-order-doc-id');
    const customerNameEl = document.getElementById('modal-customer-name');
    const customerLocationEl = document.getElementById('modal-customer-location');
    const totalAmountEl = document.getElementById('modal-total-amount');
    const dueAmountEl = document.getElementById('modal-due-amount');
    const collectedInput = document.getElementById('modal-collected-amount');

    if (orderIdDisplay) orderIdDisplay.textContent = `Complete Delivery #${order.orderId || 'ORD'}`;
    if (orderDocIdInput) orderDocIdInput.value = orderDocId;
    if (customerNameEl) customerNameEl.textContent = order.customerName || order.studentName || 'Student';
    
    const location = order.campusBlock ? `${order.campusBlock} - ${order.roomOrCabin || ''}` : (order.deliveryLocation || order.cabinNumber || 'Campus Destination');
    if (customerLocationEl) customerLocationEl.textContent = location;
    
    if (totalAmountEl) totalAmountEl.textContent = `₹${order.totalAmount}`;
    
    const due = (order.dueAmount !== undefined && order.dueAmount !== null) ? Number(order.dueAmount) : Number(order.totalAmount);
    if (dueAmountEl) dueAmountEl.textContent = `₹${due}`;
    if (collectedInput) collectedInput.value = due;

    // Reset payment selection to Cash
    selectDeliveryPayMode('Cash');

    if (modal) modal.classList.add('active');
}

function closeDeliveryModal() {
    const modal = document.getElementById('delivery-complete-modal');
    if (modal) modal.classList.remove('active');
    activeDeliveryOrder = null;
}

let selectedDeliveryPayMode = 'Cash';

function selectDeliveryPayMode(mode) {
    selectedDeliveryPayMode = mode;
    const cardCash = document.getElementById('choice-card-cash');
    const cardOnline = document.getElementById('choice-card-online');
    const onlineRefGroup = document.getElementById('modal-online-ref-group');

    const radioCash = document.querySelector('input[name="delivery_payment_mode"][value="Cash"]');
    const radioOnline = document.querySelector('input[name="delivery_payment_mode"][value="Online"]');

    if (mode === 'Cash') {
        if (cardCash) {
            cardCash.style.border = '2px solid var(--primary)';
            cardCash.style.background = '#fff7ed';
        }
        if (cardOnline) {
            cardOnline.style.border = '1.5px solid var(--border-color)';
            cardOnline.style.background = 'white';
        }
        if (radioCash) radioCash.checked = true;
        if (onlineRefGroup) onlineRefGroup.style.display = 'none';
    } else {
        if (cardOnline) {
            cardOnline.style.border = '2px solid #0284c7';
            cardOnline.style.background = '#f0f9ff';
        }
        if (cardCash) {
            cardCash.style.border = '1.5px solid var(--border-color)';
            cardCash.style.background = 'white';
        }
        if (radioOnline) radioOnline.checked = true;
        if (onlineRefGroup) onlineRefGroup.style.display = 'block';
    }
}

// 7. Submit Delivery Completion
async function handleDeliverySubmit(event) {
    event.preventDefault();

    if (!activeDeliveryOrder) return;

    const user = api.getCurrentUser();
    const runnerName = user?.name || 'Campus Runner';
    const orderDocId = document.getElementById('modal-order-doc-id').value;
    const amountCollected = parseFloat(document.getElementById('modal-collected-amount').value || '0');
    const transactionRef = document.getElementById('modal-transaction-ref')?.value.trim() || '';
    const deliveryNotes = document.getElementById('modal-delivery-notes')?.value.trim() || '';
    const submitBtn = document.getElementById('submit-delivery-btn');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Delivery...';
    }

    const payload = {
        orderId: orderDocId,
        paymentModeReceived: selectedDeliveryPayMode, // "Cash" or "Online"
        amountCollected: amountCollected,
        deliveredBy: runnerName,
        transactionRef: transactionRef,
        deliveryNotes: deliveryNotes
    };

    try {
        const res = await api.completeDelivery(payload);
        if (res.success) {
            showToast(`🎉 Order #${activeDeliveryOrder.orderId || orderDocId} marked DELIVERED! Payment recorded via ${selectedDeliveryPayMode}.`, 'success', 'Delivery Completed');
            
            // Play confirmation sound & trigger vibration if supported
            if (typeof playOrderReadyChime === 'function') playOrderReadyChime();
            if (typeof triggerDeviceVibration === 'function') triggerDeviceVibration();

            closeDeliveryModal();
            fetchDeliveryOrders();
        } else {
            showToast(res.message || 'Failed to update delivery.', 'error');
        }
    } catch (err) {
        console.error('Error completing delivery:', err);
        showToast('Error completing delivery: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Complete & Mark Delivered';
        }
    }
}

// 8. Initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const user = checkDeliveryAuth();
    if (user) {
        fetchDeliveryOrders();
        // Auto-poll for new delivery dispatches every 4 seconds
        if (deliveryPollInterval) clearInterval(deliveryPollInterval);
        deliveryPollInterval = setInterval(fetchDeliveryOrders, 4000);
    }
});
