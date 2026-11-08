// ==============================================================================
// Campus Mart – TMU Student Campus Badges & Achievements Engine
// File: js/badges.js
// Description: Gamified badge system celebrating TMU student campus foodie life
// ==============================================================================

(function() {
    'use strict';

    const BADGES = [
        {
            id: 'chai_lover',
            title: 'CCSIT Chai Addict',
            icon: '☕',
            desc: 'Ordered hot tea, cutting chai, or coffee on campus.',
            check: (orders) => orders.some(o => (o.items || []).some(i => (i.name || '').toLowerCase().match(/chai|tea|coffee|latte/i)))
        },
        {
            id: 'rush_breaker',
            title: 'Rush Breaker',
            icon: '⚡',
            desc: 'Beat the TMU canteen crowd with a smart pre-order.',
            check: (orders) => orders.length >= 1
        },
        {
            id: 'squad_captain',
            title: 'Squad Captain',
            icon: '👥',
            desc: 'Started or joined a Roommate Squad Order.',
            check: () => !!localStorage.getItem('cm_squad_code')
        },
        {
            id: 'hostel_owl',
            title: 'Hostel Night Owl',
            icon: '🌙',
            desc: 'Ordered evening snacks for hostel study sessions.',
            check: (orders) => orders.some(o => {
                const hour = new Date(o.createdAt || o.date || Date.now()).getHours();
                return hour >= 18 || hour < 4;
            })
        },
        {
            id: 'campus_vip',
            title: 'TMU Mart VIP',
            icon: '🥇',
            desc: 'Placed 3 or more pre-orders across campus counters.',
            check: (orders) => orders.length >= 3
        },
        {
            id: 'sweet_tooth',
            title: 'Sweet Tooth',
            icon: '🍫',
            desc: 'Ordered chocolates, dessert, or sweet pastries.',
            check: (orders) => orders.some(o => (o.items || []).some(i => (i.name || '').toLowerCase().match(/chocolate|dessert|shake|sweet|pastry|cake/i)))
        }
    ];

    const badgesEngine = {
        getOrders() {
            try {
                return JSON.parse(localStorage.getItem('canteen_orders') || '[]');
            } catch (e) {
                return [];
            }
        },

        getUserBadges() {
            const orders = this.getOrders();
            return BADGES.map(b => {
                const isUnlocked = b.check(orders);
                return {
                    ...b,
                    unlocked: isUnlocked
                };
            });
        },

        renderBadgesGridHTML() {
            const list = this.getUserBadges();
            const unlockedCount = list.filter(b => b.unlocked).length;

            return `
                <div class="campus-badges-section" style="background: white; border-radius: 16px; border: 1.5px solid #e2e8f0; padding: 1.25rem; margin-top: 1.25rem; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.4rem;">🎖️</span>
                            <div>
                                <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Campus Badges</h3>
                                <div style="font-size: 0.75rem; color: #64748b;">Unlock achievements by exploring TMU campus outlets</div>
                            </div>
                        </div>
                        <span style="font-size: 0.76rem; font-weight: 800; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 2px 10px; border-radius: 9999px;">
                            ${unlockedCount} / ${BADGES.length} Unlocked
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 0.75rem;">
                        ${list.map(b => `
                            <div style="text-align: center; padding: 0.85rem 0.6rem; border-radius: 12px; border: 1.5px solid ${b.unlocked ? '#fed7aa' : '#f1f5f9'}; background: ${b.unlocked ? '#fffaf5' : '#f8fafc'}; opacity: ${b.unlocked ? '1' : '0.6'}; transition: transform 0.2s;" title="${b.desc}">
                                <div style="font-size: 1.8rem; margin-bottom: 4px; filter: ${b.unlocked ? 'none' : 'grayscale(100%)'};">${b.icon}</div>
                                <div style="font-weight: 800; font-size: 0.8rem; color: ${b.unlocked ? '#1e293b' : '#94a3b8'}; line-height: 1.2; margin-bottom: 3px;">${b.title}</div>
                                <div style="font-size: 0.68rem; color: ${b.unlocked ? '#ea580c' : '#94a3b8'}; font-weight: 700;">
                                    ${b.unlocked ? '✓ Unlocked' : 'Locked'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        mountProfileBadges() {
            const container = document.getElementById('profile-badges-container');
            if (container) {
                container.innerHTML = this.renderBadgesGridHTML();
            }
        }
    };

    window.badgesEngine = badgesEngine;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => badgesEngine.mountProfileBadges());
    } else {
        badgesEngine.mountProfileBadges();
    }
})();
