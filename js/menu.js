// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/menu.js
// Description: Interactive Food Menu & Mart Products, Multi-Shop Outlet Filters, Live Search, Category Filtering & Cart addition
// ==========================================================================

let allFoodItems = [];
let allShops = [];
let currentCategory = 'all';
let selectedShopId = 'all';
let searchQuery = '';

function getShopEmoji(cat) {
    switch (cat) {
        case 'Canteen Food': return '🍔';
        case 'Snacks & Chips': return '🍿';
        case 'Chocolates & Candies': return '🍫';
        case 'Drinks & Juices': return '🥤';
        case 'Stationery': return '📚';
        case 'Hostel Essentials': return '🧴';
        case 'Salon & Grooming': return '✂️';
        default: return '🏪';
    }
}

// Helper to find shop for an item
function findShopForItem(item) {
    if (!item) return null;
    if (item.shopId) {
        const found = allShops.find(s => (s.shopId === item.shopId || s._id === item.shopId));
        if (found) return found;
    }
    if (item.shopName) {
        const found = allShops.find(s => s.name === item.shopName);
        if (found) return found;
    }
    if (item.category) {
        const found = allShops.find(s => s.category === item.category);
        if (found) return found;
    }
    return null;
}

// Load Shops from Backend
async function loadShops() {
    try {
        const res = await api.getShops();
        if (res.success && res.shops) {
            allShops = res.shops;
            renderShopCarousel();
        }
    } catch (err) {
        console.error('Error fetching shops:', err);
    }
}

function renderShopCarousel() {
    const bar = document.getElementById('shops-carousel-bar');
    const indicator = document.getElementById('shops-count-indicator');
    if (!bar) return;

    if (indicator) {
        indicator.textContent = `${allShops.length} Campus Counters Online`;
    }

    let html = `
        <button class="shop-filter-pill ${selectedShopId === 'all' ? 'active' : ''}" onclick="selectShopFilter('all')">
            <span class="shop-pill-icon">🏪</span>
            <span class="shop-pill-name">All Shops</span>
        </button>
    `;

    html += allShops.map(shop => {
        const sid = shop.shopId || shop._id;
        const isActive = (selectedShopId === sid || selectedShopId === shop.category);
        const isOpen = (shop.isOpen !== false);
        const emoji = getShopEmoji(shop.category);

        return `
            <button class="shop-filter-pill ${isActive ? 'active' : ''} ${!isOpen ? 'shop-pill-closed' : ''}" onclick="selectShopFilter('${sid}')">
                <span class="shop-pill-icon">${emoji}</span>
                <span class="shop-pill-name">${shop.name}</span>
                <span class="shop-pill-status ${isOpen ? 'status-open' : 'status-closed'}">${isOpen ? 'OPEN' : 'CLOSED'}</span>
            </button>
        `;
    }).join('');

    bar.innerHTML = html;
    updateActiveShopBanner();
}

function selectShopFilter(shopId) {
    selectedShopId = shopId;
    renderShopCarousel();
    renderFoodGrid();
}

