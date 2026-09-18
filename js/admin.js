// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/admin.js
// Description: Admin Dashboard, Food & Mart Products CRUD, Live Order Management & Seeder
// ==========================================================================

let adminFoodItems = [];
let adminOrders = [];
let currentOrderFilter = 'all';
let currentFoodFilter = 'all';
let currentAdminTab = 'orders';
let adminPollInterval = null;

// Admin Verification & Initializer
async function initAdminPage() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=admin.html';
        return;
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
        alert('Access Restricted: This dashboard is reserved for Canteen Administrators only.');
        window.location.href = 'menu.html';
        return;
    }

    document.getElementById('admin-user-name').textContent = user.name || 'Admin';

    loadAdminDashboardData();

    // Auto poll admin dashboard every 4 seconds
    if (adminPollInterval) clearInterval(adminPollInterval);
    adminPollInterval = setInterval(loadAdminDashboardData, 4000);
}

// Fetch Orders, Stats & Menu Dishes from MongoDB
async function loadAdminDashboardData() {
    try {
        // 1. Fetch Orders
        const ordersRes = await api.getOrders();
        if (ordersRes.success && ordersRes.orders) {
            adminOrders = ordersRes.orders;
            renderAdminOrdersTable();
        }

        // 2. Fetch Menu Items
        const menuRes = await api.getMenu();
        if (menuRes.success && menuRes.items) {
            adminFoodItems = menuRes.items;
            renderAdminFoodTable();
        }

        // 3. Fetch Statistics
        const statsRes = await api.getAdminStats();
        if (statsRes.success && statsRes.stats) {
            const s = statsRes.stats;
            document.getElementById('stat-total-orders').textContent = s.totalOrders;
            document.getElementById('stat-pending-orders').textContent = s.pendingOrders;
            document.getElementById('stat-active-prep').textContent = s.activePrep;
            document.getElementById('stat-completed-orders').textContent = s.completedOrders;
            document.getElementById('stat-total-revenue').textContent = `₹${s.totalRevenue}`;
            document.getElementById('stat-total-items').textContent = s.totalFoodItems;
        }
    } catch (err) {
        console.error('Error fetching admin data:', err);
    }
}

// --------------------------------------------------------------------------
// 1. ORDERS MANAGEMENT
// --------------------------------------------------------------------------

