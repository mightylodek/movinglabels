# Local Testing Guide

## Prerequisites
- Node.js (v18 or higher) - Download from https://nodejs.org/
- npm (comes with Node.js)

## Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install:
- Express (web server)
- Multer (file uploads)
- better-sqlite3 (database)
- CORS (cross-origin requests)

## Step 2: Start the Server

```bash
npm start
```

You should see:
```
Server running on port 3000
Database: /path/to/project/data/boxes.db
Uploads: /path/to/project/data/uploads
```

## Step 3: Access the Application

Open your web browser and go to:

**http://localhost:3000**

## Step 4: Test the Application

### Test Profile Creation:
1. Type a name in the "Add New Profile" field
2. Click "Add" or press Enter
3. Your profile button should appear
4. Click your profile to continue

### Test Box Creation:
1. Click "Create Label"
2. Take a photo or upload an image
3. Fill in description (optional)
4. Select "From Room(s)" - check at least one
5. Select "To Room(s)" - check at least one
6. Click "Save & Generate Labels"
7. You should see the print preview screen

### Test Label Printing:
1. Click "Print Labels" button
2. The print dialog should open
3. Check that exactly 3 labels fit on one page
4. Verify QR code is visible and readable
5. Verify box number shows last 3 digits

### Test QR Code Scanning:
1. After creating a box, check the QR debug text on the label
2. Copy the URL (should be like `http://localhost:3000/box/BOX-000001`)
3. Open in a new browser tab
4. You should see the box detail page with full-size image

### Test Box List:
1. Click "View Boxes"
2. You should see all created boxes
3. Click a box to see details

## Step 5: Check Database

The database is stored at:
- `data/boxes.db` (SQLite database)

You can inspect it with:
```bash
sqlite3 data/boxes.db
.tables
SELECT * FROM boxes;
SELECT * FROM profiles;
.quit
```

## Troubleshooting

### Port Already in Use
If you get "port 3000 already in use":
- Stop other applications using port 3000, OR
- Change the port: `PORT=3001 npm start`

### Database Errors
If you see database errors:
- Delete the `data` folder and restart
- The server will recreate it automatically

### Photo Upload Fails
- Check that `data/uploads/` directory exists
- Check file permissions
- Ensure photos are under 10MB

### CORS Errors (if testing from different origin)
- CORS is enabled by default
- If issues persist, check browser console

## Development Mode (Auto-restart)

For development with auto-restart on file changes:

```bash
npm run dev
```

(Requires nodemon to be installed in devDependencies)

## Stop the Server

Press `Ctrl+C` in the terminal to stop the server.
