// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/profile.js
// Description: Student Profile Viewing, Updating & Order Metric Statistics
// ==========================================================================

let currentUserUid = null;

async function initProfile() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=profile.html';
        return;
    }

    currentUserUid = user._id || user.uid || user.id;

    try {
        const res = await api.getProfile(currentUserUid);
        const userData = (res.success && res.user) ? res.user : user;

        document.getElementById('profile-name-display').textContent = userData.name || 'Student';
        document.getElementById('profile-email-display').textContent = userData.email || 'N/A';
        document.getElementById('profile-roll-display').textContent = userData.rollNo || 'Not Set';
        document.getElementById('profile-dept-display').textContent = userData.department || 'Not Set';
        
        let createdDate = 'Recently';
        if (userData.createdAt) {
            try {
                createdDate = new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            } catch (e) {
                createdDate = userData.createdAt;
            }
        }
        const createdDisplayEl = document.getElementById('profile-created-display');
        if (createdDisplayEl) createdDisplayEl.textContent = createdDate;
        
        // Populate Edit Form Inputs
        document.getElementById('edit-name').value = userData.name || '';
        document.getElementById('edit-roll').value = userData.rollNo || '';
        document.getElementById('edit-dept').value = userData.department || 'BCA';
        document.getElementById('edit-phone').value = userData.phone || '';
        document.getElementById('edit-email').value = userData.email || '';

        loadStudentStats(currentUserUid);

    } catch (error) {
        console.error('Error fetching profile data:', error);
        showToast('Failed to load profile details.', 'error');
    }
}

async function loadStudentStats(uid) {
    try {
        const res = await api.getOrders(uid);
        if (!res.success || !res.orders) return;

        let totalOrders = res.orders.length;
        let pendingOrders = 0;
        let completedOrders = 0;

        res.orders.forEach(order => {
            const status = order.status;
            if (status === 'Pending' || status === 'Preparing' || status === 'Ready') {
                pendingOrders++;
            } else if (status === 'Completed') {
                completedOrders++;
            }
        });

        const totalEl = document.getElementById('stat-total-orders');
        const activeEl = document.getElementById('stat-active-orders');
        const completedEl = document.getElementById('stat-completed-orders');

        if (totalEl) totalEl.textContent = totalOrders;
        if (activeEl) activeEl.textContent = pendingOrders;
        if (completedEl) completedEl.textContent = completedOrders;

    } catch (e) {
        console.warn('Could not load student stats:', e);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();

    if (!currentUserUid) return;

    const name = document.getElementById('edit-name').value.trim();
    const rollNo = document.getElementById('edit-roll').value.trim();
    const dept = document.getElementById('edit-dept').value;
    const phone = document.getElementById('edit-phone').value.trim();
    const saveBtn = document.getElementById('save-profile-btn');

    if (!name || !rollNo || !phone) {
        showToast('Please fill in all profile fields.', 'warning');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await api.updateProfile(currentUserUid, {
            name,
            rollNo,
            department: dept,
            phone
        });

        if (res.success) {
            document.getElementById('profile-name-display').textContent = name;
            document.getElementById('profile-roll-display').textContent = rollNo;
            document.getElementById('profile-dept-display').textContent = dept;

            showToast('Profile updated successfully in MongoDB!', 'success', 'Saved');
        } else {
            showToast(res.message || 'Failed to update profile.', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initProfile();
});
