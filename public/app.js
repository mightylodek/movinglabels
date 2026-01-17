// Import API functions
import { getProfiles, createProfile, getBoxes, getBox, createBox, updateBox, deleteBox as deleteBoxAPI, restoreBox } from './api.js';

// Base URL for QR codes - loaded from server configuration
let QR_BASE_URL = window.location.origin; // Default to current origin

// State management
let currentPhotoFile = null; // Store file for API upload
let currentPhotoData = null; // Store data URL for preview
let boxes = [];
let currentBoxId = null;
let currentProfile = null;
let profiles = [];
let isSubmitting = false; // Prevent double submission
let showDeletedBoxes = false; // Toggle for showing deleted boxes
let previousScreen = null; // Track previous screen for back navigation
let selectedBoxIds = new Set(); // Track selected boxes for bulk printing

// Load QR_BASE_URL from server configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        if (config.qrBaseUrl) {
            QR_BASE_URL = config.qrBaseUrl;
            console.log('QR Base URL loaded from server:', QR_BASE_URL);
        }
    } catch (error) {
        console.warn('Failed to load config, using default:', error);
        // Keep default value (window.location.origin)
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();
    
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
    if (!trimmed) {
        alert('Please enter a name');
        return null;
    }
    
    try {
        console.log('Creating profile:', trimmed);
        const result = await createProfile(trimmed);
        console.log('Profile created successfully:', result);
        await loadProfiles(); // Reload profiles
        return trimmed;
    } catch (error) {
        console.error('Failed to create profile:', error);
        const errorMsg = error.message || 'Unknown error occurred';
        alert('Failed to create profile: ' + errorMsg);
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
    if (!boxes || boxes.length === 0) {
        return 'BOX-000001';
    }
    const lastBox = boxes[boxes.length - 1];
    if (!lastBox || !lastBox.box_id) {
        return 'BOX-000001';
    }
    const lastId = parseInt(lastBox.box_id.replace('BOX-', '')) || 0;
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
    document.getElementById('create-label-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('capture-screen');
        resetForm();
    });
    
    document.getElementById('view-boxes-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        previousScreen = 'home-screen';
        selectedBoxIds.clear(); // Clear selections when entering grid view
        // Temporarily remove hashchange listener to prevent checkRoute from interfering
        window.removeEventListener('hashchange', checkRoute);
        showScreen('grid-screen');
        await loadBoxes();
        renderBoxGrid();
        window.location.hash = '#/grid';
        // Re-add listener after a short delay
        setTimeout(() => {
            window.addEventListener('hashchange', checkRoute);
        }, 100);
    });
    
    document.getElementById('list-boxes-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        previousScreen = 'home-screen';
        selectedBoxIds.clear(); // Clear selections when switching views
        // Temporarily remove hashchange listener to prevent checkRoute from interfering
        window.removeEventListener('hashchange', checkRoute);
        showScreen('list-screen');
        await loadBoxes();
        renderBoxList();
        window.location.hash = '#/list';
        // Re-add listener after a short delay
        setTimeout(() => {
            window.addEventListener('hashchange', checkRoute);
        }, 100);
    });
    
    document.getElementById('back-to-home-from-grid').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        selectedBoxIds.clear(); // Clear selections when leaving
        showHomeScreen();
    });
    
    document.getElementById('print-selected-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await printSelectedBoxes();
    });
    
    document.getElementById('switch-profile-btn').addEventListener('click', () => {
        showProfileScreen();
    });
    
    // Capture screen
    document.getElementById('back-to-home').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
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
    document.getElementById('back-to-list').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Go back to previous screen (list, grid, or home)
        if (previousScreen === 'list-screen' || window.location.hash === '#/list') {
            previousScreen = null;
            window.removeEventListener('hashchange', checkRoute);
            showScreen('list-screen');
            renderBoxList();
            window.location.hash = '#/list';
            setTimeout(() => {
                window.addEventListener('hashchange', checkRoute);
            }, 100);
        } else if (previousScreen === 'grid-screen' || window.location.hash === '#/grid') {
            previousScreen = null;
            window.removeEventListener('hashchange', checkRoute);
            showScreen('grid-screen');
            renderBoxGrid();
            window.location.hash = '#/grid';
            setTimeout(() => {
                window.addEventListener('hashchange', checkRoute);
            }, 100);
        } else {
            previousScreen = null;
            showHomeScreen();
        }
    });
    
    // Edit screen
    document.getElementById('back-to-detail').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (window.currentDetailBoxId) {
            // Preserve the previous screen context when going back to detail
            const savedPreviousScreen = previousScreen;
            showBoxDetail(window.currentDetailBoxId);
            previousScreen = savedPreviousScreen; // Restore it since showBoxDetail will overwrite it
        } else {
            // Default to list screen if no detail box ID
            if (previousScreen === 'grid-screen' || window.location.hash === '#/grid') {
                showScreen('grid-screen');
                renderBoxGrid();
            } else {
                showScreen('list-screen');
            }
        }
    });
    
    // Edit screen photo handlers
    document.getElementById('edit-camera-btn').addEventListener('click', () => {
        document.getElementById('edit-photo-input').click();
    });
    
    document.getElementById('edit-upload-btn').addEventListener('click', () => {
        document.getElementById('edit-upload-input').click();
    });
    
    document.getElementById('edit-photo-input').addEventListener('change', (e) => handleEditPhotoSelect(e));
    document.getElementById('edit-upload-input').addEventListener('change', (e) => handleEditPhotoSelect(e));
    document.getElementById('edit-change-photo').addEventListener('click', () => {
        document.getElementById('edit-photo-preview').classList.add('hidden');
        document.getElementById('edit-photo-placeholder').classList.remove('hidden');
        window.editPhotoData = null;
        updateEditSaveButton();
    });
    
    // Edit screen custom room checkboxes
    document.getElementById('edit-from-room-custom-check').addEventListener('change', (e) => {
        const customInput = document.getElementById('edit-from-room-custom-input');
        if (e.target.checked) {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = '';
        }
        updateEditSaveButton();
    });
    
    document.getElementById('edit-to-room-custom-check').addEventListener('change', (e) => {
        const customInput = document.getElementById('edit-to-room-custom-input');
        if (e.target.checked) {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = '';
        }
        updateEditSaveButton();
    });
    
    document.getElementById('edit-from-room-custom-input').addEventListener('input', updateEditSaveButton);
    document.getElementById('edit-to-room-custom-input').addEventListener('input', updateEditSaveButton);
    
    // Edit form checkbox handlers
    document.getElementById('edit-box-form').addEventListener('change', (e) => {
        if (e.target.name === 'edit-from-room' || e.target.name === 'edit-to-room') {
            updateEditSaveButton();
        }
    });
    
    // Edit form submission
    document.getElementById('edit-box-form').addEventListener('submit', handleEditFormSubmit);
    
    // Hash change handler for routing
    window.addEventListener('hashchange', checkRoute);
    
    // Search input handler for real-time filtering
    const searchInput = document.getElementById('box-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    searchInput.addEventListener('input', (e) => {
        filterBoxes(e.target.value);
        updateClearButtonVisibility(e.target.value);
    });
    
    // Clear search button handler
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = '';
            searchInput.focus();
            filterBoxes('');
            updateClearButtonVisibility('');
        });
    }
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
        const qrPayload = `${QR_BASE_URL}/box/${boxId}`;
        
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

