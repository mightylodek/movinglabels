import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';
const PROFILES_FILE = join(DATA_DIR, 'profiles.json');
const BOXES_FILE = join(DATA_DIR, 'boxes.json');
// Base URL for QR codes - set via QR_BASE_URL environment variable
// If not set, will try to use request host, or fallback to localhost
const QR_BASE_URL = process.env.QR_BASE_URL || `http://localhost:${PORT}`;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('Created data directory:', DATA_DIR);
}

// Initialize JSON files if they don't exist
if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, '[]', 'utf8');
  console.log('Created profiles file:', PROFILES_FILE);
}

if (!fs.existsSync(BOXES_FILE)) {
  fs.writeFileSync(BOXES_FILE, '[]', 'utf8');
  console.log('Created boxes file:', BOXES_FILE);
}

// Middleware
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images

// Serve QR_BASE_URL as a configuration endpoint for the client
app.get('/api/config', (req, res) => {
  res.json({ qrBaseUrl: QR_BASE_URL });
});

app.use(express.static('public'));
app.use('/qrcode.min.js', express.static('qrcode.min.js'));
app.use('/styles.css', express.static('styles.css'));

// CORS middleware (needed for phone access)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper functions for JSON storage
function readProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PROFILES_FILE, 'utf8');
    if (!data || data.trim() === '') {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading profiles:', error);
    return [];
  }
}

function writeProfiles(profiles) {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  } catch (error) {
    console.error('Error writing profiles:', error);
    throw error;
  }
}

function readBoxes() {
  try {
    const data = fs.readFileSync(BOXES_FILE, 'utf8');
    const boxes = JSON.parse(data);
    
    let needsMigration = false;
    
    // Migrate old format boxes to new format
    const migrated = boxes.map((box, index) => {
      // If box uses old format (has "id" but no "box_id"), migrate it
      if (box.id !== undefined && box.id !== null && !box.box_id) {
        needsMigration = true;
        // Handle both string and number IDs
        const idStr = String(box.id).replace(/^0+/, '') || '0'; // Remove leading zeros, default to '0'
        const newBoxId = `BOX-${idStr.padStart(6, '0')}`;
        console.log(`Migrating box ${index}: id="${box.id}" (${typeof box.id}) -> box_id="${newBoxId}"`);
        const migratedBox = {
          box_id: newBoxId,
          photo_path: box.photo || box.photo_path || '',
          short_description: box.description || box.short_description || 'No description',
          from_room: box.from || box.from_room || '',
          to_room: box.to || box.to_room || '',
          date_created: box.createdAt ? box.createdAt.split('T')[0] : (box.date_created || new Date().toISOString().split('T')[0]),
          packed_by: box.packed_by || 'Unknown',
          qr_url: `${QR_BASE_URL}/box/${newBoxId}`,
          deleted: box.deleted || false
        };
        return migratedBox;
      }
      // Ensure deleted flag exists for new format boxes
      if (!box.hasOwnProperty('deleted')) {
        box.deleted = false;
        needsMigration = true;
      }
      return box;
    });
    
    // Write back if migration occurred
    if (needsMigration) {
      console.log('Migration needed - writing boxes to file...');
      writeBoxes(migrated);
      console.log('Migration complete -', migrated.length, 'boxes');
    }
    
    return migrated;
  } catch (error) {
    console.error('Error reading boxes:', error);
    return [];
  }
}

function writeBoxes(boxes) {
  fs.writeFileSync(BOXES_FILE, JSON.stringify(boxes, null, 2));
}

// API Routes

