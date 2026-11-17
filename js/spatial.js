// ==============================================================================
// Campus Mart – 3D Spatial & GPU-Accelerated Interactive Motion Engine
// File: js/spatial.js
// Description: Multi-layer 3D tilt, holographic lighting sheen & gyroscope parallax
// ==============================================================================

(function() {
    'use strict';

    // Respect user's accessibility preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // --------------------------------------------------------------------------
    // 1. Desktop 3D Cursor Tilt with Dynamic Specular Glare
    // --------------------------------------------------------------------------
    function initCard3DTilt(card) {
        if (!card || card._has3DInit) return;
        card._has3DInit = true;

        // Ensure glare element exists
        let glare = card.querySelector('.spatial-glare');
        if (!glare) {
            glare = document.createElement('div');
            glare.className = 'spatial-glare';
            card.appendChild(glare);
        }

        let rafId = null;
        let bounds = null;

        function onPointerEnter() {
            bounds = card.getBoundingClientRect();
            card.style.transition = 'transform 0.15s ease-out, box-shadow 0.15s ease-out';
            if (glare) glare.style.opacity = '1';
        }

        function onPointerMove(e) {
            if (!bounds) bounds = card.getBoundingClientRect();
            const mouseX = e.clientX - bounds.left;
            const mouseY = e.clientY - bounds.top;

            const xPercent = ((mouseX / bounds.width) - 0.5) * 2; // -1 to 1
            const yPercent = ((mouseY / bounds.height) - 0.5) * 2; // -1 to 1

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const maxAngle = 14;
                const rotX = (-yPercent * maxAngle).toFixed(2);
                const rotY = (xPercent * maxAngle).toFixed(2);

                card.style.transform = `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px) scale3d(1.02, 1.02, 1.02)`;

                // Dynamic realistic shadow cast opposite to tilt angle
                const shadowX = (-xPercent * 16).toFixed(1);
                const shadowY = (-yPercent * 16 + 18).toFixed(1);
                card.style.boxShadow = `${shadowX}px ${shadowY}px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(234, 88, 12, 0.18)`;

                // Dynamic holographic sheen position
                if (glare) {
                    const lightX = ((xPercent + 1) * 50).toFixed(1);
                    const lightY = ((yPercent + 1) * 50).toFixed(1);
                    glare.style.background = `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 65%)`;
                }
            });
        }

        function onPointerLeave() {
            if (rafId) cancelAnimationFrame(rafId);
            bounds = null;
            card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
            card.style.boxShadow = '';
            if (glare) {
                glare.style.opacity = '0';
            }
        }

        card.addEventListener('pointerenter', onPointerEnter, { passive: true });
        card.addEventListener('pointermove', onPointerMove, { passive: true });
        card.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    // --------------------------------------------------------------------------
    // 2. Mobile Gyroscope 3D Parallax Tilt (iOS Safari & Android Chrome)
    // --------------------------------------------------------------------------
    let currentGamma = 0;
    let currentBeta = 0;
    let targetGamma = 0;
    let targetBeta = 0;
    let gyroRunning = false;

    function handleDeviceOrientation(e) {
        if (e.gamma === null || e.beta === null) return;
        // Gamma is left/right (-90 to 90), Beta is front/back (-180 to 180)
        targetGamma = Math.max(-25, Math.min(25, e.gamma || 0));
        targetBeta = Math.max(-20, Math.min(20, (e.beta || 45) - 45)); // Centered around 45 deg reading angle

        if (!gyroRunning) {
            gyroRunning = true;
            requestAnimationFrame(updateGyroTilt);
        }
    }

    function updateGyroTilt() {
        // Smooth interpolation (lerp)
        currentGamma += (targetGamma - currentGamma) * 0.08;
        currentBeta += (targetBeta - currentBeta) * 0.08;

        const tiltX = (-currentBeta * 0.4).toFixed(2);
        const tiltY = (currentGamma * 0.4).toFixed(2);

        // Apply gentle 3D tilt to visible cards in viewport on mobile
        const cards = document.querySelectorAll('.food-card, .shop-card, .hero-card-preview');
        const viewH = window.innerHeight;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top < viewH && rect.bottom > 0) {
                card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(6px)`;
            }
        });

        if (Math.abs(targetGamma - currentGamma) > 0.05 || Math.abs(targetBeta - currentBeta) > 0.05) {
            requestAnimationFrame(updateGyroTilt);
        } else {
            gyroRunning = false;
        }
    }

    // --------------------------------------------------------------------------
    // 3. Staggered 3D Scroll Reveal Animation (IntersectionObserver)
    // --------------------------------------------------------------------------
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('spatial-revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.12
    });

    function observeCardsForReveal() {
        const targets = document.querySelectorAll('.food-card:not(.spatial-reveal-ready), .shop-card:not(.spatial-reveal-ready), .feature-card:not(.spatial-reveal-ready)');
        targets.forEach((el, index) => {
            el.classList.add('spatial-reveal-ready');
            el.style.transitionDelay = `${(index % 6) * 0.06}s`;
            revealObserver.observe(el);

            if (!isTouchDevice) {
                initCard3DTilt(el);
            }
        });
    }

    // --------------------------------------------------------------------------
    // 4. Hero Section Ambient 3D Glowing Orbs
    // --------------------------------------------------------------------------
    function injectHero3DOrbs() {
        const hero = document.querySelector('.hero-section');
        if (!hero || hero.querySelector('.hero-3d-orb')) return;

        hero.style.position = 'relative';
        hero.style.overflow = 'hidden';

        const orb1 = document.createElement('div');
        orb1.className = 'hero-3d-orb hero-3d-orb-1';
        const orb2 = document.createElement('div');
        orb2.className = 'hero-3d-orb hero-3d-orb-2';

        hero.insertBefore(orb2, hero.firstChild);
        hero.insertBefore(orb1, hero.firstChild);
    }

    // --------------------------------------------------------------------------
    // 5. Automatic Dynamic Observer for Menu & Filter Updates
    // --------------------------------------------------------------------------
    function setupEngine() {
        injectHero3DOrbs();
        observeCardsForReveal();

        // Attach 3D tilt to static preview elements
        const previewCards = document.querySelectorAll('.hero-card-preview, .feature-card, .stat-card-modern');
        previewCards.forEach(c => {
            if (!isTouchDevice) initCard3DTilt(c);
        });

        // Monitor dynamic insertions (e.g. food items rendered by search/filters)
        const container = document.getElementById('food-items-container') || document.getElementById('shops-container');
        if (container) {
            const mutObserver = new MutationObserver(() => {
                requestAnimationFrame(observeCardsForReveal);
            });
            mutObserver.observe(container, { childList: true, subtree: false });
        }

        // Listen for mobile orientation
        if (isTouchDevice && window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEngine);
    } else {
        setupEngine();
    }

    // Export global trigger for dynamic re-init
    window.CampusSpatial = {
        refresh: observeCardsForReveal,
        initCard: initCard3DTilt
    };
})();
