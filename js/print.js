// ==========================================================================
// Campus Mart – Express Printouts & Assignment Hub
// File: js/print.js
// Description: Interactive Document Upload, Print Configurator & Pickup PIN Engine
// ==========================================================================

let printConfig = {
    file: null,
    colorMode: 'bw', // 'bw' or 'color'
    printSide: 'double', // 'double' or 'single'
    pages: 1,
    copies: 1,
    binding: 'staple' // 'staple', 'spiral', 'hardcover', 'none'
};

document.addEventListener('DOMContentLoaded', () => {
    initPrintDropzone();
    initPrintUserData();
    calculatePrintCost();
    loadMyPrintJobs();
});

// 1. User Profile Auto-fill
function initPrintUserData() {
    try {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            const nameInput = document.getElementById('print-student-name');
            const phoneInput = document.getElementById('print-student-phone');
            
            if (nameInput && user.name && !nameInput.value) {
                nameInput.value = user.name;
            }
            if (phoneInput && user.phone && !phoneInput.value) {
                phoneInput.value = user.phone;
            }
        }
    } catch (e) {
        console.warn('Auto-fill print profile skipped:', e);
    }
}

// 2. Drag & Drop File Upload Zone
function initPrintDropzone() {
    const dropzone = document.getElementById('print-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '#0284c7';
            dropzone.style.background = '#e0f2fe';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '#93c5fd';
            dropzone.style.background = '#f0f9ff';
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });
}

function handlePrintFileSelect(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        handleSelectedFile(files[0]);
    }
}

function handleSelectedFile(file) {
    printConfig.file = file;

    const idleBox = document.getElementById('dropzone-idle');
    const activeBox = document.getElementById('dropzone-active');
    const nameEl = document.getElementById('selected-file-name');
    const metaEl = document.getElementById('selected-file-meta');

    if (idleBox) idleBox.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';

    if (nameEl) nameEl.textContent = file.name;
    
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const ext = file.name.split('.').pop().toUpperCase();
    if (metaEl) metaEl.textContent = `${sizeMb} MB • ${ext} File`;

    // Attempt to inspect PDF page count if PDF
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        estimatePdfPages(file);
    }

    if (window.soundEngine && typeof window.soundEngine.playItemAddedSound === 'function') {
        window.soundEngine.playItemAddedSound();
    }
}

function resetPrintFile(e) {
    if (e) {
        e.stopPropagation();
    }
    printConfig.file = null;
    const fileInput = document.getElementById('print-file-input');
    if (fileInput) fileInput.value = '';

    const idleBox = document.getElementById('dropzone-idle');
    const activeBox = document.getElementById('dropzone-active');
    if (idleBox) idleBox.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
}

// Quick PDF Page Count Detector using FileReader
function estimatePdfPages(file) {
    const reader = new FileReader();
    reader.onloadend = function() {
        try {
            const content = reader.result;
            // Match PDF /Type /Page objects
            const matches = content.match(/\/Type\s*\/Page\b/g);
            if (matches && matches.length > 0) {
                // Approximate pages
                const pageCount = matches.length;
                const pageInput = document.getElementById('print-page-count');
                if (pageInput) {
                    pageInput.value = pageCount;
                    calculatePrintCost();
                }
            }
        } catch(err) {
            console.log('PDF page count inspection note:', err);
        }
    };
    reader.readAsBinaryString(file.slice(0, 500000)); // Read first 500KB
}

// 3. Option Selection Handlers
function selectColorMode(mode) {
    printConfig.colorMode = mode;
    const bwCard = document.getElementById('opt-color-bw');
    const fullCard = document.getElementById('opt-color-full');

    if (mode === 'bw') {
        bwCard.classList.add('active');
        fullCard.classList.remove('active');
        bwCard.style.borderColor = '#0284c7';
        bwCard.style.background = '#f0f9ff';
        fullCard.style.borderColor = '#e2e8f0';
        fullCard.style.background = '#ffffff';
    } else {
        fullCard.classList.add('active');
        bwCard.classList.remove('active');
        fullCard.style.borderColor = '#059669';
        fullCard.style.background = '#ecfdf5';
        bwCard.style.borderColor = '#e2e8f0';
        bwCard.style.background = '#ffffff';
    }
    calculatePrintCost();
}

