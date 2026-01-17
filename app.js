// Import API functions
import { getProfiles, createProfile, getBoxes, getBox, createBox } from './api.js';

// State management
let currentPhotoFile = null; // Store file for API upload
let currentPhotoData = null; // Store data URL for preview
let boxes = [];
let currentBoxId = null;
let currentProfile = null;
let profiles = [];
let isSubmitting = false; // Prevent double submission

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfiles();
    await loadBoxes();
    setupEventListeners();
    
    // Check if profile is selected (from sessionStorage for current session)
    const savedProfile = sessionStorage.getItem('currentProfile');
    if (savedProfile && profiles.includes(savedProfile)) {
        currentProfile = savedProfile;
        checkRoute();
    } else {
        showProfileScreen();
    }
});

// Profile Management - API-based
async function loadProfiles() {
    try {
        profiles = await getProfiles();
        renderProfiles();
    } catch (error) {
        console.error('Failed to load profiles:', error);
        profiles = [];
        renderProfiles();
    }
}

async function addProfile(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    
    try {
        await createProfile(trimmed);
        await loadProfiles(); // Reload profiles
        return trimmed;
    } catch (error) {
        console.error('Failed to create profile:', error);
        alert('Failed to create profile: ' + error.message);
        return null;
    }
}

function selectProfile(name) {
    currentProfile = name;
    sessionStorage.setItem('currentProfile', name);
    showHomeScreen();
}

// Make selectProfile globally available
window.selectProfile = selectProfile;