function updateActiveShopBanner() {
    const banner = document.getElementById('active-shop-banner');
    if (!banner) return;

    if (selectedShopId === 'all') {
        banner.style.display = 'none';
        return;
    }

    const shop = allShops.find(s => (s.shopId === selectedShopId || s._id === selectedShopId || s.category === selectedShopId));
    if (!shop) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    const nameEl = document.getElementById('banner-shop-name');
    const statusEl = document.getElementById('banner-shop-status');
    const descEl = document.getElementById('banner-shop-desc');
    const locEl = document.getElementById('banner-shop-loc');
    const timeEl = document.getElementById('banner-shop-time');
    const ownerEl = document.getElementById('banner-shop-owner');

    const isOpen = (shop.isOpen !== false);

    if (nameEl) nameEl.innerHTML = `${getShopEmoji(shop.category)} ${shop.name}`;
    if (statusEl) {
        statusEl.textContent = isOpen ? '● Accepting Orders Now' : '● Currently Closed';
        statusEl.style.background = isOpen ? '#dcfce7' : '#fee2e2';
        statusEl.style.color = isOpen ? '#15803d' : '#b91c1c';
        statusEl.style.border = isOpen ? '1px solid #86efac' : '1px solid #fca5a5';
    }
    if (descEl) descEl.textContent = shop.description || 'Official campus outlet.';
    if (locEl) locEl.textContent = shop.location || 'Campus Center';
    if (timeEl) timeEl.textContent = shop.timing || '8:00 AM - 9:00 PM';
    if (ownerEl) ownerEl.textContent = `${shop.ownerName || 'Manager'} ${shop.phone ? '(' + shop.phone + ')' : ''}`;
}

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
        await loadShops();

        const res = await api.getMenu();
        if (res.success && res.items) {
            allFoodItems = res.items;

            if (allFoodItems.length === 0) {
                renderEmptyMenu();
            } else {
                // Check URL params for initial filters
                checkUrlParams();
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
                <p>Please make sure the Python MongoDB backend server is running on Port 5000.</p>
                <button onclick="loadMenuItems()" class="btn btn-outline btn-sm">
                    <i class="fa-solid fa-rotate-right"></i> Retry
                </button>
            </div>
        `;
    }
}

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const catParam = params.get('category');

    if (shopParam) {
        selectedShopId = shopParam;
        renderShopCarousel();
    }
    if (catParam) {
        currentCategory = catParam;
        document.querySelectorAll('.filter-pill').forEach(p => {
            if (p.getAttribute('data-category').toLowerCase() === catParam.toLowerCase()) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }
}

function renderEmptyMenu() {
    const grid = document.getElementById('food-grid');
    grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fa-solid fa-store empty-icon"></i>
            <h3>No Products Available</h3>
            <p>The catalog has not been uploaded yet. Please ask the administrator to add or scan menu items.</p>
            <a href="admin.html" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Go to Admin to Add Items
            </a>
        </div>
    `;
}

let selectedPortions = {};

function setCardPortion(itemId, portion, price) {
    selectedPortions[itemId] = { portion, price };
    const priceEl = document.getElementById(`food-card-price-${itemId}`);
    if (priceEl) priceEl.textContent = `₹${price}`;

    const halfBtn = document.getElementById(`portion-btn-half-${itemId}`);
    const fullBtn = document.getElementById(`portion-btn-full-${itemId}`);

    if (halfBtn && fullBtn) {
        if (portion === 'Half') {
            halfBtn.style.background = 'white';
            halfBtn.style.color = '#0284c7';
            halfBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            fullBtn.style.background = 'transparent';
            fullBtn.style.color = '#64748b';
            fullBtn.style.boxShadow = 'none';
        } else {
            fullBtn.style.background = 'white';
            fullBtn.style.color = '#15803d';
            fullBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            halfBtn.style.background = 'transparent';
            halfBtn.style.color = '#64748b';
            halfBtn.style.boxShadow = 'none';
        }
    }
}

function matchSmartCategory(item, catKey) {
    if (!catKey || catKey === 'all') return true;
    const catLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const fullText = `${nameLower} ${catLower} ${descLower}`;

    switch (catKey.toLowerCase()) {
        case 'drinks':
        case 'drinks & juices':
        case 'drinks & shakes':
            return catLower.includes('drink') || catLower.includes('juice') ||
                   /\b(shake|tea|chai|coffee|mojito|soda|shikanji|lassi|frappe|water|lemonade|frooti|maaza|pepsi|sprite|coke|dew|tropicana|red bull)\b/i.test(fullText);
        case 'rolls':
        case 'rolls & wraps':
            return /\b(roll|wrap|kathi)\b/i.test(fullText);
        case 'sandwiches':
        case 'burgers & sandwiches':
            return /\b(sandwich|burger|sub|toast)\b/i.test(fullText);
        case 'pizzas':
        case 'pizzas & breads':
            return /\b(pizza|garlic bread)\b/i.test(fullText);
        case 'chinese':
        case 'pastas & chinese':
            return /\b(pasta|noodle|noodles|chowmein|manchurian|fried rice|singapuri|schezwan|chilli paneer|chilli mushroom|chilli potato|chopsuey|sizzler|bhel|ting ming)\b/i.test(fullText);
        case 'momos':
        case 'momos & starters':
            return /\b(momo|momos|spring roll|kurkure spring roll|crispy corn|satay)\b/i.test(fullText);
        case 'curries':
        case 'main course curries':
            return (catLower === 'canteen food' || catLower.includes('main course')) &&
                   /\b(paneer|chaap|dal|makhani|tadka|kofta|mushroom|aloo jeera|dum aloo|sev bhaji|chana masala|mix veg|bhurji|handi|kadhai|shahi|lababdar|mughlai|changezi|rogan josh)\b/i.test(fullText) &&
                   !/\b(roll|wrap|dosa|burger|sandwich|pizza|momo|pasta|noodle|biryani|pulao|thali|naan|roti|paratha|kulcha)\b/i.test(fullText);
        case 'breads':
        case 'naans, rotis & kulchas':
        case 'breads & paranthas':
            return /\b(roti|naan|paratha|kulcha|rumali|missi|laccha)\b/i.test(fullText);
        case 'thalis':
        case 'thalis & biryanis':
        case 'thalis & combos':
            return /\b(thali|biryani|pulao|khichdi|combo|chawal combo|jeera rice|plain rice)\b/i.test(fullText);
        case 'desserts':
        case 'waffles & sweets':
            return catLower.includes('chocolate') || catLower.includes('sweet') ||
                   /\b(waffle|brownie|cake|ice cream|gulab jamun|kheer|rasgulla|kulfi|halwa|ras malai|chhena poda|lava cake|sweet)\b/i.test(fullText);
        case 'south_indian':
        case 'south indian':
            return /\b(dosa|uttapam|uttappam|idli|sambhar|sambar|vada|curd rice)\b/i.test(fullText);
        case 'snacks':
        case 'snacks & maggi':
        case 'snacks & chips':
            return catLower.includes('snack') || catLower.includes('chip') ||
                   /\b(maggi|fries|nachos|pakoda|pakodi|chilla|vada pav|cutlet|moonglet|pav bhaji|chole bhature|aloo puri|corn|finger|chips|kurkure|lays)\b/i.test(fullText);
        case 'stationery':
        case 'stationery & mart':
        case 'hostel essentials':
            return catLower.includes('stationery') || catLower.includes('essential') || catLower.includes('hostel') ||
                   /\b(pen|pencil|register|notebook|copy|file|folder|sheet|paper|soap|shampoo|paste|brush|sanitizer)\b/i.test(fullText);
        default:
            return catLower === catKey.toLowerCase() || fullText.includes(catKey.toLowerCase());
    }
}

// // Image URL Optimizer for Ultra-Fast Loading on Mobile
function getOptimizedImageUrl(url) {
    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=360&auto=format&fit=crop&q=70';
    if (!url || typeof url !== 'string') return fallbackImg;
    
    // Optimize Unsplash images with lightweight mobile thumbnails
    if (url.includes('images.unsplash.com')) {
        try {
            const base = url.split('?')[0];
            return `${base}?w=360&auto=format&fit=crop&q=70`;
        } catch (e) {
            return url;
        }
    }
    return url;
}

let currentFilteredItems = [];
let currentRenderCount = 0;
const CHUNK_SIZE = 28;
let menuIntersectionObserver = null;

// Build HTML for a single food card
function buildFoodCardHTML(item) {
    const isVeg = item.type === 'veg' || !item.type;
    const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=360&auto=format&fit=crop&q=70';
    const rawImg = item.image || item.imageUrl || fallbackImg;
    const imgUrl = getOptimizedImageUrl(rawImg);
    const itemId = item._id || item.id;

    const shop = findShopForItem(item);
    const shopName = item.shopName || (shop ? shop.name : (item.category || 'Campus Outlet'));
    const isShopOpen = shop ? (shop.isOpen !== false) : true;
    const canOrder = isAvailable && isShopOpen;

    const hasHalfFull = !!item.hasHalfFull;
    const currentSelected = selectedPortions[itemId] || {
        portion: 'Half',
        price: (hasHalfFull ? (item.priceHalf || item.price) : item.price)
    };
    const currentPortion = currentSelected.portion;
    const displayPrice = hasHalfFull ? currentSelected.price : item.price;

    return `
        <div class="food-card ${!canOrder ? 'out-of-stock' : ''}" id="card-${itemId}">
            <div class="food-img-wrap">
                <img src="${imgUrl}" alt="${item.name}" class="food-img" loading="lazy" decoding="async" onerror="this.src='${fallbackImg}'">
                
                <div class="food-type-tag veg">
                    <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
                    <span>100% PURE VEG</span>
                </div>

                <div class="food-category-tag">
                    ${item.category || 'General'}
                </div>

                ${!isShopOpen ? '<div class="out-of-stock-badge" style="background: #b91c1c;">Shop Closed</div>' : (!isAvailable ? '<div class="out-of-stock-badge">Sold Out</div>' : '')}
            </div>

            <div class="food-body">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span class="shop-item-badge" title="Sold by ${shopName}">
                        <i class="fa-solid fa-store" style="font-size: 0.7rem; color: var(--primary);"></i> ${shopName}
                    </span>
                </div>

                <h3 class="food-title">${item.name}</h3>
                <p class="food-desc">${item.description || 'Freshly prepared item available at campus counter.'}</p>
                
                ${hasHalfFull ? `
                    <!-- Half & Full Portion Switcher -->
                    <div class="portion-selector-bar" style="display: flex; gap: 4px; margin: 0.5rem 0 0.35rem 0; background: #f1f5f9; padding: 3px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <button type="button" id="portion-btn-half-${itemId}" 
                                onclick="setCardPortion('${itemId}', 'Half', ${item.priceHalf || item.price})" 
                                style="flex: 1; padding: 4px 6px; border-radius: 6px; border: none; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.2s; ${currentPortion === 'Half' ? 'background: white; color: #0284c7; box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: #64748b;'}">
                            🥣 Half: ₹${item.priceHalf || item.price}
                        </button>
                        <button type="button" id="portion-btn-full-${itemId}" 
                                onclick="setCardPortion('${itemId}', 'Full', ${item.priceFull || item.price})" 
                                style="flex: 1; padding: 4px 6px; border-radius: 6px; border: none; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.2s; ${currentPortion === 'Full' ? 'background: white; color: #15803d; box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: #64748b;'}">
                            🍲 Full: ₹${item.priceFull || item.price}
                        </button>
                    </div>
                ` : ''}

                <div class="food-footer" style="margin-top: 0.5rem;">
                    <div class="food-price" id="food-card-price-${itemId}">₹${displayPrice}</div>
                    <button 
                        class="add-cart-btn" 
                        onclick="addToCart('${itemId}')"
                        ${!canOrder ? 'disabled' : ''}
                        style="${!isShopOpen ? 'background: #94a3b8; cursor: not-allowed;' : ''}"
                    >
                        <i class="fa-solid fa-cart-plus"></i>
                        <span>${!isShopOpen ? 'Closed' : (isAvailable ? 'Add' : 'Sold Out')}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Food Grid with Chunking & Infinite Scroll for Ultra Smooth 60 FPS
function renderFoodGrid(reset = true) {
    const grid = document.getElementById('food-grid');
    if (!grid) return;

    if (reset) {
        if (menuIntersectionObserver) {
            menuIntersectionObserver.disconnect();
            menuIntersectionObserver = null;
        }

        currentFilteredItems = allFoodItems.filter(item => {
            // Strict Shop filter
            let matchesShop = true;
            if (selectedShopId !== 'all') {
                const targetShop = allShops.find(s => (s.shopId === selectedShopId || s._id === selectedShopId || s.name === selectedShopId));
                const targetSid = targetShop ? (targetShop.shopId || targetShop._id) : selectedShopId;
                const targetSname = targetShop ? targetShop.name : selectedShopId;

                matchesShop = (item.shopId === targetSid || 
                               item.shopId === selectedShopId || 
                               item.shopName === targetSname || 
                               item.shopName === selectedShopId);
            }

            // Granular Smart Category filter
            const matchesCategory = matchSmartCategory(item, currentCategory);

            // Search query
            const matchesSearch = !searchQuery || 
                                  (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                  (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                  (item.shopName && item.shopName.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesShop && matchesCategory && matchesSearch;
        });

        if (currentFilteredItems.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-magnifying-glass empty-icon"></i>
                    <h3>No Items Found</h3>
                    <p>We couldn't find any items matching your selected criteria. Try checking another counter or category.</p>
                    <button onclick="resetFilters()" class="btn btn-outline btn-sm">Show All Items</button>
                </div>
            `;
            return;
        }

        currentRenderCount = Math.min(CHUNK_SIZE, currentFilteredItems.length);
        const initialChunk = currentFilteredItems.slice(0, currentRenderCount);
        
        let html = initialChunk.map(buildFoodCardHTML).join('');

        if (currentFilteredItems.length > currentRenderCount) {
            html += `
                <div id="infinite-scroll-container" style="grid-column: 1 / -1; text-align: center; padding: 1.5rem 0 2rem;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.75rem;" id="items-count-indicator">
                        Showing ${currentRenderCount} of ${currentFilteredItems.length} items
                    </div>
                    <button id="load-more-btn" onclick="loadNextFoodChunk()" class="btn btn-outline" style="padding: 0.6rem 1.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.9rem; box-shadow: var(--shadow-sm); transition: all 0.2s;">
                        <i class="fa-solid fa-arrow-down" style="margin-right: 6px;"></i> Load More Dishes
                    </button>
                    <div id="infinite-scroll-sentinel" style="height: 20px; margin-top: 10px;"></div>
                </div>
            `;
        }

        grid.innerHTML = html;
        setupInfiniteScrollObserver();
    }
}

