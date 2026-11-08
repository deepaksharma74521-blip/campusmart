// ==============================================================================
// Campus Mart – Roommate & Class "Squad Order" (Shared Group Cart Engine)
// File: js/squad.js
// Description: Multi-device synchronized group cart for hostel roommates & class squads
// ==============================================================================

(function() {
    'use strict';

    let currentSquad = null;
    let syncInterval = null;

    function getSquadCodeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('squad') ? params.get('squad').toUpperCase().trim() : null;
    }

    function getActiveSquadCode() {
        const urlCode = getSquadCodeFromUrl();
        if (urlCode) {
            localStorage.setItem('cm_active_squad_code', urlCode);
            return urlCode;
        }
        return localStorage.getItem('cm_active_squad_code');
    }

    function getMemberName() {
        let name = localStorage.getItem('cm_squad_member_name');
        if (!name) {
            const user = (window.api && typeof window.api.getCurrentUser === 'function') 
                ? window.api.getCurrentUser() 
                : null;
            name = user ? user.name : '';
        }
        return name;
    }

    function setMemberName(name) {
        if (name && name.trim()) {
            localStorage.setItem('cm_squad_member_name', name.trim());
        }
    }

    // 1. UI: Floating Squad Banner
    function renderSquadBanner(squad) {
        let banner = document.getElementById('squad-floating-banner');
        if (!squad) {
            if (banner) banner.remove();
            return;
        }

        const items = squad.items || [];
        const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);
        const membersCount = squad.members ? squad.members.length : 1;
        const myName = getMemberName() || 'You';

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'squad-floating-banner';
            banner.className = 'squad-active-strip';
            document.body.prepend(banner);
        }

        banner.innerHTML = `
            <div class="squad-strip-inner">
                <div class="squad-strip-left">
                    <span class="squad-badge-tag"><i class="fa-solid fa-users"></i> SQUAD: ${squad.squadCode}</span>
                    <span class="squad-members-text">👥 ${membersCount} Members &bull; ${items.length} dishes (₹${subtotal})</span>
                </div>
                <div class="squad-strip-actions">
                    <button type="button" class="squad-strip-btn btn-share" onclick="window.squadEngine.openInviteModal()">
                        <i class="fa-solid fa-user-plus"></i> Invite Roommates
                    </button>
                    <a href="cart.html" class="squad-strip-btn btn-view">
                        <i class="fa-solid fa-cart-shopping"></i> View Squad Cart
                    </a>
                    <button type="button" class="squad-strip-btn btn-leave" onclick="window.squadEngine.leaveSquad()" title="Leave Squad">
                        &times;
                    </button>
                </div>
            </div>
        `;
    }

    // 2. Member Name Prompt Modal
    function ensureMemberName(callback) {
        const existing = getMemberName();
        if (existing) {
            callback(existing);
            return;
        }

        let modal = document.getElementById('squad-name-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'squad-name-modal';
            modal.className = 'modal-backdrop active';
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 380px; text-align: center; padding: 1.5rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin: 0 auto 0.75rem;">
                        <i class="fa-solid fa-user-tag"></i>
                    </div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.35rem; color: #0f172a;">Join Squad Order</h3>
                    <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1rem;">Roommates &amp; class friends can see who ordered what!</p>
                    <div class="form-group" style="margin-bottom: 1rem; text-align: left;">
                        <label class="form-label" style="font-weight: 700; font-size: 0.8rem;">Your Name / Nickname:</label>
                        <input type="text" id="squad-input-member-name" class="form-input no-icon" placeholder="e.g. Rahul (Room 304)" autofocus style="font-weight: 600;">
                    </div>
                    <button type="button" id="squad-confirm-name-btn" class="btn btn-primary btn-block btn-lg" style="box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
                        <i class="fa-solid fa-check"></i> Continue to Squad
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.classList.add('active');
        }

        const input = document.getElementById('squad-input-member-name');
        const btn = document.getElementById('squad-confirm-name-btn');
        input.focus();

        btn.onclick = () => {
            const val = input.value.trim();
            if (!val) {
                if (typeof showToast === 'function') showToast('Please enter your name.', 'warning');
                return;
            }
            setMemberName(val);
            modal.classList.remove('active');
            callback(val);
        };
    }

    // 3. Squad Invite Modal (WhatsApp & 1-Click Code Copy)
    function openInviteModal() {
        const code = getActiveSquadCode();
        if (!code) return;

        const url = `https://campusmart.online/menu.html?squad=${code}`;
        const waText = encodeURIComponent(`🍕 TMU Squad Order Active!\nBhai, hum log Campus Mart par group order laga rahe hain. Apni pasand ka khana is link se add kar lo:\n👉 ${url}\nSquad Code: *${code}*`);
        const waLink = `https://api.whatsapp.com/send?text=${waText}`;

        let modal = document.getElementById('squad-invite-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'squad-invite-modal';
            modal.className = 'modal-backdrop active';
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 440px; text-align: center; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-users" style="color: #ea580c;"></i> Invite Roommates
                        </h3>
                        <button type="button" onclick="document.getElementById('squad-invite-modal').classList.remove('active')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8;">&times;</button>
                    </div>
                    <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1.1rem;">Share this Squad Code or link with friends in your hostel room or classroom!</p>

                    <div style="background: #fff7ed; border: 2px dashed #fb923c; border-radius: 14px; padding: 1rem; margin-bottom: 1.25rem;">
                        <div style="font-size: 0.74rem; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 1px;">SQUAD CODE</div>
                        <div id="squad-modal-code-display" style="font-family: monospace; font-size: 2.2rem; font-weight: 900; letter-spacing: 4px; color: #9a3412; margin: 4px 0;">${code}</div>
                        <div style="font-size: 0.74rem; color: #9a3412;">Friends can enter this code in their cart</div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                        <a href="${waLink}" target="_blank" class="btn btn-block btn-lg" style="background: #16a34a; color: white; border-radius: 10px; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-brands fa-whatsapp" style="font-size: 1.2rem;"></i> Share on WhatsApp Group
                        </a>
                        <button type="button" class="btn btn-outline btn-block" onclick="window.squadEngine.copySquadLink('${url}', this)">
                            <i class="fa-solid fa-copy"></i> Copy Direct Squad Link
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            document.getElementById('squad-modal-code-display').textContent = code;
            modal.classList.add('active');
        }
    }

    // 4. Squad Engine Core Methods
    const squadEngine = {
        async init() {
            const code = getActiveSquadCode();
            if (!code) return;

            // Fetch live squad state
            await this.refreshSquad(code);

            // Auto-sync poll every 4 seconds if on cart or menu page
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(() => {
                const activeCode = getActiveSquadCode();
                if (activeCode) {
                    this.refreshSquad(activeCode, true);
                }
            }, 4000);
        },

        async refreshSquad(code, silent = false) {
            if (!window.api || typeof window.api.getSquad !== 'function') return null;
            try {
                const res = await window.api.getSquad(code);
                if (res.success && res.squad) {
                    currentSquad = res.squad;
                    renderSquadBanner(currentSquad);

                    // If on cart page, re-render cart with squad items
                    if (window.location.pathname.includes('cart.html') && typeof window.loadSquadCart === 'function') {
                        window.loadSquadCart(currentSquad);
                    }
                    return currentSquad;
                } else if (!silent) {
                    localStorage.removeItem('cm_active_squad_code');
                    renderSquadBanner(null);
                }
            } catch (e) {}
            return null;
        },

        async startNewSquad() {
            const user = (window.api && typeof window.api.getCurrentUser === 'function') 
                ? window.api.getCurrentUser() 
                : null;
            const hostName = user ? user.name : (getMemberName() || 'Host');

            if (!user && !getMemberName()) {
                ensureMemberName(async (chosenName) => {
                    await this.executeCreateSquad(chosenName);
                });
            } else {
                await this.executeCreateSquad(hostName);
            }
        },

        async executeCreateSquad(hostName) {
            if (!window.api || typeof window.api.createSquad !== 'function') return;
            const user = window.api.getCurrentUser ? window.api.getCurrentUser() : null;
            const res = await window.api.createSquad(hostName, user?.phone || '', user?._id || '');

            if (res.success && res.squadCode) {
                localStorage.setItem('cm_active_squad_code', res.squadCode);
                setMemberName(hostName);
                currentSquad = res.squad;
                renderSquadBanner(currentSquad);
                
                if (typeof showToast === 'function') {
                    showToast(`🎉 Squad ${res.squadCode} created! Share with roommates.`, 'success', 'Squad Ready');
                }
                if (window.soundEngine) window.soundEngine.playCelebration();

                openInviteModal();
            } else {
                if (typeof showToast === 'function') {
                    showToast(res.message || 'Could not create Squad.', 'error');
                }
            }
        },

        async joinSquadByCode(code) {
            if (!code || !code.trim()) return;
            const cleanCode = code.toUpperCase().trim();
            
            ensureMemberName(async (memberName) => {
                const res = await window.api.getSquad(cleanCode);
                if (res.success && res.squad) {
                    localStorage.setItem('cm_active_squad_code', cleanCode);
                    currentSquad = res.squad;
                    renderSquadBanner(currentSquad);

                    if (typeof showToast === 'function') {
                        showToast(`Joined Squad ${cleanCode} with ${currentSquad.hostName}!`, 'success', 'Squad Joined');
                    }
                    if (window.soundEngine) window.soundEngine.playPop();

                    // If on menu, redirect or stay
                    if (window.location.pathname.includes('cart.html') && typeof window.loadSquadCart === 'function') {
                        window.loadSquadCart(currentSquad);
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('Invalid or expired Squad Code.', 'error');
                    }
                }
            });
        },

        async addItemToSquad(item) {
            const code = getActiveSquadCode();
            if (!code) return false;

            ensureMemberName(async (memberName) => {
                const res = await window.api.addToSquad(code, item, memberName);
                if (res.success) {
                    if (typeof showToast === 'function') {
                        showToast(`${item.name} added to Squad Cart by ${memberName}!`, 'success', 'Squad Updated');
                    }
                    if (window.soundEngine) window.soundEngine.playPop();
                    this.refreshSquad(code);
                }
            });
            return true;
        },

        async removeItemFromSquad(itemId, memberName) {
            const code = getActiveSquadCode();
            if (!code) return;
            await window.api.removeFromSquad(code, itemId, memberName);
            await this.refreshSquad(code);
        },

        leaveSquad() {
            if (confirm('Leave this Squad Order and return to your individual cart?')) {
                localStorage.removeItem('cm_active_squad_code');
                currentSquad = null;
                renderSquadBanner(null);
                if (syncInterval) clearInterval(syncInterval);
                if (typeof showToast === 'function') {
                    showToast('Left Squad. Individual cart active.', 'info');
                }
                if (window.location.pathname.includes('cart.html') && typeof window.loadCart === 'function') {
                    window.loadCart();
                }
            }
        },

        openInviteModal() {
            openInviteModal();
        },

        promptJoinSquad() {
            let modal = document.getElementById('squad-join-code-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'squad-join-code-modal';
                modal.className = 'modal-backdrop active';
                modal.innerHTML = `
                    <div class="modal-card" style="max-width: 400px; text-align: center; padding: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-right-to-bracket" style="color: #ea580c;"></i> Join Squad Order
                            </h3>
                            <button type="button" onclick="document.getElementById('squad-join-code-modal').classList.remove('active')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8;">&times;</button>
                        </div>
                        <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1.1rem;">Enter the Squad Code shared by your roommate (e.g. <code>TMU-492</code>).</p>
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <input type="text" id="squad-input-join-code" class="form-input no-icon" placeholder="TMU-..." style="text-align: center; font-family: monospace; font-size: 1.4rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase;">
                        </div>
                        <button type="button" class="btn btn-primary btn-block btn-lg" onclick="window.squadEngine.submitJoinCode()">
                            <i class="fa-solid fa-users"></i> Join Squad Now
                        </button>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                modal.classList.add('active');
            }
            const input = document.getElementById('squad-input-join-code');
            if (input) {
                input.value = '';
                input.focus();
            }
        },

        submitJoinCode() {
            const input = document.getElementById('squad-input-join-code');
            const code = input ? input.value.trim().toUpperCase() : '';
            if (!code) {
                if (typeof showToast === 'function') showToast('Please enter a Squad Code.', 'warning');
                return;
            }
            const modal = document.getElementById('squad-join-code-modal');
            if (modal) modal.classList.remove('active');
            this.joinSquadByCode(code);
        },

        renderSquadHub() {
            const hub = document.getElementById('squad-cart-hub');
            if (!hub) return;

            const code = getActiveSquadCode();
            if (code && currentSquad) {
                const members = currentSquad.members || [];
                const membersStr = members.length > 0 ? members.join(', ') : 'Host';
                hub.innerHTML = `
                    <div class="squad-hub-left">
                        <div class="squad-hub-icon"><i class="fa-solid fa-users-viewfinder"></i></div>
                        <div class="squad-hub-info">
                            <h4 style="display: flex; align-items: center; gap: 8px;">
                                👥 Squad Order Active: <span style="background: #ea580c; color: white; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 0.95rem;">${code}</span>
                            </h4>
                            <p><strong>Host:</strong> ${currentSquad.hostName} &bull; <strong>Roommates:</strong> ${membersStr}</p>
                        </div>
                    </div>
                    <div class="squad-hub-actions">
                        <button type="button" class="btn btn-sm" style="background: #16a34a; color: white; border: none; font-weight: 700;" onclick="window.squadEngine.openInviteModal()">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp Invite
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="window.squadEngine.leaveSquad()">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i> Leave Squad
                        </button>
                    </div>
                `;
            } else {
                hub.innerHTML = `
                    <div class="squad-hub-left">
                        <div class="squad-hub-icon"><i class="fa-solid fa-users"></i></div>
                        <div class="squad-hub-info">
                            <h4>👥 Order with Roommates &amp; Class?</h4>
                            <p>Create a group cart, share the WhatsApp link, and everyone can add their own food!</p>
                        </div>
                    </div>
                    <div class="squad-hub-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="window.squadEngine.promptJoinSquad()">
                            <i class="fa-solid fa-right-to-bracket"></i> Enter Squad Code
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="window.squadEngine.startNewSquad()">
                            <i class="fa-solid fa-plus"></i> Start Squad Order
                        </button>
                    </div>
                `;
            }
        },

        copySquadLink(link, btnEl) {
            navigator.clipboard.writeText(link).then(() => {
                const originalHtml = btnEl.innerHTML;
                btnEl.innerHTML = '<i class="fa-solid fa-check"></i> Link Copied!';
                setTimeout(() => { btnEl.innerHTML = originalHtml; }, 2000);
            });
        },

        getCurrentSquad() {
            return currentSquad;
        },

        isSquadActive() {
            return !!getActiveSquadCode();
        }
    };

    window.squadEngine = squadEngine;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => squadEngine.init());
    } else {
        squadEngine.init();
    }
})();