// Generate printable label HTML for a single box (3 labels, left column)
function generatePrintLabels(box, qrDataUrl, qrPayload) {
    // Remove any existing print labels
    const existing = document.querySelectorAll('.label-sheet');
    existing.forEach(el => el.remove());

    // Create sheet container with exactly 3 labels using absolute positioning
    const sheet = document.createElement('div');
    sheet.className = 'label-sheet';
    
    // Create 3 identical labels with slot classes for absolute positioning (left column)
    for (let i = 1; i <= 3; i++) {
        const label = createLabelElement(box, qrDataUrl, qrPayload);
        label.classList.add('left', `slot-${i}`);
        sheet.appendChild(label);
    }
    
    document.body.appendChild(sheet);
}

// Generate printable labels for multiple boxes using left and right columns
// Each box gets 3 labels - positioned on left column OR right column
async function generatePrintLabelsForMultiple(selectedBoxIdsArray) {
    // Remove any existing print labels
    const existing = document.querySelectorAll('.label-sheet');
    existing.forEach(el => el.remove());
    
    if (selectedBoxIdsArray.length === 0) {
        alert('No boxes selected');
        return;
    }
    
    // Fetch all selected boxes
    const selectedBoxes = [];
    for (const boxId of selectedBoxIdsArray) {
        try {
            const box = await getBox(boxId);
            selectedBoxes.push(box);
        } catch (error) {
            console.error(`Failed to fetch box ${boxId}:`, error);
        }
    }
    
    if (selectedBoxes.length === 0) {
        alert('Failed to load selected boxes');
        return;
    }
    
    // Process boxes: each box gets 3 labels
    // Box 1: left column (slot-1, slot-2, slot-3)
    // Box 2: right column (slot-1, slot-2, slot-3)
    // Box 3: left column (slot-1, slot-2, slot-3) - new sheet
    // Box 4: right column (slot-1, slot-2, slot-3) - same sheet
    // etc.
    // Each sheet can hold 2 boxes (one on left, one on right), each with 3 labels
    
    const boxesPerSheet = 2;
    const numSheets = Math.ceil(selectedBoxes.length / boxesPerSheet);
    
    for (let sheetIndex = 0; sheetIndex < numSheets; sheetIndex++) {
        const sheet = document.createElement('div');
        sheet.className = 'label-sheet';
        
        const startIndex = sheetIndex * boxesPerSheet;
        const endIndex = Math.min(startIndex + boxesPerSheet, selectedBoxes.length);
        const boxesForThisSheet = selectedBoxes.slice(startIndex, endIndex);
        
        // First box on left column, second box on right column
        for (let boxIndex = 0; boxIndex < boxesForThisSheet.length; boxIndex++) {
            const box = boxesForThisSheet[boxIndex];
            const qrPayload = `${QR_BASE_URL}/box/${box.box_id}`;
            const qrDataUrl = await generateQRCode(qrPayload);
            
            // Determine column: first box = left, second box = right
            const isLeftColumn = boxIndex === 0;
            
            // Create 3 labels for this box
            for (let slotNumber = 1; slotNumber <= 3; slotNumber++) {
                const label = createLabelElement(box, qrDataUrl, qrPayload);
                
                if (isLeftColumn) {
                    label.classList.add('left', `slot-${slotNumber}`);
                } else {
                    label.classList.add('right', `slot-${slotNumber}`);
                }
                
                sheet.appendChild(label);
            }
        }
        
        document.body.appendChild(sheet);
    }
}

