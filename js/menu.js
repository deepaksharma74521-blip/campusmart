// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/menu.js
// Description: Interactive Food Menu & Mart Products, Live Search, Category Filtering & Cart addition
// ==========================================================================

let allFoodItems = [];
let currentCategory = 'all';
let searchQuery = '';

// Load Food Items from MongoDB Backend
async function loadMenuItems() {
    const grid = document.getElementById('food-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0;">
            <div class="loader-spinner"></div>
            <p style="color: var(--text-muted); font-weight: 500;">Loading items & fresh dishes from database...</p>
        </div>
    `;

    try {
        const res = await api.getMenu();
        if (res.success && res.items) {
            allFoodItems = res.items;

            if (allFoodItems.length === 0) {
                renderEmptyMenu();
            } else {
                renderFoodGrid();
            }
        } else {
            renderEmptyMenu();
        }
    } catch (error) {
        console.error('Error fetching menu items:', error);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: #ef4444;"></i>
                <h3>Unable to load menu</h3>
                <p>Please make sure the Python MongoDB backend server is running.</p>
                <button onclick="loadMenuItems()" class="btn btn-outline btn-sm">
                    <i class="fa-solid fa-rotate-right"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderEmptyMenu() {
    const grid = document.getElementById('food-grid');
    grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fa-solid fa-store empty-icon"></i>
            <h3>No Products Available</h3>
            <p>The catalog has not been uploaded yet. Please ask the administrator to add products.</p>
            <a href="admin.html" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Go to Admin to Add Items
            </a>
        </div>
    `;
}

// Render Food Grid based on search & category filter
function renderFoodGrid() {
    const grid = document.getElementById('food-grid');
    if (!grid) return;

    let filtered = allFoodItems.filter(item => {
        const matchesCategory = (currentCategory === 'all') || 
                               (item.category && item.category.toLowerCase() === currentCategory.toLowerCase());
        const matchesSearch = !searchQuery || 
                             (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                             (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-magnifying-glass empty-icon"></i>
                <h3>No Items Found</h3>
                <p>We couldn't find any items matching "${searchQuery || currentCategory}". Try checking another category.</p>
                <button onclick="resetFilters()" class="btn btn-outline btn-sm">Show All Items</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isVeg = item.type === 'veg' || !item.type;
        const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
        const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
        const imgUrl = item.image || item.imageUrl || fallbackImg;
        const itemId = item._id || item.id;

        return `
            <div class="food-card ${!isAvailable ? 'out-of-stock' : ''}">
                <div class="food-img-wrap">
                    <img src="${imgUrl}" alt="${item.name}" class="food-img" loading="lazy" onerror="this.src='${fallbackImg}'">
                    <div class="food-type-tag ${isVeg ? 'veg' : 'nonveg'}">
                        <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
                        <span>${isVeg ? 'VEG' : 'NON-VEG'}</span>
                    </div>
                    <div class="food-category-tag">
                        ${item.category || 'General'}
                    </div>
                    ${!isAvailable ? '<div class="out-of-stock-badge">Sold Out</div>' : ''}
                </div>
                <div class="food-body">
                    <h3 class="food-title">${item.name}</h3>
                    <p class="food-desc">${item.description || 'Freshly prepared tasty canteen food.'}</p>
                    <div class="food-footer">
                        <div class="food-price">₹${item.price}</div>
                        <button 
                            class="add-cart-btn" 
                            onclick="addToCart('${itemId}')"
                            ${!isAvailable ? 'disabled' : ''}
                        >
                            <i class="fa-solid fa-cart-plus"></i>
                            <span>${isAvailable ? 'Add' : 'Unavailable'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Add Item to Shopping Cart
function addToCart(itemId) {
    const item = allFoodItems.find(i => (i._id === itemId || i.id === itemId));
    if (!item) return;

    const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
    if (!isAvailable) {
        showToast(`${item.name} is currently sold out!`, 'warning', 'Unavailable');
        return;
    }

    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    const existingIndex = cart.findIndex(i => (i.id === itemId || i._id === itemId));

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({
            id: item._id || item.id,
            _id: item._id || item.id,
            name: item.name,
            price: Number(item.price),
            category: item.category || 'General',
            image: item.image || item.imageUrl || '',
            imageUrl: item.image || item.imageUrl || '',
            type: item.type || 'veg',
            quantity: 1
        });
    }

    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    updateGlobalCartBadge();
    showToast(`${item.name} added to cart!`, 'success', 'Cart Updated');
}

function setupFilterListeners() {
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.getAttribute('data-category');
            renderFoodGrid();
        });
    });

    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderFoodGrid();
        });
    }
}

function resetFilters() {
    currentCategory = 'all';
    searchQuery = '';
    const searchInput = document.getElementById('menu-search');
    if (searchInput) searchInput.value = '';

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(p => {
        if (p.getAttribute('data-category') === 'all') {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    renderFoodGrid();
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupFilterListeners();
    loadMenuItems();
});
