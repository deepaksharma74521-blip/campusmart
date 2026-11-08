// ==============================================================================
// Campus Mart – Live Counter Rush Radar (Bheed Meter Engine)
// File: js/rush-radar.js
// Description: Real-time intelligent counter wait time & rush radar for TMU food counters
// ==============================================================================

(function() {
    'use strict';

    const rushRadar = {
        getRushInfo(shop = null) {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const timeVal = hour * 60 + minute; // minutes since midnight

            // College Rush Hours (TMU Schedule):
            // 1. Recess Break: 11:15 AM - 11:45 AM (675 - 705 mins)
            // 2. Lunch Break: 1:15 PM - 2:15 PM (795 - 855 mins)
            // 3. Evening Tea: 3:30 PM - 4:30 PM (930 - 990 mins)
            const isRecess = (timeVal >= 670 && timeVal <= 710);
            const isLunch = (timeVal >= 790 && timeVal <= 860);
            const isTea = (timeVal >= 930 && timeVal <= 995);

            const category = shop?.category?.toLowerCase() || '';
            const isCookedFood = category.includes('canteen') || category.includes('chole') || category.includes('south') || category.includes('chinese');
            const isBeverage = category.includes('chai') || category.includes('tea') || category.includes('juice') || category.includes('bakery');

            if (isLunch && isCookedFood) {
                return {
                    level: 'peak',
                    badgeClass: 'rush-red',
                    label: '15-20m Peak',
                    text: 'Lunch Rush • Pre-order Now',
                    dotColor: '#ef4444',
                    bgColor: '#fee2e2',
                    textColor: '#991b1b',
                    icon: 'fa-solid fa-fire-flame-curved'
                };
            }

            if ((isRecess || isTea) && isBeverage) {
                return {
                    level: 'moderate',
                    badgeClass: 'rush-yellow',
                    label: '8-12m Rush',
                    text: 'Break Rush • Active',
                    dotColor: '#f59e0b',
                    bgColor: '#fef3c7',
                    textColor: '#92400e',
                    icon: 'fa-solid fa-users'
                };
            }

            if (isRecess || isLunch || isTea) {
                return {
                    level: 'moderate',
                    badgeClass: 'rush-yellow',
                    label: '8-10m Wait',
                    text: 'Moderate Queue',
                    dotColor: '#f59e0b',
                    bgColor: '#fef3c7',
                    textColor: '#92400e',
                    icon: 'fa-solid fa-clock'
                };
            }

            // Normal hours: Light crowd / Fast Handover
            return {
                level: 'low',
                badgeClass: 'rush-green',
                label: '2-5m Wait',
                text: 'Fast Handover',
                dotColor: '#22c55e',
                bgColor: '#dcfce7',
                textColor: '#166534',
                icon: 'fa-solid fa-bolt'
            };
        },

        renderBadgeHTML(shop = null) {
            const info = this.getRushInfo(shop);
            return `
                <div class="rush-badge ${info.badgeClass}" title="${info.text}">
                    <span class="rush-dot" style="background: ${info.dotColor};"></span>
                    <i class="${info.icon}" style="font-size: 0.68rem; margin-right: 3px;"></i>
                    <span>${info.label}</span>
                </div>
            `;
        }
    };

    window.rushRadar = rushRadar;
})();
