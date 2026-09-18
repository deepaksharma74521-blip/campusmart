// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/cart.js
// Description: Shopping Cart Management, Calculations & Pre-Order Placement
// ==========================================================================

const PACKAGING_FEE = 5;

// Load Cart Items & Calculate Totals
function loadCart() {
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

    const totalAmount = subtotal + PACKAGING_FEE;
    document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
    document.getElementById('summary-packaging').textContent = `₹${PACKAGING_FEE}`;
    document.getElementById('summary-total').textContent = `₹${totalAmount}`;

    updateGlobalCartBadge();
}

function updateItemQuantity(index, delta) {
    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    if (!cart[index]) return;

    cart[index].quantity = (cart[index].quantity || 1) + delta;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
        showToast('Item removed from cart.', 'info');
    }

    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    loadCart();
}

function removeCartItem(index) {
    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    if (!cart[index]) return;

    const itemName = cart[index].name;
    cart.splice(index, 1);
    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    loadCart();
    showToast(`${itemName} removed from cart.`, 'info');
}

function clearCart() {
    localStorage.removeItem('canteen_cart');
    loadCart();
    showToast('Your cart has been cleared.', 'info');
}

// Place Food Pre-Order into MongoDB
async function handlePlaceOrder(event) {
    if (event) event.preventDefault();

    const placeBtn = document.getElementById('place-order-btn');
    const cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');

    if (cart.length === 0) {
        showToast('Your cart is empty!', 'warning');
        return;
    }

    const user = api.getCurrentUser();
    if (!user) {
        showToast('Please login to place your pre-order.', 'warning', 'Authentication Required');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=cart.html';
        }, 1200);
        return;
    }

    const pickupSlot = document.getElementById('pickup-slot').value;
    const specialNotes = document.getElementById('special-notes').value.trim();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Pay on Pickup Counter';

    placeBtn.disabled = true;
    placeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Pre-Order...';

    try {
        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        const totalAmount = subtotal + PACKAGING_FEE;
        
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const orderId = `ORD-${randomDigits}`;

        const orderPayload = {
            orderId: orderId,
            userId: user._id || user.uid || user.id,
            customerName: user.name || 'Student',
            customerEmail: user.email || '',
            studentName: user.name || 'Student',
            studentRoll: user.rollNo || 'N/A',
            studentDept: user.department || 'N/A',
            studentPhone: user.phone || 'N/A',
            studentEmail: user.email || '',
            items: cart.map(item => ({
                id: item.id || item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                type: item.type || 'veg'
            })),
            subtotal: subtotal,
            packagingFee: PACKAGING_FEE,
            totalAmount: totalAmount,
            pickupSlot: pickupSlot,
            specialNotes: specialNotes,
            paymentMethod: paymentMethod
        };

        const res = await api.placeOrder(orderPayload);

        if (res.success) {
            localStorage.removeItem('canteen_cart');
            updateGlobalCartBadge();
            showOrderSuccessModal(orderId, totalAmount, pickupSlot);
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

function showOrderSuccessModal(orderId, amount, pickupSlot) {
    const modal = document.getElementById('order-success-modal');
    if (!modal) {
        window.location.href = 'orders.html';
        return;
    }

    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('modal-order-amount').textContent = `₹${amount}`;
    document.getElementById('modal-order-slot').textContent = pickupSlot;

    modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCart();
});
