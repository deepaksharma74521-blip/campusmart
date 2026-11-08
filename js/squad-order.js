// ==============================================================================
// Campus Mart – Roommate & Benchmates Squad Order Engine
// File: js/squad-order.js
// Description: Multi-user shared cart & group pre-ordering for TMU hostels & classrooms
// ==============================================================================

(function() {
    'use strict';

    const SQUAD_STORAGE_KEY = 'cm_squad_code';

    const squadOrder = {
        init() {
            // Check if user clicked a shared squad link: ?squad=HOSTEL-402
            const urlParams = new URLSearchParams(window.location.search);
            const querySquad = urlParams.get('squad');
            if (querySquad) {
                this.joinSquad(querySquad.trim().toUpperCase(), false);
            }
            this.renderSquadWidgets();
        },

        getActiveSquad() {
            return localStorage.getItem(SQUAD_STORAGE_KEY) || null;
        },

        createSquad(customName = '') {
            let code = customName ? customName.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') : '';
            if (!code) {
                const randomNum = Math.floor(100 + Math.random() * 900);
                code = `HOSTEL-${randomNum}`;
            }
            localStorage.setItem(SQUAD_STORAGE_KEY, code);
            this.renderSquadWidgets();
            if (window.soundEngine) window.soundEngine.playPop();
            if (typeof showToast === 'function') {
                showToast(`🎉 Squad "${code}" created! Share the link with your roommates.`, 'success', 'Squad Active');
            }
            return code;
        },

        joinSquad(code, showNotification = true) {
            const cleanCode = code.trim().toUpperCase();
            localStorage.setItem(SQUAD_STORAGE_KEY, cleanCode);
            this.renderSquadWidgets();
            if (window.soundEngine) window.soundEngine.playPop();
            if (showNotification && typeof showToast === 'function') {
                showToast(`👥 Joined Squad "${cleanCode}"! Dishes you add will be shared with the squad.`, 'success', 'Squad Joined');
            }
            return cleanCode;
        },

        leaveSquad() {
            const current = this.getActiveSquad();
            localStorage.removeItem(SQUAD_STORAGE_KEY);
            this.renderSquadWidgets();
            if (typeof showToast === 'function') {
                showToast(`Left Squad "${current}". You are now ordering solo.`, 'info', 'Squad Disconnected');
            }
        },

        getShareLink() {
            const squad = this.getActiveSquad();
            if (!squad) return 'https://campusmart.online';
            return `https://campusmart.online/menu.html?squad=${encodeURIComponent(squad)}`;
        },

        getWhatsAppInviteUrl() {
            const squad = this.getActiveSquad();
            const link = this.getShareLink();
            const text = `🍕 *TMU CAMPUS MART - SQUAD ORDER*\nBhai maine Room Squad banaya hai (*${squad}*). Apni pasand ka khana add karo, sath me order kar rhe hain:\n👉 ${link}`;
            return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        },

        // Render Squad Banner in Cart and Menu
        renderSquadWidgets() {
            const squad = this.getActiveSquad();
            const squadCartBanner = document.getElementById('squad-cart-banner');
            
            if (squadCartBanner) {
                if (squad) {
                    squadCartBanner.style.display = 'block';
                    squadCartBanner.innerHTML = `
                        <div class="squad-active-banner">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div class="squad-icon-badge"><i class="fa-solid fa-users"></i></div>
                                    <div>
                                        <div style="font-weight: 800; font-size: 0.92rem; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                            Squad Order: <span style="color: #ea580c; font-family: monospace; font-size: 1rem;">${squad}</span>
                                            <span style="font-size: 0.7rem; background: #dcfce7; color: #15803d; padding: 1px 7px; border-radius: 9999px; font-weight: 700;">Active</span>
                                        </div>
                                        <div style="font-size: 0.74rem; color: #64748b;">Hostel & Roommates Shared Cart Mode</div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <a href="${this.getWhatsAppInviteUrl()}" target="_blank" class="btn btn-sm" style="background: #22c55e; color: white; border: none; font-size: 0.76rem; border-radius: 8px; font-weight: 700; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                                        <i class="fa-brands fa-whatsapp"></i> Invite Roommates
                                    </a>
                                    <button type="button" onclick="window.squadOrder.leaveSquad()" class="btn btn-sm btn-outline" style="font-size: 0.74rem; padding: 4px 8px; border-radius: 8px; color: #64748b;">
                                        Exit Squad
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    squadCartBanner.style.display = 'block';
                    squadCartBanner.innerHTML = `
                        <div class="squad-invite-banner" onclick="window.squadOrder.promptCreateSquad()">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="squad-icon-badge" style="background: #eff6ff; color: #0284c7;"><i class="fa-solid fa-people-group"></i></div>
                                <div>
                                    <strong style="font-size: 0.88rem; color: #0f172a; display: block;">Ordering with Roommates or Friends?</strong>
                                    <span style="font-size: 0.75rem; color: #64748b;">1-Click Squad Cart: Share link so everyone adds dishes together.</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-sm btn-primary" style="font-size: 0.78rem; border-radius: 8px; font-weight: 700; white-space: nowrap;">
                                + Start Squad
                            </button>
                        </div>
                    `;
                }
            }

            const squadMenuBanner = document.getElementById('squad-menu-banner');
            if (squadMenuBanner) {
                if (squad) {
                    squadMenuBanner.style.display = 'block';
                    squadMenuBanner.innerHTML = `
                        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 0.65rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.08);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-users" style="color: #0284c7; font-size: 1.1rem;"></i>
                                <span style="font-weight: 700; font-size: 0.88rem; color: #1e3a8a;">Squad Active: <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 6px; border: 1px solid #93c5fd; color: #1d4ed8;">${squad}</span></span>
                                <span style="font-size: 0.75rem; color: #3b82f6;">(Dishes added will be marked in squad cart)</span>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <a href="${this.getWhatsAppInviteUrl()}" target="_blank" class="btn btn-sm" style="background: #22c55e; color: white; border: none; font-size: 0.74rem; font-weight: 700; border-radius: 6px; padding: 3px 8px; text-decoration: none;">
                                    <i class="fa-brands fa-whatsapp"></i> Invite
                                </a>
                                <a href="cart.html" class="btn btn-sm" style="background: #0284c7; color: white; border: none; font-size: 0.74rem; font-weight: 700; border-radius: 6px; padding: 3px 8px; text-decoration: none;">
                                    View Cart <i class="fa-solid fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    `;
                } else {
                    squadMenuBanner.style.display = 'none';
                }
            }
        },

        promptCreateSquad() {
            const code = prompt('Enter Room Number or Squad Name (e.g. H-2 Room 304, or leave empty for auto code):');
            if (code !== null) {
                this.createSquad(code);
            }
        }
    };

    window.squadOrder = squadOrder;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => squadOrder.init());
    } else {
        squadOrder.init();
    }
})();
