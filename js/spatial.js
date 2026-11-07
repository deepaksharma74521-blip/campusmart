// ==============================================================================
// Campus Mart – Apple VisionOS Style 3D Spatial Interactive Tilt & Depth Physics
// File: js/spatial.js
// Description: Dynamic 3D gyro/mouse perspective tilt & luminous specular light tracking
// ==============================================================================

(function() {
    'use strict';

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    function handleCardMouseMove(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const cardWidth = rect.width;
        const cardHeight = rect.height;

        // Calculate cursor position from center (-0.5 to +0.5)
        const xOffset = (e.clientX - rect.left) / cardWidth - 0.5;
        const yOffset = (e.clientY - rect.top) / cardHeight - 0.5;

        // 3D rotation angles (max 10 degrees)
        const rotateY = (xOffset * 18).toFixed(2);
        const rotateX = (-yOffset * 18).toFixed(2);

        // Specular light coordinates
        const lightX = ((e.clientX - rect.left) / cardWidth * 100).toFixed(1);
        const lightY = ((e.clientY - rect.top) / cardHeight * 100).toFixed(1);

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale3d(1.025, 1.025, 1.025)`;
        card.style.setProperty('--spatial-light-x', `${lightX}%`);
        card.style.setProperty('--spatial-light-y', `${lightY}%`);
    }

    function handleCardMouseLeave(e) {
        const card = e.currentTarget;
        card.style.transform = '';
        card.style.setProperty('--spatial-light-x', '50%');
        card.style.setProperty('--spatial-light-y', '0%');
    }

    function handleCardTouchStart(e) {
        const card = e.currentTarget;
        card.style.transform = 'perspective(1000px) scale3d(0.975, 0.975, 0.975) translateZ(-6px)';
    }

    function handleCardTouchEnd(e) {
        const card = e.currentTarget;
        card.style.transform = '';
    }

    function attachSpatialListeners() {
        const targets = document.querySelectorAll('.food-card, .shop-card, .card-hover, .feature-card, .order-summary-card');
        targets.forEach(card => {
            if (card.dataset.spatialAttached === 'true') return;
            card.dataset.spatialAttached = 'true';

            if (!isTouchDevice) {
                card.addEventListener('mousemove', handleCardMouseMove, { passive: true });
                card.addEventListener('mouseleave', handleCardMouseLeave, { passive: true });
            } else {
                card.addEventListener('touchstart', handleCardTouchStart, { passive: true });
                card.addEventListener('touchend', handleCardTouchEnd, { passive: true });
                card.addEventListener('touchcancel', handleCardTouchEnd, { passive: true });
            }
        });
    }

    // Initialize on DOM ready and observe dynamic DOM changes (e.g. food items rendered)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            attachSpatialListeners();
        });
    } else {
        attachSpatialListeners();
    }

    // MutationObserver to attach to dynamically rendered dishes and shop cards
    const observer = new MutationObserver(() => {
        attachSpatialListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
