// ==========================================================================
// Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB)
// File: js/auth.js
// Description: Multi-Role Authentication, Registration & Session Guards (Student, Faculty & Shop Owner)
// ==========================================================================

function handleLoginRoleChange(selectedRole) {
    const labelStudent = document.getElementById('login-label-student');
    const labelFaculty = document.getElementById('login-label-faculty');
    const labelShop = document.getElementById('login-label-shop');
    const labelDelivery = document.getElementById('login-label-delivery');

    const headerIcon = document.getElementById('login-header-icon');
    const headerTitle = document.getElementById('login-header-title');
    const headerSubtitle = document.getElementById('login-header-subtitle');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const allLabels = [labelStudent, labelFaculty, labelShop, labelDelivery];
    allLabels.forEach(lbl => {
        if (lbl) {
            lbl.style.border = '1.5px solid #cbd5e1';
            lbl.style.background = 'white';
            lbl.style.color = '#475569';
            lbl.style.fontWeight = '600';
        }
    });

    if (selectedRole === 'Delivery') {
        if (labelDelivery) {
            labelDelivery.style.border = '2px solid #0284c7';
            labelDelivery.style.background = '#f0f9ff';
            labelDelivery.style.color = '#0284c7';
            labelDelivery.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-person-biking';
        if (headerTitle) headerTitle.textContent = 'Delivery Partner & Fleet Login';
        if (headerSubtitle) headerSubtitle.textContent = 'Sign in to deliver hostel & cabin orders and collect payments';
        if (emailInput) emailInput.placeholder = 'delivery@campusmart.in';
        if (passwordInput && !passwordInput.value) passwordInput.value = 'delivery123';
    } else if (selectedRole === 'ShopOwner') {
        if (labelShop) {
            labelShop.style.border = '2px solid var(--primary)';
            labelShop.style.background = '#fff7ed';
            labelShop.style.color = 'var(--primary)';
            labelShop.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-store';
        if (headerTitle) headerTitle.textContent = 'Shop Owner & Vendor Login';
        if (headerSubtitle) headerSubtitle.textContent = 'Sign in to manage your counter orders, food menu & profile';
        if (emailInput) emailInput.placeholder = 'vendor@tmu.ac.in or deepaksharma74521@gmail.com';
    } else if (selectedRole === 'Faculty') {
        if (labelFaculty) {
            labelFaculty.style.border = '2px solid var(--primary)';
            labelFaculty.style.background = '#fff7ed';
            labelFaculty.style.color = 'var(--primary)';
            labelFaculty.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-chalkboard-user';
        if (headerTitle) headerTitle.textContent = 'Faculty & Teacher Login';
        if (headerSubtitle) headerSubtitle.textContent = 'Sign in to order tea, lunch & snacks to your department';
        if (emailInput) emailInput.placeholder = 'faculty@college.edu';
    } else {
        if (labelStudent) {
            labelStudent.style.border = '2px solid var(--primary)';
            labelStudent.style.background = '#fff7ed';
            labelStudent.style.color = 'var(--primary)';
            labelStudent.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-graduation-cap';
        if (headerTitle) headerTitle.textContent = 'Student Login';
        if (headerSubtitle) headerSubtitle.textContent = 'Sign in to order food, snacks, stationery & essentials';
        if (emailInput) emailInput.placeholder = 'student@college.edu';
    }
}

function handleUserTypeChange(selectedType) {
    const isFaculty = (selectedType === 'Faculty');
    const isShopOwner = (selectedType === 'ShopOwner');

    const labelStudent = document.getElementById('label-type-student');
    const labelFaculty = document.getElementById('label-type-faculty');
    const labelShop = document.getElementById('label-type-shop');

    const nameLabel = document.getElementById('reg-name-label');
    const nameInput = document.getElementById('reg-name');
    const idLabel = document.getElementById('reg-id-label');
    const idInput = document.getElementById('reg-roll');
    const idIcon = document.getElementById('reg-id-icon');
    const deptLabel = document.getElementById('reg-dept-label');
    const deptSelect = document.getElementById('reg-dept');
    const deptIcon = document.getElementById('reg-dept-icon');

    const cabinGroup = document.getElementById('faculty-cabin-group');
    const shopLocGroup = document.getElementById('shop-location-group');
    const headerIcon = document.getElementById('reg-header-icon');
    const headerTitle = document.getElementById('reg-header-title');
    const headerSubtitle = document.getElementById('reg-header-subtitle');

    const allLabels = [labelStudent, labelFaculty, labelShop];
    allLabels.forEach(lbl => {
        if (lbl) {
            lbl.style.border = '1.5px solid #cbd5e1';
            lbl.style.background = 'white';
            lbl.style.color = '#475569';
            lbl.style.fontWeight = '600';
        }
    });

    if (isShopOwner) {
        if (labelShop) {
            labelShop.style.border = '2px solid var(--primary)';
            labelShop.style.background = '#fff7ed';
            labelShop.style.color = 'var(--primary)';
            labelShop.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-store';
        if (headerTitle) headerTitle.textContent = 'Register Campus Shop / Outlet';
        if (headerSubtitle) headerSubtitle.textContent = 'Create your counter profile to sell food, drinks & daily supplies';

        if (nameLabel) nameLabel.textContent = 'Shop Owner / Manager Full Name';
        if (nameInput) nameInput.placeholder = 'e.g. Mr. Ramesh Sharma';
        if (idLabel) idLabel.textContent = 'Shop / Counter Name *';
        if (idInput) idInput.placeholder = 'e.g. TMU Central Food Court / Juice Bar';
        if (idIcon) idIcon.className = 'fa-solid fa-store input-icon';

        if (deptLabel) deptLabel.textContent = 'Primary Shop Category *';
        if (deptIcon) deptIcon.className = 'fa-solid fa-tags input-icon';
        if (deptSelect) {
            deptSelect.innerHTML = `
                <option value="Canteen Food" selected>🍔 Canteen Food & Meals</option>
                <option value="Drinks & Juices">🥤 Drinks, Juices & Shakes</option>
                <option value="Snacks & Chips">🍿 Bakery & Packaged Snacks</option>
                <option value="Chocolates & Candies">🍫 Chocolates & Sweets</option>
                <option value="Stationery">📚 Stationery & Xerox Supplies</option>
                <option value="Hostel Essentials">🧴 Daily / Hostel Essentials</option>
            `;
        }

        if (shopLocGroup) shopLocGroup.style.display = 'block';
        if (cabinGroup) cabinGroup.style.display = 'none';
    } else if (isFaculty) {
        if (labelFaculty) {
            labelFaculty.style.border = '2px solid var(--primary)';
            labelFaculty.style.background = '#fff7ed';
            labelFaculty.style.color = 'var(--primary)';
            labelFaculty.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-chalkboard-user';
        if (headerTitle) headerTitle.textContent = 'Create Faculty Account';
        if (headerSubtitle) headerSubtitle.textContent = 'Register your faculty profile for express food delivery & pickup';

        if (nameLabel) nameLabel.textContent = 'Full Name';
        if (nameInput) nameInput.placeholder = 'e.g. Prof. R. K. Sharma';
        if (idLabel) idLabel.textContent = 'Faculty / Employee ID';
        if (idInput) idInput.placeholder = 'e.g. FAC-CS-108';
        if (idIcon) idIcon.className = 'fa-solid fa-id-card input-icon';

        if (deptLabel) deptLabel.textContent = 'College / Department';
        if (deptIcon) deptIcon.className = 'fa-solid fa-building-columns input-icon';
        resetCollegeDepartments();

        if (shopLocGroup) shopLocGroup.style.display = 'none';
        if (cabinGroup) cabinGroup.style.display = 'block';
    } else {
        if (labelStudent) {
            labelStudent.style.border = '2px solid var(--primary)';
            labelStudent.style.background = '#fff7ed';
            labelStudent.style.color = 'var(--primary)';
            labelStudent.style.fontWeight = '700';
        }
        if (headerIcon) headerIcon.className = 'fa-solid fa-graduation-cap';
        if (headerTitle) headerTitle.textContent = 'Create Student Account';
        if (headerSubtitle) headerSubtitle.textContent = 'Register your profile for fast, queue-free campus food & stationery pre-orders';

        if (nameLabel) nameLabel.textContent = 'Full Name';
        if (nameInput) nameInput.placeholder = 'e.g. Rahul Sharma';
        if (idLabel) idLabel.textContent = 'Roll / Student ID';
        if (idInput) idInput.placeholder = 'e.g. BCA-2024-042';
        if (idIcon) idIcon.className = 'fa-solid fa-id-card input-icon';

        if (deptLabel) deptLabel.textContent = 'College / Department';
        if (deptIcon) deptIcon.className = 'fa-solid fa-building-columns input-icon';
        resetCollegeDepartments();

        if (shopLocGroup) shopLocGroup.style.display = 'none';
        if (cabinGroup) cabinGroup.style.display = 'none';
    }
}

function resetCollegeDepartments() {
    const deptSelect = document.getElementById('reg-dept');
    if (deptSelect) {
        deptSelect.innerHTML = `
            <option value="College of Computing Sciences & IT (CCSIT)" selected>College of Computing Sciences & IT (CCSIT)</option>
            <option value="Medical College & Research Centre">Medical College & Research Centre</option>
            <option value="Dental College & Research Centre">Dental College & Research Centre</option>
            <option value="College of Nursing">College of Nursing</option>
            <option value="College of Pharmacy">College of Pharmacy</option>
            <option value="College of Paramedical Sciences">College of Paramedical Sciences</option>
            <option value="Department of Physiotherapy">Department of Physiotherapy</option>
            <option value="TMIMT College of Management">TMIMT College of Management</option>
            <option value="College of Law & Legal Studies">College of Law & Legal Studies</option>
            <option value="College of Engineering">College of Engineering</option>
            <option value="College of Fine Arts">College of Fine Arts</option>
            <option value="Faculty of Education">Faculty of Education</option>
            <option value="TMIMT College of Physical Education">TMIMT College of Physical Education</option>
            <option value="College of Agriculture Sciences">College of Agriculture Sciences</option>
            <option value="Centre for Jain Studies">Centre for Jain Studies</option>
            <option value="Other Department">Other Department</option>
        `;
    }
}

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

// Global state for OTP Registration Flow
let pendingRegistrationData = null;
let otpTimerInterval = null;
let currentGeneratedOtp = null;
let pushNotificationTimeout = null;

// Realistic Web Audio SMS Arrival Chime
function playSmsChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        
        // Note 1 (A5 - 880Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.22);

        // Note 2 (E6 - 1320Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.1);
        gain2.gain.setValueAtTime(0.25, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.42);

        // Vibration for mobile devices
        if (navigator.vibrate) {
            navigator.vibrate([70, 40, 80]);
        }
    } catch (e) {
        console.warn('Web Audio error:', e);
    }
}

// Floating Push Notification Controls
function showPushNotification(otpCode) {
    const banner = document.getElementById('mobile-push-notification');
    const display = document.getElementById('push-otp-display');
    if (!banner) return;

    if (display) display.textContent = otpCode;
    banner.style.top = '24px';
    playSmsChime();

    if (pushNotificationTimeout) clearTimeout(pushNotificationTimeout);
    pushNotificationTimeout = setTimeout(() => {
        dismissPushNotification();
    }, 20000);
}

function dismissPushNotification() {
    const banner = document.getElementById('mobile-push-notification');
    if (banner) banner.style.top = '-160px';
    if (pushNotificationTimeout) clearTimeout(pushNotificationTimeout);
}

function autoFillOtpAndNotify() {
    autoFillOtp();
    dismissPushNotification();
}

// Handle Student / Faculty / Staff / Shop Owner Registration with Mobile OTP
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

    const userType = document.querySelector('input[name="account-type"]:checked')?.value || 'Student';
    const isShopOwner = (userType === 'ShopOwner');
    const cabinNumber = document.getElementById('reg-cabin')?.value.trim() || '';
    const shopLocation = document.getElementById('reg-shop-loc')?.value.trim() || 'Campus Food Court';

    const isStaffChecked = document.getElementById('is-admin-checkbox')?.checked;
    const staffRole = document.getElementById('reg-staff-role')?.value;
    const staffShop = document.getElementById('reg-staff-shop')?.value || 'All';

    if (!name || !rollNo || !dept || !phone || !email || !password) {
        showToast('Please fill in all required fields.', 'warning', 'Missing Details');
        return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
        showToast('Please enter a valid 10-digit mobile number.', 'warning', 'Invalid Phone');
        document.getElementById('reg-phone')?.focus();
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

    // Save pending registration payload
    pendingRegistrationData = {
        name,
        rollNo,
        department: dept,
        phone,
        email,
        password,
        userType,
        cabinNumber
    };

    if (isShopOwner) {
        pendingRegistrationData.isShopOwner = true;
        pendingRegistrationData.role = 'admin';
        pendingRegistrationData.shopName = rollNo;
        pendingRegistrationData.shopCategory = dept;
        pendingRegistrationData.location = shopLocation;
    } else if (isStaffChecked) {
        pendingRegistrationData.applyForStaff = true;
        pendingRegistrationData.staffDesignation = staffRole;
        pendingRegistrationData.assignedShop = staffShop;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating SMS OTP...';

    try {
        let otpRes;
        try {
            otpRes = await api.sendOtp({
                phone,
                email,
                purpose: 'register'
            });
        } catch (netErr) {
            console.warn('Backend send-otp fallback triggered:', netErr);
            const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
            otpRes = { success: true, otp: fallbackCode, phone };
        }

        if (otpRes && otpRes.success) {
            currentGeneratedOtp = String(otpRes.otp);
            openOtpModal(phone, otpRes.otp);
            showPushNotification(otpRes.otp);
            showToast(`📲 6-Digit SMS Verification code sent to +91 ${cleanPhone.slice(-10)}!`, 'success', 'SMS OTP Dispatched');
        } else {
            if (otpRes && otpRes.alreadyRegistered) {
                showToast(otpRes.message || 'Mobile number already registered. Please Login.', 'error', 'Already Registered');
                const phoneInput = document.getElementById('reg-phone');
                if (phoneInput) {
                    phoneInput.style.borderColor = '#ef4444';
                    phoneInput.focus();
                }
            } else {
                showToast(otpRes?.message || 'Failed to send OTP.', 'error', 'OTP Error');
            }
        }
    } catch (err) {
        console.error('Send OTP error:', err);
        showToast('Error sending OTP. Please check details.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Verify Mobile & Create Account';
    }
}

// ==========================================================================
// OTP Modal Controls & Input Digit Auto-Advancement
// ==========================================================================

function openOtpModal(phone, otpCode) {
    const modal = document.getElementById('otp-modal');
    const phoneDisplay = document.getElementById('otp-phone-display');
    const smsBanner = document.getElementById('simulated-sms-banner');
    const smsCode = document.getElementById('simulated-sms-code');

    if (!modal) return;

    if (phoneDisplay) phoneDisplay.textContent = `+91 ${phone}`;
    if (smsCode && otpCode) smsCode.textContent = otpCode;
    if (smsBanner) smsBanner.style.display = 'block';

    // Clear previous inputs
    for (let i = 1; i <= 6; i++) {
        const inp = document.getElementById(`otp-d${i}`);
        if (inp) inp.value = '';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
        document.getElementById('otp-d1')?.focus();
    }, 150);

    startOtpTimer(60);
}

function closeOtpModal() {
    const modal = document.getElementById('otp-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    dismissPushNotification();
}

function startOtpTimer(seconds = 60) {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    
    let remaining = seconds;
    const timerWrap = document.getElementById('otp-timer-wrap');
    const timerCount = document.getElementById('otp-timer-count');
    const resendBtn = document.getElementById('resend-otp-btn');

    if (timerWrap) timerWrap.style.display = 'inline';
    if (resendBtn) resendBtn.style.display = 'none';
    if (timerCount) timerCount.textContent = `${remaining}s`;

    otpTimerInterval = setInterval(() => {
        remaining--;
        if (timerCount) timerCount.textContent = `${remaining}s`;

        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            if (timerWrap) timerWrap.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'inline-block';
        }
    }, 1000);
}

function handleOtpDigitInput(input, index) {
    // Only allow single digit
    input.value = input.value.replace(/[^0-9]/g, '');

    if (input.value && index < 6) {
        const nextInput = document.getElementById(`otp-d${index + 1}`);
        if (nextInput) nextInput.focus();
    }
}

function handleOtpDigitKeydown(event, index) {
    if (event.key === 'Backspace' && !event.target.value && index > 1) {
        const prevInput = document.getElementById(`otp-d${index - 1}`);
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
        }
    } else if (event.key === 'ArrowLeft' && index > 1) {
        document.getElementById(`otp-d${index - 1}`)?.focus();
    } else if (event.key === 'ArrowRight' && index < 6) {
        document.getElementById(`otp-d${index + 1}`)?.focus();
    }
}

function handleOtpPaste(event) {
    event.preventDefault();
    const pasteData = (event.clipboardData || window.clipboardData).getData('text').trim();
    const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);
    if (!digits) return;

    for (let i = 1; i <= 6; i++) {
        const inp = document.getElementById(`otp-d${i}`);
        if (inp) {
            inp.value = digits[i - 1] || '';
        }
    }
    const targetIdx = Math.min(digits.length, 6);
    document.getElementById(`otp-d${targetIdx}`)?.focus();
}

function getEnteredOtp() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
        const val = document.getElementById(`otp-d${i}`)?.value || '';
        otp += val;
    }
    return otp;
}

function autoFillOtp() {
    if (!currentGeneratedOtp || currentGeneratedOtp.length !== 6) return;
    for (let i = 1; i <= 6; i++) {
        const inp = document.getElementById(`otp-d${i}`);
        if (inp) inp.value = currentGeneratedOtp[i - 1];
    }
    document.getElementById('otp-d6')?.focus();
    showToast('✨ OTP Auto-filled!', 'success');
}

async function handleResendOtp() {
    if (!pendingRegistrationData) {
        showToast('Please submit the registration form again.', 'error');
        closeOtpModal();
        return;
    }

    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';
    }

    try {
        let res;
        try {
            res = await api.sendOtp({
                phone: pendingRegistrationData.phone,
                email: pendingRegistrationData.email,
                purpose: 'register'
            });
        } catch (netErr) {
            const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
            res = { success: true, otp: fallbackCode };
        }

        if (res && res.success) {
            currentGeneratedOtp = String(res.otp);
            const smsCode = document.getElementById('simulated-sms-code');
            if (smsCode) smsCode.textContent = res.otp;
            showPushNotification(res.otp);
            
            showToast(`🎉 New 6-Digit OTP sent to ${pendingRegistrationData.phone}!`, 'success', 'OTP Resent');
            startOtpTimer(60);
        } else {
            showToast(res?.message || 'Failed to resend OTP.', 'error');
        }
    } catch (err) {
        showToast('Error resending OTP.', 'error');
    } finally {
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Resend OTP Now';
        }
    }
}

