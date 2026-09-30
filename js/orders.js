// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/orders.js
// Description: Student Order History, Live Status Polling & Order Cancellation
// ==========================================================================

let ordersPollInterval = null;
let studentOrdersCache = [];
let studentPreviousStatusMap = new Map();
let isStudentFirstLoad = true;

function checkAndAlertOrderStatusChanges(orders) {
    if (!orders || orders.length === 0) return;
    
    if (isStudentFirstLoad) {
        orders.forEach(o => {
            const id = o.orderId || o._id || o.id;
            studentPreviousStatusMap.set(id, o.status || 'Pending');
        });
        isStudentFirstLoad = false;
        return;
    }

    orders.forEach(order => {
        const id = order.orderId || order._id || order.id;
        const currentStatus = order.status || 'Pending';
        const prevStatus = studentPreviousStatusMap.get(id);

        if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === 'Ready') {
                playOrderReadyChime();
                if (typeof speakOrderReadyAnnouncement === 'function') {
                    speakOrderReadyAnnouncement(order);
                }
                if (typeof triggerDeviceVibration === 'function') {
                    triggerDeviceVibration();
                }
                if (typeof showOrderReadyModal === 'function') {
                    showOrderReadyModal(order);
                }
                showToast(`🎉 Order #${id} is READY for pickup at counter!`, 'success', 'Order Ready!');
            } else if (currentStatus === 'Preparing') {
                playOrderReadyChime();
                showToast(`👨‍🍳 Kitchen started cooking order #${id}!`, 'info', 'Kitchen Preparing');
            } else if (currentStatus === 'Completed') {
                playOrderReadyChime();
                showToast(`✅ Order #${id} marked completed!`, 'success', 'Order Completed');
            }
        }

        studentPreviousStatusMap.set(id, currentStatus);
    });
}

function showOrderReadyById(orderId) {
    const order = studentOrdersCache.find(o => (o._id === orderId || o.id === orderId || o.orderId === orderId));
    if (order && typeof showOrderReadyModal === 'function') {
        showOrderReadyModal(order);
    }
}

async function fetchAndRenderOrders() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=orders.html';
        return;
    }

    const ordersListContainer = document.getElementById('my-orders-list');
    if (!ordersListContainer) return;

    try {
        const userId = user._id || user.uid || user.id;
        const res = await api.getOrders(userId);

        if (res.success && res.orders) {
            studentOrdersCache = res.orders;
            checkAndAlertOrderStatusChanges(res.orders);
            renderOrders(res.orders);
        } else {
            studentOrdersCache = [];
            renderOrders([]);
        }
    } catch (error) {
        console.error('Error fetching student orders:', error);
    }
}

