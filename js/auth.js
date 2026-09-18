// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/auth.js
// Description: User Registration, Login, Logout & Role-based Access Control
// ==========================================================================

function toggleAdminKeyField(checkbox) {
    const container = document.getElementById('admin-key-container');
    if (container) {
        container.style.display = checkbox.checked ? 'block' : 'none';
        const keyInput = document.getElementById('reg-admin-key');
        if (checkbox.checked && keyInput) {
            keyInput.focus();
        }
    }
}

// Handle Student / Staff Registration
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const rollNo = document.getElementById('reg-roll').value.trim();
    const dept = document.getElementById('reg-dept').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = document.getElementById('reg-submit-btn');

    const isStaffChecked = document.getElementById('is-admin-checkbox')?.checked;
    const staffRole = document.getElementById('reg-staff-role')?.value;

    if (!name || !rollNo || !dept || !phone || !email || !password) {
        showToast('Please fill in all required fields.', 'warning', 'Missing Details');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'warning', 'Weak Password');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match. Please recheck.', 'error', 'Mismatch');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        const payload = {
            name,
            rollNo,
            department: dept,
            phone,
            email,
            password
        };

        if (isStaffChecked) {
            payload.applyForStaff = true;
            payload.staffDesignation = staffRole;
        }

        const result = await api.register(payload);

        if (result.success) {
            if (isStaffChecked) {
                showToast('Staff Request submitted! Pending approval by Super Admin Deepak.', 'info', 'Application Sent');
            } else {
                showToast('Account created successfully! Logging you in...', 'success', 'Welcome');
            }

            // Auto login
            const loginRes = await api.login(email, password);
            setTimeout(() => {
                if (loginRes.user && (loginRes.user.role === 'admin' || loginRes.user.role === 'superadmin')) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'menu.html';
                }
            }, 1200);
        } else {
            showToast(result.message || 'Registration failed.', 'error', 'Registration Failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
        }
    } catch (error) {
        console.error('Registration Error:', error);
        showToast('Server connection failed. Make sure backend is running.', 'error', 'Error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
    }
}

// Handle Student / Admin Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    if (!email || !password) {
        showToast('Please enter your email and password.', 'warning', 'Required');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    try {
        const result = await api.login(email, password);

        if (result.success && result.user) {
            const userData = result.user;
            showToast(`Welcome back, ${userData.name || 'User'}!`, 'success', 'Login Successful');
            
            setTimeout(() => {
                if (userData.role === 'admin' || userData.role === 'superadmin') {
                    window.location.href = 'admin.html';
                } else if (userData.role === 'pending_admin') {
                    showToast('Your Staff request is currently pending Super Admin Deepak approval.', 'info', 'Pending Review');
                    window.location.href = 'menu.html';
                } else {
                    window.location.href = 'menu.html';
                }
            }, 800);
        } else {
            showToast(result.message || 'Invalid email or password.', 'error', 'Login Failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        }
    } catch (error) {
        console.error('Login Error:', error);
        showToast('Could not connect to backend server. Make sure server.py is running.', 'error', 'Connection Error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    }
}

// Handle User Logout
function handleLogout() {
    api.logout();
}

// Page Guard
function checkAuth(requiredRole = null, redirectUrl = 'login.html') {
    const user = api.getCurrentUser();
    if (!user) {
        if (requiredRole) {
            window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        updateNavForGuest();
    } else {
        if (requiredRole === 'admin') {
            const isAuthorized = (user.role === 'admin' || user.role === 'superadmin');
            if (!isAuthorized) {
                if (user.role === 'pending_admin') {
                    showToast('Your Staff access request is pending approval by Super Admin Deepak.', 'warning', 'Pending Approval');
                } else {
                    showToast('Access denied. Administrator privileges required.', 'error', 'Unauthorized');
                }
                setTimeout(() => {
                    window.location.href = 'menu.html';
                }, 1200);
                return;
            }
        }
        updateNavForUser(user);
    }
}

function updateNavForUser(userData) {
    const authActionsContainer = document.getElementById('nav-auth-actions');
    if (!authActionsContainer) return;

    const shortName = userData.name ? userData.name.split(' ')[0] : 'User';
    const isAdmin = userData.role === 'admin';

    authActionsContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="${isAdmin ? 'admin.html' : 'profile.html'}" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 0.4rem;">
                <i class="fa-solid fa-user-circle"></i>
                <span>${shortName}</span>
            </a>
            <button onclick="handleLogout()" class="btn btn-secondary btn-sm" title="Logout">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
        </div>
    `;
}

function updateNavForGuest() {
    const authActionsContainer = document.getElementById('nav-auth-actions');
    if (!authActionsContainer) return;

    authActionsContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <a href="login.html" class="btn btn-outline btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
        </div>
    `;
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
