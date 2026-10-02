// ==========================================================================
// Campus Mart – PWA 1-Click Mobile App Installer & Service Worker Registration
// File: js/pwa-install.js
// ==========================================================================

let deferredPwaPrompt = null;

// 1. Register Service Worker for Instant Performance & Offline Caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                // Check for updates
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    if (installingWorker) {
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[PWA] New version available.');
                            }
                        };
                    }
                };
            })
            .catch(err => {
                // Silently ignore or log registration warning
                console.debug('[PWA] Service Worker registration note:', err.message);
            });
    });
}

// 2. Capture 'beforeinstallprompt' Event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;

    // Show custom install buttons / banner if present
    const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn, .auto-apk-banner');
    installBtns.forEach(btn => {
        btn.style.display = 'inline-flex';
    });
});

// 3. Global Install Handler
function promptPwaInstall() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the installation prompt.');
            }
            deferredPwaPrompt = null;
        });
    } else {
        // Fallback: If APK or direct download exists
        const apkLink = document.getElementById('direct-apk-download-btn');
        if (apkLink) {
            apkLink.click();
        } else if (typeof showToast === 'function') {
            showToast('To install Campus Mart app, tap browser menu (⋮) -> "Add to Home screen" / "Install app"', 'info');
        }
    }
}

// 4. Handle Successful Installation
window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn, .auto-apk-banner');
    installBtns.forEach(btn => {
        btn.style.display = 'none';
    });
    if (typeof showToast === 'function') {
        showToast('🎉 Campus Mart installed successfully on your device!', 'success');
    }
});

// Export globally
window.promptPwaInstall = promptPwaInstall;