function selectPrintSide(side) {
    printConfig.printSide = side;
    const doubleCard = document.getElementById('opt-side-double');
    const singleCard = document.getElementById('opt-side-single');

    if (side === 'double') {
        doubleCard.classList.add('active');
        singleCard.classList.remove('active');
        doubleCard.style.borderColor = '#0284c7';
        doubleCard.style.background = '#f0f9ff';
        singleCard.style.borderColor = '#e2e8f0';
        singleCard.style.background = '#ffffff';
    } else {
        singleCard.classList.add('active');
        doubleCard.classList.remove('active');
        singleCard.style.borderColor = '#0284c7';
        singleCard.style.background = '#f0f9ff';
        doubleCard.style.borderColor = '#e2e8f0';
        doubleCard.style.background = '#ffffff';
    }
    calculatePrintCost();
}

function adjustPages(delta) {
    const pageInput = document.getElementById('print-page-count');
    if (!pageInput) return;
    let val = parseInt(pageInput.value) || 1;
    val = Math.max(1, Math.min(500, val + delta));
    pageInput.value = val;
    calculatePrintCost();
}

function adjustCopies(delta) {
    const copyInput = document.getElementById('print-copies');
    if (!copyInput) return;
    let val = parseInt(copyInput.value) || 1;
    val = Math.max(1, Math.min(20, val + delta));
    copyInput.value = val;
    calculatePrintCost();
}

