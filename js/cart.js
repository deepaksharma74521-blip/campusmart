// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/cart.js
// Description: Shopping Cart Management, Calculations & Pre-Order Placement
// ==========================================================================

function checkIsSalonOrder(cart) {
    if (!cart || cart.length === 0) return false;
    return cart.some(it => 
        it.category === 'Salon & Grooming' || 
        it.shopId === 'shop-24' || 
        (it.shopName && it.shopName.toLowerCase().includes('salon')) ||
        it.packagingFee === 20 ||
        it.isService === true
    );
}

function calculateCartBreakdown(cart, customSubtotal = null) {
    if (!cart || cart.length === 0) {
        return { subtotal: 0, packagingFee: 0, platformFee: 0, totalFee: 0, totalAmount: 0, isSalon: false };
    }
    const subtotal = (customSubtotal !== null) 
        ? Number(customSubtotal) 
        : cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    const isSalon = checkIsSalonOrder(cart);

    // 1. Base Packaging & Prep Charge (₹20 for salon disposable kit; ₹5 fixed flat for food prep & packaging)
    const packagingFee = isSalon ? 20 : 5;

    // 2. Campus Platform Fee: ₹5 per ₹100 slab (when subtotal >= 100 and not salon)
    let platformFee = 0;
    if (subtotal >= 100 && !isSalon) {
        platformFee = Math.floor(subtotal / 100) * 5;
    }

    const totalFee = packagingFee + platformFee;
    const totalAmount = subtotal + totalFee;

    return {
        subtotal,
        packagingFee,
        platformFee,
        totalFee,
        totalAmount,
        isSalon
    };
}

function getCartPackagingFee(cart, subtotal = null) {
    return calculateCartBreakdown(cart, subtotal).totalFee;
}

let currentSelectedSplit = 100;

function selectPaymentSplit(percent) {
    currentSelectedSplit = Number(percent) || 100;

    // Update Radio buttons & Active Card Styles
    [100, 50, 80].forEach(p => {
        const card = document.getElementById(`split-card-${p}`);
        const radio = card?.querySelector(`input[value="${p}"]`);
        if (card) {
            if (p === currentSelectedSplit) {
                card.style.borderColor = 'var(--primary)';
                card.style.background = '#fff7ed';
                card.style.borderWidth = '2px';
                if (radio) radio.checked = true;
            } else {
                card.style.borderColor = 'var(--border-color)';
                card.style.background = 'white';
                card.style.borderWidth = '1.5px';
                if (radio) radio.checked = false;
            }
        }
    });

    const cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    const breakdown = calculateCartBreakdown(cart);
    updateSplitCalculation(breakdown.totalAmount);
}

let currentShopPaymentInfo = null;

function updateSplitCalculation(totalAmount) {
    const badge100 = document.getElementById('split-badge-100');
    const badge50 = document.getElementById('split-badge-50');
    const badge80 = document.getElementById('split-badge-80');

    const advance50 = Math.round(totalAmount * 0.5);
    const advance80 = Math.round(totalAmount * 0.8);

    if (badge100) badge100.textContent = `₹${totalAmount}`;
    if (badge50) badge50.textContent = `₹${advance50} Now`;
    if (badge80) badge80.textContent = `₹${advance80} Now`;

    let advanceNow = totalAmount;
    if (currentSelectedSplit === 50) advanceNow = advance50;
    if (currentSelectedSplit === 80) advanceNow = advance80;
    const dueAtCounter = totalAmount - advanceNow;

    const advanceEl = document.getElementById('split-advance-amt');
    const dueEl = document.getElementById('split-due-amt');

    if (advanceEl) advanceEl.textContent = `₹${advanceNow} (${currentSelectedSplit}%)`;
    if (dueEl) dueEl.textContent = `₹${dueAtCounter} (${100 - currentSelectedSplit}%)`;

    const upiAmountBadge = document.getElementById('checkout-upi-amount-badge');
    if (upiAmountBadge) upiAmountBadge.textContent = `₹${advanceNow}`;

    renderShopUpiQrPreview(advanceNow);
}

function toggleUpiPaymentBox(show) {
    const box = document.getElementById('checkout-upi-box');
    if (!box) return;
    if (show) {
        box.style.display = 'block';
        loadCheckoutShopPaymentInfo();
    } else {
        box.style.display = 'none';
    }
}

