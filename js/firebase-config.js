// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System
// File: js/firebase-config.js
// Description: Firebase initialization and configuration
// ==========================================================================

// --------------------------------------------------------------------------
// STEP: Replace the configuration values below with your Firebase Project config.
// You can get this from the Firebase Console -> Project Settings -> General -> Your apps -> Web app
// --------------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCbmJuLizxCC0_jx10AMcSqV0nT4gImON4",
    authDomain: "campus-canteen-136b6.firebaseapp.com",
    projectId: "campus-canteen-136b6",
    storageBucket: "campus-canteen-136b6.firebasestorage.app",
    messagingSenderId: "566506097602",
    appId: "1:566506097602:web:3837992114a35995af245b"
};

// Initialize Firebase App
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Auth and Firestore instances
const auth = firebase.auth();
const db = firebase.firestore();

// Check if file is opened directly via file:// protocol
if (window.location.protocol === 'file:') {
    console.warn('Campus Mart: Opened using file:// protocol. Firebase Auth & Firestore require an HTTP/HTTPS server (e.g. VS Code Live Server).');
    document.addEventListener('DOMContentLoaded', () => {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; padding: 12px 20px; z-index: 99999; font-weight: 600; font-size: 14px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; gap: 10px; font-family: sans-serif;';
        warningDiv.innerHTML = `
            <span>⚠️ <strong>Notice:</strong> You opened this file directly via <code>file:///</code>. Firebase Authentication & Firestore require a local server. Please right-click <code>index.html</code> in VS Code and select <strong>"Open with Live Server"</strong> (http://127.0.0.1:5500).</span>
            <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.3); border: none; color: white; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">✕</button>
        `;
        document.body.prepend(warningDiv);
    });
}

// Toast notification helper for modern feedback
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

    // Auto remove after 3.8 seconds
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 400);
    }, 3800);
}

// Global Cart Badge updater helper
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

// Run on initial load
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalCartBadge();
});