// Print selected boxes from grid view
async function printSelectedBoxes() {
    const selectedArray = Array.from(selectedBoxIds);
    
    if (selectedArray.length === 0) {
        alert('Please select at least one box to print');
        return;
    }
    
    try {
        // Switch to print screen
        showScreen('print-screen');
        
        // Generate labels for selected boxes
        await generatePrintLabelsForMultiple(selectedArray);
        
        // Show print info
        const container = document.getElementById('labels-container');
        if (container) {
            const info = document.createElement('div');
            info.className = 'print-info';
            info.innerHTML = `
                <p>Preparing labels for ${selectedArray.length} selected box(es) on Avery 5264 (3⅓" × 4") sheets.</p>
                <p>Labels will be positioned using both left and right columns to maximize sheet usage.</p>
            `;
            container.innerHTML = '';
            container.appendChild(info);
        }
        
        // Trigger print dialog
        setTimeout(() => {
            window.print();
        }, 500);
    } catch (error) {
        console.error('Error printing selected boxes:', error);
        alert('Failed to generate labels: ' + error.message);
    }
}

// Create label element
function createLabelElement(box, qrDataUrl, qrPayload) {
    if (!box || !box.box_id) {
        console.error('Invalid box data:', box);
        throw new Error('Box data is missing or invalid');
    }
    
    const label = document.createElement('div');
    label.className = 'label';
    
    const truncateDesc = (box.short_description || '').length > 50 
        ? (box.short_description || '').substring(0, 47) + '...'
        : (box.short_description || '');

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
    
    // Prioritize hash-based routing (for navigation within app) over pathname
    // This prevents pathname from overriding when user clicks navigation buttons
    if (hash === '#/list') {
        showScreen('list-screen');
        renderBoxList();
        return;
    } else if (hash === '#/grid') {
        selectedBoxIds.clear(); // Clear selections when routing to grid
        showScreen('grid-screen');
        renderBoxGrid();
        return;
    } else if (hash.startsWith('#/box/')) {
        const boxId = hash.replace('#/box/', '');
        showBoxDetail(boxId);
        return;
    }
    
    // Only check pathname if there's no hash (or empty hash)
    // Handle /box/{boxId} path (from QR code scan)
    if (!hash || hash === '#') {
        const boxMatch = path.match(/\/box\/(.+)/);
        if (boxMatch) {
            const boxId = boxMatch[1];
            // When coming from pathname (QR scan), set previous to home
            previousScreen = 'home-screen';
            showBoxDetail(boxId);
            return;
        }
    }
    
    // Default to home screen if no specific route
    if (!activeScreen || (activeScreen.id !== 'print-screen' && activeScreen.id !== 'capture-screen')) {
        showHomeScreen();
    }
}