// 4. Cost Calculation Matrix
function calculatePrintCost() {
    const pages = Math.max(1, parseInt(document.getElementById('print-page-count')?.value) || 1);
    const copies = Math.max(1, parseInt(document.getElementById('print-copies')?.value) || 1);
    const bindingSelect = document.getElementById('print-binding');
    const binding = bindingSelect ? bindingSelect.value : 'staple';

    printConfig.pages = pages;
    printConfig.copies = copies;
    printConfig.binding = binding;

    const ratePerPage = (printConfig.colorMode === 'color') ? 10.0 : 2.0;
    const basePrintCost = pages * ratePerPage * copies;

    const sheets = (printConfig.printSide === 'single') ? pages : Math.ceil(pages / 2);

    let bindingCost = 0.0;
    let bindingName = 'Corner Stapled (Free)';
    if (binding === 'spiral') {
        bindingCost = 25.0 * copies;
        bindingName = 'Spiral Binding (+₹25)';
    } else if (binding === 'hardcover') {
        bindingCost = 120.0 * copies;
        bindingName = 'Project Hardcover (+₹120)';
    } else if (binding === 'none') {
        bindingName = 'Loose Sheets (No Staple)';
    }

    const totalAmount = Math.round(basePrintCost + bindingCost);

    // Update Summary Elements
    const pagesLabel = document.getElementById('sum-pages-label');
    const sheetsLabel = document.getElementById('sum-sheets-label');
    const copiesLabel = document.getElementById('sum-copies-label');
    const bindingLabel = document.getElementById('sum-binding-label');
    const totalLabel = document.getElementById('sum-total-amount');
    const submitBtn = document.getElementById('submit-print-btn');

    const colorText = printConfig.colorMode === 'color' ? 'Color' : 'B&W';
    if (pagesLabel) pagesLabel.textContent = `${pages} page${pages > 1 ? 's' : ''} (${colorText} @ ₹${ratePerPage}/p)`;
    
    const sideText = printConfig.printSide === 'double' ? 'Both sided' : 'Single sided';
    if (sheetsLabel) sheetsLabel.textContent = `${sheets * copies} sheet${(sheets * copies) > 1 ? 's' : ''} (${sideText})`;
    
    if (copiesLabel) copiesLabel.innerHTML = `&times; ${copies}`;
    if (bindingLabel) bindingLabel.textContent = bindingName;
    if (totalLabel) totalLabel.textContent = `₹${totalAmount}`;
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="fa-solid fa-print"></i> Send Printout Order (₹${totalAmount})`;
    }

    return { totalAmount, basePrintCost, bindingCost, sheets };
}

// 5. Submit Print Order
async function submitPrintOrder() {
    const studentName = document.getElementById('print-student-name')?.value.trim();
    const studentPhone = document.getElementById('print-student-phone')?.value.trim();
    const studentDept = document.getElementById('print-student-dept')?.value;
    const studentRoll = document.getElementById('print-student-roll')?.value.trim() || 'N/A';
    const pickupSlot = document.getElementById('print-pickup-slot')?.value;
    const notes = document.getElementById('print-notes')?.value.trim() || '';

    if (!printConfig.file) {
        alert('⚠️ Please select or drop your assignment document first!');
        document.getElementById('print-dropzone')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    if (!studentName) {
        alert('⚠️ Please enter your student name so the counter can identify your printout.');
        document.getElementById('print-student-name')?.focus();
        return;
    }

    if (!studentPhone || studentPhone.length < 10) {
        alert('⚠️ Please enter a valid 10-digit mobile number for order verification.');
        document.getElementById('print-student-phone')?.focus();
        return;
    }

    let userId = '';
    try {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            userId = u._id || u.id || '';
        }
    } catch(e) {}

    const submitBtn = document.getElementById('submit-print-btn');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending Order to Counter...`;
    }

    const formData = new FormData();
    formData.append('file', printConfig.file);
    formData.append('filename', printConfig.file.name);
    formData.append('pageCount', printConfig.pages);
    formData.append('colorMode', printConfig.colorMode);
    formData.append('printSide', printConfig.printSide);
    formData.append('copies', printConfig.copies);
    formData.append('binding', printConfig.binding);
    formData.append('pickupSlot', pickupSlot);
    formData.append('notes', notes);
    formData.append('studentName', studentName);
    formData.append('studentPhone', studentPhone);
    formData.append('studentDept', studentDept);
    formData.append('studentRoll', studentRoll);
    formData.append('userId', userId);

    try {
        const res = await api.submitPrintOrder(formData);
        if (res && res.success) {
            // Success Audio Feedback
            if (window.soundEngine && typeof window.soundEngine.playOrderSuccessSound === 'function') {
                window.soundEngine.playOrderSuccessSound();
            }

            // Apple Dynamic Island Notification
            if (window.dynamicIsland && typeof window.dynamicIsland.triggerNotification === 'function') {
                window.dynamicIsland.triggerNotification({
                    title: '🖨️ Print Job Queued',
                    subtitle: `Counter PIN: ${res.pickupOtp}`,
                    icon: 'fa-solid fa-print'
                });
            }

            // Save to local print history
            saveLocalPrintJob({
                jobId: res.jobId,
                pickupOtp: res.pickupOtp,
                studentName: studentName,
                filename: printConfig.file.name,
                pages: printConfig.pages,
                copies: printConfig.copies,
                binding: printConfig.binding,
                totalAmount: res.totalAmount,
                createdAt: new Date().toISOString()
            });

            // Show PIN Modal
            const modal = document.getElementById('print-success-modal');
            const otpEl = document.getElementById('modal-print-otp');
            const jobEl = document.getElementById('modal-print-job-id');

            if (otpEl) otpEl.textContent = res.pickupOtp;
            if (jobEl) jobEl.textContent = `Token #${res.jobId} • ₹${res.totalAmount}`;
            if (modal) {
                modal.classList.add('active');
                modal.classList.add('show');
            }

            // Reset File Form
            resetPrintFile();
            loadMyPrintJobs();
        } else {
            alert('❌ ' + (res.message || 'Could not queue print order. Please try again.'));
        }
    } catch (err) {
        console.error('Submit print order failure:', err);
        alert('❌ An error occurred while uploading. Please check your connection.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}

function closePrintSuccessModal() {
    const modal = document.getElementById('print-success-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('show');
    }
    document.getElementById('my-print-jobs-section')?.scrollIntoView({ behavior: 'smooth' });
}

// 6. Local Print History Storage Helpers
function getLocalPrintJobs() {
    try {
        return JSON.parse(localStorage.getItem('cm_my_print_jobs') || '[]');
    } catch(e) {
        return [];
    }
}

function saveLocalPrintJob(job) {
    try {
        const jobs = getLocalPrintJobs();
        jobs.unshift(job);
        localStorage.setItem('cm_my_print_jobs', JSON.stringify(jobs.slice(0, 20)));
    } catch(e) {}
}

// 7. Load & Render Active Print Jobs
async function loadMyPrintJobs() {
    const container = document.getElementById('print-jobs-container');
    if (!container) return;

    let userId = '';
    try {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            userId = u._id || u.id || '';
        }
    } catch(e) {}

    let jobs = [];
    try {
        const res = await api.getPrintJobs(userId);
        if (res && res.success && Array.isArray(res.jobs) && res.jobs.length > 0) {
            jobs = res.jobs;
        }
    } catch(err) {
        console.warn('Backend print jobs note:', err);
    }

    // Fallback to local storage if user is guest or offline
    if (jobs.length === 0) {
        jobs = getLocalPrintJobs();
    }

    if (jobs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8; background: white; border-radius: 14px; border: 1px dashed #cbd5e1; grid-column: 1 / -1;">
                <i class="fa-solid fa-file-circle-check" style="font-size: 2.2rem; margin-bottom: 0.6rem; color: #93c5fd;"></i>
                <h4 style="color: #334155; font-weight: 700; margin-bottom: 0.25rem;">No Active Print Orders</h4>
                <p style="margin: 0; font-size: 0.82rem;">Upload your assignment or lecture notes above to get a pickup PIN!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => {
        const status = job.status || 'Received';
        let badgeBg = '#fef3c7';
        let badgeColor = '#92400e';
        let statusIcon = 'fa-solid fa-hourglass-start';

        if (status === 'Printing') {
            badgeBg = '#e0f2fe';
            badgeColor = '#0369a1';
            statusIcon = 'fa-solid fa-gear fa-spin';
        } else if (status === 'Ready' || status === 'Ready for Pickup') {
            badgeBg = '#dcfce7';
            badgeColor = '#15803d';
            statusIcon = 'fa-solid fa-circle-check';
        } else if (status === 'Completed') {
            badgeBg = '#f1f5f9';
            badgeColor = '#475569';
            statusIcon = 'fa-solid fa-check-double';
        }

        const dateStr = job.createdAt ? new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
        const docName = job.originalFilename || job.filename || 'Document.pdf';
        const bindingName = job.binding === 'spiral' ? 'Spiral Binding' : (job.binding === 'hardcover' ? 'Hardcover' : 'Corner Stapled');

        return `
            <div class="card" style="padding: 1.25rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem;">
                        <span style="font-weight: 800; font-size: 0.88rem; color: #0284c7;">
                            #${job.jobId || 'PRNT'}
                        </span>
                        <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="${statusIcon}"></i> ${status}
                        </span>
                    </div>

                    <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; word-break: break-all;">
                        📄 ${docName}
                    </h4>

                    <div style="font-size: 0.76rem; color: #64748b; margin-bottom: 0.85rem; line-height: 1.4;">
                        ${job.pageCount || job.pages || 1} pages &bull; ${job.copies || 1} copy &bull; ${bindingName}
                    </div>

                    <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
                        <div>
                            <div style="font-size: 0.68rem; font-weight: 800; color: #64748b; text-transform: uppercase;">COUNTER PICKUP PIN</div>
                            <div style="font-family: monospace; font-size: 1.3rem; font-weight: 900; letter-spacing: 3px; color: #0284c7;">${job.pickupOtp || '----'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.7rem; color: #64748b;">Amount</div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">₹${job.totalAmount || 0}</div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 0.65rem;">
                    <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                    <span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-location-dot"></i> Gate 1 Stationery</span>
                </div>
            </div>
        `;
    }).join('');
}