async function loadCheckoutShopPaymentInfo() {
    const cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    if (cart.length === 0) return;

    const firstItem = cart[0];
    const shopTarget = firstItem.shopName || firstItem.shopId || firstItem.category || 'Canteen Food';

    try {
        const res = await api.getShopPaymentInfo(shopTarget);
        if (res && res.success) {
            currentShopPaymentInfo = res;
        } else {
            currentShopPaymentInfo = {
                shopName: shopTarget,
                upiId: `${shopTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`,
                payeeName: shopTarget,
                qrCodeImage: '',
                qrNote: 'Scan using any UPI App (GPay/PhonePe/Paytm).'
            };
        }
    } catch (e) {
        currentShopPaymentInfo = {
            shopName: shopTarget,
            upiId: 'campusmart@upi',
            payeeName: 'Campus Mart Counter',
            qrCodeImage: '',
            qrNote: 'Scan using any UPI App (GPay/PhonePe/Paytm).'
        };
    }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const totalAmount = subtotal + PACKAGING_FEE;
    const advancePercentage = currentSelectedSplit || 100;
    const advanceAmount = Math.round(totalAmount * (advancePercentage / 100));

    renderShopUpiQrPreview(advanceAmount);
}

function renderShopUpiQrPreview(amount = 0) {
    if (!currentShopPaymentInfo) return;

    const shopNameEl = document.getElementById('checkout-upi-shop-name');
    const vpaEl = document.getElementById('checkout-upi-vpa-text');
    const noteEl = document.getElementById('checkout-upi-note');
    const qrImgEl = document.getElementById('checkout-upi-qr-img');
    const amountBadge = document.getElementById('checkout-upi-amount-badge');

    if (shopNameEl) shopNameEl.textContent = currentShopPaymentInfo.shopName || 'Campus Mart Counter';
    if (vpaEl) vpaEl.textContent = currentShopPaymentInfo.upiId || 'campusmart@upi';
    if (noteEl) noteEl.textContent = `💡 ${currentShopPaymentInfo.qrNote || 'Scan with Google Pay / PhonePe / Paytm. Keep screenshot ready for pickup.'}`;
    if (amountBadge) amountBadge.textContent = `₹${amount}`;

    if (qrImgEl) {
        if (currentShopPaymentInfo.qrCodeImage && currentShopPaymentInfo.qrCodeImage.trim()) {
            qrImgEl.src = currentShopPaymentInfo.qrCodeImage;
        } else {
            // Dynamic UPI QR code with amount pre-filled
            const upiUrl = `upi://pay?pa=${currentShopPaymentInfo.upiId || 'campusmart@upi'}&pn=${encodeURIComponent(currentShopPaymentInfo.payeeName || currentShopPaymentInfo.shopName || 'Campus Counter')}&am=${amount}&cu=INR`;
            qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
        }
    }
}

function copyCheckoutUpiId(btn) {
    const upiId = currentShopPaymentInfo?.upiId || document.getElementById('checkout-upi-vpa-text')?.textContent || 'campusmart@upi';
    navigator.clipboard.writeText(upiId).then(() => {
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btn.style.color = '#15803d';
            btn.style.borderColor = '#86efac';
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 2000);
        }
    }).catch(err => {
        showToast('UPI ID: ' + upiId, 'info');
    });
}