// Load next batch smoothly without rebuilding the DOM
function loadNextFoodChunk() {
    const grid = document.getElementById('food-grid');
    const scrollContainer = document.getElementById('infinite-scroll-container');
    if (!grid || currentRenderCount >= currentFilteredItems.length) return;

    const nextBatch = currentFilteredItems.slice(currentRenderCount, currentRenderCount + CHUNK_SIZE);
    currentRenderCount += nextBatch.length;

    const cardsHtml = nextBatch.map(buildFoodCardHTML).join('');

    if (scrollContainer) {
        scrollContainer.insertAdjacentHTML('beforebegin', cardsHtml);
        const indicator = document.getElementById('items-count-indicator');
        if (indicator) {
            indicator.textContent = `Showing ${currentRenderCount} of ${currentFilteredItems.length} items`;
        }

        if (currentRenderCount >= currentFilteredItems.length) {
            scrollContainer.innerHTML = `
                <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; padding: 1rem 0;">
                    <i class="fa-solid fa-circle-check" style="color: var(--veg-color); margin-right: 4px;"></i>
                    All ${currentFilteredItems.length} Pure Veg items loaded
                </div>
            `;
            if (menuIntersectionObserver) {
                menuIntersectionObserver.disconnect();
                menuIntersectionObserver = null;
            }
        }
    } else {
        grid.insertAdjacentHTML('beforeend', cardsHtml);
    }
}

