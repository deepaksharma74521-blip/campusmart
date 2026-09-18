// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/orders.js
// Description: Student Order History, Live Status Polling & Order Cancellation
// ==========================================================================

let ordersPollInterval = null;

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
            renderOrders(res.orders);
        } else {
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

    // Auto poll every 4 seconds for live kitchen updates
    if (ordersPollInterval) clearInterval(ordersPollInterval);
    ordersPollInterval = setInterval(fetchAndRenderOrders, 4000);
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
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <div class="order-id-badge">
                            <i class="fa-solid fa-receipt" style="color: var(--primary);"></i>
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
                ` : `
                    <div style="background: var(--status-cancelled-bg); color: var(--status-cancelled-text); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; margin: 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-ban"></i> This order was cancelled.
                    </div>
                `}

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
                        <span>Total Paid / Payable</span>
                        <span style="color: var(--primary);">₹${order.totalAmount}</span>
                    </div>
                </div>

                <!-- Pickup & Payment Metadata -->
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                    <div>
                        <i class="fa-solid fa-person-walking-luggage" style="color: var(--primary);"></i>
                        <strong>Pickup Slot:</strong> ${order.pickupSlot || 'Immediate'}
                    </div>
                    <div>
                        <i class="fa-solid fa-credit-card" style="color: var(--primary);"></i>
                        <strong>Payment:</strong> ${order.paymentMethod || 'Pay on Pickup'}
                    </div>
                    ${order.specialNotes ? `
                        <div style="width: 100%; background: #fff; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem;">
                            <i class="fa-solid fa-note-sticky" style="color: var(--accent);"></i>
                            <strong>Note:</strong> ${order.specialNotes}
                        </div>
                    ` : ''}
                </div>

                <!-- Action: Cancel button if still Pending -->
                ${isPending ? `
                    <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
                        <button onclick="cancelStudentOrder('${orderDocId}', '${order.orderId}')" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;">
                            <i class="fa-solid fa-xmark"></i> Cancel Order
                        </button>
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

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initOrders();
});
