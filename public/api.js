// API Helper Functions - Simple JSON-based API

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
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to create profile');
    }
    return await response.json();
}

// Boxes API
export async function getBoxes() {
    const response = await fetch(`${API_BASE}/api/boxes`);
    if (!response.ok) throw new Error('Failed to load boxes');
    return await response.json();
}

export async function getBox(boxId) {
    const encodedBoxId = encodeURIComponent(boxId);
    const response = await fetch(`${API_BASE}/api/boxes/${encodedBoxId}`);
    if (!response.ok) throw new Error('Failed to load box');
    return await response.json();
}

export async function createBox(boxData) {
    // Send base64 image data directly in JSON
    const response = await fetch(`${API_BASE}/api/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boxData)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to create box');
    }
    
    return await response.json();
}

export async function updateBox(boxId, boxData) {
    const encodedBoxId = encodeURIComponent(boxId);
    const response = await fetch(`${API_BASE}/api/boxes/${encodedBoxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boxData)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to update box');
    }
    
    return await response.json();
}

export async function deleteBox(boxId) {
    const encodedBoxId = encodeURIComponent(boxId);
    console.log('API deleteBox called with:', boxId, 'encoded:', encodedBoxId);
    const response = await fetch(`${API_BASE}/api/boxes/${encodedBoxId}`, {
        method: 'DELETE'
    });
    
    console.log('Delete response status:', response.status, response.statusText);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('Delete error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete box');
    }
    
    const result = await response.json();
    console.log('Delete success:', result);
    return result;
}

export async function restoreBox(boxId) {
    const encodedBoxId = encodeURIComponent(boxId);
    const response = await fetch(`${API_BASE}/api/boxes/${encodedBoxId}/restore`, {
        method: 'POST'
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to restore box');
    }
    
    return await response.json();
}