function renderProfiles() {
    const list = document.getElementById('profiles-list');
    if (profiles.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--secondary-color); padding: 1rem;">No profiles yet. Add one below.</p>';
        return;
    }
    
    list.innerHTML = profiles.map(name => `
        <button class="profile-button" onclick="selectProfile('${name.replace(/'/g, "\\'")}')">${escapeHtml(name)}</button>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load boxes from API
async function loadBoxes() {
    try {
        boxes = await getBoxes();
    } catch (error) {
        console.error('Failed to load boxes:', error);
        boxes = [];
    }
}

// Generate next box ID - get from API
async function getNextBoxId() {
    await loadBoxes(); // Refresh boxes list
    const lastId = boxes.length > 0 
        ? parseInt(boxes[boxes.length - 1].box_id.replace('BOX-', ''))
        : 0;
    const nextNum = lastId + 1;
    return `BOX-${String(nextNum).padStart(6, '0')}`;
}

// Setup event listeners
function setupEventListeners() {
    // Profile screen
    document.getElementById('add-profile-btn').addEventListener('click', async () => {
        const input = document.getElementById('new-profile-name');
        const name = await addProfile(input.value);
        if (name) {
            input.value = '';
            selectProfile(name);
        }
    });
    
    document.getElementById('new-profile-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('add-profile-btn').click();
        }
    });
    
    // Home screen
    document.getElementById('create-label-btn').addEventListener('click', () => {
        showScreen('capture-screen');
        resetForm();
    });
    
    document.getElementById('view-boxes-btn').addEventListener('click', async () => {
        showScreen('list-screen');
        await loadBoxes();
        renderBoxList();
        window.location.hash = '#/list';
    });
    
    document.getElementById('switch-profile-btn').addEventListener('click', () => {
        showProfileScreen();
    });
    
    // Capture screen
    document.getElementById('back-to-home').addEventListener('click', () => {
        showHomeScreen();
    });
    
    // Camera/Photo
    document.getElementById('camera-btn').addEventListener('click', () => {
        document.getElementById('photo-input').click();
    });
    
    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('upload-input').click();
    });
    
    document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);
    document.getElementById('upload-input').addEventListener('change', handlePhotoSelect);
    document.getElementById('retake-photo').addEventListener('click', retakePhoto);

    // Custom room checkbox handling
    document.getElementById('from-room-custom-check').addEventListener('change', (e) => {
        const customInput = document.getElementById('from-room-custom-input');
        if (e.target.checked) {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = '';
        }
        updateSaveButton();
    });
    
    document.getElementById('to-room-custom-check').addEventListener('change', (e) => {
        const customInput = document.getElementById('to-room-custom-input');
        if (e.target.checked) {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = '';
        }
        updateSaveButton();
    });
    
    // Update save button when custom inputs change
    document.getElementById('from-room-custom-input').addEventListener('input', updateSaveButton);
    document.getElementById('to-room-custom-input').addEventListener('input', updateSaveButton);
    
    // Room checkbox change handlers - use event delegation since checkboxes are in the form
    document.getElementById('box-form').addEventListener('change', (e) => {
        if (e.target.name === 'from-room' || e.target.name === 'to-room') {
            updateSaveButton();
        }
    });

    // Form submission
    const form = document.getElementById('box-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('Form submit listener attached');
    } else {
        console.error('Form not found!');
    }
    
    // Prevent double submission - remove direct button click handler
    // The form submit handler will take care of it
    
    // Photo requirement check
    document.getElementById('photo-input').addEventListener('change', updateSaveButton);
    document.getElementById('upload-input').addEventListener('change', updateSaveButton);

    // Print screen
    document.getElementById('back-to-capture').addEventListener('click', () => {
        showScreen('capture-screen');
        resetForm();
    });
    
    document.getElementById('new-box-btn').addEventListener('click', () => {
        showScreen('capture-screen');
        resetForm();
    });
    
    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });

    // List screen
    document.getElementById('back-to-home-from-list').addEventListener('click', () => {
        showHomeScreen();
    });
    
    // Detail screen
    document.getElementById('back-to-list').addEventListener('click', () => {
        showScreen('list-screen');
        renderBoxList();
        window.location.hash = '#/list';
    });
    
    // Hash change handler for routing
    window.addEventListener('hashchange', checkRoute);
}

// Update save button state
function updateSaveButton() {
    const saveBtn = document.getElementById('save-btn');
    const hasPhoto = currentPhotoData !== null;
    const fromRooms = getSelectedRooms('from-room');
    const toRooms = getSelectedRooms('to-room');
    saveBtn.disabled = !(hasPhoto && fromRooms.length > 0 && toRooms.length > 0);
}

// Get selected rooms
function getSelectedRooms(roomType) {
    const selected = [];
    document.querySelectorAll(`input[name="${roomType}"]:checked`).forEach(checkbox => {
        if (checkbox.value === 'Custom') {
            const customValue = document.getElementById(`${roomType}-custom-input`).value.trim();
            if (customValue) {
                selected.push(customValue);
            }
        } else {
            selected.push(checkbox.value);
        }
    });
    return selected;
}

// Handle photo selection
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentPhotoFile = file; // Store file for API upload

    const reader = new FileReader();
    reader.onload = (event) => {
        currentPhotoData = event.target.result;
        displayPhotoPreview(currentPhotoData);
        updateSaveButton();
    };
    reader.readAsDataURL(file);
}

// Display photo preview
function displayPhotoPreview(dataUrl) {
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('photo-placeholder');
    const img = document.getElementById('preview-img');
    
    img.src = dataUrl;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
}

// Retake photo
function retakePhoto() {
    currentPhotoData = null;
    currentPhotoFile = null;
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('photo-placeholder').classList.remove('hidden');
    document.getElementById('photo-input').value = '';
    document.getElementById('upload-input').value = '';
    updateSaveButton();
}

// Compress image to reduce localStorage size
function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to compressed data URL
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.onerror = () => resolve(dataUrl); // Return original if compression fails
        img.src = dataUrl;
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
        console.log('Form submission already in progress');
        return;
    }
    
    isSubmitting = true;
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }
    
    console.log('Form submitted!', { currentProfile, currentPhotoData });
    
    if (!currentProfile) {
        isSubmitting = false;
        if (saveBtn) saveBtn.disabled = false;
        alert('Please select a profile first');
        showProfileScreen();
        return;
    }
    
    // Validate required fields
    if (!currentPhotoData) {
        isSubmitting = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Generate Labels';
        }
        alert('Please take or upload a photo');
        return;
    }
    
    const fromRooms = getSelectedRooms('from-room');
    const toRooms = getSelectedRooms('to-room');
    
    if (fromRooms.length === 0) {
        isSubmitting = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Generate Labels';
        }
        alert('Please select at least one "From Room"');
        return;
    }
    
    if (toRooms.length === 0) {
        isSubmitting = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Generate Labels';
        }
        alert('Please select at least one "To Room"');
        return;
    }
    
    try {
        const boxId = await getNextBoxId();
        const description = document.getElementById('description').value.trim();
        const dateCreated = new Date().toISOString().split('T')[0];

        // Compress image before sending (base64 in JSON)
        console.log('Compressing image...');
        const compressedPhoto = await compressImage(currentPhotoData);
        console.log('Image compressed');
        
        // Create box via API - send base64 photo data in JSON
        const boxData = {
            box_id: boxId,
            photo_path: compressedPhoto, // Send base64 data URL
            short_description: description || 'No description',
            from_room: fromRooms.join(', '),
            to_room: toRooms.join(', '),
            date_created: dateCreated,
            packed_by: currentProfile
        };

        console.log('Creating box via API...');
        const result = await createBox(boxData);
        console.log('Box created:', result);

        // QR PAYLOAD - SINGLE SOURCE OF TRUTH
        // Use the server's base URL for QR codes
        const qrPayload = `${window.location.origin}/box/${boxId}`;
        
        // Validate QR payload
        console.assert(
            typeof qrPayload === 'string' && qrPayload.startsWith('http'),
            'QR payload must be absolute URL'
        );
        console.log('QR Payload:', qrPayload);

        // Fetch the created box to get full data including photo URL
        const box = await getBox(boxId);
        currentBoxId = boxId;

        // Reload boxes list
        await loadBoxes();

        // Generate labels and show print screen
        // Pass the exact qrPayload (single source of truth) to generateLabels
        await generateLabels(box, qrPayload);
        console.log('Labels generated, switching to print screen');
        
        // Switch to print screen - this must happen after labels are generated
        const printScreen = document.getElementById('print-screen');
        if (printScreen) {
            // Hide all screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            });
            // Show print screen
            printScreen.classList.remove('hidden');
            printScreen.classList.add('active');
            console.log('Screen switched to print-screen successfully');
        } else {
            console.error('Print screen element not found!');
            alert('Error: Could not find print screen. Please refresh the page.');
        }
        
        // Reset submission flag after successful completion
        isSubmitting = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Generate Labels';
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        isSubmitting = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Generate Labels';
        }
        
        if (error.name === 'QuotaExceededError') {
            alert('Storage is full. Please delete some old boxes or clear your browser storage.');
        } else {
            alert('An error occurred: ' + error.message);
        }
    }
}

// Generate QR code and labels
async function generateLabels(box, qrPayload) {
    try {
        const container = document.getElementById('labels-container');
        if (!container) {
            throw new Error('Labels container not found');
        }
        
        container.innerHTML = '';

        // Generate QR code using the exact payload string (single source of truth)
        const payloadToUse = qrPayload;
        console.log('Generating QR code with payload:', payloadToUse);
        console.assert(
            typeof payloadToUse === 'string' && payloadToUse.startsWith('http'),
            'QR payload must be absolute URL'
        );
        const qrDataUrl = await generateQRCode(payloadToUse);
        
        // Create preview (not for printing)
        const preview = document.createElement('div');
        preview.className = 'label-preview';
        preview.innerHTML = `
            <h3>Label Preview (${box.box_id})</h3>
            <p><strong>${box.date_created}</strong> | ${box.from_room} → ${box.to_room}</p>
            <p>${box.short_description}</p>
            <p style="font-size: 0.85rem; color: #666;">Packed by: ${box.packed_by}</p>
            <p style="font-size: 0.75rem; color: #999; font-family: monospace; word-break: break-all;">QR: ${payloadToUse}</p>
        `;
        container.appendChild(preview);

        // Generate printable labels (3 per box, left column only)
        // Pass the exact qrPayload so it can be displayed in debug mode
        // Use box.photo_url for the image (from API)
        generatePrintLabels(box, qrDataUrl, payloadToUse);
    } catch (error) {
        console.error('Error generating labels:', error);
        throw error;
    }
}

// Generate QR code using qrcodejs library
function generateQRCode(url) {
    return new Promise((resolve, reject) => {
        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            reject(new Error('QR code library failed to load. Please refresh the page.'));
            return;
        }
        
        try {
            // Ensure document.body exists
            if (!document.body) {
                reject(new Error('Document body not available'));
                return;
            }
            
            // Create a temporary div element for QR code rendering
            const tempDiv = document.createElement('div');
            if (!tempDiv || typeof tempDiv.appendChild !== 'function') {
                reject(new Error('Failed to create DOM element'));
                return;
            }
            
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '160px';  // Final pixel size - DO NOT SCALE
            tempDiv.style.height = '160px'; // Final pixel size - DO NOT SCALE
            document.body.appendChild(tempDiv);
            
            // Verify it's actually in the DOM
            if (!tempDiv.parentNode) {
                reject(new Error('Failed to append element to DOM'));
                return;
            }
            
            // Create QR code - first param MUST be the DOM element, second is options
            // Render at final pixel size (160px) with error correction level H
            // Use the EXACT payload string passed in
            let qrCode;
            try {
                // Verify QRCode is a constructor function
                if (typeof QRCode !== 'function') {
                    throw new Error('QRCode is not a function');
                }
                
                // Verify url is the exact payload string
                console.log('QRCode constructor called with text:', url);
                
                qrCode = new QRCode(tempDiv, {
                    text: url, // Exact payload string - single source of truth
                    width: 160,  // Final pixel size - no CSS scaling
                    height: 160, // Final pixel size - no CSS scaling
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H  // High error correction
                });
            } catch (qrError) {
                if (tempDiv.parentNode) {
                    document.body.removeChild(tempDiv);
                }
                console.error('QRCode constructor error:', qrError);
                reject(new Error('Failed to create QR code: ' + qrError.message));
                return;
            }
            
            // Wait for QR code to render
            setTimeout(() => {
                try {
                    // Try to find canvas element first (preferred)
                    let canvas = tempDiv.querySelector('canvas');
                    let dataUrl;
                    
                    if (canvas && canvas.getContext) {
                        dataUrl = canvas.toDataURL('image/png');
                    } else {
                        // Fallback: try to find img element
                        const img = tempDiv.querySelector('img');
                        if (img) {
                            // Wait for image to load if needed
                            if (img.complete && img.src) {
                                if (img.src.startsWith('data:')) {
                                    dataUrl = img.src;
                                } else {
                                    // Create canvas from img
                                    canvas = document.createElement('canvas');
                                    canvas.width = 300;
                                    canvas.height = 300;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0);
                                    dataUrl = canvas.toDataURL('image/png');
                                }
                            } else {
                                img.onload = () => {
                                    canvas = document.createElement('canvas');
                                    canvas.width = 300;
                                    canvas.height = 300;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0);
                                    dataUrl = canvas.toDataURL('image/png');
                                    document.body.removeChild(tempDiv);
                                    resolve(dataUrl);
                                };
                                img.onerror = () => {
                                    document.body.removeChild(tempDiv);
                                    reject(new Error('Failed to load QR code image'));
                                };
                                return; // Exit early, will resolve/reject in onload/onerror
                            }
                        }
                    }
                    
                    if (dataUrl) {
                        document.body.removeChild(tempDiv);
                        resolve(dataUrl);
                    } else {
                        document.body.removeChild(tempDiv);
                        reject(new Error('Failed to generate QR code: no canvas or image found'));
                    }
                } catch (error) {
                    if (tempDiv.parentNode) {
                        document.body.removeChild(tempDiv);
                    }
                    console.error('Error extracting QR code:', error);
                    reject(error);
                }
            }, 300); // Increased timeout to ensure rendering completes
        } catch (error) {
            console.error('QR code generation exception:', error);
            reject(error);
        }
    });
}

// Generate printable label HTML
function generatePrintLabels(box, qrDataUrl, qrPayload) {
    // Remove any existing print labels
    const existing = document.querySelectorAll('.label-sheet');
    existing.forEach(el => el.remove());

    // Create label sheet container
    const sheet = document.createElement('div');
    sheet.className = 'label-sheet';

    // Create 3 identical labels (left column only)
    // Pass the exact qrPayload for debug display
    for (let i = 0; i < 3; i++) {
        const label = createLabelElement(box, qrDataUrl, qrPayload);
        sheet.appendChild(label);
    }

    document.body.appendChild(sheet);
}

// Create label element
function createLabelElement(box, qrDataUrl, qrPayload) {
    const label = document.createElement('div');
    label.className = 'label';
    
    const truncateDesc = box.short_description.length > 50 
        ? box.short_description.substring(0, 47) + '...'
        : box.short_description;

    // Extract box number - show just the last 3 digits (e.g., "BOX-000001" -> "001")
    const fullNumber = box.box_id.replace('BOX-', '');
    const boxNumber = fullNumber.slice(-3); // Get last 3 digits

    // QR DEBUG MODE: Display the exact payload string used for QR generation
    // This is the single source of truth - same string used for both QR and display
    // Use photo_url from API if available, otherwise fall back to photo_path
    const photoUrl = box.photo_url || box.photo_path;

    label.innerHTML = `
        <div class="label-header">
            <span class="box-number">${boxNumber}</span>
            <span class="room-flow">${box.from_room} → ${box.to_room}</span>
        </div>
        <div class="label-description">${truncateDesc}</div>
        <div class="media-row">
            <img src="${photoUrl}" alt="Box contents" class="label-photo">
            <div class="label-qr">
                <img src="${qrDataUrl}" alt="QR Code">
            </div>
        </div>
        <div class="qr-debug">
            <span class="qr-debug-label">QR:</span>
            <span class="qr-debug-value">${qrPayload}</span>
        </div>
        <div class="label-footer">
            <span>${box.date_created}</span>
            <span>Packed by: ${box.packed_by}</span>
        </div>
    `;
    
    return label;
}

// Show specific screen
function showScreen(screenId) {
    console.log('showScreen called with:', screenId);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.classList.add('active');
        console.log('Screen switched to:', screenId, targetScreen.className);
    } else {
        console.error('Screen not found:', screenId);
    }
}

function showProfileScreen() {
    renderProfiles();
    showScreen('profile-screen');
    window.location.hash = '';
}

function showHomeScreen() {
    showScreen('home-screen');
    window.location.hash = '';
}

// Reset form
function resetForm() {
    document.getElementById('box-form').reset();
    retakePhoto();
    currentBoxId = null;
    
    // Reset custom inputs
    document.getElementById('from-room-custom-input').classList.add('hidden');
    document.getElementById('to-room-custom-input').classList.add('hidden');
    document.getElementById('from-room-custom-input').value = '';
    document.getElementById('to-room-custom-input').value = '';
}

// Check route (for QR code scanning)
function checkRoute() {
    if (!currentProfile) {
        showProfileScreen();
        return;
    }
    
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Don't override if we're on print screen or capture screen
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && (activeScreen.id === 'print-screen' || activeScreen.id === 'capture-screen')) {
        return; // Keep current screen
    }
    
    // Handle /box/{boxId} path (from QR code scan)
    const boxMatch = path.match(/\/box\/(.+)/);
    if (boxMatch) {
        const boxId = boxMatch[1];
        showBoxDetail(boxId);
        return;
    }
    
    // Handle hash-based routing (for navigation within app)
    if (hash.startsWith('#/box/')) {
        const boxId = hash.replace('#/box/', '');
        showBoxDetail(boxId);
    } else if (hash === '#/list') {
        showScreen('list-screen');
        renderBoxList();
    } else {
        // Default to home screen
        if (!activeScreen || (activeScreen.id !== 'print-screen' && activeScreen.id !== 'capture-screen')) {
            showHomeScreen();
        }
    }
}

// Show box detail (QR scan result)
window.showBoxDetail = async (boxId) => {
    try {
        // Fetch box from API
        const box = await getBox(boxId);
        
        showScreen('detail-screen');
        // Update URL to match QR code format /box/{boxId}
        if (!window.location.pathname.match(/\/box\/.+$/)) {
            const basePath = window.location.pathname.replace(/\/[^\/]*$/, '') || '';
            window.history.pushState({}, '', `${basePath}/box/${boxId}`);
        }
        document.getElementById('detail-box-id').textContent = boxId;
        
        const content = document.getElementById('box-detail-content');
        const photoUrl = box.photo_url || box.photo_path;
        content.innerHTML = `
            <div class="detail-photo">
                <img src="${photoUrl}" alt="Box contents">
            </div>
            <div class="detail-info">
                <div class="detail-info-item">
                    <div class="detail-info-label">Description</div>
                    <div class="detail-info-value">${box.short_description}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">From Room(s)</div>
                    <div class="detail-info-value">${box.from_room}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">To Room(s)</div>
                    <div class="detail-info-value">${box.to_room}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">Date Packed</div>
                    <div class="detail-info-value">${box.date_created}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">Packed By</div>
                    <div class="detail-info-value">${box.packed_by}</div>
                </div>
            </div>
        `;
    } catch (error) {
        showHomeScreen();
        alert('Box not found: ' + error.message);
        if (window.location.pathname.startsWith('/box/')) {
            window.history.pushState({}, '', window.location.pathname.replace(/\/box\/.*/, ''));
        } else {
            window.location.hash = '';
        }
    }
};

// Render box list
function renderBoxList() {
    const list = document.getElementById('boxes-list');
    
    if (boxes.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No boxes created yet.</p>';
        return;
    }

    list.innerHTML = boxes.map(box => `
        <div class="box-card" onclick="showBoxDetail('${box.box_id}')">
            <div class="box-card-header">
                <span class="box-id">${box.box_id}</span>
                <span class="box-date">${box.date_created}</span>
            </div>
            <div class="box-description">${box.short_description}</div>
            <div class="box-rooms">${box.from_room} → ${box.to_room}</div>
        </div>
    `).join('');
}
