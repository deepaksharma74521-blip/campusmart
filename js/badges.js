// ==============================================================================
// Campus Mart – Campus Foodie Badges & Leaderboard Engine
// File: js/badges.js
// Description: Fun achievement badges & real-time campus foodie leaderboard
// ==============================================================================

(function() {
    'use strict';

    const BADGE_DEFINITIONS = [
        {
            id: 'chai_addict',
            name: 'Chai Addict',
            icon: 'fa-mug-hot',
            color: 'linear-gradient(135deg, #d97706, #b45309)',
            desc: 'Order steaming campus tapri Chai 2 or more times.',
            requiredCount: 2,
            getDepartmentTitle(dept) {
                const shortDept = (dept && dept.includes('CCSIT')) ? 'CCSIT' : (dept ? dept.split(' ')[0] : 'Campus');
                return `☕ Chai Addict of ${shortDept}`;
            },
            eval(stats) {
                const count = stats.chaiCount || 0;
                return {
                    unlocked: count >= 2,
                    current: Math.min(count, 2),
                    target: 2,
                    percent: Math.min(Math.round((count / 2) * 100), 100),
                    statusText: count >= 2 ? 'Unlocked' : `${count}/2 Chais ordered`
                };
            }
        },
        {
            id: 'night_owl',
            name: 'Night Owl Maggi Master',
            icon: 'fa-bowl-food',
            color: 'linear-gradient(135deg, #6366f1, #4338ca)',
            desc: 'Order hot Maggi / Noodles or satisfy late-night cravings after 7 PM.',
            requiredCount: 1,
            getDepartmentTitle() {
                return '🌙 Night Owl Maggi Master';
            },
            eval(stats) {
                const count = (stats.maggiCount || 0) + (stats.lateOrders || 0);
                return {
                    unlocked: count >= 1,
                    current: Math.min(count, 1),
                    target: 1,
                    percent: count >= 1 ? 100 : 0,
                    statusText: count >= 1 ? 'Unlocked' : 'Order Maggi or after 7 PM'
                };
            }
        },
        {
            id: 'canteen_vip',
            name: 'Canteen VIP',
            icon: 'fa-crown',
            color: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            desc: 'Complete 3 or more campus canteen pre-orders.',
            requiredCount: 3,
            getDepartmentTitle() {
                return '👑 Canteen VIP';
            },
            eval(stats) {
                const count = stats.totalOrders || 0;
                return {
                    unlocked: count >= 3,
                    current: Math.min(count, 3),
                    target: 3,
                    percent: Math.min(Math.round((count / 3) * 100), 100),
                    statusText: count >= 3 ? 'Unlocked' : `${count}/3 orders placed`
                };
            }
        },
        {
            id: 'squad_commander',
            name: 'Squad Commander',
            icon: 'fa-users',
            color: 'linear-gradient(135deg, #10b981, #047857)',
            desc: 'Host or join a Roommate & Class Squad Order group cart.',
            requiredCount: 1,
            getDepartmentTitle() {
                return '👥 Squad Commander';
            },
            eval(stats) {
                const count = stats.squadOrders || 0;
                return {
                    unlocked: count >= 1,
                    current: Math.min(count, 1),
                    target: 1,
                    percent: count >= 1 ? 100 : 0,
                    statusText: count >= 1 ? 'Unlocked' : '0/1 Squad order placed'
                };
            }
        }
    ];

    function calculateStatsFromOrders(orders) {
        const stats = {
            totalOrders: (orders || []).length,
            completedOrders: 0,
            chaiCount: 0,
            maggiCount: 0,
            lateOrders: 0,
            squadOrders: 0
        };

        (orders || []).forEach(o => {
            if (o.status === 'Completed') stats.completedOrders++;
            if (o.squadCode || o.isSquadOrder) stats.squadOrders++;

            // Late order check (after 7 PM)
            if (o.createdAt) {
                try {
                    const hour = new Date(o.createdAt).getHours();
                    if (hour >= 19 || hour < 6) stats.lateOrders++;
                } catch (e) {}
            }

            // Item checks
            (o.items || []).forEach(it => {
                const name = (it.name || '').toLowerCase();
                const qty = Number(it.quantity) || 1;
                if (name.includes('chai') || name.includes('tea')) {
                    stats.chaiCount += qty;
                }
                if (name.includes('maggi') || name.includes('noodle')) {
                    stats.maggiCount += qty;
                }
            });
        });

        return stats;
    }

    const foodieBadges = {
        async initProfileBadges(user, orders = null) {
            const container = document.getElementById('foodie-badges-container');
            if (!container) return;

            if (!orders && window.api && typeof window.api.getOrders === 'function') {
                const uid = user?._id || user?.uid || user?.id;
                if (uid) {
                    try {
                        const res = await window.api.getOrders(uid);
                        if (res.success && res.orders) {
                            orders = res.orders;
                        }
                    } catch (e) {}
                }
            }

            const stats = calculateStatsFromOrders(orders || []);
            this.renderBadges(container, user, stats);
        },

        renderBadges(container, user, stats) {
            const dept = user?.department || 'CCSIT';
            let unlockedCount = 0;

            const badgeCardsHtml = BADGE_DEFINITIONS.map(badge => {
                const res = badge.eval(stats);
                if (res.unlocked) unlockedCount++;
                const title = badge.getDepartmentTitle(dept);

                return `
                    <div class="badge-item-card ${res.unlocked ? 'unlocked' : 'locked'}" onclick="window.foodieBadges.showBadgeDetail('${badge.id}', ${res.unlocked})">
                        <div class="badge-top-row">
                            <div class="badge-icon-box" style="background: ${badge.color};">
                                <i class="fa-solid ${badge.icon}"></i>
                            </div>
                            <div class="badge-info">
                                <h4>${title}</h4>
                                <span class="badge-tag ${res.unlocked ? 'unlocked-tag' : 'locked-tag'}">
                                    <i class="fa-solid ${res.unlocked ? 'fa-check-circle' : 'fa-lock'}"></i>
                                    ${res.unlocked ? 'Unlocked' : 'In Progress'}
                                </span>
                            </div>
                        </div>
                        <p class="badge-desc">${badge.desc}</p>
                        <div class="badge-progress-container">
                            <div class="badge-progress-fill" style="width: ${res.percent}%; background: ${badge.color};"></div>
                        </div>
                        <div class="badge-progress-text">
                            <span>${res.statusText}</span>
                            <span>${res.percent}%</span>
                        </div>
                    </div>
                `;
            }).join('');

            const levelTier = unlockedCount >= 3 ? '🥇 Gold Foodie' : (unlockedCount >= 1 ? '🥈 Silver Foodie' : '🥉 Rookie Foodie');

            container.innerHTML = `
                <div class="badges-showcase-card">
                    <div class="badges-header">
                        <div class="badges-title-group">
                            <h3><i class="fa-solid fa-award" style="color: #f59e0b;"></i> Campus Foodie Badges</h3>
                            <p>Unlock official TMU canteen badges &amp; rise on the campus foodie leaderboard!</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                            <span style="background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 800;">
                                ${levelTier} (${unlockedCount}/${BADGE_DEFINITIONS.length} Unlocked)
                            </span>
                            <button type="button" class="btn btn-outline btn-sm" onclick="window.foodieBadges.openLeaderboardModal()" style="font-weight: 700;">
                                <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i> Campus Leaderboard
                            </button>
                        </div>
                    </div>
                    <div class="badges-grid">
                        ${badgeCardsHtml}
                    </div>
                </div>
            `;
        },

        showBadgeDetail(badgeId, isUnlocked) {
            const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
            if (!badge) return;

            const user = (window.api && typeof window.api.getCurrentUser === 'function') ? window.api.getCurrentUser() : null;
            const title = badge.getDepartmentTitle(user?.department);

            if (isUnlocked && window.soundEngine) {
                window.soundEngine.playCelebration();
            }

            let modal = document.getElementById('badge-detail-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'badge-detail-modal';
                modal.className = 'modal-backdrop active';
                document.body.appendChild(modal);
            } else {
                modal.classList.add('active');
            }

            modal.innerHTML = `
                <div class="modal-card" style="max-width: 380px; text-align: center; padding: 1.75rem;">
                    <div style="width: 72px; height: 72px; border-radius: 20px; background: ${badge.color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.18);">
                        <i class="fa-solid ${badge.icon}"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem;">${title}</h3>
                    <p style="font-size: 0.84rem; color: #64748b; margin-bottom: 1.25rem; line-height: 1.5;">${badge.desc}</p>
                    <div style="background: ${isUnlocked ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${isUnlocked ? '#86efac' : '#e2e8f0'}; padding: 0.65rem 1rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 700; color: ${isUnlocked ? '#15803d' : '#64748b'};">
                        ${isUnlocked ? '🎉 Congratulations! You have earned this badge.' : '🔒 Keep ordering on Campus Mart to unlock this badge!'}
                    </div>
                    <button type="button" class="btn btn-primary btn-block btn-lg" onclick="document.getElementById('badge-detail-modal').classList.remove('active')">
                        Awesome!
                    </button>
                </div>
            `;
        },

        async openLeaderboardModal() {
            let modal = document.getElementById('campus-leaderboard-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'campus-leaderboard-modal';
                modal.className = 'modal-backdrop active';
                document.body.appendChild(modal);
            } else {
                modal.classList.add('active');
            }

            modal.innerHTML = `
                <div class="modal-card" style="max-width: 480px; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i> TMU Foodie Leaderboard
                        </h3>
                        <button type="button" onclick="document.getElementById('campus-leaderboard-modal').classList.remove('active')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; color: #94a3b8;">&times;</button>
                    </div>
                    <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1rem;">Top active foodies across CCSIT, Medical, Dental &amp; Nursing campus blocks!</p>
                    <div id="leaderboard-items-container" class="leaderboard-list">
                        <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
                            <div style="margin-top: 0.5rem; font-size: 0.85rem;">Loading campus rankings...</div>
                        </div>
                    </div>
                </div>
            `;

            try {
                const res = (window.api && typeof window.api.getLeaderboard === 'function') 
                    ? await window.api.getLeaderboard() 
                    : { success: false, leaderboard: [] };
                    
                const list = (res.success && res.leaderboard) ? res.leaderboard : [];
                const listContainer = document.getElementById('leaderboard-items-container');
                if (!listContainer) return;

                if (list.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #94a3b8;">No foodies on the leaderboard yet!</div>';
                    return;
                }

                listContainer.innerHTML = list.map((item, index) => {
                    const rank = index + 1;
                    let medalHtml = `<span style="font-weight: 800; color: #64748b; font-size: 0.95rem;">#${rank}</span>`;
                    let rankClass = '';
                    if (rank === 1) {
                        medalHtml = '🥇';
                        rankClass = 'rank-1';
                    } else if (rank === 2) {
                        medalHtml = '🥈';
                        rankClass = 'rank-2';
                    } else if (rank === 3) {
                        medalHtml = '🥉';
                        rankClass = 'rank-3';
                    }

                    const badgeTags = (item.badges || []).slice(0, 2).map(b => `
                        <span style="font-size: 0.68rem; background: #ffffff; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${b}</span>
                    `).join(' ');

                    return `
                        <div class="leaderboard-row ${rankClass}">
                            <div class="leaderboard-rank-col">
                                <div class="leaderboard-medal">${medalHtml}</div>
                                <div>
                                    <div class="leaderboard-user-name">${item.name}</div>
                                    <div class="leaderboard-user-dept" title="${item.department}">${item.department}</div>
                                    <div style="margin-top: 3px; display: flex; gap: 4px; flex-wrap: wrap;">${badgeTags}</div>
                                </div>
                            </div>
                            <div class="leaderboard-score-badge">
                                <div class="leaderboard-score-val">${item.totalOrders} Orders</div>
                                <div class="leaderboard-score-lbl">✨ ${item.score || item.totalOrders * 10} pts</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                console.error('Failed to load leaderboard:', err);
            }
        }
    };

    window.foodieBadges = foodieBadges;
})();
