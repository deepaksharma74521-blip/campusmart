// ==============================================================================
// Campus Mart – Interactive Digital Scratch Card Engine
// File: js/scratch-card.js
// Description: Procedural HTML5 Canvas scratch card reward modal with haptics & audio
// ==============================================================================

(function() {
    'use strict';

    const REWARDS_POOL = [
        { title: '₹15 Flat Discount', code: 'CAMPUS15', desc: 'Flat ₹15 off on your next TMU meal pre-order!', icon: '🎁' },
        { title: 'Free Hot Cutting Chai', code: 'CHAIWALA', desc: 'Get 1 Free Chai at Tea Counter on orders above ₹49!', icon: '☕' },
        { title: '₹10 Off Snack Voucher', code: 'SNACK10', desc: '₹10 Off on quick bites, patties, or samosas!', icon: '🥟' },
        { title: 'TMU VIP Free Dessert', code: 'TMUTREAT', desc: 'Free Gulab Jamun / Cookie with any Thali meal!', icon: '🍪' },
        { title: '50 Mart Loyalty Points', code: 'LOYALTY50', desc: '50 Points added to your TMU Mart student account!', icon: '⭐' }
    ];

    const scratchCard = {
        activeReward: null,
        isScratched: false,
        modalEl: null,
        canvasEl: null,
        ctx: null,
        isDrawing: false,

        init() {
            this.injectStyles();
            this.buildModalDOM();
        },

        injectStyles() {
            if (document.getElementById('cm-scratch-styles')) return;
            const style = document.createElement('style');
            style.id = 'cm-scratch-styles';
            style.textContent = `
                .scratch-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 10000;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .scratch-overlay.active {
                    display: flex;
                    opacity: 1;
                }
                .scratch-modal-box {
                    background: #ffffff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 340px;
                    padding: 1.5rem 1.25rem;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2);
                    position: relative;
                    transform: scale(0.92);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .scratch-overlay.active .scratch-modal-box {
                    transform: scale(1);
                }
                .scratch-card-wrapper {
                    position: relative;
                    width: 280px;
                    height: 150px;
                    margin: 1rem auto;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                }
                .scratch-reward-layer {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.75rem;
                    border: 2px dashed #ea580c;
                    border-radius: 16px;
                    box-sizing: border-box;
                }
                .scratch-reward-code {
                    font-family: monospace;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #ea580c;
                    background: white;
                    padding: 3px 12px;
                    border-radius: 8px;
                    border: 1px solid #fed7aa;
                    margin-top: 6px;
                    letter-spacing: 1px;
                }
                .scratch-canvas {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    cursor: grab;
                    z-index: 2;
                    border-radius: 16px;
                }
                .scratch-canvas:active {
                    cursor: grabbing;
                }
                .scratch-close-btn {
                    position: absolute;
                    top: 12px;
                    right: 14px;
                    background: #f1f5f9;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    color: #64748b;
                    font-size: 0.9rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        },

        buildModalDOM() {
            if (document.getElementById('cm-scratch-modal')) return;

            const overlay = document.createElement('div');
            overlay.id = 'cm-scratch-modal';
            overlay.className = 'scratch-overlay';
            overlay.innerHTML = `
                <div class="scratch-modal-box">
                    <button type="button" class="scratch-close-btn" onclick="window.scratchCard.close()">✕</button>
                    <div style="font-size: 1.8rem; margin-bottom: 4px;">🎉</div>
                    <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Campus Lucky Reward</h3>
                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">Scratch with your finger or mouse to reveal!</p>

                    <div class="scratch-card-wrapper" id="scratch-wrapper">
                        <div class="scratch-reward-layer" id="scratch-reward-content">
                            <div style="font-size: 1.6rem;" id="scratch-reward-icon">🎁</div>
                            <div style="font-weight: 800; font-size: 1rem; color: #1e293b;" id="scratch-reward-title">₹15 Flat Off</div>
                            <div style="font-size: 0.72rem; color: #64748b;" id="scratch-reward-desc">Valid on next counter pre-order</div>
                            <div class="scratch-reward-code" id="scratch-reward-code">CAMPUS15</div>
                        </div>
                        <canvas class="scratch-canvas" id="scratch-canvas" width="280" height="150"></canvas>
                    </div>

                    <div id="scratch-action-area" style="display: none; margin-top: 1rem;">
                        <button type="button" class="btn btn-primary btn-sm" id="scratch-copy-btn" onclick="window.scratchCard.copyReward()" style="width: 100%; border-radius: 12px; font-weight: 700; padding: 0.6rem;">
                            📋 Copy Coupon & Apply
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            this.modalEl = overlay;
            this.canvasEl = document.getElementById('scratch-canvas');
            this.ctx = this.canvasEl.getContext('2d');
            this.bindEvents();
        },

        bindEvents() {
            const canvas = this.canvasEl;
            if (!canvas) return;

            const startDraw = (e) => {
                this.isDrawing = true;
                this.scratch(e);
            };

            const endDraw = () => {
                if (!this.isDrawing) return;
                this.isDrawing = false;
                this.checkScratchedPercentage();
            };

            const drawMove = (e) => {
                if (!this.isDrawing) return;
                this.scratch(e);
            };

            canvas.addEventListener('mousedown', startDraw);
            window.addEventListener('mouseup', endDraw);
            canvas.addEventListener('mousemove', drawMove);

            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startDraw(e.touches[0]);
            }, { passive: false });

            window.addEventListener('touchend', endDraw);
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                drawMove(e.touches[0]);
            }, { passive: false });
        },

        scratch(e) {
            if (this.isScratched || !this.ctx) return;
            const rect = this.canvasEl.getBoundingClientRect();
            const x = (e.clientX || e.pageX) - rect.left;
            const y = (e.clientY || e.pageY) - rect.top;

            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 18, 0, Math.PI * 2);
            this.ctx.fill();

            // Sensory feedback: subtle haptic & tick
            if (window.soundEngine && Math.random() < 0.25) {
                window.soundEngine.vibrate([10]);
                window.soundEngine.playTick();
            }
        },

        checkScratchedPercentage() {
            if (this.isScratched || !this.ctx) return;
            try {
                const imgData = this.ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
                const data = imgData.data;
                let transparentCount = 0;
                const total = data.length / 4;

                // Sample every 4th pixel for 120 FPS performance
                for (let i = 3; i < data.length; i += 16) {
                    if (data[i] === 0) transparentCount++;
                }

                const ratio = transparentCount / (total / 4);
                if (ratio >= 0.35) {
                    this.revealReward();
                }
            } catch (err) {
                console.warn('[ScratchCard] Check error:', err);
            }
        },

        revealReward() {
            this.isScratched = true;
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            }

            const actionArea = document.getElementById('scratch-action-area');
            if (actionArea) actionArea.style.display = 'block';

            if (window.soundEngine) {
                window.soundEngine.playCelebration();
                window.soundEngine.vibrate([50, 40, 70]);
            }

            // Save to rewards storage
            this.saveRewardLocally(this.activeReward);
        },

        saveRewardLocally(reward) {
            if (!reward) return;
            try {
                const saved = JSON.parse(localStorage.getItem('cm_saved_rewards') || '[]');
                if (!saved.some(r => r.code === reward.code)) {
                    saved.push({ ...reward, unlockedAt: new Date().toISOString() });
                    localStorage.setItem('cm_saved_rewards', JSON.stringify(saved));
                }
            } catch (e) {}
        },

        resetCanvas() {
            if (!this.ctx) return;
            const w = this.canvasEl.width;
            const h = this.canvasEl.height;

            this.ctx.globalCompositeOperation = 'source-over';
            
            // Silver metallic scratch gradient
            const grad = this.ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#94a3b8');
            grad.addColorStop(0.5, '#cbd5e1');
            grad.addColorStop(1, '#64748b');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);

            // Shimmer overlay text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🪙 Scratch with Finger / Mouse', w / 2, h / 2 - 2);

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            this.ctx.font = '11px system-ui, -apple-system, sans-serif';
            this.ctx.fillText('TMU Campus Mart Special', w / 2, h / 2 + 18);
        },

        open(customReward = null) {
            this.activeReward = customReward || REWARDS_POOL[Math.floor(Math.random() * REWARDS_POOL.length)];
            this.isScratched = false;

            document.getElementById('scratch-reward-icon').textContent = this.activeReward.icon;
            document.getElementById('scratch-reward-title').textContent = this.activeReward.title;
            document.getElementById('scratch-reward-desc').textContent = this.activeReward.desc;
            document.getElementById('scratch-reward-code').textContent = this.activeReward.code;

            const actionArea = document.getElementById('scratch-action-area');
            if (actionArea) actionArea.style.display = 'none';

            this.resetCanvas();

            if (this.modalEl) {
                this.modalEl.classList.add('active');
            }

            if (window.soundEngine) window.soundEngine.playPop();
        },

        close() {
            if (this.modalEl) {
                this.modalEl.classList.remove('active');
            }
        },

        copyReward() {
            if (!this.activeReward) return;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(this.activeReward.code);
            }
            if (typeof showToast === 'function') {
                showToast(`🎉 Coupon "${this.activeReward.code}" copied to clipboard!`, 'success', 'Reward Saved');
            }
            if (window.soundEngine) window.soundEngine.playPop();
            setTimeout(() => this.close(), 600);
        }
    };

    window.scratchCard = scratchCard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => scratchCard.init());
    } else {
        scratchCard.init();
    }
})();
