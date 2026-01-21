# Quick Start - Local Testing

## 🚀 Get Running in 3 Steps

### 1. Install Dependencies
```bash
cd /Users/georgebrown/Projects/moving_labels_qr
npm install
```

If you get permission errors, fix npm cache permissions first:
```bash
sudo chown -R $(whoami) ~/.npm
```

Then try `npm install` again.

### 2. Start the Server
```bash
npm start
```

You should see:
```
Server running on port 3000
Database: .../data/boxes.db
Uploads: .../data/uploads
```

### 3. Open in Browser
Go to: **http://localhost:3000**

## ✅ What to Test

### Basic Flow:
1. **Create Profile** → Type name → Click "Add" → Click your name
2. **Create Box** → Take/upload photo → Select rooms → Click "Save & Generate Labels"
3. **View Labels** → Check print preview → Click "Print Labels" → Verify 3 labels fit on one page
4. **Scan QR** → Copy QR URL from debug text → Open in new tab → Should show box details
5. **View All Boxes** → Click "View Boxes" → See list → Click a box to view details

### Verify:
- ✅ Profile saves and appears in list
- ✅ Box creation works with photo upload
- ✅ QR code generates and displays debug text
- ✅ Print preview shows 3 labels
- ✅ Labels don't overflow to page 2
- ✅ Box number shows last 3 digits (e.g., "001")
- ✅ QR code URL opens box detail page
- ✅ Box detail page shows full-size image

## 🔧 Troubleshooting

**Port 3000 in use?**
```bash
PORT=3001 npm start
# Then visit http://localhost:3001
```

**Database errors?**
```bash
rm -rf data
npm start
# Database will be recreated
```

**Can't upload photos?**
- Check `data/uploads/` directory exists
- Make sure photo is under 10MB

## 🛑 Stop Server
Press `Ctrl+C` in terminal
