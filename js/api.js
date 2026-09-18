// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB API Client)
// File: js/api.js
// Description: Centralized REST API client for MongoDB Backend
// ==========================================================================

const API_BASE = window.location.origin.includes('5000') || window.location.origin.includes('5500') || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? '' 
    : 'http://localhost:5000';

const api = {
    // 1. Auth Methods
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

    async seedDishes() {
        const res = await fetch(`${API_BASE}/api/menu/seed`, {
            method: 'POST'
        });
        return await res.json();
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

    async updateOrderStatus(orderId, status) {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
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

    async manageStaff(userId, action) {
        const res = await fetch(`${API_BASE}/api/admin/staff/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
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

document.addEventListener('DOMContentLoaded', () => {
    updateGlobalCartBadge();
});