// Show box detail (QR scan result)
window.showBoxDetail = async (boxId) => {
    try {
        // Store previous screen before navigating
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            previousScreen = activeScreen.id;
        }
        
        // Fetch box from API
        const box = await getBox(boxId);
        
        showScreen('detail-screen');
        // Update hash to match navigation format (not pathname to avoid conflicts)
        window.removeEventListener('hashchange', checkRoute);
        window.location.hash = `#/box/${boxId}`;
        setTimeout(() => {
            window.addEventListener('hashchange', checkRoute);
        }, 100);
        document.getElementById('detail-box-id').textContent = boxId;
        
        // Store current box for editing
        window.currentDetailBox = box;
        window.currentDetailBoxId = boxId;
        
        const content = document.getElementById('box-detail-content');
        // Use photo_path (base64) if photo_url doesn't exist, fallback to empty string
        const photoUrl = box.photo_url || box.photo_path || '';
        if (!photoUrl) {
            console.warn('Box has no photo_path or photo_url:', box);
        }
        content.innerHTML = `
            <div class="detail-photo">
                <img src="${photoUrl}" alt="Box contents" onerror="this.style.display='none';">
            </div>
            <div class="detail-info">
                <div class="detail-info-item">
                    <div class="detail-info-label">Description</div>
                    <div class="detail-info-value" id="detail-description">${box.short_description}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">From Room(s)</div>
                    <div class="detail-info-value" id="detail-from-room">${box.from_room}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">To Room(s)</div>
                    <div class="detail-info-value" id="detail-to-room">${box.to_room}</div>
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
            <div class="detail-actions">
                <button id="edit-box-btn" class="btn-primary">Edit</button>
                <button id="print-box-btn" class="btn-primary">Print Labels</button>
                <button id="delete-box-btn" class="btn-danger">Delete</button>
            </div>
        `;
        
        // Add event listeners for action buttons (remove old listeners first)
        const editBtn = document.getElementById('edit-box-btn');
        const printBtn = document.getElementById('print-box-btn');
        const deleteBtn = document.getElementById('delete-box-btn');
        
        // Clone and replace to remove old event listeners
        const newEditBtn = editBtn.cloneNode(true);
        const newPrintBtn = printBtn.cloneNode(true);
        const newDeleteBtn = deleteBtn.cloneNode(true);
        
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        
        // Add fresh event listeners
        newEditBtn.addEventListener('click', () => editBox(boxId, box));
        newPrintBtn.addEventListener('click', () => printBoxLabels(boxId, box));
        newDeleteBtn.addEventListener('click', () => deleteBox(boxId));
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

// Update clear button visibility based on search input value
function updateClearButtonVisibility(value) {
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        if (value && value.trim().length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    }
}

// Filter boxes based on search query
function filterBoxes(searchQuery) {
    const searchTerm = searchQuery.toLowerCase().trim();
    const searchInput = document.getElementById('box-search-input');
    
    if (!searchTerm) {
        // If search is empty, show all boxes
        renderBoxList();
        updateClearButtonVisibility('');
        return;
    }
    
    // Filter boxes that match the search query
    const filteredActive = boxes.filter(box => {
        if (box.deleted) return false;
        return searchBoxMatches(box, searchTerm);
    });
    
    const filteredDeleted = boxes.filter(box => {
        if (!box.deleted) return false;
        return searchBoxMatches(box, searchTerm);
    });
    
    renderBoxListWithFilter(filteredActive, filteredDeleted);
    updateClearButtonVisibility(searchQuery);
}

// Check if a box matches the search query
function searchBoxMatches(box, searchTerm) {
    // Search across all fields except image
    const searchableFields = [
        box.box_id || '',
        box.short_description || '',
        box.from_room || '',
        box.to_room || '',
        box.date_created || '',
        box.packed_by || '',
        box.date_deleted || ''
    ].map(field => String(field).toLowerCase());
    
    return searchableFields.some(field => field.includes(searchTerm));
}

// Render box grid view (image at top, info below)
function renderBoxGrid() {
    const grid = document.getElementById('boxes-grid');
    if (!grid) return;
    
    // Only show active (non-deleted) boxes in grid view
    const activeBoxes = boxes.filter(box => !box.deleted || box.deleted === false);
    
    if (activeBoxes.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No boxes created yet.</p>';
        updatePrintButtonVisibility();
        return;
    }
    
    const html = activeBoxes.map(box => {
        const photoUrl = box.photo_url || box.photo_path || '';
        const isSelected = selectedBoxIds.has(box.box_id);
        return `
            <div class="grid-box-card ${isSelected ? 'grid-box-card-selected' : ''}">
                <input type="checkbox" 
                       class="grid-box-checkbox" 
                       ${isSelected ? 'checked' : ''} 
                       onclick="event.stopPropagation(); toggleBoxSelection('${box.box_id}');"
                       onchange="event.stopPropagation(); toggleBoxSelection('${box.box_id}');">
                <div class="grid-box-content" onclick="handleGridBoxContentClick(event, '${box.box_id}')">
                    <div class="grid-box-image">
                        ${photoUrl ? `<img src="${photoUrl}" alt="Box ${box.box_id}" onerror="this.style.display='none';">` : '<div class="grid-box-image-placeholder">No Image</div>'}
                    </div>
                    <div class="grid-box-info">
                        <div class="grid-box-id">${box.box_id}</div>
                        <div class="grid-box-description">${box.short_description || 'No description'}</div>
                        <div class="grid-box-rooms">
                            <div class="grid-box-room-row">
                                <span class="grid-box-room-label">From:</span>
                                <span>${box.from_room || 'N/A'}</span>
                            </div>
                            <div class="grid-box-room-row">
                                <span class="grid-box-room-label">To:</span>
                                <span>${box.to_room || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="grid-box-meta">
                            <div class="grid-box-date">${box.date_created || ''}</div>
                            <div class="grid-box-profile">${box.packed_by || 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = html;
    updatePrintButtonVisibility();
}

// Handle grid box content click - open detail view
window.handleGridBoxContentClick = function(event, boxId) {
    // Don't open detail view if clicking on checkbox
    if (event.target.type === 'checkbox' || event.target.closest('.grid-box-checkbox')) {
        return;
    }
    previousScreen = 'grid-screen';
    showBoxDetail(boxId);
};

// Toggle box selection
window.toggleBoxSelection = function(boxId) {
    if (selectedBoxIds.has(boxId)) {
        selectedBoxIds.delete(boxId);
    } else {
        selectedBoxIds.add(boxId);
    }
    renderBoxGrid();
};

// Update print button visibility based on selection
function updatePrintButtonVisibility() {
    const printBtn = document.getElementById('print-selected-btn');
    const countSpan = document.getElementById('selected-count');
    
    if (printBtn && countSpan) {
        const count = selectedBoxIds.size;
        countSpan.textContent = count;
        if (count > 0) {
            printBtn.classList.remove('hidden');
        } else {
            printBtn.classList.add('hidden');
        }
    }
}

// Render box list with optional filtered boxes
function renderBoxList(filteredActive = null, filteredDeleted = null) {
    const list = document.getElementById('boxes-list');
    const searchInput = document.getElementById('box-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    // Use filtered boxes if provided, otherwise filter by search query
    let activeBoxes, deletedBoxes;
    
    if (filteredActive !== null && filteredDeleted !== null) {
        // Use provided filtered results
        activeBoxes = filteredActive;
        deletedBoxes = filteredDeleted;
    } else {
        // Apply search filter if there's a query
        if (searchQuery) {
            activeBoxes = boxes.filter(box => {
                if (box.deleted) return false;
                return searchBoxMatches(box, searchQuery);
            });
            deletedBoxes = boxes.filter(box => {
                if (!box.deleted) return false;
                return searchBoxMatches(box, searchQuery);
            });
        } else {
            // No search query, show all
            activeBoxes = boxes.filter(box => !box.deleted || box.deleted === false);
            deletedBoxes = boxes.filter(box => box.deleted === true);
        }
    }
    
    // Show message if no boxes match
    if (activeBoxes.length === 0 && (!showDeletedBoxes || deletedBoxes.length === 0)) {
        if (searchQuery) {
            list.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No boxes match your search.</p>';
        } else {
            list.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No boxes created yet.</p>';
        }
        return;
    }

    let html = '';
    
    // Render active boxes
    if (activeBoxes.length > 0) {
        html += activeBoxes.map(box => `
            <div class="box-card">
                <div class="box-card-content" onclick="previousScreen='list-screen'; showBoxDetail('${box.box_id}')">
                    <div class="box-card-header">
                        <span class="box-id">${box.box_id}</span>
                        <div class="box-header-right">
                            <span class="box-date">${box.date_created}</span>
                            <span class="box-profile">${box.packed_by || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="box-description">${box.short_description}</div>
                    <div class="box-rooms">${box.from_room} → ${box.to_room}</div>
                </div>
                <button class="box-delete-btn" onclick="event.stopPropagation(); event.preventDefault(); window.deleteBoxFromList('${box.box_id}'); return false;" title="Delete box">
                    🗑️
                </button>
            </div>
        `).join('');
    }
    
    // Render deleted boxes if toggle is on
    if (showDeletedBoxes && deletedBoxes.length > 0) {
        html += '<div class="deleted-boxes-separator"><span>Deleted Boxes</span></div>';
        html += deletedBoxes.map(box => `
            <div class="box-card box-card-deleted">
                <div class="box-card-content" onclick="previousScreen='list-screen'; showBoxDetail('${box.box_id}')">
                    <div class="box-card-header">
                        <span class="box-id">${box.box_id}</span>
                        <div class="box-header-right">
                            <span class="box-date">${box.date_created}${box.date_deleted ? ' (deleted ' + box.date_deleted + ')' : ''}</span>
                            <span class="box-profile">${box.packed_by || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="box-description">${box.short_description}</div>
                    <div class="box-rooms">${box.from_room} → ${box.to_room}</div>
                </div>
                <button class="box-restore-btn" onclick="event.stopPropagation(); event.preventDefault(); window.restoreBoxFromList('${box.box_id}'); return false;" title="Restore box">
                    ♻️
                </button>
            </div>
        `).join('');
    }
    
    // Add toggle button at the end
    html += `
        <div class="show-deleted-toggle">
            <label>
                <input type="checkbox" id="show-deleted-checkbox" ${showDeletedBoxes ? 'checked' : ''}>
                Show deleted boxes (${filteredDeleted !== null ? filteredDeleted.length : deletedBoxes.length})
            </label>
        </div>
    `;
    
    list.innerHTML = html;
    
    // Add event listener to toggle checkbox
    const checkbox = document.getElementById('show-deleted-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            showDeletedBoxes = e.target.checked;
            renderBoxList();
        });
    }
}

// Render with filtered boxes (used by filterBoxes)
function renderBoxListWithFilter(filteredActive, filteredDeleted) {
    renderBoxList(filteredActive, filteredDeleted);
}

// Edit box functionality - show edit screen
async function editBox(boxId, box) {
    // Store box for edit
    window.currentEditBoxId = boxId;
    window.currentEditBox = box;
    window.editPhotoData = box.photo_path || box.photo_url; // Keep existing photo
    
    // Show edit screen
    showScreen('edit-screen');
    document.getElementById('edit-box-id').textContent = `Edit ${boxId}`;
    
    // Populate form with existing data
    document.getElementById('edit-description').value = box.short_description || '';
    
    // Set existing photo
    if (window.editPhotoData) {
        document.getElementById('edit-preview-img').src = window.editPhotoData;
        document.getElementById('edit-photo-preview').classList.remove('hidden');
        document.getElementById('edit-photo-placeholder').classList.add('hidden');
    } else {
        document.getElementById('edit-photo-preview').classList.add('hidden');
        document.getElementById('edit-photo-placeholder').classList.remove('hidden');
    }
    
    // Populate room checkboxes
    populateEditRooms('edit-from-room', box.from_room);
    populateEditRooms('edit-to-room', box.to_room);
    
    // Update save button
    updateEditSaveButton();
}

// Populate room checkboxes from comma-separated string
function populateEditRooms(namePrefix, roomsString) {
    if (!roomsString) return;
    
    const rooms = roomsString.split(',').map(r => r.trim());
    const checkboxes = document.querySelectorAll(`input[name="${namePrefix}"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear custom input
    const customInput = document.getElementById(`${namePrefix}-custom-input`);
    const customCheckbox = document.getElementById(`${namePrefix}-custom-check`);
    customInput.value = '';
    customInput.classList.add('hidden');
    customCheckbox.checked = false;
    
    rooms.forEach(room => {
        // Check if it's a standard room
        const matchingCheckbox = Array.from(checkboxes).find(cb => cb.value === room);
        if (matchingCheckbox) {
            matchingCheckbox.checked = true;
        } else if (room) {
            // It's a custom room
            customCheckbox.checked = true;
            customInput.value = room;
            customInput.classList.remove('hidden');
        }
    });
}

// Handle photo selection for edit screen
function handleEditPhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        window.editPhotoData = event.target.result;
        document.getElementById('edit-preview-img').src = window.editPhotoData;
        document.getElementById('edit-photo-preview').classList.remove('hidden');
        document.getElementById('edit-photo-placeholder').classList.add('hidden');
        updateEditSaveButton();
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = '';
}

// Get selected rooms for edit form
function getSelectedEditRooms(roomType) {
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

// Update edit save button state
function updateEditSaveButton() {
    const saveBtn = document.getElementById('edit-save-btn');
    const hasPhoto = window.editPhotoData !== null;
    const fromRooms = getSelectedEditRooms('edit-from-room');
    const toRooms = getSelectedEditRooms('edit-to-room');
    saveBtn.disabled = !(hasPhoto && fromRooms.length > 0 && toRooms.length > 0);
}

// Handle edit form submission
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) {
        console.log('Already submitting, ignoring...');
        return;
    }
    
    try {
        isSubmitting = true;
        const boxId = window.currentEditBoxId;
        const description = document.getElementById('edit-description').value.trim();
        const fromRooms = getSelectedEditRooms('edit-from-room');
        const toRooms = getSelectedEditRooms('edit-to-room');
        
        if (fromRooms.length === 0 || toRooms.length === 0) {
            alert('Please select at least one From Room and one To Room');
            isSubmitting = false;
            return;
        }
        
        if (!window.editPhotoData) {
            alert('Please add a photo');
            isSubmitting = false;
            return;
        }
        
        // Prepare update data
        const updateData = {
            short_description: description || 'No description',
            from_room: fromRooms.join(', '),
            to_room: toRooms.join(', ')
        };
        
        // If photo was changed, include it in the update
        if (window.editPhotoData !== window.currentEditBox.photo_path && 
            window.editPhotoData !== window.currentEditBox.photo_url) {
            const compressedPhoto = await compressImage(window.editPhotoData);
            updateData.photo_path = compressedPhoto;
        }
        
        // Update box via API
        const updatedBox = await updateBox(boxId, updateData);
        
        // Refresh the detail view (preserve previousScreen from before edit)
        const savedPreviousScreen = previousScreen || 'list-screen';
        await showBoxDetail(boxId);
        previousScreen = savedPreviousScreen; // Restore it since showBoxDetail will overwrite it
        
        // Refresh box list or grid if we're coming from there
        if (document.getElementById('list-screen').classList.contains('active')) {
            await loadBoxes();
            renderBoxList();
        } else if (document.getElementById('grid-screen').classList.contains('active')) {
            await loadBoxes();
            renderBoxGrid();
        }
        
        isSubmitting = false;
    } catch (error) {
        console.error('Error updating box:', error);
        alert('Failed to update box: ' + error.message);
        isSubmitting = false;
    }
}

// Delete box functionality (from detail screen)
async function deleteBox(boxId) {
    if (!confirm('Are you sure you want to delete this box? It can be restored later if needed.')) {
        return;
    }
    
    try {
        await deleteBoxAPI(boxId);
        
        // Go back to list or home
        if (document.getElementById('list-screen').classList.contains('active')) {
            // If we're viewing from list, refresh the list
            await loadBoxes();
            renderBoxList();
            showScreen('list-screen');
        } else {
            // Otherwise go to home
            showHomeScreen();
        }
        
        // Clear URL if on box detail page
        if (window.location.pathname.startsWith('/box/')) {
            window.history.pushState({}, '', window.location.pathname.replace(/\/box\/.*/, ''));
        } else {
            window.location.hash = '';
        }
    } catch (error) {
        console.error('Error deleting box:', error);
        alert('Failed to delete box: ' + error.message);
    }
}

// Delete box from list view
window.deleteBoxFromList = async function(boxId) {
    if (!confirm('Are you sure you want to delete this box? It can be restored later if needed.')) {
        return;
    }
    
    try {
        console.log('Deleting box:', boxId);
        console.log('Box ID type:', typeof boxId, 'Value:', JSON.stringify(boxId));
        const result = await deleteBoxAPI(boxId);
        console.log('Delete result:', result);
        
        // Refresh the list
        await loadBoxes();
        renderBoxList();
        
        // Clear search if it's filtering
        const searchInput = document.getElementById('box-search-input');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            updateClearButtonVisibility('');
        }
    } catch (error) {
        console.error('Error deleting box:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            boxId: boxId
        });
        alert('Failed to delete box: ' + error.message);
    }
};

// Restore box from list view
window.restoreBoxFromList = async function(boxId) {
    try {
        await restoreBox(boxId);
        
        // Refresh the list
        await loadBoxes();
        renderBoxList();
    } catch (error) {
        console.error('Error restoring box:', error);
        alert('Failed to restore box: ' + error.message);
    }
};

// Print labels for a single box
async function printBoxLabels(boxId, box) {
    try {
        // Generate QR code
        const qrPayload = `${QR_BASE_URL}/box/${boxId}`;
        const qrDataUrl = await generateQRCode(qrPayload);
        
        // Generate print labels
        generatePrintLabels(box, qrDataUrl, qrPayload);
        
        // Switch to print screen
        showScreen('print-screen');
        
        // Trigger print dialog
        setTimeout(() => {
            window.print();
        }, 500);
    } catch (error) {
        console.error('Error printing labels:', error);
        alert('Failed to generate labels: ' + error.message);
    }
}