// Get all profiles
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = readProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Error reading profiles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create profile
app.post('/api/profiles', (req, res) => {
  try {
    console.log('POST /api/profiles - Body:', req.body);
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      console.log('Profile creation failed: name is empty');
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const profiles = readProfiles();
    const trimmedName = name.trim();
    console.log('Current profiles:', profiles);
    console.log('Adding profile:', trimmedName);
    
    if (!profiles.includes(trimmedName)) {
      profiles.push(trimmedName);
      writeProfiles(profiles);
      console.log('Profile saved successfully');
    } else {
      console.log('Profile already exists');
    }
    
    res.json({ name: trimmedName });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all boxes
app.get('/api/boxes', (req, res) => {
  try {
    const boxes = readBoxes();
    console.log('GET /api/boxes - returning', boxes.length, 'boxes');
    res.json(boxes);
  } catch (error) {
    console.error('Error in GET /api/boxes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single box by box_id
app.get('/api/boxes/:boxId', (req, res) => {
  try {
    const boxes = readBoxes();
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('GET /api/boxes/:boxId - looking for:', boxId);
    
    // Find by box_id (exact match)
    let box = boxes.find(b => b.box_id === boxId);
    
    // If not found, try string comparison
    if (!box) {
      box = boxes.find(b => String(b.box_id) === String(boxId));
    }
    
    // If still not found, try old format
    if (!box && boxId.startsWith('BOX-')) {
      const oldId = boxId.replace('BOX-', '').replace(/^0+/, '') || '0';
      box = boxes.find(b => {
        if (b.id !== undefined) {
          return String(b.id) === oldId || String(b.id) === String(parseInt(oldId));
        }
        return false;
      });
    }
    
    if (!box) {
      console.error('Box not found:', boxId);
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    res.json(box);
  } catch (error) {
    console.error('Error in GET /api/boxes/:boxId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create box
app.post('/api/boxes', (req, res) => {
  try {
    const { box_id, photo_path, short_description, from_room, to_room, date_created, packed_by } = req.body;
    
    if (!photo_path || !from_room || !to_room) {
      return res.status(400).json({ error: 'Photo, from_room, and to_room are required' });
    }
    
    const boxes = readBoxes();
    
    const box = {
      box_id,
      photo_path, // Stored as base64 data URL
      short_description: short_description || 'No description',
      from_room,
      to_room,
      date_created,
      packed_by,
      qr_url: `${QR_BASE_URL}/box/${box_id}`,
      deleted: false // Soft delete flag
    };
    
    boxes.push(box);
    writeBoxes(boxes);
    
    res.json(box);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update box
app.put('/api/boxes/:boxId', (req, res) => {
  try {
    const { short_description, from_room, to_room, photo_path } = req.body;
    const boxes = readBoxes();
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('PUT request for boxId:', boxId);
    
    // Find box by box_id
    let boxIndex = boxes.findIndex(b => b.box_id === boxId);
    
    // If not found, try matching as string
    if (boxIndex === -1) {
      boxIndex = boxes.findIndex(b => String(b.box_id) === String(boxId));
    }
    
    // If still not found, try old format matching
    if (boxIndex === -1 && boxId.startsWith('BOX-')) {
      const oldId = boxId.replace('BOX-', '').replace(/^0+/, '') || '0';
      boxIndex = boxes.findIndex(b => {
        if (b.id !== undefined) {
          return String(b.id) === oldId || String(b.id) === String(parseInt(oldId));
        }
        return false;
      });
    }
    
    if (boxIndex === -1) {
      console.error('Box not found for update!');
      console.error('Requested boxId:', JSON.stringify(boxId));
      console.error('Available boxes:', boxes.map(b => ({ box_id: b.box_id, id: b.id })));
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    console.log('Found box at index:', boxIndex, 'box_id:', boxes[boxIndex].box_id);
    
    // Update only provided fields
    if (short_description !== undefined) {
      boxes[boxIndex].short_description = short_description;
    }
    if (from_room !== undefined) {
      boxes[boxIndex].from_room = from_room;
    }
    if (to_room !== undefined) {
      boxes[boxIndex].to_room = to_room;
    }
    if (photo_path !== undefined) {
      boxes[boxIndex].photo_path = photo_path;
    }
    
    writeBoxes(boxes);
    res.json(boxes[boxIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Soft delete box (set deleted flag)
app.delete('/api/boxes/:boxId', (req, res) => {
  try {
    const boxes = readBoxes();
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('DELETE request for boxId:', boxId, 'type:', typeof boxId);
    console.log('Total boxes:', boxes.length);
    console.log('Available box IDs:', boxes.map((b, idx) => ({ index: idx, box_id: b.box_id, id: b.id })));
    
    // Find box by box_id
    let boxIndex = boxes.findIndex(b => b.box_id === boxId);
    
    // If not found, try matching as string
    if (boxIndex === -1) {
      boxIndex = boxes.findIndex(b => String(b.box_id) === String(boxId));
    }
    
    // If still not found, try old format matching
    if (boxIndex === -1 && boxId.startsWith('BOX-')) {
      const oldId = boxId.replace('BOX-', '').replace(/^0+/, '') || '0'; // Remove leading zeros
      boxIndex = boxes.findIndex(b => {
        if (b.id !== undefined) {
          return String(b.id) === oldId || String(b.id) === String(parseInt(oldId));
        }
        return false;
      });
    }
    
    if (boxIndex === -1) {
      console.error('Box not found!');
      console.error('Requested boxId:', JSON.stringify(boxId));
      console.error('Available boxes:', boxes.map(b => ({
        box_id: b.box_id,
        id: b.id,
        box_id_type: typeof b.box_id,
        id_type: typeof b.id
      })));
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    console.log('Found box at index:', boxIndex, 'box_id:', boxes[boxIndex].box_id);
    
    // Soft delete - set deleted flag instead of removing
    boxes[boxIndex].deleted = true;
    boxes[boxIndex].date_deleted = new Date().toISOString().split('T')[0];
    writeBoxes(boxes);
    res.json({ success: true, message: 'Box deleted', box: boxes[boxIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore box (un-delete)
app.post('/api/boxes/:boxId/restore', (req, res) => {
  try {
    const boxes = readBoxes();
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('RESTORE request for boxId:', boxId);
    
    // Find box by box_id or old id format
    const boxIndex = boxes.findIndex(b => {
      if (b.box_id === boxId) return true;
      // Handle old format
      if (boxId.startsWith('BOX-')) {
        const oldId = boxId.replace('BOX-', '');
        return b.id === oldId || b.id === parseInt(oldId);
      }
      return false;
    });
    
    if (boxIndex === -1) {
      console.log('Box not found for restore:', boxId);
      return res.status(404).json({ error: 'Box not found' });
    }
    
    boxes[boxIndex].deleted = false;
    delete boxes[boxIndex].date_deleted;
    writeBoxes(boxes);
    res.json({ success: true, message: 'Box restored', box: boxes[boxIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve box detail page (for QR code scanning)
app.get('/box/:boxId', (req, res) => {
  res.sendFile(join(__dirname, 'box-detail.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`QR Base URL: ${QR_BASE_URL}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Profiles: ${PROFILES_FILE}`);
  console.log(`Boxes: ${BOXES_FILE}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