function initOrders() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=orders.html';
        return;
    }

    const ordersListContainer = document.getElementById('my-orders-list');
    if (ordersListContainer) {
        ordersListContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem 0;">
                <div class="loader-spinner"></div>
                <p style="color: var(--text-muted); font-weight: 500;">Fetching your orders...</p>
            </div>
        `;
    }

    fetchAndRenderOrders();

    // Start live 1-second timer tick for countdown displays
    startFreshnessTicker();

    // Auto poll every 4 seconds for live kitchen updates
    if (ordersPollInterval) clearInterval(ordersPollInterval);
    ordersPollInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        fetchAndRenderOrders();
    }, 4500);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            fetchAndRenderOrders();
        }
    });
}

let freshnessTickerInterval = null;
function startFreshnessTicker() {
    if (freshnessTickerInterval) clearInterval(freshnessTickerInterval);
    freshnessTickerInterval = setInterval(() => {
        const timerEls = document.querySelectorAll('.freshness-timer[data-freshness-target]');
        timerEls.forEach(el => {
            const targetTime = parseInt(el.getAttribute('data-freshness-target'), 10);
            if (!targetTime) return;
            const remainingSec = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
            const countdownEl = el.querySelector('.freshness-countdown');
            if (countdownEl) {
                if (remainingSec > 0) {
                    const mins = Math.floor(remainingSec / 60);
                    const secs = remainingSec % 60;
                    countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                } else {
                    // Switch to cold state notice
                    el.className = 'freshness-timer cold';
                    el.removeAttribute('data-freshness-target');
                    el.innerHTML = `
                        <i class="fa-solid fa-snowflake" style="font-size: 1.25rem; color: #64748b;"></i>
                        <div style="flex: 1;">
                            <div><strong>❄️ Food Cool-Down Notice:</strong> Prepared 20+ mins ago.</div>
                            <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                                Food is safely packed at the counter, but may have cooled down. Please collect right away!
                            </div>
                        </div>
                    `;
                }
            }
        });
    }, 1000);
}

function getOrderFreshnessHtml(order) {
    const status = order.status || 'Pending';
    if (status === 'Cancelled' || status === 'Completed') return '';

    let orderTime = Date.now();
    if (order.updatedAt) {
        try {
            const parsed = new Date(order.updatedAt).getTime();
            if (!isNaN(parsed) && parsed > 0) orderTime = parsed;
        } catch (e) {}
    } else if (order.createdAt) {
        try {
            const parsed = new Date(order.createdAt).getTime();
            if (!isNaN(parsed) && parsed > 0) orderTime = parsed;
        } catch (e) {}
    }

    const FRESHNESS_WINDOW_SEC = 20 * 60; // 20 minutes freshness limit
    const elapsedSec = Math.max(0, Math.floor((Date.now() - orderTime) / 1000));
    const remainingSec = Math.max(0, FRESHNESS_WINDOW_SEC - elapsedSec);

    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (status === 'Ready') {
        if (remainingSec > 0) {
            return `
                <div class="freshness-timer hot" data-freshness-target="${Date.now() + (remainingSec * 1000)}" data-order-status="Ready">
                    <i class="fa-solid fa-fire" style="font-size: 1.25rem; color: #ea580c;"></i>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
                            <span><strong>♨️ Hot & Fresh Window:</strong> Collect before food cools down!</span>
                            <span class="timer-tick freshness-countdown">${formattedTime}</span>
                        </div>
                        <div style="font-size: 0.76rem; color: #c2410c; margin-top: 2px;">
                            Optimal taste & temperature window: 20 minutes from kitchen preparation.
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="freshness-timer cold">
                    <i class="fa-solid fa-snowflake" style="font-size: 1.25rem; color: #64748b;"></i>
                    <div style="flex: 1;">
                        <div><strong>❄️ Food Cool-Down Notice:</strong> Prepared 20+ mins ago.</div>
                        <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                            Food is safely packed at the counter, but may have cooled down. Please collect right away!
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (status === 'Preparing') {
        return `
            <div class="freshness-timer prep">
                <i class="fa-solid fa-fire-burner" style="font-size: 1.15rem; color: #2563eb;"></i>
                <div style="flex: 1;">
                    <div><strong>👨‍🍳 Fresh Kitchen Cooking:</strong> Preparing hot & fresh right now.</div>
                    <div style="font-size: 0.76rem; color: #1d4ed8; margin-top: 2px;">
                        Freshness guarantee: 20-minute pickup window starts immediately once ready bell rings!
                    </div>
                </div>
            </div>
        `;
    } else if (status === 'Pending') {
        return `
            <div class="freshness-timer prep" style="background: #f8fafc; border-color: #e2e8f0; color: #475569;">
                <i class="fa-solid fa-hourglass-half" style="font-size: 1.1rem; color: #f59e0b;"></i>
                <div style="flex: 1;">
                    <div><strong>⏳ Queued for Cooking:</strong> In kitchen queue.</div>
                    <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                        Will be made fresh upon preparation start.
                    </div>
                </div>
            </div>
        `;
    }
    return '';
}

