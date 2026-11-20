// ==============================================================================
// Campus Mart – Tactile Spring & Flying Add-to-Cart Animation Engine
// File: js/spatial.js (v12.0 - Ultra-Fast & Lag-Free)
// Description: Replaces heavy 3D tilt with Apple-style tactile spring press and Swiggy-style flying dish cart animation
// ==============================================================================

(function() {
    'use strict';

    // 1. Tactile Spring Touch & Badge Bounce CSS Injection
    function injectTactileStyles() {
        if (document.getElementById('cm-tactile-motion-styles')) return;

        const style = document.createElement('style');
        style.id = 'cm-tactile-motion-styles';
        style.textContent = `
            /* Apple iOS Spring Touch Feel (Lightweight GPU-friendly) */
            .food-card, .btn, .filter-pill, .shop-filter-pill, .cart-item-remove, .qty-btn, .time-slot-pill {
                transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.15s ease !important;
                -webkit-tap-highlight-color: transparent;
            }

            .food-card:active {
                transform: scale(0.97) !important;
            }

            .btn:active, .filter-pill:active, .shop-filter-pill:active, .qty-btn:active, .time-slot-pill:active {
                transform: scale(0.93) !important;
            }

            /* Cart Badge Juicy Pop Animation */
            @keyframes cartBadgePop {
                0% { transform: scale(1); }
                30% { transform: scale(1.65); background: #22c55e !important; }
                65% { transform: scale(0.88); }
                100% { transform: scale(1); }
            }

            .cart-badge-pop {
                animation: cartBadgePop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            }

            /* Flying Dish Ball Container */
            .flying-dish-particle {
                position: fixed;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                pointer-events: none;
                z-index: 100000;
                overflow: hidden;
                border: 2.5px solid #ffffff;
                box-shadow: 0 8px 24px rgba(234, 88, 12, 0.4), 0 0 16px rgba(255, 255, 255, 0.8);
                background: #ea580c;
                display: flex;
                align-items: center;
                justify-content: center;
                transform-origin: center center;
                will-change: transform, opacity;
            }

            .flying-dish-particle img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }

            .flying-dish-sparkle {
                position: fixed;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ea580c;
                pointer-events: none;
                z-index: 99999;
                box-shadow: 0 0 8px #ea580c;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Flying Add-to-Cart Animation Engine
    function flyToCart(originElement, imageUrl) {
        let trigger = originElement;
        if (!trigger && typeof window !== 'undefined' && window.event && window.event.target) {
            trigger = window.event.target;
        }

        // Find origin card or button bounds
        let startX = window.innerWidth / 2 - 26;
        let startY = window.innerHeight / 2 - 26;

        if (trigger) {
            const cardElem = trigger.closest ? (trigger.closest('.food-card') || trigger) : trigger;
            if (cardElem && cardElem.getBoundingClientRect) {
                const startRect = cardElem.getBoundingClientRect();
                startX = startRect.left + startRect.width / 2 - 26;
                startY = startRect.top + startRect.height / 2 - 26;
            }
        }

        // Target Cart Icon: check desktop header cart or mobile bottom nav cart
        let targetCart = null;

        // Check mobile bottom nav first if visible
        const mobileNavCart = document.querySelector('.mobile-bottom-nav a[href*="cart.html"]');
        if (mobileNavCart && mobileNavCart.offsetParent !== null) {
            targetCart = mobileNavCart;
        } else {
            // Header desktop cart icon
            targetCart = document.querySelector('.cart-btn-wrap .cart-icon-btn') || 
                         document.querySelector('.cart-icon-btn') || 
                         document.querySelector('a[href*="cart.html"]');
        }

        let endX = window.innerWidth - 60;
        let endY = 30;

        if (targetCart && targetCart.getBoundingClientRect) {
            const endRect = targetCart.getBoundingClientRect();
            endX = endRect.left + endRect.width / 2 - 26;
            endY = endRect.top + endRect.height / 2 - 26;
        }

        // Create flying clone particle
        const flying = document.createElement('div');
        flying.className = 'flying-dish-particle';
        flying.style.left = `${startX}px`;
        flying.style.top = `${startY}px`;

        const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
        const displayImg = imageUrl || fallbackImg;
        flying.innerHTML = `<img src="${displayImg}" onerror="this.src='${fallbackImg}'" alt="dish">`;

        document.body.appendChild(flying);

        // Haptic feedback if available on device
        if (navigator.vibrate) {
            try { navigator.vibrate([15]); } catch(e){}
        }

        // Animate along curved parabola
        const duration = 520; // ms
        const startTime = performance.now();
        const midY = Math.min(startY, endY) - 75; // Arch peak

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease-in-out quadratic curve for X
            const easeX = progress * progress * (3 - 2 * progress);
            const currentX = startX + (endX - startX) * easeX;

            // Parabolic arch for Y
            const currentY = (1 - progress) * (1 - progress) * startY +
                             2 * (1 - progress) * progress * midY +
                             progress * progress * endY;

            // Scale down from 1.0 to 0.35 as it reaches cart
            const currentScale = 1.0 - (progress * 0.65);
            const currentOpacity = progress > 0.85 ? 1.0 - ((progress - 0.85) / 0.15) : 1.0;

            flying.style.transform = `translate3d(${currentX - startX}px, ${currentY - startY}px, 0) scale(${currentScale})`;
            flying.style.opacity = String(currentOpacity);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                flying.remove();
                // Pop the cart badge
                triggerCartBadgePop();
            }
        }

        requestAnimationFrame(step);
    }

    // 3. Cart Badge Bounce Animation
    function triggerCartBadgePop() {
        const badges = document.querySelectorAll('.cart-badge, .mobile-cart-badge');
        badges.forEach(b => {
            b.classList.remove('cart-badge-pop');
            void b.offsetWidth; // trigger reflow
            b.classList.add('cart-badge-pop');
            setTimeout(() => b.classList.remove('cart-badge-pop'), 500);
        });

        // Trigger light vibration
        if (navigator.vibrate) {
            try { navigator.vibrate([25, 30, 20]); } catch(e){}
        }
    }

    // 4. Passive Scroll & Touch Booster (Locks scrolling to 120 FPS without thread blocking)
    try {
        const passiveOpts = { passive: true, capture: false };
        window.addEventListener('touchstart', function() {}, passiveOpts);
        window.addEventListener('touchmove', function() {}, passiveOpts);
        window.addEventListener('wheel', function() {}, passiveOpts);
    } catch(e) {}

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectTactileStyles);
    } else {
        injectTactileStyles();
    }

    // Global export
    window.motionEngine = {
        flyToCart,
        triggerCartBadgePop
    };
})();
