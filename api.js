// API Helper Functions

const API_BASE = '';

// Helper to handle API errors
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'API request failed');
    }
    return response.json();
}

// Profiles API
export async function getProfiles() {
    const response = await fetch(`${API_BASE}/api/profiles`);
    if (!response.ok) throw new Error('Failed to load profiles');
    return await response.json();
}

export async function createProfile(name) {
    const response = await fetch(`${API_BASE}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Failed to create profile');
    return await response.json();
}

// Boxes API
export async function getBoxes() {
    const response = await fetch(`${API_BASE}/api/boxes`);
    if (!response.ok) throw new Error('Failed to load boxes');
    return await response.json();
}

export async function getBox(boxId) {
    const response = await fetch(`${API_BASE}/api/boxes/${boxId}`);
    if (!response.ok) throw new Error('Failed to load box');
    return await response.json();
}

export async function createBox(boxData) {
    const formData = new FormData();
    formData.append('box_id', boxData.box_id);
    formData.append('short_description', boxData.short_description || '');
    formData.append('from_room', boxData.from_room);
    formData.append('to_room', boxData.to_room);
    formData.append('date_created', boxData.date_created);
    formData.append('packed_by', boxData.packed_by);
    
    // If photo is a File object, use it directly
    // Otherwise convert data URL to blob
    if (boxData.photo instanceof File) {
        formData.append('photo', boxData.photo);
    } else if (boxData.photo.startsWith('data:')) {
        const response = await fetch(boxData.photo);
        const blob = await response.blob();
        formData.append('photo', blob, 'box-photo.jpg');
    } else {
        formData.append('photo', boxData.photo);
    }

    const response = await fetch(`${API_BASE}/api/boxes`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to create box');
    }
    
    return await response.json();
}