function renderOrders(orders) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt empty-icon"></i>
                <h3>No Orders Placed Yet</h3>
                <p>Looks like you haven't pre-ordered any items yet.</p>
                <a href="menu.html" class="btn btn-primary">
                    <i class="fa-solid fa-bag-shopping"></i> Explore Mart & Menu
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const status = order.status || 'Pending';
        let formattedDate = 'Just now';
        if (order.createdAt) {
            try {
                formattedDate = new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            } catch (e) {
                formattedDate = order.createdAt;
            }
        }

        const isCancelled = status === 'Cancelled';
        const isPending = status === 'Pending';
        const isPreparing = status === 'Preparing';
        const isReady = status === 'Ready';
        const isCompleted = status === 'Completed';
        const orderDocId = order._id || order.id;

        return `
            <div class="order-card" id="order-${order.orderId || orderDocId}" style="${isReady ? 'border: 2px solid #16a34a; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.25);' : ''}">
                <div class="order-card-header">
                    <div>
                        <div class="order-id-badge" style="${isReady ? 'background: #dcfce7; color: #15803d; border-color: #86efac;' : ''}">
                            <i class="fa-solid fa-receipt" style="color: ${isReady ? '#16a34a' : 'var(--primary)'};"></i>
                            ${order.orderId || 'ORD-#'}
                        </div>
                        <div class="order-date">
                            <i class="fa-regular fa-clock"></i> ${formattedDate}
                        </div>
                    </div>
                    <div>
                        <span class="status-badge status-${status.toLowerCase()}">
                            <i class="fa-solid ${getStatusIcon(status)}"></i>
                            ${status}
                        </span>
                    </div>
                </div>

                ${isReady ? `
                    <div style="background: #f0fdf4; border: 1.5px dashed #86efac; color: #166534; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 700; margin: 0.75rem 0 1rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-bell-concierge" style="font-size: 1.2rem; color: #16a34a;"></i>
                            <span>Order is READY! Please collect from counter.</span>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="showOrderReadyById('${orderDocId}')">
                            <i class="fa-solid fa-qrcode"></i> Show Pickup Token
                        </button>
                    </div>
                ` : ''}

                <!-- 4-Stage Live Order Tracker -->
                ${!isCancelled ? `
                    <div class="order-tracker">
                        <div class="tracker-step ${isPending || isPreparing || isReady || isCompleted ? 'completed' : ''} ${isPending ? 'active' : ''}">
                            <div class="tracker-icon"><i class="fa-solid fa-check"></i></div>
                            <div class="tracker-label">Placed</div>
                        </div>
                        <div class="tracker-step ${isPreparing || isReady || isCompleted ? 'completed' : ''} ${isPreparing ? 'active' : ''}">
                            <div class="tracker-icon"><i class="fa-solid fa-fire-burner"></i></div>
                            <div class="tracker-label">Preparing</div>
                        </div>
                        <div class="tracker-step ${isReady || isCompleted ? 'completed' : ''} ${isReady ? 'active' : ''}">
                            <div class="tracker-icon"><i class="fa-solid fa-bell-concierge"></i></div>
                            <div class="tracker-label">Ready for Pickup</div>
                        </div>
                        <div class="tracker-step ${isCompleted ? 'completed active' : ''}">
                            <div class="tracker-icon"><i class="fa-solid fa-circle-check"></i></div>
                            <div class="tracker-label">Completed</div>
                        </div>
                    </div>

                    <!-- Food Freshness & Temperature Countdown Timer -->
                    ${getOrderFreshnessHtml(order)}
                ` : `
                    <div style="background: var(--status-cancelled-bg); color: var(--status-cancelled-text); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; margin: 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-ban"></i> This order was cancelled.
                    </div>
                `}

                <!-- Fulfillment & Kitchen Prep Time Banner -->
                ${order.estimatedPrepTime ? `
                    <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; color: #1e40af; padding: 0.65rem 0.9rem; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 600; margin: 0.65rem 0; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 7px;">
                            <i class="fa-solid fa-kitchen-set" style="font-size: 1.1rem; color: #2563eb;"></i>
                            <span><strong>Kitchen Update:</strong> ${order.estimatedPrepTime}</span>
                        </div>
                        <span style="font-size: 0.75rem; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">In Kitchen</span>
                    </div>
                ` : ''}

                <!-- Receiving Mode & Customer Arrival Info -->
                <div style="background: var(--bg-surface-soft, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 0.65rem 0.85rem; margin: 0.65rem 0 0.85rem 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; font-size: 0.83rem;">
                    <div>
                        ${order.fulfillmentType === 'delivery' ? `
                            <span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-person-biking"></i> Campus Delivery
                            </span>
                            <span style="margin-left: 6px; color: var(--secondary); font-weight: 600;">
                                <i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ${order.campusBlock ? `${order.campusBlock} - ${order.roomOrCabin || ''}` : (order.deliveryLocation || 'Campus Address')}
                            </span>
                        ` : `
                            <span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-person-walking"></i> Self Pickup (${order.campusBlock || 'Counter'})
                            </span>
                        `}
                        ${(order.googleMapsUrl || (order.lat && order.lng)) ? `
                            <a href="${order.googleMapsUrl || `https://www.google.com/maps?q=${order.lat},${order.lng}`}" target="_blank" style="font-size: 0.72rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 3px; margin-left: 6px;" title="View Live Pin on Google Maps">
                                <i class="fa-solid fa-map-location-dot"></i> Live Pin 📍
                            </a>
                        ` : ''}
                    </div>
                    <div style="color: var(--text-muted); font-weight: 600;">
                        <i class="fa-regular fa-clock" style="color: var(--primary);"></i>
                        <strong>Arrival Time:</strong> ${order.customerArrivalTime || order.pickupSlot || 'Immediate (15m)'}
                    </div>
                </div>

                <!-- Ordered Items Details -->
                <div class="order-items-mini">
                    <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.6rem; color: var(--secondary);">
                        Order Items (${order.items?.length || 0}):
                    </div>
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <span>
                                <i class="fa-solid fa-circle" style="font-size: 0.45rem; color: ${item.type === 'nonveg' ? '#dc2626' : '#16a34a'};"></i>
                                ${item.name} &times; ${item.quantity}
                            </span>
                            <span style="font-weight: 600;">₹${Number(item.price) * Number(item.quantity)}</span>
                        </div>
                    `).join('')}
                    
                    <div class="order-item-row" style="border-top: 1px dashed var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem; font-weight: 700; font-size: 0.95rem; color: var(--secondary);">
                        <span>Total Bill</span>
                        <span style="color: var(--primary);">₹${order.totalAmount}</span>
                    </div>

                    ${(order.dueAmount && Number(order.dueAmount) > 0) ? `
                        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.5rem 0.75rem; margin-top: 0.5rem; font-size: 0.82rem;">
                            <div style="display: flex; justify-content: space-between; color: #166534; font-weight: 600; margin-bottom: 2px;">
                                <span><i class="fa-solid fa-check"></i> Advance Paid (${order.advancePercentage || 50}%):</span>
                                <strong>₹${order.advanceAmount || Math.round(order.totalAmount * 0.5)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: #92400e; font-weight: 700;">
                                <span><i class="fa-solid fa-hand-holding-dollar"></i> Balance Due on Pickup:</span>
                                <span style="background: #fef3c7; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 4px;">₹${order.dueAmount}</span>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size: 0.8rem; color: #15803d; font-weight: 700; margin-top: 0.35rem; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-circle-check"></i> 100% Fully Paid
                        </div>
                    `}
                </div>

                <!-- Pickup & Payment Metadata -->
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                    <div>
                        <i class="fa-solid fa-credit-card" style="color: var(--primary);"></i>
                        <strong>Payment:</strong> ${order.paymentMethod || 'Pay on Pickup'}
                    </div>
                    ${order.studentDept ? `
                    <div>
                        <i class="fa-solid fa-building-columns" style="color: var(--primary);"></i>
                        <strong>Dept:</strong> ${order.studentDept}
                    </div>
                    ` : ''}
                    ${order.specialNotes ? `
                        <div style="width: 100%; background: #fff; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem;">
                            <i class="fa-solid fa-note-sticky" style="color: var(--accent);"></i>
                            <strong>Note:</strong> ${order.specialNotes}
                        </div>
                    ` : ''}
                </div>

                <!-- Action Buttons: Cancel (if Pending) or Rate Order (if Completed) -->
                ${isPending ? `
                    <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
                        <button onclick="cancelStudentOrder('${orderDocId}', '${order.orderId}')" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;">
                            <i class="fa-solid fa-xmark"></i> Cancel Order
                        </button>
                    </div>
                ` : ''}

                ${isCompleted ? `
                    <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem;">
                        ${order.hasFeedback ? `
                            <span class="feedback-rated-badge">
                                <i class="fa-solid fa-star"></i> Rated (${order.feedbackRating || 5}/5 ⭐)
                            </span>
                        ` : `
                            <button onclick="openFeedbackModal('${orderDocId}', '${order.orderId}')" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #f59e0b, #ea580c); border: none;">
                                <i class="fa-solid fa-star"></i> Rate & Review Order
                            </button>
                        `}
                    </div>
                ` : ''}
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
        case 'Cancelled': return 'fa-circle-xmark';
        default: return 'fa-info-circle';
    }
}

