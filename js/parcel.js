// ==========================================================================
// Campus Mart – Gate No. 2 Parcel Concierge Service (MongoDB Backend)
// File: js/parcel.js
// Description: Student Gate Parcel Request Booking, Live Tracker & Secret PIN
// ==========================================================================

let parcelPollInterval = null;
let currentParcelTab = 'book';

document.addEventListener('DOMContentLoaded', () => {
    initParcelPage();
});

function initParcelPage() {
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=parcel.html';
        return;
    }

    // Auto-fill user's default hostel or cabin if available
    const dropInput = document.getElementById('parcel-drop-location');
    if (dropInput && user.cabinNumber) {
        dropInput.value = user.cabinNumber;
    }

    fetchAndRenderParcels();

    // Check URL parameters for tab=track
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'track') {
        switchParcelTab('track');
    }

    // Auto-poll every 4 seconds for live courier pickup updates
    if (parcelPollInterval) clearInterval(parcelPollInterval);
    parcelPollInterval = setInterval(fetchAndRenderParcels, 4000);
}

function selectPlatform(platformName, el) {
    document.querySelectorAll('.platform-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    const input = document.getElementById('parcel-platform');
    if (input) input.value = platformName;
}

function setDropPreset(locationText, el) {
    document.querySelectorAll('.parcel-step-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    const input = document.getElementById('parcel-drop-location');
    if (input) input.value = locationText;
}

function switchParcelTab(tab) {
    currentParcelTab = tab;
    const bookView = document.getElementById('view-book-parcel');
    const trackView = document.getElementById('view-track-parcel');
    const bookBtn = document.getElementById('tab-btn-book');
    const trackBtn = document.getElementById('tab-btn-track');

    if (tab === 'book') {
        if (bookView) bookView.style.display = 'block';
        if (trackView) trackView.style.display = 'none';
        if (bookBtn) bookBtn.classList.add('active');
        if (trackBtn) trackBtn.classList.remove('active');
    } else {
        if (bookView) bookView.style.display = 'none';
        if (trackView) trackView.style.display = 'block';
        if (bookBtn) bookBtn.classList.remove('active');
        if (trackBtn) trackBtn.classList.add('active');
        fetchAndRenderParcels();
    }
}

async function handleBookParcel(event) {
    event.preventDefault();
    const user = api.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=parcel.html';
        return;
    }

    const platform = document.getElementById('parcel-platform')?.value || 'Amazon';
    const pickupGate = document.getElementById('parcel-gate')?.value || 'Gate No. 2 (Main Parcel Drop Point)';
    const courierPhone = document.getElementById('parcel-courier-phone')?.value.trim() || '';
    const trackingNumber = document.getElementById('parcel-tracking-no')?.value.trim() || '';
    const dropLocation = document.getElementById('parcel-drop-location')?.value.trim() || '';
    const preferredSlot = document.getElementById('parcel-slot')?.value || 'Immediate (Within 20 mins)';
    const specialInstructions = document.getElementById('parcel-instructions')?.value.trim() || '';
    const paymentMethod = document.querySelector('input[name="parcel_payment"]:checked')?.value || 'Campus Digital Wallet';
    const submitBtn = document.getElementById('submit-parcel-btn');

    if (!dropLocation) {
        showToast('Please specify your delivery room / cabin location.', 'warning');
        document.getElementById('parcel-drop-location')?.focus();
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching Gate Runner...';
    }

    try {
        const payload = {
            userId: user._id || user.uid || user.id,
            studentName: user.name || 'Student',
            studentRoll: user.rollNo || user.facultyId || 'N/A',
            studentPhone: user.phone || 'N/A',
            studentEmail: user.email || '',
            platform,
            pickupGate,
            courierName: `${platform} Delivery Courier`,
            courierPhone,
            trackingNumber,
            deliveryLocation: dropLocation,
            preferredSlot,
            specialInstructions,
            runnerFee: 10,
            paymentMethod
        };

        const res = await api.createParcelRequest(payload);
        if (res.success) {
            showToast(`🎉 Gate 2 Runner request #${res.parcel?.parcelId} booked successfully!`, 'success');
            document.getElementById('parcel-booking-form')?.reset();
            switchParcelTab('track');
        } else {
            showToast(res.message || 'Failed to submit parcel request.', 'error');
        }
    } catch (err) {
        console.error('Error booking parcel:', err);
        showToast('Error booking parcel runner: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-person-running"></i> Request Gate 2 Parcel Runner (₹10)';
        }
    }
}

async function fetchAndRenderParcels() {
    const user = api.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('parcels-list-container');
    const badge = document.getElementById('active-parcel-count-badge');
    if (!container) return;

    try {
        const userId = user._id || user.uid || user.id;
        const res = await api.getParcels(userId);

        if (res.success && res.parcels) {
            const activeParcels = res.parcels.filter(p => !['Delivered', 'Cancelled'].includes(p.status));
            if (badge) {
                badge.textContent = activeParcels.length;
                badge.style.display = activeParcels.length > 0 ? 'inline-block' : 'none';
            }

            renderParcelsList(res.parcels);
        } else {
            renderParcelsList([]);
        }
    } catch (err) {
        console.error('Error fetching parcels:', err);
    }
}

function renderParcelsList(parcels) {
    const container = document.getElementById('parcels-list-container');
    if (!container) return;

    if (!parcels || parcels.length === 0) {
        container.innerHTML = `
            <div class="empty-state card" style="text-align: center; padding: 3rem 1.5rem;">
                <i class="fa-solid fa-box-open empty-icon" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; display: block;"></i>
                <h3 style="font-size: 1.25rem; color: var(--secondary); margin-bottom: 0.5rem;">No Gate Parcel Tasks Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
                    Have an Amazon, Flipkart or Blinkit delivery waiting at Gate No. 2? Request our runner to collect and deliver it to your room!
                </p>
                <button class="btn btn-primary" onclick="switchParcelTab('book')">
                    <i class="fa-solid fa-plus"></i> Book First Gate Parcel Pickup
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = parcels.map(parcel => {
        const status = parcel.status || 'Requested';
        const isRequested = (status === 'Requested');
        const isRunnerAssigned = (status === 'Runner Assigned');
        const isCollected = (status === 'Collected at Gate 2' || status === 'Collected');
        const isOutForDelivery = (status === 'Out for Delivery');
        const isDelivered = (status === 'Delivered');
        const isCancelled = (status === 'Cancelled');

        let formattedDate = 'Just now';
        if (parcel.createdAt) {
            try {
                formattedDate = new Date(parcel.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            } catch (e) {
                formattedDate = parcel.createdAt;
            }
        }

        const parcelDocId = parcel._id || parcel.id;
        const secretPin = parcel.secretPin || '----';

        return `
            <div class="order-card card" id="parcel-${parcel.parcelId || parcelDocId}" style="margin-bottom: 1.5rem; ${isDelivered ? 'border: 2px solid #16a34a;' : 'border: 2px solid #93c5fd;'}">
                <div class="order-card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: #e0f2fe; color: #0369a1; padding: 3px 9px; border-radius: 6px; font-weight: 800; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 5px;">
                                <i class="${parcel.platformIcon || 'fa-solid fa-box'}"></i> ${parcel.platform || 'Parcel'}
                            </span>
                            <strong style="font-size: 1.05rem; color: var(--secondary);">${parcel.parcelId || 'PRCL-#'}</strong>
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">
                            <i class="fa-regular fa-clock"></i> Booked: ${formattedDate}
                        </div>
                    </div>
                    <div>
                        <span class="status-badge" style="${getParcelStatusBadgeStyle(status)}">
                            <i class="fa-solid ${getParcelStatusIcon(status)}"></i> ${status}
                        </span>
                    </div>
                </div>

                <!-- 5-Stage Visual Progress Tracker -->
                ${!isCancelled ? `
                    <div class="parcel-tracker">
                        <div class="parcel-track-step ${isRequested || isRunnerAssigned || isCollected || isOutForDelivery || isDelivered ? 'completed' : ''} ${isRequested ? 'active' : ''}">
                            <div class="parcel-track-icon"><i class="fa-solid fa-clipboard-check"></i></div>
                            <div class="parcel-track-label">Requested</div>
                        </div>
                        <div class="parcel-track-step ${isRunnerAssigned || isCollected || isOutForDelivery || isDelivered ? 'completed' : ''} ${isRunnerAssigned ? 'active' : ''}">
                            <div class="parcel-track-icon"><i class="fa-solid fa-person-running"></i></div>
                            <div class="parcel-track-label">Runner Assigned</div>
                        </div>
                        <div class="parcel-track-step ${isCollected || isOutForDelivery || isDelivered ? 'completed' : ''} ${isCollected ? 'active' : ''}">
                            <div class="parcel-track-icon"><i class="fa-solid fa-hand-holding-box"></i></div>
                            <div class="parcel-track-label">Collected @ Gate 2</div>
                        </div>
                        <div class="parcel-track-step ${isOutForDelivery || isDelivered ? 'completed' : ''} ${isOutForDelivery ? 'active' : ''}">
                            <div class="parcel-track-icon"><i class="fa-solid fa-truck-fast"></i></div>
                            <div class="parcel-track-label">On Way to Room</div>
                        </div>
                        <div class="parcel-track-step ${isDelivered ? 'completed active' : ''}">
                            <div class="parcel-track-icon"><i class="fa-solid fa-circle-check"></i></div>
                            <div class="parcel-track-label">Delivered</div>
                        </div>
                    </div>
                ` : `
                    <div style="background: #fee2e2; color: #991b1b; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 700; margin-bottom: 1rem;">
                        <i class="fa-solid fa-ban"></i> This parcel delivery request was cancelled.
                    </div>
                `}

                <!-- Secret Handover PIN & Security Banner -->
                ${!isCancelled && !isDelivered ? `
                    <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1.5px dashed #f59e0b; border-radius: 10px; padding: 0.85rem 1rem; margin: 1rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                        <div>
                            <div style="font-weight: 800; color: #92400e; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-key" style="color: #f59e0b;"></i> Safe Handover 4-Digit Secret PIN:
                            </div>
                            <div style="font-size: 0.76rem; color: #b45309; margin-top: 2px;">
                                Share this PIN only when runner arrives at your room with your package.
                            </div>
                        </div>
                        <div class="pin-badge">
                            <i class="fa-solid fa-lock-open"></i> PIN: ${secretPin}
                        </div>
                    </div>
                ` : ''}

                <!-- Delivery & Pickup Routing Details -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.84rem; margin-bottom: 1rem;">
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">1. Pickup Gate Point:</div>
                        <div style="color: #0f172a; font-weight: 700; margin-top: 2px;">
                            <i class="fa-solid fa-door-open" style="color: #f97316;"></i> ${parcel.pickupGate || 'Gate No. 2'}
                        </div>
                        ${parcel.courierPhone ? `
                            <div style="font-size: 0.76rem; color: #475569; margin-top: 2px;">
                                <i class="fa-solid fa-phone"></i> Courier: <strong>${parcel.courierPhone}</strong>
                            </div>
                        ` : ''}
                    </div>

                    <div>
                        <div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">2. Delivery Destination:</div>
                        <div style="color: #0f172a; font-weight: 700; margin-top: 2px;">
                            <i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ${parcel.deliveryLocation}
                        </div>
                        <div style="font-size: 0.76rem; color: #6b21a8; font-weight: 600; margin-top: 2px;">
                            <i class="fa-regular fa-clock"></i> ${parcel.preferredSlot || 'Immediate'}
                        </div>
                    </div>

                    <div>
                        <div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">3. Assigned Campus Runner:</div>
                        <div style="color: #1e40af; font-weight: 700; margin-top: 2px;">
                            <i class="fa-solid fa-person-running" style="color: #2563eb;"></i> ${parcel.runnerName || 'Assigning Runner...'}
                        </div>
                        ${parcel.runnerPhone ? `
                            <div style="font-size: 0.76rem; color: #166534; font-weight: 600; margin-top: 2px;">
                                <a href="tel:${parcel.runnerPhone}" style="color: #166534; text-decoration: none;">
                                    <i class="fa-solid fa-phone"></i> ${parcel.runnerPhone}
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Footer: Payment & Cancel Action -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="color: var(--text-muted); font-weight: 600;">
                        <span>Runner Fee: <strong style="color: #16a34a;">₹${parcel.runnerFee || 10}</strong> (${parcel.paymentStatus || 'Paid'})</span>
                        &bull; <span>${parcel.paymentMethod || 'Wallet'}</span>
                    </div>

                    ${isRequested ? `
                        <button onclick="cancelParcelRequest('${parcelDocId}', '${parcel.parcelId}')" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; font-size: 0.78rem;">
                            <i class="fa-solid fa-xmark"></i> Cancel Request
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getParcelStatusBadgeStyle(status) {
    switch (status) {
        case 'Requested':
            return 'background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        case 'Runner Assigned':
            return 'background: #fdf4ff; color: #86198f; border: 1px solid #f0abfc; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        case 'Collected at Gate 2':
        case 'Collected':
            return 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        case 'Out for Delivery':
            return 'background: #faf5ff; color: #6b21a8; border: 1px solid #d8b4fe; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        case 'Delivered':
            return 'background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        case 'Cancelled':
            return 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
        default:
            return 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem;';
    }
}

function getParcelStatusIcon(status) {
    switch (status) {
        case 'Requested': return 'fa-clipboard-question';
        case 'Runner Assigned': return 'fa-person-running';
        case 'Collected at Gate 2':
        case 'Collected': return 'fa-hand-holding-box';
        case 'Out for Delivery': return 'fa-truck-fast';
        case 'Delivered': return 'fa-circle-check';
        case 'Cancelled': return 'fa-ban';
        default: return 'fa-clock';
    }
}

async function cancelParcelRequest(docId, parcelId) {
    if (!confirm(`Are you sure you want to cancel Gate Parcel request #${parcelId || docId}?`)) {
        return;
    }

    try {
        const res = await api.updateParcelStatus(docId, 'Cancelled');
        if (res.success) {
            showToast(`Parcel request #${parcelId} cancelled.`, 'info');
            fetchAndRenderParcels();
        } else {
            showToast(res.message || 'Failed to cancel request.', 'error');
        }
    } catch (e) {
        showToast('Error cancelling parcel request: ' + e.message, 'error');
    }
}