async function handleVerifyOtpSubmit(event) {
    event.preventDefault();

    if (!pendingRegistrationData) {
        showToast('Session expired. Please fill the registration form again.', 'error');
        closeOtpModal();
        return;
    }

    const enteredOtp = getEnteredOtp();
    if (enteredOtp.length < 6) {
        showToast('Please enter the complete 6-digit OTP.', 'warning', 'Incomplete OTP');
        return;
    }

    const verifyBtn = document.getElementById('verify-otp-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    }

    try {
        let isVerified = false;
        if (currentGeneratedOtp && enteredOtp === currentGeneratedOtp) {
            isVerified = true;
        } else {
            const verifyRes = await api.verifyOtp({
                phone: pendingRegistrationData.phone,
                otp: enteredOtp
            });
            if (verifyRes && verifyRes.success) {
                isVerified = true;
            }
        }

        if (!isVerified) {
            showToast('❌ Invalid 6-digit OTP! Please recheck the code.', 'error', 'Verification Failed');
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify & Register';
            }
            return;
        }

        // Step 2: OTP Verified! Create account in MongoDB
        dismissPushNotification();
        const regResult = await api.register(pendingRegistrationData);

        if (regResult && regResult.success) {
            closeOtpModal();
            const isShopOwner = pendingRegistrationData.isShopOwner;
            const isStaff = pendingRegistrationData.applyForStaff;

            if (isShopOwner) {
                showToast(`🎉 Verified! Shop Owner account & outlet created!`, 'success', 'Welcome Vendor');
            } else if (isStaff) {
                showToast('🎉 Mobile verified & Staff request submitted! Pending admin approval.', 'success', 'Application Sent');
            } else {
                showToast('🎉 Mobile verified & Account created! Logging you in...', 'success', 'Welcome to Campus Mart');
            }

            // Auto login user
            try {
                await api.login(pendingRegistrationData.email, pendingRegistrationData.password);
            } catch (lErr) {}
            
            setTimeout(() => {
                if (isShopOwner) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'menu.html';
                }
            }, 1200);
        } else {
            showToast(regResult?.message || 'Registration failed after verification.', 'error');
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify & Register';
            }
        }
    } catch (err) {
        console.error('OTP Verification error:', err);
        showToast('Error during OTP verification: ' + err.message, 'error');
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify & Register';
        }
    }
}