async function cancelStudentOrder(docId, orderId) {
    if (!confirm(`Are you sure you want to cancel order ${orderId}?`)) return;

    try {
        const res = await api.updateOrderStatus(docId, 'Cancelled');
        if (res.success) {
            showToast(`Order ${orderId} has been cancelled.`, 'info', 'Order Cancelled');
            fetchAndRenderOrders();
        } else {
            showToast(res.message || 'Could not cancel order.', 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Could not cancel order: ' + error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// Feedback & Star Rating Modal Logic
// --------------------------------------------------------------------------

let currentFeedbackRating = 5;
let currentFeedbackTags = new Set();
let activeFeedbackOrderId = null;

const RATING_DESCRIPTIONS = {
    1: '⭐ Terrible – Needs major improvement',
    2: '⭐⭐ Poor – Not satisfied',
    3: '⭐⭐⭐ Average – Decent food & service',
    4: '⭐⭐⭐⭐ Very Good – Fast & delicious!',
    5: '⭐⭐⭐⭐⭐ Excellent! Outstanding Mart & Express Pickup! 🎉'
};

function openFeedbackModal(docId, orderCode) {
    activeFeedbackOrderId = orderCode || docId;
    currentFeedbackRating = 5;
    currentFeedbackTags.clear();

    const orderIdDisplay = document.getElementById('feedback-modal-order-id');
    const orderIdInput = document.getElementById('feedback-form-order-id');
    const commentInput = document.getElementById('feedback-form-comment');

    if (orderIdDisplay) orderIdDisplay.textContent = `Order #${orderCode || docId}`;
    if (orderIdInput) orderIdInput.value = orderCode || docId;
    if (commentInput) commentInput.value = '';

    // Reset Tag Pills
    document.querySelectorAll('.feedback-tag-pill').forEach(pill => pill.classList.remove('active'));

    // Highlight 5 Stars by default
    updateStarUI(5);

    const modal = document.getElementById('feedback-modal');
    if (modal) modal.classList.add('active');
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) modal.classList.remove('active');
}

function setRating(val) {
    currentFeedbackRating = val;
    updateStarUI(val);
}

function hoverRating(val) {
    const buttons = document.querySelectorAll('.star-rate-btn');
    buttons.forEach(btn => {
        const bVal = parseInt(btn.getAttribute('data-val'), 10);
        btn.classList.toggle('hover', bVal <= val);
    });
    const label = document.getElementById('rating-score-label');
    if (label) label.textContent = RATING_DESCRIPTIONS[val] || '';
}

function resetRatingHover() {
    document.querySelectorAll('.star-rate-btn').forEach(btn => btn.classList.remove('hover'));
    updateStarUI(currentFeedbackRating);
}

function updateStarUI(val) {
    const buttons = document.querySelectorAll('.star-rate-btn');
    buttons.forEach(btn => {
        const bVal = parseInt(btn.getAttribute('data-val'), 10);
        btn.classList.toggle('active', bVal <= val);
    });
    const label = document.getElementById('rating-score-label');
    if (label) label.textContent = RATING_DESCRIPTIONS[val] || 'Tap a star to rate';
}

function toggleFeedbackTag(tagName, element) {
    if (currentFeedbackTags.has(tagName)) {
        currentFeedbackTags.delete(tagName);
        element.classList.remove('active');
    } else {
        currentFeedbackTags.add(tagName);
        element.classList.add('active');
    }
}

async function handleFeedbackSubmit(event) {
    event.preventDefault();

    const user = api.getCurrentUser();
    if (!user) {
        showToast('Please login to submit feedback.', 'warning');
        return;
    }

    const comment = document.getElementById('feedback-form-comment')?.value.trim() || '';
    const submitBtn = document.getElementById('submit-feedback-btn');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    }

    const payload = {
        orderId: activeFeedbackOrderId || 'General',
        userId: user._id || user.uid || user.id,
        userName: user.name || 'Campus Student',
        userRoll: user.rollNo || user.studentRoll || '',
        rating: currentFeedbackRating,
        tags: Array.from(currentFeedbackTags),
        comment: comment || 'Smooth pickup experience!'
    };

    try {
        const res = await api.submitFeedback(payload);
        if (res.success) {
            showToast('Thank you! Your feedback & rating have been shared with the canteen staff.', 'success', 'Review Submitted');
            closeFeedbackModal();
            fetchAndRenderOrders();
        } else {
            showToast(res.message || 'Failed to submit feedback.', 'error');
        }
    } catch (err) {
        console.error('Error submitting feedback:', err);
        showToast('Error submitting feedback: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Feedback';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initOrders();
});

