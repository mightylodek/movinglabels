import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chromium } from 'playwright';
import { getDb, IMAGES_DIR } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';
const PROFILES_FILE = join(DATA_DIR, 'profiles.json');
// Base URL for QR codes - set via QR_BASE_URL environment variable
// If not set, will be determined dynamically from requests
let QR_BASE_URL = process.env.QR_BASE_URL;
// Group password for authentication
const GROUP_PASSWORD = process.env.GROUP_PASSWORD || 'changeme';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('Created data directory:', DATA_DIR);
}

// Initialize JSON files if they don't exist (profiles still in JSON)
if (!fs.existsSync(PROFILES_FILE)) {
  fs.writeFileSync(PROFILES_FILE, '[]', 'utf8');
  console.log('Created profiles file:', PROFILES_FILE);
}

// Initialize database
const db = getDb();

// Middleware
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images during migration

// CORS middleware (needed for phone access) - must be before routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple password authentication
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('[AUTH] Login attempt received');
    const { password } = req.body;
    console.log('[AUTH] Password received:', password ? '***' : 'missing');
    console.log('[AUTH] Expected password:', GROUP_PASSWORD ? '***' : 'not set');
    
    if (!password) {
      console.log('[AUTH] Login failed: No password provided');
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password === GROUP_PASSWORD) {
      console.log('[AUTH] Login successful');
      res.json({ success: true, message: 'Login successful' });
    } else {
      console.log('[AUTH] Login failed: Invalid password');
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve QR_BASE_URL as a configuration endpoint for the client
app.get('/api/config', (req, res) => {
  // If QR_BASE_URL is not set, determine it from the request
  let qrBaseUrl = QR_BASE_URL;
  if (!qrBaseUrl) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host) {
      qrBaseUrl = `${protocol}://${host}`;
    } else {
      // If host header is missing (unusual), use window.location.origin on client side
      // Don't hardcode localhost here
      qrBaseUrl = null; // Client will use window.location.origin as fallback
    }
  }
  res.json({ qrBaseUrl });
});

app.use(express.static('public'));
app.use('/qrcode.min.js', express.static('qrcode.min.js'));
app.use('/styles.css', express.static('styles.css'));

// Serve images from filesystem
app.use('/images', express.static(IMAGES_DIR));

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