function renderAdminOrdersTable() {
    const tableBody = document.getElementById('admin-orders-table-body');
    const searchVal = document.getElementById('admin-order-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    let filtered = adminOrders.filter(order => {
        const matchesStatus = (currentOrderFilter === 'all') || (order.status === currentOrderFilter);
        const matchesSearch = !searchVal || 
                              (order.orderId && order.orderId.toLowerCase().includes(searchVal)) ||
                              (order.customerName && order.customerName.toLowerCase().includes(searchVal)) ||
                              (order.studentName && order.studentName.toLowerCase().includes(searchVal)) ||
                              (order.studentRoll && order.studentRoll.toLowerCase().includes(searchVal));
        return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    No orders found matching this filter in MongoDB.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(order => {
        let formattedDate = 'Just now';
        if (order.createdAt) {
            try {
                formattedDate = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                formattedDate = order.createdAt;
            }
        }

        const status = order.status || 'Pending';
        const itemsSummary = (order.items || []).map(i => `${i.name} &times; ${i.quantity}`).join(', ');
        const orderId = order._id || order.id;

        return `
            <tr>
                <td>
                    <strong>${order.orderId || 'ORD-#'}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${formattedDate}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${order.customerName || order.studentName || 'Student'}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${order.studentRoll || 'N/A'} &bull; ${order.studentPhone || ''}</div>
                </td>
                <td style="max-width: 220px;">
                    <div style="font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsSummary}">
                        ${itemsSummary}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--primary); font-weight: 600;">
                        <i class="fa-solid fa-clock"></i> Slot: ${order.pickupSlot || 'Immediate'}
                    </div>
                </td>
                <td>
                    <strong style="color: var(--primary); font-size: 1rem;">₹${order.totalAmount}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${order.paymentMethod || 'Pay on Pickup'}</div>
                </td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                </td>
                <td>
                    <select class="form-select no-icon" style="padding: 0.35rem 0.6rem; font-size: 0.85rem; border-radius: var(--radius-sm);" 
                            onchange="updateOrderStatus('${orderId}', this.value)">
                        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Preparing" ${status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="viewOrderDetailsModal('${orderId}')" title="View Full Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await api.updateOrderStatus(orderId, newStatus);
        if (res.success) {
            showToast(`Order status updated to "${newStatus}" in MongoDB!`, 'success');
            loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to update status.', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status: ' + error.message, 'error');
    }
}

function viewOrderDetailsModal(orderId) {
    const order = adminOrders.find(o => (o._id === orderId || o.id === orderId));
    if (!order) return;

    const modal = document.getElementById('admin-order-modal');
    const content = document.getElementById('admin-order-modal-content');

    let formattedDate = 'Just now';
    if (order.createdAt) {
        try {
            formattedDate = new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
            formattedDate = order.createdAt;
        }
    }

    content.innerHTML = `
        <div style="margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="font-size: 1.2rem; color: var(--secondary);">${order.orderId}</h4>
                <span class="status-badge status-${(order.status || 'Pending').toLowerCase()}">${order.status || 'Pending'}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${formattedDate}</div>
        </div>

        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--secondary);">Student Details:</div>
            <div style="font-size: 0.88rem; line-height: 1.6;">
                <div><strong>Name:</strong> ${order.customerName || order.studentName || 'N/A'}</div>
                <div><strong>Roll No:</strong> ${order.studentRoll || 'N/A'} &bull; <strong>Dept:</strong> ${order.studentDept || 'N/A'}</div>
                <div><strong>Phone:</strong> ${order.studentPhone || 'N/A'} &bull; <strong>Email:</strong> ${order.customerEmail || order.studentEmail || 'N/A'}</div>
            </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--secondary);">Ordered Items:</div>
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                ${(order.items || []).map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.88rem;">
                        <span>
                            <i class="fa-solid fa-circle" style="font-size: 0.45rem; color: ${item.type === 'nonveg' ? '#dc2626' : '#16a34a'};"></i>
                            ${item.name} &times; ${item.quantity}
                        </span>
                        <span style="font-weight: 600;">₹${Number(item.price) * Number(item.quantity)}</span>
                    </div>
                `).join('')}
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: #f8fafc; font-weight: 700; font-size: 0.95rem;">
                    <span>Total Bill:</span>
                    <span style="color: var(--primary);">₹${order.totalAmount}</span>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 1rem;">
            <div>
                <strong>Pickup Slot:</strong><br>
                <span>${order.pickupSlot || 'Immediate'}</span>
            </div>
            <div>
                <strong>Payment Mode:</strong><br>
                <span>${order.paymentMethod || 'Pay on Pickup'}</span>
            </div>
        </div>

        ${order.specialNotes ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem;">
                <strong>Special Note:</strong> ${order.specialNotes}
            </div>
        ` : ''}
    `;

    modal.classList.add('active');
}

// --------------------------------------------------------------------------
// 2. FOOD MENU (CRUD) MANAGEMENT
// --------------------------------------------------------------------------

function renderAdminFoodTable() {
    const tableBody = document.getElementById('admin-food-table-body');
    const searchVal = document.getElementById('admin-food-search')?.value.trim().toLowerCase() || '';
    if (!tableBody) return;

    let filtered = adminFoodItems.filter(item => {
        const matchesCategory = (currentFoodFilter === 'all') || (item.category === currentFoodFilter);
        const matchesSearch = !searchVal || 
                              (item.name && item.name.toLowerCase().includes(searchVal)) ||
                              (item.description && item.description.toLowerCase().includes(searchVal));
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    No food items available in this category.
                </td>
            </tr>
        `;
        return;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

    tableBody.innerHTML = filtered.map(item => {
        const isAvailable = item.available !== undefined ? item.available : (item.isAvailable !== false);
        const isVeg = item.type === 'veg' || !item.type;
        const itemId = item._id || item.id;

        return `
            <tr>
                <td>
                    <img src="${item.image || item.imageUrl || fallbackImg}" alt="${item.name}" 
                         style="width: 50px; height: 50px; border-radius: var(--radius-sm); object-fit: cover;"
                         onerror="this.src='${fallbackImg}'">
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--secondary);">${item.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.description || ''}
                    </div>
                </td>
                <td>
                    <span style="font-size: 0.82rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: var(--radius-full); background: #f1f5f9;">
                        ${item.category || 'General'}
                    </span>
                    <span style="font-size: 0.75rem; font-weight: 700; margin-left: 0.4rem; color: ${isVeg ? '#16a34a' : '#dc2626'};">
                        ${isVeg ? 'VEG' : 'NON-VEG'}
                    </span>
                </td>
                <td>
                    <strong style="color: var(--primary); font-size: 1rem;">₹${item.price}</strong>
                </td>
                <td>
                    <button class="btn btn-sm ${isAvailable ? 'btn-success' : 'btn-outline'}" 
                            onclick="toggleItemAvailability('${itemId}', ${!isAvailable})"
                            title="Click to toggle stock status">
                        <i class="fa-solid ${isAvailable ? 'fa-check' : 'fa-xmark'}"></i>
                        ${isAvailable ? 'In Stock' : 'Out of Stock'}
                    </button>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm" onclick="openEditFoodModal('${itemId}')" title="Edit Item">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="deleteFoodItem('${itemId}', '${item.name}')" title="Delete Item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

const PRESET_FOOD_PHOTOS = {
    samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    thali: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    silk: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
    kitkat: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80',
    lays: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    maggi: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
    coffee: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    redbull: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    register: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
    pen: 'https://images.unsplash.com/photo-1585336261026-7f576d338f0d?w=600&auto=format&fit=crop&q=80',
    sanitizer: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80'
};

const DEFAULT_FOOD_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

function switchImageTab(tabName) {
    // Tabs
    document.getElementById('tab-btn-upload')?.classList.toggle('active', tabName === 'upload');
    document.getElementById('tab-btn-preset')?.classList.toggle('active', tabName === 'preset');
    document.getElementById('tab-btn-url')?.classList.toggle('active', tabName === 'url');

    // Sections
    document.getElementById('img-section-upload').style.display = tabName === 'upload' ? 'block' : 'none';
    document.getElementById('img-section-preset').style.display = tabName === 'preset' ? 'block' : 'none';
    document.getElementById('img-section-url').style.display = tabName === 'url' ? 'block' : 'none';
}

function updateImagePreview(imgSrc, statusText) {
    const preview = document.getElementById('food-img-preview');
    const masterInput = document.getElementById('food-form-img');
    const statusLabel = document.getElementById('food-img-preview-status');
    
    const finalSrc = imgSrc || DEFAULT_FOOD_IMG;
    if (preview) preview.src = finalSrc;
    if (masterInput) masterInput.value = finalSrc === DEFAULT_FOOD_IMG ? '' : finalSrc;
    if (statusLabel) {
        statusLabel.textContent = statusText || (finalSrc === DEFAULT_FOOD_IMG ? 'Preview: Default Dish Photo' : 'Preview: Custom Photo Ready');
    }
}

function updateImagePreviewFromUrl(url) {
    updateImagePreview(url.trim(), 'Preview: Web URL Image');
}

function selectPresetPhoto(key) {
    const photoUrl = PRESET_FOOD_PHOTOS[key];
    if (photoUrl) {
        updateImagePreview(photoUrl, `Preview: ${key.toUpperCase()} Preset`);
        showToast(`Selected ${key.toUpperCase()} photo!`, 'info');
    }
}

function handleFoodImageFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress / resize image using canvas to max 500px width for fast loading
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 500;

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
            updateImagePreview(compressedBase64, 'Preview: Device Uploaded Photo');
            showToast('Photo uploaded from device successfully!', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function openAddFoodModal() {
    document.getElementById('food-modal-title').textContent = 'Add New Food Item';
    document.getElementById('food-form-id').value = '';
    document.getElementById('food-form-name').value = '';
    document.getElementById('food-form-category').value = 'Breakfast';
    document.getElementById('food-form-price').value = '';
    document.getElementById('food-form-type').value = 'veg';
    document.getElementById('food-form-img').value = '';
    if (document.getElementById('food-form-img-input')) document.getElementById('food-form-img-input').value = '';
    document.getElementById('food-form-desc').value = '';
    document.getElementById('food-form-available').checked = true;
    switchImageTab('upload');
    updateImagePreview(DEFAULT_FOOD_IMG, 'Preview: Default Dish Photo');

    document.getElementById('admin-food-modal').classList.add('active');
}

function openEditFoodModal(itemId) {
    const item = adminFoodItems.find(i => (i._id === itemId || i.id === itemId));
    if (!item) return;

    const currentImg = item.image || item.imageUrl || DEFAULT_FOOD_IMG;

    document.getElementById('food-modal-title').textContent = 'Edit Food Item';
    document.getElementById('food-form-id').value = item._id || item.id;
    document.getElementById('food-form-name').value = item.name || '';
    document.getElementById('food-form-category').value = item.category || 'Breakfast';
    document.getElementById('food-form-price').value = item.price || '';
    document.getElementById('food-form-type').value = item.type || 'veg';
    document.getElementById('food-form-img').value = item.image || item.imageUrl || '';
    if (document.getElementById('food-form-img-input')) document.getElementById('food-form-img-input').value = (currentImg.startsWith('http') ? currentImg : '');
    document.getElementById('food-form-desc').value = item.description || '';
    document.getElementById('food-form-available').checked = (item.available !== undefined ? item.available : (item.isAvailable !== false));
    switchImageTab(currentImg.startsWith('data:') ? 'upload' : (currentImg.startsWith('http') ? 'url' : 'preset'));
    updateImagePreview(currentImg, 'Preview: Current Dish Photo');

    document.getElementById('admin-food-modal').classList.add('active');
}

async function handleSaveFoodItem(event) {
    event.preventDefault();

    const docId = document.getElementById('food-form-id').value;
    const name = document.getElementById('food-form-name').value.trim();
    const category = document.getElementById('food-form-category').value;
    const price = Number(document.getElementById('food-form-price').value);
    const type = document.getElementById('food-form-type').value;
    const imageUrl = document.getElementById('food-form-img').value.trim();
    const description = document.getElementById('food-form-desc').value.trim();
    const isAvailable = document.getElementById('food-form-available').checked;
    const saveBtn = document.getElementById('save-food-btn');

    if (!name || isNaN(price) || price <= 0) {
        showToast('Please provide a valid name and price.', 'warning');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const finalImg = imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
    const payload = {
        name,
        category,
        price,
        type,
        image: finalImg,
        imageUrl: finalImg,
        description,
        available: isAvailable,
        isAvailable: isAvailable
    };

    try {
        const res = await api.saveFoodItem(payload, docId || null);
        if (res.success) {
            showToast(`"${name}" saved successfully in MongoDB!`, 'success');
            closeModal('admin-food-modal');
            loadAdminDashboardData();
        } else {
            showToast(res.message || 'Failed to save food item.', 'error');
        }
    } catch (error) {
        console.error('Error saving food item:', error);
        showToast('Error saving food item: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Item';
    }
}

async function toggleItemAvailability(itemId, newStatus) {
    try {
        const res = await api.toggleStock(itemId, newStatus);
        if (res.success) {
            showToast('Stock status updated.', 'info');
            loadAdminDashboardData();
        } else {
            showToast('Could not update status.', 'error');
        }
    } catch (error) {
        console.error('Error updating availability:', error);
        showToast('Could not update status: ' + error.message, 'error');
    }
}

async function deleteFoodItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to permanently delete "${itemName}" from the canteen menu in MongoDB?`)) return;

    try {
        const res = await api.deleteFoodItem(itemId);
        if (res.success) {
            showToast(`"${itemName}" deleted from menu.`, 'info');
            loadAdminDashboardData();
        } else {
            showToast('Could not delete item: ' + res.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting food item:', error);
        showToast('Could not delete item: ' + error.message, 'error');
    }
}

// --------------------------------------------------------------------------
// 3. 1-CLICK SAMPLE DATA SEEDER
// --------------------------------------------------------------------------
async function seedSampleDishes() {
    if (!confirm('This will load 10+ sample canteen dishes (Samosa, Aloo Paratha, Chowmein, etc.) into MongoDB. Proceed?')) return;

    const seedBtn = document.getElementById('seed-dishes-btn');
    if (seedBtn) {
        seedBtn.disabled = true;
        seedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding MongoDB...';
    }

    try {
        const res = await api.seedDishes();
        if (res.success) {
            showToast('10+ Sample dishes populated successfully in MongoDB!', 'success', 'Demo Ready');
            loadAdminDashboardData();
        } else {
            showToast('Failed to seed dishes.', 'error');
        }
    } catch (error) {
        console.error('Error seeding dishes:', error);
        showToast('Failed to seed dishes: ' + error.message, 'error');
    } finally {
        if (seedBtn) {
            seedBtn.disabled = false;
            seedBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Load 10+ Sample Dishes';
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

let pendingStaffList = [];
let activeStaffList = [];

// --------------------------------------------------------------------------
// 4. STAFF APPROVAL & PERMISSIONS (SUPER ADMIN)
// --------------------------------------------------------------------------
async function loadStaffData() {
    try {
        const res = await api.getStaffList();
        if (res.success) {
            pendingStaffList = res.pendingStaff || [];
            activeStaffList = res.activeStaff || [];
            renderStaffTables();
        }
    } catch (error) {
        console.error('Error loading staff data:', error);
    }
}

function renderStaffTables() {
    const pendingBody = document.getElementById('pending-staff-table-body');
    const activeBody = document.getElementById('active-staff-table-body');
    const badge = document.getElementById('pending-staff-badge');

    // Update Badge
    if (badge) {
        if (pendingStaffList.length > 0) {
            badge.textContent = pendingStaffList.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // 1. Render Pending Requests Table
    if (pendingBody) {
        if (pendingStaffList.length === 0) {
            pendingBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fa-solid fa-circle-check" style="font-size: 1.8rem; color: #10b981; margin-bottom: 0.4rem; display: block;"></i>
                        No pending staff access requests. All applications are reviewed!
                    </td>
                </tr>
            `;
        } else {
            pendingBody.innerHTML = pendingStaffList.map(applicant => {
                const appId = applicant._id || applicant.uid;
                let formattedTime = 'Recent';
                if (applicant.createdAt) {
                    try {
                        formattedTime = new Date(applicant.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                    } catch (e) {
                        formattedTime = applicant.createdAt;
                    }
                }

                return `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: var(--secondary);">${applicant.name}</div>
                            <span style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                                Pending Review
                            </span>
                        </td>
                        <td>
                            <div>${applicant.email}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${applicant.phone || 'N/A'}</div>
                        </td>
                        <td>
                            <div><strong>Roll:</strong> ${applicant.rollNo || 'N/A'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${applicant.department || 'BCA'}</div>
                        </td>
                        <td>
                            <strong style="color: var(--primary);">${applicant.staffDesignation || 'Counter Staff'}</strong>
                        </td>
                        <td style="font-size: 0.82rem; color: var(--text-muted);">
                            ${formattedTime}
                        </td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-sm btn-success" onclick="handleStaffApproval('${appId}', 'approve', '${applicant.name}')">
                                    <i class="fa-solid fa-check"></i> Approve Admin
                                </button>
                                <button class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;" onclick="handleStaffApproval('${appId}', 'reject', '${applicant.name}')">
                                    <i class="fa-solid fa-xmark"></i> Reject
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. Render Active Staff Table
    if (activeBody) {
        if (activeStaffList.length === 0) {
            activeBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No staff members found.
                    </td>
                </tr>
            `;
        } else {
            activeBody.innerHTML = activeStaffList.map(staff => {
                const staffId = staff._id || staff.uid;
                const isMainSuper = staff.email === 'deepaksharma74521@gmail.com' || staff.email === 'admin@canteen.edu' || staff.role === 'superadmin';

                return `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: var(--secondary);">${staff.name}</div>
                            ${isMainSuper ? '<span style="font-size: 0.72rem; background: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">SUPER ADMIN (OWNER)</span>' : ''}
                        </td>
                        <td>${staff.email}</td>
                        <td>${staff.phone || 'N/A'}</td>
                        <td>
                            <span style="font-weight: 600; color: #334155;">${staff.staffDesignation || (isMainSuper ? 'System Super Admin' : 'Canteen Admin')}</span>
                        </td>
                        <td>
                            <span class="status-badge status-ready" style="font-size: 0.75rem;">Active &bull; Authorized</span>
                        </td>
                        <td>
                            ${isMainSuper ? `
                                <span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Protected Account</span>
                            ` : `
                                <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="handleStaffApproval('${staffId}', 'revoke', '${staff.name}')">
                                    <i class="fa-solid fa-user-minus"></i> Revoke Access
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

async function handleStaffApproval(userId, action, staffName) {
    const actionText = action === 'approve' ? `Approve ${staffName} as Canteen Admin?` : (action === 'revoke' ? `Revoke Admin privileges from ${staffName}?` : `Reject ${staffName}'s staff request?`);
    if (!confirm(actionText)) return;

    try {
        const res = await api.manageStaff(userId, action);
        if (res.success) {
            showToast(res.message, action === 'approve' ? 'success' : 'info');
            loadStaffData();
        } else {
            showToast(res.message || 'Operation failed.', 'error');
        }
    } catch (error) {
        console.error('Staff action error:', error);
        showToast('Error updating staff permission: ' + error.message, 'error');
    }
}

function switchAdminTab(tabName) {
    currentAdminTab = tabName;

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    const ordersSection = document.getElementById('admin-orders-section');
    const menuSection = document.getElementById('admin-menu-section');
    const staffSection = document.getElementById('admin-staff-section');

    if (ordersSection) ordersSection.style.display = (tabName === 'orders' ? 'block' : 'none');
    if (menuSection) menuSection.style.display = (tabName === 'menu' ? 'block' : 'none');
    if (staffSection) staffSection.style.display = (tabName === 'staff' ? 'block' : 'none');

    if (tabName === 'staff') {
        loadStaffData();
    }
}

function setupAdminEventListeners() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchAdminTab(btn.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.order-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.order-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentOrderFilter = pill.getAttribute('data-filter');
            renderAdminOrdersTable();
        });
    });

    document.getElementById('admin-order-search')?.addEventListener('input', () => {
        renderAdminOrdersTable();
    });

    document.querySelectorAll('.admin-food-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.admin-food-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFoodFilter = pill.getAttribute('data-category');
            renderAdminFoodTable();
        });
    });

    document.getElementById('admin-food-search')?.addEventListener('input', () => {
        renderAdminFoodTable();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupAdminEventListeners();
    initAdminPage();
});