// Handle Student / Admin / Shop Owner Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');
    const selectedRole = document.querySelector('input[name="login-role"]:checked')?.value || 'Student';

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
                const urlParams = new URLSearchParams(window.location.search);
                const redirectTarget = urlParams.get('redirect');

                if (redirectTarget) {
                    window.location.href = redirectTarget;
                } else if (userData.role === 'delivery_partner' || userData.role === 'delivery' || selectedRole === 'Delivery') {
                    window.location.href = 'delivery.html';
                } else if (userData.role === 'admin' || userData.role === 'superadmin' || selectedRole === 'ShopOwner' || userData.userType === 'ShopOwner') {
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
    const isAdmin = (userData.role === 'admin' || userData.role === 'superadmin');

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

function togglePasswordVisibility(inputId, iconIdOrEl) {
    const input = document.getElementById(inputId);
    let icon = null;
    if (typeof iconIdOrEl === 'string') {
        icon = document.getElementById(iconIdOrEl);
    } else if (iconIdOrEl && iconIdOrEl.querySelector) {
        icon = iconIdOrEl.querySelector('i') || iconIdOrEl;
    } else if (iconIdOrEl && iconIdOrEl.classList) {
        icon = iconIdOrEl;
    }
    
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// ==========================================================================
// Strong Password Generator & Realtime Strength Analysis
// ==========================================================================

function generateStrongPassword(length = 12) {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*()_+-=';
    
    let password = [
        uppercase[Math.floor(Math.random() * uppercase.length)],
        lowercase[Math.floor(Math.random() * lowercase.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        uppercase[Math.floor(Math.random() * uppercase.length)],
        lowercase[Math.floor(Math.random() * lowercase.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    const allChars = uppercase + lowercase + numbers + symbols;
    while (password.length < length) {
        password.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }
    
    // Shuffle array
    for (let i = password.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [password[i], password[j]] = [password[j], password[i]];
    }
    
    return password.join('');
}

function generateAndSetStrongPassword() {
    const pwd = generateStrongPassword(12);
    const pwdInput = document.getElementById('reg-password');
    const confInput = document.getElementById('reg-confirm-password');
    const copyBtn = document.getElementById('copy-pwd-btn');
    const pwdIcon = document.getElementById('reg-pwd-icon');
    const confIcon = document.getElementById('reg-conf-icon');

    if (pwdInput && confInput) {
        pwdInput.value = pwd;
        confInput.value = pwd;

        // Make visible so user sees the generated password
        pwdInput.type = 'text';
        confInput.type = 'text';
        if (pwdIcon) {
            pwdIcon.classList.remove('fa-eye');
            pwdIcon.classList.add('fa-eye-slash');
        }
        if (confIcon) {
            confIcon.classList.remove('fa-eye');
            confIcon.classList.add('fa-eye-slash');
        }

        if (copyBtn) {
            copyBtn.style.display = 'inline-flex';
        }

        checkPasswordStrength(pwd);
        checkPasswordMatch();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(pwd).then(() => {
                showToast(`🔐 Ultra Strong Password generated & copied: "${pwd}"`, 'success', 'Password Ready');
            }).catch(() => {
                showToast(`🔐 Ultra Strong Password generated and filled!`, 'success', 'Password Ready');
            });
        } else {
            showToast(`🔐 Ultra Strong Password generated and filled!`, 'success', 'Password Ready');
        }
    }
}

function copyGeneratedPassword() {
    const pwdInput = document.getElementById('reg-password');
    const pwd = pwdInput ? pwdInput.value : '';
    if (!pwd) {
        showToast('No password to copy.', 'warning');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pwd).then(() => {
            showToast('📋 Password copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyText(pwd);
        });
    } else {
        fallbackCopyText(pwd);
    }
}

function fallbackCopyText(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
        showToast('📋 Password copied to clipboard!', 'success');
    } catch (e) {
        showToast('Please select and copy the password manually.', 'info');
    }
    document.body.removeChild(temp);
}

function checkPasswordStrength(password) {
    const wrap = document.getElementById('password-strength-wrap');
    const bar = document.getElementById('strength-bar');
    const text = document.getElementById('strength-text');
    const tips = document.getElementById('password-feedback-tips');
    const copyBtn = document.getElementById('copy-pwd-btn');

    if (!wrap || !bar || !text) return;

    if (!password) {
        wrap.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';
        return;
    }

    wrap.style.display = 'block';
    if (copyBtn) copyBtn.style.display = 'inline-flex';

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 9) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
        bar.style.width = '20%';
        bar.style.backgroundColor = '#ef4444';
        text.style.color = '#ef4444';
        text.textContent = 'Very Weak ⚠️';
        if (tips) tips.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i> Too short. Min 6 characters required.';
    } else if (score === 2) {
        bar.style.width = '45%';
        bar.style.backgroundColor = '#f97316';
        text.style.color = '#f97316';
        text.textContent = 'Weak 🔴';
        if (tips) tips.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #f97316;"></i> Add uppercase letters (A-Z) & numbers (0-9).';
    } else if (score === 3 || score === 4) {
        bar.style.width = '75%';
        bar.style.backgroundColor = '#eab308';
        text.style.color = '#ca8a04';
        text.textContent = 'Good / Medium 🟡';
        if (tips) tips.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #ca8a04;"></i> Good password. Add a symbol (!@#$) for max security.';
    } else {
        bar.style.width = '100%';
        bar.style.backgroundColor = '#16a34a';
        text.style.color = '#16a34a';
        text.textContent = 'Ultra Strong 🟢🛡️';
        if (tips) tips.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #16a34a;"></i> Excellent! High entropy password protects your account.';
    }
}

function checkPasswordMatch() {
    const pwd = document.getElementById('reg-password')?.value || '';
    const conf = document.getElementById('reg-confirm-password')?.value || '';
    const badge = document.getElementById('password-match-badge');

    if (!badge) return;

    if (!conf) {
        badge.style.display = 'none';
        return;
    }

    badge.style.display = 'inline-block';
    if (pwd === conf) {
        badge.style.color = '#16a34a';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Match';
    } else {
        badge.style.color = '#dc2626';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Mismatch';
    }
}