function setupInfiniteScrollObserver() {
    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;

    if (menuIntersectionObserver) {
        menuIntersectionObserver.disconnect();
    }

    menuIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && currentRenderCount < currentFilteredItems.length) {
                loadNextFoodChunk();
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
    });

    menuIntersectionObserver.observe(sentinel);
}

// Add Item to Shopping Cart with Portion / Variant Support
function addToCart(itemId) {
    const item = allFoodItems.find(i => (i._id === itemId || i.id === itemId));
    if (!item) return;

    const shop = findShopForItem(item);
    const isShopOpen = shop ? (shop.isOpen !== false) : true;
    if (!isShopOpen) {
        showToast(`${shop ? shop.name : 'This shop'} is currently CLOSED and not accepting orders right now.`, 'warning', 'Shop Closed');
        return;
    }

    const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
    if (!isAvailable) {
        showToast(`${item.name} is currently sold out!`, 'warning', 'Unavailable');
        return;
    }

    const hasHalfFull = !!item.hasHalfFull;
    let selectedPortionInfo = selectedPortions[itemId];
    if (!selectedPortionInfo && hasHalfFull) {
        selectedPortionInfo = { portion: 'Half', price: (item.priceHalf || item.price) };
    }

    const portion = hasHalfFull ? selectedPortionInfo.portion : null;
    const finalPrice = hasHalfFull ? Number(selectedPortionInfo.price) : Number(item.price);
    const cartItemId = hasHalfFull ? `${itemId}-${portion.toLowerCase()}` : (item._id || item.id);
    const cartItemName = hasHalfFull ? `${item.name} (${portion})` : item.name;

    let cart = JSON.parse(localStorage.getItem('canteen_cart') || '[]');
    
    // Check Max 4 Items Limit
    const currentTotalQuantity = cart.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    if (currentTotalQuantity >= 4) {
        showToast('Cart limit reached! You can add a maximum of 4 items per express break order for faster counter packing.', 'warning', 'Limit Reached (Max 4 Items)');
        return;
    }

    const existingIndex = cart.findIndex(i => (i.id === cartItemId || i._id === cartItemId));

    const shopName = item.shopName || (shop ? shop.name : (item.category || 'Campus Outlet'));
    const shopId = item.shopId || (shop ? (shop.shopId || shop._id) : 'shop-1');

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({
            id: cartItemId,
            _id: cartItemId,
            baseId: item._id || item.id,
            name: cartItemName,
            portion: portion,
            price: finalPrice,
            category: item.category || 'General',
            shopId: shopId,
            shopName: shopName,
            image: item.image || item.imageUrl || '',
            imageUrl: item.image || item.imageUrl || '',
            type: item.type || 'veg',
            quantity: 1
        });
    }

    localStorage.setItem('canteen_cart', JSON.stringify(cart));
    updateGlobalCartBadge();
    showToast(`${cartItemName} added to cart! (${currentTotalQuantity + 1}/4 items)`, 'success', 'Cart Updated');
}

let searchDebounceTimer = null;

function setupFilterListeners() {
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.getAttribute('data-category');
            renderFoodGrid(true);
        });
    });

    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                searchQuery = e.target.value.trim();
                renderFoodGrid(true);
            }, 120);
        });
    }
}

function resetFilters() {
    currentCategory = 'all';
    selectedShopId = 'all';
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

    renderShopCarousel();
    renderFoodGrid(true);
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupFilterListeners();
    loadMenuItems();
});