// ------------------------------------------------------------------------------
// Squad Order Group Cart Loader (Roommate & Class Shared Order)
// ------------------------------------------------------------------------------
window.loadSquadCart = function(squad) {
    if (!squad) return;
    if (window.squadEngine) window.squadEngine.renderSquadHub();

    const cartContainer = document.getElementById('cart-items-list');
    const emptyContainer = document.getElementById('cart-empty-view');
    const layoutContainer = document.getElementById('cart-content-layout');
    const squadSplitEl = document.getElementById('squad-split-container');
    
    if (!cartContainer) return;

    const items = squad.items || [];

    if (items.length === 0) {
        if (layoutContainer) layoutContainer.style.display = 'none';
        if (emptyContainer) {
            emptyContainer.style.display = 'block';
            emptyContainer.innerHTML = `
                <i class="fa-solid fa-users empty-icon" style="color: #ea580c;"></i>
                <h3>Squad Cart (${squad.squadCode}) is Empty</h3>
                <p>No food added yet! Share the code with roommates and start adding snacks from the menu.</p>
                <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
                    <a href="menu.html" class="btn btn-primary btn-lg">
                        <i class="fa-solid fa-utensils"></i> Browse Mart & Menu
                    </a>
                    <button type="button" class="btn btn-outline btn-lg" onclick="window.squadEngine.openInviteModal()">
                        <i class="fa-brands fa-whatsapp"></i> Invite Roommates
                    </button>
                </div>
            `;
        }
        if (squadSplitEl) squadSplitEl.style.display = 'none';
        updateGlobalCartBadge();
        return;
    }

    if (layoutContainer) layoutContainer.style.display = 'grid';
    if (emptyContainer) emptyContainer.style.display = 'none';

    let subtotal = 0;
    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
    const splitMap = {};

    cartContainer.innerHTML = items.map((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity || 1);
        subtotal += itemTotal;
        const imgUrl = item.image || item.imageUrl || fallbackImg;
        const member = item.addedBy || 'Roommate';

        splitMap[member] = (splitMap[member] || 0) + itemTotal;

        return `
            <div class="cart-item">
                <img src="${imgUrl}" alt="${item.name}" class="cart-item-img" onerror="this.src='${fallbackImg}'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} each</div>
                    <span class="squad-member-badge"><i class="fa-solid fa-user"></i> Added by ${member}</span>
                </div>
                <div class="qty-control">
                    <span class="qty-val" style="min-width: 32px; text-align: center; font-weight: 700;">x${item.quantity || 1}</span>
                </div>
                <div class="cart-item-total">₹${itemTotal}</div>
                <button class="cart-item-remove" onclick="window.squadEngine.removeItemFromSquad('${item.id}', '${member}')" title="Remove item">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');

    const b = calculateCartBreakdown(items, subtotal);
    const totalAmount = b.totalAmount;

    document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
    const packLabel = document.getElementById('summary-packaging-label');
    const packVal = document.getElementById('summary-packaging');
    if (packLabel) {
        packLabel.innerHTML = b.isSalon 
            ? '💈 Salon Booking &amp; Disposable Kit Fee' 
            : 'Packaging &amp; Prep Fee';
    }
    if (packVal) {
        packVal.textContent = `₹${b.packagingFee}`;
    }

    const platformRow = document.getElementById('summary-platform-row');
    const platformVal = document.getElementById('summary-platform-fee');
    if (platformRow) {
        if (b.platformFee > 0) {
            platformRow.style.display = 'flex';
            if (platformVal) platformVal.textContent = `₹${b.platformFee}`;
        } else {
            platformRow.style.display = 'none';
        }
    }

    document.getElementById('summary-total').textContent = `₹${totalAmount}`;

    // Render Roommate Split Breakdown Box
    if (squadSplitEl) {
        const rows = Object.entries(splitMap).map(([mName, mAmt]) => `
            <div class="squad-split-row">
                <span><i class="fa-solid fa-user-check" style="color: #ea580c; font-size: 0.75rem;"></i> ${mName}</span>
                <span style="font-weight: 700; color: #0f172a;">₹${mAmt}</span>
            </div>
        `).join('');

        squadSplitEl.style.display = 'block';
        squadSplitEl.innerHTML = `
            <div class="squad-split-box">
                <div class="squad-split-title">
                    <span><i class="fa-solid fa-calculator"></i> Roommate UPI Split Breakdown</span>
                    <span style="font-size: 0.72rem; color: #ea580c; text-transform: none;">Items share</span>
                </div>
                ${rows}
                <div class="squad-split-row strong" style="border-top: 1px dashed #fed7aa; margin-top: 5px; padding-top: 5px;">
                    <span>Fees: Prep ₹${b.packagingFee}${b.platformFee > 0 ? ` + Platform ₹${b.platformFee}` : ''}</span>
                    <span>Total: ₹${totalAmount}</span>
                </div>
            </div>
        `;
    }

    updateSplitCalculation(totalAmount);

    // Update Customer Identity Badge & Checkout Button
    const user = api.getCurrentUser();
    const identityEl = document.getElementById('cart-user-identity');
    const placeBtn = document.getElementById('place-order-btn');

    if (identityEl) {
        identityEl.innerHTML = `
            <span style="color: #c2410c; background: #fff7ed; padding: 3px 8px; border-radius: 6px; border: 1px solid #fed7aa; font-size: 0.82rem; font-weight: 700;">
                <i class="fa-solid fa-users"></i> Squad Order: ${squad.squadCode} (Host: ${squad.hostName})
            </span>
        `;
    }

    if (placeBtn) {
        if (!user) {
            placeBtn.innerHTML = `<i class="fa-solid fa-lock" style="margin-right: 6px;"></i> Sign In to Place Squad Order (₹${totalAmount})`;
            placeBtn.onclick = function(e) {
                e.preventDefault();
                showToast('Please sign in with your student/faculty account to place order.', 'info', 'Sign In Required');
                setTimeout(() => {
                    window.location.href = 'login.html?redirect=cart.html';
                }, 600);
            };
        } else {
            placeBtn.innerHTML = `<i class="fa-solid fa-users" style="margin-right: 6px;"></i> Place Squad Order Now (₹${totalAmount})`;
            placeBtn.onclick = null;
        }
    }
};

// Load Cart Items & Calculate Totals
function loadCart() {
    if (window.squadEngine && window.squadEngine.isSquadActive()) {
        const squad = window.squadEngine.getCurrentSquad();
        if (squad) {
            window.loadSquadCart(squad);
            return;
        }
    }
    if (window.squadEngine) window.squadEngine.renderSquadHub();
    const squadSplitEl = document.getElementById('squad-split-container');
    if (squadSplitEl) squadSplitEl.style.display = 'none';

    const cartContainer = document.getElementById('cart-items-list');
    const emptyContainer = document.getElementById('cart-empty-view');
    const layoutContainer = document.getElementById('cart-content-layout');
    
    if (!cartContainer) return;

    const cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');

    if (cart.length === 0) {
        if (layoutContainer) layoutContainer.style.display = 'none';
        if (emptyContainer) emptyContainer.style.display = 'block';
        updateGlobalCartBadge();
        return;
    }

    if (layoutContainer) layoutContainer.style.display = 'grid';
    if (emptyContainer) emptyContainer.style.display = 'none';

    let subtotal = 0;
    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

    cartContainer.innerHTML = cart.map((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        subtotal += itemTotal;
        const imgUrl = item.image || item.imageUrl || fallbackImg;

        return `
            <div class="cart-item">
                <img src="${imgUrl}" alt="${item.name}" class="cart-item-img" onerror="this.src='${fallbackImg}'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} each</div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateItemQuantity(${index}, -1)" title="Decrease">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateItemQuantity(${index}, 1)" title="Increase">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-total">₹${itemTotal}</div>
                <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remove item">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');

    const b = calculateCartBreakdown(cart, subtotal);
    const totalAmount = b.totalAmount;
    
    document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
    
    const packLabel = document.getElementById('summary-packaging-label');
    const packVal = document.getElementById('summary-packaging');
    if (packLabel) {
        packLabel.innerHTML = b.isSalon 
            ? '💈 Salon Booking &amp; Disposable Kit Fee' 
            : 'Packaging &amp; Prep Fee';
    }
    if (packVal) {
        packVal.textContent = `₹${b.packagingFee}`;
    }

    const platformRow = document.getElementById('summary-platform-row');
    const platformVal = document.getElementById('summary-platform-fee');
    if (platformRow) {
        if (b.platformFee > 0) {
            platformRow.style.display = 'flex';
            if (platformVal) platformVal.textContent = `₹${b.platformFee}`;
        } else {
            platformRow.style.display = 'none';
        }
    }

    document.getElementById('summary-total').textContent = `₹${totalAmount}`;

    updateSplitCalculation(totalAmount);

    // Update Customer Identity Badge & Checkout Button
    const user = api.getCurrentUser();
    const identityEl = document.getElementById('cart-user-identity');
    const placeBtn = document.getElementById('place-order-btn');

    if (identityEl) {
        if (user) {
            const isFaculty = user.userType === 'Faculty';
            identityEl.innerHTML = isFaculty 
                ? `<span style="color: #6d28d9; background: #ede9fe; padding: 3px 8px; border-radius: 6px; border: 1px solid #ddd6fe; font-size: 0.82rem; font-weight: 700;"><i class="fa-solid fa-chalkboard-user"></i> Faculty (${user.name} &bull; ${user.cabinNumber || user.department || 'Faculty'})</span>`
                : `<span style="color: #15803d; background: #dcfce7; padding: 3px 8px; border-radius: 6px; border: 1px solid #bbf7d0; font-size: 0.82rem; font-weight: 700;"><i class="fa-solid fa-graduation-cap"></i> Student (${user.name} &bull; ${user.rollNo || 'Verified'})</span>`;
        } else {
            identityEl.innerHTML = `
                <span style="color: #ea580c; background: #fff7ed; padding: 3px 8px; border-radius: 6px; border: 1px solid #fed7aa; font-size: 0.82rem; font-weight: 600;">
                    <i class="fa-solid fa-user-clock"></i> Guest User (Login at checkout)
                </span>
            `;
        }
    }

    if (placeBtn) {
        if (!user) {
            placeBtn.innerHTML = `<i class="fa-solid fa-lock" style="margin-right: 6px;"></i> Sign In to Place Pre-Order (₹${totalAmount})`;
            placeBtn.onclick = function(e) {
                e.preventDefault();
                showToast('Please sign in with your student/faculty account to place order.', 'info', 'Sign In Required');
                setTimeout(() => {
                    window.location.href = 'login.html?redirect=cart.html';
                }, 600);
            };
        } else {
            placeBtn.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> Place Pre-Order Now (₹${totalAmount})`;
            placeBtn.onclick = null;
        }
    }

    if (user && user.department) {
        const deptSelect = document.getElementById('cart-order-dept');
        if (deptSelect) {
            deptSelect.value = user.department;
        }
    }

    updateGlobalCartBadge();
}

function updateItemQuantity(index, delta) {
    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    if (!cart[index]) return;

    // Cart limit removed - allow unlimited items

    cart[index].quantity = (cart[index].quantity || 1) + delta;

    if (window.soundEngine) {
        window.soundEngine.playTick();
    }

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
        showToast('Item removed from cart.', 'info');
    }

    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    loadCart();
}

function removeCartItem(index) {
    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    const removedItem = cart.splice(index, 1)[0];
    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    loadCart();
    if (removedItem) {
        showToast(`"${removedItem.name}" removed from cart.`, 'info');
    }
}

function clearCart() {
    const isSquad = window.squadEngine && window.squadEngine.isSquadActive();
    if (isSquad) {
        if (confirm('Are you sure you want to clear all items in this shared Squad Cart?')) {
            const squadCode = window.squadEngine.getActiveSquadCode();
            if (squadCode && window.api) {
                window.api.clearSquad(squadCode).then(() => {
                    window.squadEngine.refreshSquad(squadCode);
                    showToast('Squad cart cleared.', 'info');
                });
            }
        }
        return;
    }
    if (confirm('Are you sure you want to clear your cart?')) {
        localStorage.removeItem('canteen_cart');
        loadCart();
        showToast('Cart cleared.', 'info');
    }
}

function checkAuth() {
    const user = api.getCurrentUser();
    if (user) {
        if (typeof updateNavForUser === 'function') {
            updateNavForUser(user);
        }
    } else {
        if (typeof updateNavForGuest === 'function') {
            updateNavForGuest();
        }
    }
    return user;
}

let currentFulfillmentType = 'pickup'; // 'pickup' | 'delivery'

function selectFulfillmentType(type) {
    currentFulfillmentType = type;
    const cardPickup = document.getElementById('fulfillment-card-pickup');
    const cardDelivery = document.getElementById('fulfillment-card-delivery');
    const deliveryGroup = document.getElementById('delivery-address-group');
    const radioPickup = cardPickup?.querySelector('input[value="pickup"]');
    const radioDelivery = cardDelivery?.querySelector('input[value="delivery"]');

    if (type === 'pickup') {
        if (cardPickup) {
            cardPickup.style.borderColor = 'var(--primary)';
            cardPickup.style.background = '#fff7ed';
            cardPickup.style.borderWidth = '2px';
            if (radioPickup) radioPickup.checked = true;
        }
        if (cardDelivery) {
            cardDelivery.style.borderColor = 'var(--border-color)';
            cardDelivery.style.background = 'white';
            cardDelivery.style.borderWidth = '1.5px';
            if (radioDelivery) radioDelivery.checked = false;
        }
        if (deliveryGroup) deliveryGroup.style.display = 'none';
    } else {
        if (cardDelivery) {
            cardDelivery.style.borderColor = 'var(--primary)';
            cardDelivery.style.background = '#eff6ff';
            cardDelivery.style.borderWidth = '2px';
            if (radioDelivery) radioDelivery.checked = true;
        }
        if (cardPickup) {
            cardPickup.style.borderColor = 'var(--border-color)';
            cardPickup.style.background = 'white';
            cardPickup.style.borderWidth = '1.5px';
            if (radioPickup) radioPickup.checked = false;
        }
        if (deliveryGroup) {
            deliveryGroup.style.display = 'block';
            const input = document.getElementById('delivery-location-input');
            if (input && !input.value) {
                const user = api.getCurrentUser();
                if (user?.cabinNumber) input.value = user.cabinNumber;
            }
        }
    }
}

function selectTimeSlotOption(slotText, btnEl) {
    document.querySelectorAll('.time-slot-pill').forEach(btn => {
        btn.style.border = '1.5px solid #cbd5e1';
        btn.style.background = 'white';
        btn.style.color = '#334155';
    });
    if (btnEl) {
        btnEl.style.border = '2px solid var(--primary)';
        btnEl.style.background = '#fff7ed';
        btnEl.style.color = 'var(--primary)';
    }
    const hiddenInput = document.getElementById('pickup-slot');
    if (hiddenInput) hiddenInput.value = slotText;

    const customBox = document.getElementById('custom-time-box');
    if (customBox) customBox.style.display = 'none';

    // Update Banner Info
    const bannerText = document.getElementById('break-slot-info-text');
    if (bannerText) {
        if (slotText.includes('Lunch')) {
            bannerText.textContent = '🍱 Lunch Break (1:15 PM) selected — Your meal will be packed piping hot & kept ready for zero-wait pickup!';
        } else if (slotText.includes('Recess')) {
            bannerText.textContent = '🥪 Morning Recess (11:15 AM) selected — Counter will have your snacks fresh and packed when the bell rings!';
        } else if (slotText.includes('Evening')) {
            bannerText.textContent = '☕ Evening Tea (3:30 PM) selected — Fresh tea & snacks scheduled for evening departure break.';
        } else {
            bannerText.textContent = '⚡ Immediate Pickup selected — Kitchen will prepare order fresh within 10-15 minutes.';
        }
    }
}

function toggleCustomTimeInput(btnEl) {
    document.querySelectorAll('.time-slot-pill').forEach(btn => {
        btn.style.border = '1.5px solid #cbd5e1';
        btn.style.background = 'white';
        btn.style.color = '#475569';
    });
    if (btnEl) {
        btnEl.style.border = '1.5px solid #a855f7';
        btnEl.style.background = '#faf5ff';
        btnEl.style.color = '#7e22ce';
    }
    const customBox = document.getElementById('custom-time-box');
    if (customBox) {
        customBox.style.display = 'block';
        const picker = document.getElementById('custom-time-picker');
        if (picker && !picker.value) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 30);
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            picker.value = `${hours}:${mins}`;
            onCustomTimeChanged();
        }
    }
}

function onCustomTimeChanged() {
    const timeVal = document.getElementById('custom-time-picker')?.value || '';
    const noteVal = document.getElementById('custom-time-note')?.value.trim() || '';
    const hiddenInput = document.getElementById('pickup-slot');
    if (hiddenInput) {
        let label = 'Custom Arrival: ';
        if (timeVal) {
            try {
                const [h, m] = timeVal.split(':');
                const hourNum = parseInt(h, 10);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                const formattedHour = hourNum % 12 || 12;
                label += `${formattedHour}:${m} ${ampm}`;
            } catch (e) {
                label += timeVal;
            }
        }
        if (noteVal) {
            label += ` (${noteVal})`;
        }
        hiddenInput.value = label;
    }
}

// --- Live GPS Geolocation & Campus Location Detection ---
let currentGpsCoords = null;
let isGpsDetecting = false;

function detectLiveGpsLocation(isUserInitiated = false) {
    const coordsDisplay = document.getElementById('gps-coords-display');
    const accuracyDisplay = document.getElementById('gps-accuracy-display');
    const statusPill = document.getElementById('gps-status-pill');
    const mapLink = document.getElementById('view-live-map-link');

    if (isGpsDetecting) return;
    isGpsDetecting = true;

    if (statusPill) {
        statusPill.innerHTML = '<i class="fa-solid fa-satellite fa-spin" style="color: #2563eb;"></i> Fetching GPS...';
        statusPill.style.background = '#e0f2fe';
        statusPill.style.borderColor = '#7dd3fc';
        statusPill.style.color = '#0369a1';
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                isGpsDetecting = false;
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));
                const acc = Math.round(position.coords.accuracy);

                currentGpsCoords = {
                    lat: lat,
                    lng: lng,
                    accuracy: acc,
                    googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
                    timestamp: new Date().toISOString()
                };

                if (coordsDisplay) coordsDisplay.innerHTML = `📍 Lat: <strong>${lat}° N</strong>, Lng: <strong>${lng}° E</strong>`;
                if (accuracyDisplay) accuracyDisplay.innerHTML = `<span style="color: #16a34a; font-weight: 700;">🟢 Live Campus GPS Pinpoint Active</span> &bull; Accuracy: ±${acc}m`;
                if (statusPill) {
                    statusPill.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #16a34a;"></i> GPS Verified';
                    statusPill.style.background = '#dcfce7';
                    statusPill.style.borderColor = '#86efac';
                    statusPill.style.color = '#15803d';
                }
                if (mapLink) {
                    mapLink.href = currentGpsCoords.googleMapsUrl;
                    mapLink.style.display = 'inline-flex';
                }
                if (isUserInitiated) {
                    showToast(`📍 Live GPS pinned: ${lat}, ${lng} (±${acc}m)`, 'success');
                }
            },
            (error) => {
                isGpsDetecting = false;
                const fallbackLat = 28.834120;
                const fallbackLng = 78.783210;
                currentGpsCoords = {
                    lat: fallbackLat,
                    lng: fallbackLng,
                    accuracy: 15,
                    googleMapsUrl: `https://www.google.com/maps?q=${fallbackLat},${fallbackLng}`,
                    timestamp: new Date().toISOString(),
                    fallback: true
                };

                if (coordsDisplay) coordsDisplay.innerHTML = `📍 Lat: <strong>${fallbackLat}° N</strong>, Lng: <strong>${fallbackLng}° E</strong>`;
                if (accuracyDisplay) accuracyDisplay.innerHTML = `<span style="color: #0284c7; font-weight: 600;">📍 Campus Geolocation Pin Set</span> (Accuracy: ±15m)`;
                if (statusPill) {
                    statusPill.innerHTML = '<i class="fa-solid fa-location-dot" style="color: #0284c7;"></i> Campus Pin Set';
                    statusPill.style.background = '#e0f2fe';
                    statusPill.style.borderColor = '#7dd3fc';
                    statusPill.style.color = '#0369a1';
                }
                if (mapLink) {
                    mapLink.href = currentGpsCoords.googleMapsUrl;
                    mapLink.style.display = 'inline-flex';
                }
                if (isUserInitiated) {
                    showToast('📍 Campus GPS Pin set!', 'info');
                }
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    } else {
        isGpsDetecting = false;
        const fallbackLat = 28.834120;
        const fallbackLng = 78.783210;
        currentGpsCoords = {
            lat: fallbackLat,
            lng: fallbackLng,
            accuracy: 20,
            googleMapsUrl: `https://www.google.com/maps?q=${fallbackLat},${fallbackLng}`,
            timestamp: new Date().toISOString(),
            fallback: true
        };
        if (coordsDisplay) coordsDisplay.innerHTML = `📍 Lat: <strong>${fallbackLat}° N</strong>, Lng: <strong>${fallbackLng}° E</strong>`;
        if (accuracyDisplay) accuracyDisplay.innerHTML = `📍 Campus GPS Pin Active`;
    }
}

// Checkout & Place Pre-Order
async function handlePlaceOrder(event) {
    event.preventDefault();
    
    const user = api.getCurrentUser();
    if (!user) {
        showToast('Please sign in with your student/faculty account to place order.', 'info', 'Sign In Required');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=cart.html';
        }, 600);
        return;
    }

    const isSquad = window.squadEngine && window.squadEngine.isSquadActive();
    const activeSquad = isSquad ? window.squadEngine.getCurrentSquad() : null;
    const cart = (isSquad && activeSquad) ? (activeSquad.items || []) : JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    const placeBtn = document.getElementById('place-order-btn');

    if (cart.length === 0) {
        showToast(isSquad ? 'Squad cart is empty. Please add items from menu first.' : 'Your cart is empty. Please add items first.', 'warning');
        return;
    }

    // Unlimited Items Allowed - No restriction on quantity

    // Campus Block & Room/Cabin
    const campusBlock = document.getElementById('cart-campus-block')?.value || 'CCSIT Computer Science Block';
    const campusRoom = document.getElementById('cart-campus-room')?.value.trim() || '';
    if (!campusRoom) {
        showToast('Please enter your Room / Cabin / Lab No.', 'warning');
        document.getElementById('cart-campus-room')?.focus();
        return;
    }

    if (!currentGpsCoords) {
        detectLiveGpsLocation(false);
    }

    const isDelivery = (currentFulfillmentType === 'delivery');
    let deliveryLocation = `${campusBlock} - ${campusRoom}`;
    if (isDelivery) {
        const extraLoc = document.getElementById('delivery-location-input')?.value.trim();
        if (extraLoc) deliveryLocation = `${deliveryLocation} (${extraLoc})`;
    }

    const pickupSlot = document.getElementById('pickup-slot')?.value || 'Immediate / In 15 Mins';
    const specialNotes = document.getElementById('special-notes')?.value.trim() || '';
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Campus Digital Wallet';
    const selectedDept = document.getElementById('cart-order-dept')?.value || user.department || 'College of Computing Sciences & IT (CCSIT)';
    const paymentUtr = document.getElementById('checkout-utr-input')?.value.trim() || '';

    if (placeBtn) {
        placeBtn.disabled = true;
        placeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Pre-Order...';
    }

    try {
        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        const b = calculateCartBreakdown(cart, subtotal);
        const isSalon = b.isSalon;
        const packagingFee = b.packagingFee;
        const platformFee = b.platformFee;
        const totalAmount = b.totalAmount;
        const adminCommission = isSalon ? 10.0 : (2.5 + platformFee);
        const vendorPackagingShare = isSalon ? 10.0 : 2.5;
        
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const orderId = isSalon ? `SLN-${randomDigits}` : `ORD-${randomDigits}`;
        const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();

        const isFaculty = user.userType === 'Faculty';
        
        // Calculate Payment Split & Due
        const advancePercentage = currentSelectedSplit || 100;
        const advanceAmount = Math.round(totalAmount * (advancePercentage / 100));
        const dueAmount = totalAmount - advanceAmount;

        let paymentSplitLabel = '100% Full Payment';
        if (advancePercentage === 50) paymentSplitLabel = '50% Advance + 50% on Pickup';
        if (advancePercentage === 80) paymentSplitLabel = '80% Advance + 20% on Pickup';

        let payStatusText = advancePercentage === 100 ? 'Fully Paid' : `Advance Paid (₹${advanceAmount})`;
        if (paymentMethod === 'Instant UPI & QR Pay' && paymentUtr) {
            payStatusText += ` (UTR: ${paymentUtr})`;
        }

        const mapsUrl = currentGpsCoords?.googleMapsUrl || (currentGpsCoords?.lat ? `https://www.google.com/maps?q=${currentGpsCoords.lat},${currentGpsCoords.lng}` : `https://www.google.com/maps?q=28.834120,78.783210`);

        const orderPayload = {
            orderId: orderId,
            pickupOtp: pickupOtp,
            userId: user._id || user.uid || user.id,
            customerType: user.userType || 'Student',
            cabinNumber: campusRoom || user.cabinNumber || '',
            fulfillmentType: isDelivery ? 'delivery' : 'pickup',
            deliveryLocation: deliveryLocation,
            campusBlock: campusBlock,
            roomOrCabin: campusRoom,
            liveLocation: {
                lat: currentGpsCoords?.lat || 28.834120,
                lng: currentGpsCoords?.lng || 78.783210,
                accuracy: currentGpsCoords?.accuracy || 10,
                googleMapsUrl: mapsUrl,
                campusBlock: campusBlock,
                roomOrCabin: campusRoom,
                locationVerified: true
            },
            lat: currentGpsCoords?.lat || 28.834120,
            lng: currentGpsCoords?.lng || 78.783210,
            googleMapsUrl: mapsUrl,
            locationVerified: true,
            customerName: user.name || (isFaculty ? 'Faculty Member' : 'Student'),
            customerEmail: user.email || '',
            studentName: user.name || (isFaculty ? 'Faculty Member' : 'Student'),
            studentRoll: user.rollNo || user.facultyId || 'N/A',
            studentDept: selectedDept,
            customerDept: selectedDept,
            department: selectedDept,
            studentPhone: user.phone || 'N/A',
            studentEmail: user.email || '',
            squadCode: (isSquad && activeSquad) ? activeSquad.squadCode : null,
            squadMembers: (isSquad && activeSquad) ? activeSquad.members : null,
            isSquadOrder: !!(isSquad && activeSquad),
            items: cart.map(item => ({
                id: item.id || item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                portion: item.portion || null,
                shopId: item.shopId || (isSalon ? 'shop-24' : 'shop-1'),
                shopName: item.shopName || (isSalon ? "New look MENS' PERSONAL CARE SALON" : ''),
                type: item.type || 'veg',
                addedBy: item.addedBy || user.name || 'Student'
            })),
            subtotal: subtotal,
            packagingFee: packagingFee,
            platformFee: platformFee,
            adminCommission: adminCommission,
            vendorPackagingShare: vendorPackagingShare,
            totalAmount: totalAmount,
            paymentSplit: paymentSplitLabel,
            advancePercentage: advancePercentage,
            advanceAmount: advanceAmount,
            dueAmount: dueAmount,
            paymentMethod: paymentMethod,
            paymentUtr: paymentUtr,
            upiReference: paymentUtr,
            paymentStatus: payStatusText,
            dueStatus: dueAmount > 0 ? `₹${dueAmount} to Collect at Counter` : 'Fully Paid',
            pickupSlot: pickupSlot,
            customerArrivalTime: pickupSlot,
            estimatedPrepTime: 'Chef reviewing (Auto: 15 mins)',
            prepTimeMinutes: 15,
            specialNotes: specialNotes
        };

        const res = await api.placeOrder(orderPayload);

        if (res.success) {
            if (isSquad && activeSquad) {
                if (window.api && typeof window.api.clearSquad === 'function') {
                    await window.api.clearSquad(activeSquad.squadCode);
                }
                localStorage.removeItem('cm_active_squad_code');
            } else {
                localStorage.removeItem('canteen_cart');
            }
            updateGlobalCartBadge();

            // Next-Gen Sensory: Celebration Chime & Dynamic Island Tracking
            if (window.soundEngine) {
                window.soundEngine.playCelebration();
            }
            if (window.dynamicIsland) {
                window.dynamicIsland.setActiveOrder({
                    orderId: orderId,
                    pickupOtp: pickupOtp,
                    shopName: orderPayload.items[0]?.shopName || 'Canteen Counter',
                    items: orderPayload.items,
                    totalAmount: totalAmount
                });
            }

            showOrderSuccessModal(orderId, totalAmount, pickupSlot, advanceAmount, dueAmount, pickupOtp);
        } else {
            showToast(res.message || 'Failed to place order.', 'error');
            placeBtn.disabled = false;
            placeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Place Pre-Order Now';
        }

    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Failed to place order. Check server connection.', 'error', 'Error');
        placeBtn.disabled = false;
        placeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Place Pre-Order Now';
    }
}