// Helper function to embed images as base64 in HTML for PDF generation
async function embedImagesAsBase64(html, imagesDir, baseUrl) {
  console.log('[PDF] embedImagesAsBase64: Starting...');
  // Find all image src attributes that point to /images/ files
  const imagePathRegex = /src="(\/images\/[^"]+)"/g;
  let match;
  const imagePromises = [];
  const imageMap = new Map();
  const imagePaths = [];

  while ((match = imagePathRegex.exec(html)) !== null) {
    const imagePath = match[1];
    imagePaths.push(imagePath);
    if (!imageMap.has(imagePath)) {
      // Read image file and convert to base64
      const fullPath = join(imagesDir, imagePath.replace('/images/', ''));
      console.log('[PDF] embedImagesAsBase64: Found image path:', imagePath, '-> Full path:', fullPath);
      if (fs.existsSync(fullPath)) {
        imagePromises.push(
          fs.promises.readFile(fullPath)
            .then(buffer => {
              const base64 = buffer.toString('base64');
              const mimeType = 'image/png'; // Assuming PNG for now
              const dataUrl = `data:${mimeType};base64,${base64}`;
              imageMap.set(imagePath, dataUrl);
              console.log('[PDF] embedImagesAsBase64: Embedded image:', imagePath, 'size:', buffer.length, 'bytes');
            })
            .catch(err => {
              console.warn('[PDF] embedImagesAsBase64: Failed to read image', fullPath, ':', err);
              // Keep original path if read fails
            })
        );
      } else {
        console.warn('[PDF] embedImagesAsBase64: Image file not found:', fullPath);
      }
    }
  }

  console.log('[PDF] embedImagesAsBase64: Found', imagePaths.length, 'image references,', imagePromises.length, 'unique images to embed');
  await Promise.all(imagePromises);
  console.log('[PDF] embedImagesAsBase64: All images embedded, map size:', imageMap.size);

  // Replace all image paths with base64 data URLs
  let processedHtml = html;
  let replacementCount = 0;
  imageMap.forEach((base64DataUrl, imagePath) => {
    const regex = new RegExp(`src="${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    const matches = processedHtml.match(regex);
    if (matches) {
      processedHtml = processedHtml.replace(regex, `src="${base64DataUrl}"`);
      replacementCount += matches.length;
    }
  });
  console.log('[PDF] embedImagesAsBase64: Replaced', replacementCount, 'image references');

  return processedHtml;
}

// Helper function to save base64 image to filesystem
function saveImageToFilesystem(base64Data, boxId) {
  if (!base64Data) return null;

  // Extract base64 from data URL if needed
  const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  const imageData = base64Match ? base64Match[2] : base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  if (!imageData) return null;

  // Clean box ID for filename
  const cleanId = boxId.replace(/^BOX-/, '').replace(/[^0-9]/g, '');
  const imagePath = join(IMAGES_DIR, `box-${cleanId}.png`);
  
  try {
    // Write image to filesystem
    const imageBuffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);
    return `images/box-${cleanId}.png`; // Return relative path for DB storage
  } catch (error) {
    console.error('Error saving image to filesystem:', error);
    return null;
  }
}

// Helper function to convert DB row to API format
function rowToBox(row) {
  return {
    box_id: row.box_id,
    short_description: row.short_description,
    from_room: row.from_room,
    to_room: row.to_room,
    packed_by: row.packed_by,
    photo_path: row.image_path ? `/${row.image_path}` : null, // Serve via /images/ route
    photo_url: row.image_path ? `/${row.image_path}` : null, // Alias for compatibility
    date_created: row.date_created,
    date_deleted: row.date_deleted,
    deleted: row.deleted === 1,
    qr_url: row.qr_url || `${QR_BASE_URL}/box/${row.box_id}`
  };
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
    const rows = db.prepare('SELECT * FROM boxes ORDER BY date_created DESC').all();
    const boxes = rows.map(rowToBox);
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
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('GET /api/boxes/:boxId - looking for:', boxId);
    
    const row = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(boxId);
    
    if (!row) {
      console.error('Box not found:', boxId);
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    res.json(rowToBox(row));
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
    
    // Save image to filesystem if it's base64
    const imagePath = saveImageToFilesystem(photo_path, box_id);
    if (!imagePath && photo_path) {
      // If photo_path is already a path (not base64), use it directly
      const existingPath = photo_path.startsWith('images/') ? photo_path : null;
      if (!existingPath) {
        console.warn('Could not save image, but continuing with box creation');
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO boxes (
        box_id, short_description, from_room, to_room, packed_by,
        image_path, date_created, deleted, qr_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    
    stmt.run(
      box_id,
      short_description || 'No description',
      from_room,
      to_room,
      packed_by || 'Unknown',
      imagePath || null,
      date_created || new Date().toISOString().split('T')[0],
      `${QR_BASE_URL}/box/${box_id}`
    );
    
    const row = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(box_id);
    res.json(rowToBox(row));
  } catch (error) {
    console.error('Error creating box:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update box
app.put('/api/boxes/:boxId', (req, res) => {
  try {
    const { short_description, from_room, to_room, photo_path } = req.body;
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('PUT request for boxId:', boxId);
    
    // Check if box exists
    const existing = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(boxId);
    if (!existing) {
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    // Build update statement dynamically
    const updates = [];
    const values = [];
    
    if (short_description !== undefined) {
      updates.push('short_description = ?');
      values.push(short_description);
    }
    if (from_room !== undefined) {
      updates.push('from_room = ?');
      values.push(from_room);
    }
    if (to_room !== undefined) {
      updates.push('to_room = ?');
      values.push(to_room);
    }
    if (photo_path !== undefined) {
      // Save image to filesystem if it's base64
      const imagePath = saveImageToFilesystem(photo_path, boxId);
      if (imagePath) {
        updates.push('image_path = ?');
        values.push(imagePath);
      } else if (!photo_path.startsWith('images/')) {
        // If it's already a path or null, use it
        updates.push('image_path = ?');
        values.push(photo_path || null);
      }
    }
    
    if (updates.length === 0) {
      // No updates, return existing box
      return res.json(rowToBox(existing));
    }
    
    values.push(boxId);
    const stmt = db.prepare(`UPDATE boxes SET ${updates.join(', ')} WHERE box_id = ?`);
    stmt.run(...values);
    
    const updated = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(boxId);
    res.json(rowToBox(updated));
  } catch (error) {
    console.error('Error updating box:', error);
    res.status(500).json({ error: error.message });
  }
});

// Soft delete box (set deleted flag)
app.delete('/api/boxes/:boxId', (req, res) => {
  try {
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('DELETE request for boxId:', boxId);
    
    const stmt = db.prepare(`
      UPDATE boxes 
      SET deleted = 1, date_deleted = ? 
      WHERE box_id = ?
    `);
    
    const result = stmt.run(new Date().toISOString().split('T')[0], boxId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    const deleted = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(boxId);
    res.json({ success: true, message: 'Box deleted', box: rowToBox(deleted) });
  } catch (error) {
    console.error('Error deleting box:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore box (un-delete)
app.post('/api/boxes/:boxId/restore', (req, res) => {
  try {
    const boxId = decodeURIComponent(req.params.boxId);
    console.log('RESTORE request for boxId:', boxId);
    
    const stmt = db.prepare(`
      UPDATE boxes 
      SET deleted = 0, date_deleted = NULL 
      WHERE box_id = ?
    `);
    
    const result = stmt.run(boxId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Box not found', requestedId: boxId });
    }
    
    const restored = db.prepare('SELECT * FROM boxes WHERE box_id = ?').get(boxId);
    res.json({ success: true, message: 'Box restored', box: rowToBox(restored) });
  } catch (error) {
    console.error('Error restoring box:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve box detail page (for QR code scanning)
app.get('/box/:boxId', (req, res) => {
  res.sendFile(join(__dirname, 'box-detail.html'));
});

// Serve print template page (used by Puppeteer for PDF generation)
app.get('/print/avery-5264', (req, res) => {
  res.sendFile(join(__dirname, 'views', 'print-avery-5264.html'));
});

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  let browser = null;
  try {
    console.log('[PDF] Starting PDF generation...');
    const { labelHtml } = req.body;
    
    if (!labelHtml) {
      console.error('[PDF] Error: labelHtml is required');
      return res.status(400).json({ error: 'labelHtml is required' });
    }

    console.log('[PDF] Label HTML length:', labelHtml.length);
    console.log('[PDF] Label HTML preview:', labelHtml.substring(0, 200));

    console.log('[PDF] Launching Playwright browser...');
    browser = await chromium.launch({
      headless: true
    });
    console.log('[PDF] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[PDF] New page created');
    
    // Load the print template - use file:// or data URL approach instead
    const printUrl = `${req.protocol}://${req.get('host')}/print/avery-5264`;
    console.log('[PDF] Loading print template:', printUrl);
    await page.goto(printUrl, {
      waitUntil: 'networkidle0'
    });
    console.log('[PDF] Print template loaded');

    // Convert image paths to base64 data URLs for embedding
    // This ensures images work regardless of server location
    console.log('[PDF] Embedding images as base64...');
    const htmlWithEmbeddedImages = await embedImagesAsBase64(labelHtml, IMAGES_DIR, printUrl);
    console.log('[PDF] Images embedded, HTML length:', htmlWithEmbeddedImages.length);

    // Inject the label HTML into the container
    console.log('[PDF] Injecting HTML into page...');
    await page.evaluate((html) => {
      const container = document.getElementById('labels-container');
      if (container) {
        container.innerHTML = html;
      }
    }, htmlWithEmbeddedImages);
    console.log('[PDF] HTML injected successfully');

    // Wait for images and QR codes to load
    console.log('[PDF] Waiting for images to load...');
    const imageLoadResult = await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img, idx) => {
          if (img.complete) {
            console.log(`[PDF] Image ${idx} already complete`);
            return Promise.resolve({ index: idx, loaded: true });
          }
          return new Promise((resolve) => {
            img.onload = () => {
              console.log(`[PDF] Image ${idx} loaded successfully`);
              resolve({ index: idx, loaded: true });
            };
            img.onerror = (err) => {
              console.warn(`[PDF] Image ${idx} failed to load:`, err);
              resolve({ index: idx, loaded: false, error: true });
            };
            setTimeout(() => {
              console.warn(`[PDF] Image ${idx} load timeout`);
              resolve({ index: idx, loaded: false, timeout: true });
            }, 3000);
          });
        })
      );
    });
    console.log('[PDF] Image load results:', JSON.stringify(imageLoadResult));

    // Check how many images we have
    const imageCount = await page.evaluate(() => document.images.length);
    console.log('[PDF] Total images on page:', imageCount);

    // Additional wait for layout to settle
    console.log('[PDF] Waiting for layout to settle...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF with explicit settings
    console.log('[PDF] Generating PDF buffer...');
    let pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      scale: 1.0,
      margin: {
        top: '0in',
        right: '0in',
        bottom: '0in',
        left: '0in'
      }
    });
    
    console.log('[PDF] page.pdf() returned, type:', typeof pdfBuffer);
    console.log('[PDF] Is Buffer?', Buffer.isBuffer(pdfBuffer));
    console.log('[PDF] Constructor:', pdfBuffer ? pdfBuffer.constructor.name : 'null/undefined');
    
    // Convert to Buffer if it's not already one (some Puppeteer versions return Uint8Array or ArrayBuffer)
    if (pdfBuffer && !Buffer.isBuffer(pdfBuffer)) {
      console.log('[PDF] Converting to Buffer from type:', typeof pdfBuffer);
      console.log('[PDF] Is Uint8Array?', pdfBuffer instanceof Uint8Array);
      console.log('[PDF] Is ArrayBuffer?', pdfBuffer instanceof ArrayBuffer);
      console.log('[PDF] Has length?', pdfBuffer.length !== undefined);
      
      try {
        if (pdfBuffer instanceof ArrayBuffer) {
          pdfBuffer = Buffer.from(pdfBuffer);
          console.log('[PDF] Converted ArrayBuffer to Buffer');
        } else if (pdfBuffer instanceof Uint8Array) {
          pdfBuffer = Buffer.from(pdfBuffer);
          console.log('[PDF] Converted Uint8Array to Buffer');
        } else if (typeof pdfBuffer === 'string') {
          pdfBuffer = Buffer.from(pdfBuffer, 'binary');
          console.log('[PDF] Converted string to Buffer');
        } else if (pdfBuffer.buffer instanceof ArrayBuffer) {
          // Handle TypedArray
          pdfBuffer = Buffer.from(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
          console.log('[PDF] Converted TypedArray to Buffer');
        } else {
          // Try generic conversion
          pdfBuffer = Buffer.from(pdfBuffer);
          console.log('[PDF] Converted using generic Buffer.from()');
        }
      } catch (e) {
        console.error('[PDF] Failed to convert to Buffer:', e);
        console.error('[PDF] Error details:', e.message, e.stack);
        throw new Error('Could not convert PDF result to Buffer: ' + e.message);
      }
      
      // Verify conversion worked
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.error('[PDF] ERROR: Conversion failed, still not a Buffer');
        console.error('[PDF] Final type:', typeof pdfBuffer);
        console.error('[PDF] Final constructor:', pdfBuffer ? pdfBuffer.constructor.name : 'null');
        throw new Error('Failed to convert PDF result to Buffer after all attempts');
      }
      console.log('[PDF] Successfully converted to Buffer');
    }
    
    console.log('[PDF] PDF buffer generated, size:', pdfBuffer.length, 'bytes');

    await browser.close();
    browser = null;
    console.log('[PDF] Browser closed');

    // Validate PDF buffer
    console.log('[PDF] Validating PDF buffer...');
    if (!pdfBuffer) {
      console.error('[PDF] ERROR: pdfBuffer is null or undefined');
      throw new Error('Generated PDF buffer is null');
    }
    
    if (!Buffer.isBuffer(pdfBuffer)) {
      console.error('[PDF] ERROR: pdfBuffer is not a Buffer, type:', typeof pdfBuffer);
      console.error('[PDF] pdfBuffer value:', pdfBuffer);
      throw new Error('Generated PDF buffer is not a Buffer');
    }
    
    if (pdfBuffer.length === 0) {
      console.error('[PDF] ERROR: PDF buffer is empty');
      throw new Error('Generated PDF buffer is empty');
    }

    console.log('[PDF] Buffer is valid, length:', pdfBuffer.length);

    // Verify PDF header (PDF files start with %PDF)
    const firstBytes = pdfBuffer.slice(0, 10);
    const firstBytesHex = Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
    console.log('[PDF] First 10 bytes:', firstBytesHex);
    console.log('[PDF] First 10 bytes as string:', firstBytes.toString());
    
    if (pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
      console.error('[PDF] ERROR: PDF buffer does not have valid PDF header');
      console.error('[PDF] Expected: %PDF (0x25 0x50 0x44 0x46)');
      console.error('[PDF] Got:', firstBytesHex);
      throw new Error('Generated file is not a valid PDF - invalid header');
    }

    console.log('[PDF] PDF header validated successfully');
    console.log('[PDF] Sending PDF response, size:', pdfBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="labels.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    console.log('[PDF] PDF response sent successfully');
  } catch (error) {
    console.error('[PDF] ERROR during PDF generation:');
    console.error('[PDF] Error message:', error.message);
    console.error('[PDF] Error stack:', error.stack);
    console.error('[PDF] Error type:', error.constructor.name);
    
    // Make sure to close browser even on error
    if (browser) {
      try {
        console.log('[PDF] Closing browser due to error...');
        await browser.close();
      } catch (e) {
        console.error('[PDF] Error closing browser:', e);
      }
    }
    
    // Make sure we send JSON error, not try to send PDF
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
    } else {
      console.error('[PDF] WARNING: Response already sent, cannot send error response');
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`QR Base URL: ${QR_BASE_URL || 'Will be determined dynamically from requests'}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Database: ${db.name}`);
  console.log(`Images directory: ${IMAGES_DIR}`);
  console.log(`Profiles: ${PROFILES_FILE}`);
  console.log(`Group password: ${GROUP_PASSWORD ? '***SET***' : 'NOT SET (using default: changeme)'}`);
  console.log(`Server accessible on all network interfaces (0.0.0.0:${PORT})`);
});