function showOrderSuccessModal(orderId, amount, pickupSlot, advanceAmount = amount, dueAmount = 0, pickupOtp = '') {
    const modal = document.getElementById('order-success-modal');
    if (!modal) {
        window.location.href = 'orders.html';
        return;
    }

    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('modal-order-amount').textContent = `₹${amount}`;
    
    const advanceEl = document.getElementById('modal-order-advance');
    const dueEl = document.getElementById('modal-order-due');
    const dueRow = document.getElementById('modal-due-row');

    if (advanceEl) advanceEl.textContent = `₹${advanceAmount}`;
    if (dueEl) dueEl.textContent = `₹${dueAmount}`;
    if (dueRow) dueRow.style.display = (dueAmount > 0) ? 'flex' : 'none';

    document.getElementById('modal-order-slot').textContent = pickupSlot;
    const pinEl = document.getElementById('modal-order-pin');
    if (pinEl) pinEl.textContent = pickupOtp || (orderId ? orderId.slice(-4) : '----');
    try { localStorage.setItem('last_order_pin_' + orderId, pickupOtp); } catch(e) {}

    modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCart();
    initCollegeClockInCart();
    detectLiveGpsLocation(false);
});


function initCollegeClockInCart() {
    function tick() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const el = document.getElementById('current-college-time');
        if (el) el.textContent = `⏰ College Time: ${timeStr}`;
    }
    tick();
    setInterval(tick, 10000);
}
