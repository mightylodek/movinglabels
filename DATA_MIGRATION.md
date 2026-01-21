# Data Migration Instructions

Follow these steps to transfer your data from your local machine to the server.

## ⚠️ Important: Stop the Server First

**Before transferring the database file, you must stop the server on your destination server** to avoid database locking issues.

On your server, stop the app:
```bash
# If using PM2:
pm2 stop moving-box-labels

# Or if running directly with npm start:
# Press Ctrl+C to stop it
```

## Step 1: Prepare Data on Local Machine

Your data directory contains:
- `profiles.json` - Your profiles ("GB", "Liz")
- `moving-labels.db` - SQLite database with all boxes
- `images/` - 11 image files for your boxes
- `*.db-wal` and `*.db-shm` - Temporary SQLite files (optional to transfer)

## Step 2: Transfer Data Directory

From your **local machine**, run one of these commands:

### Option A: Transfer entire data directory (Recommended)

```bash
# Replace with your actual server details
scp -r /Users/georgebrown/Projects/moving_labels_qr/data/ user@your-server-ip:/path/to/moving_labels_qr/
```

### Option B: Create a tarball first (better for large transfers)

```bash
# On your LOCAL machine
cd /Users/georgebrown/Projects/moving_labels_qr
tar -czf data-migration.tar.gz data/

# Transfer the tarball
scp data-migration.tar.gz user@your-server-ip:/path/to/moving_labels_qr/

# Then on your SERVER, extract it:
ssh user@your-server-ip
cd /path/to/moving_labels_qr
tar -xzf data-migration.tar.gz
```

## Step 3: Set Correct Permissions on Server

After transferring, set proper permissions:

```bash
# On your SERVER
cd /path/to/moving_labels_qr
chmod -R 755 data/
chmod 644 data/*.json
chmod 644 data/*.db
```

## Step 4: Verify Data on Server

Check that everything transferred correctly:

```bash
# On your SERVER
cd /path/to/moving_labels_qr
ls -lah data/

# You should see:
# - profiles.json (should show 19 bytes)
# - moving-labels.db (should show ~12KB)
# - images/ directory (should contain 11 files)
```

Check the images:
```bash
ls -la data/images/ | wc -l  # Should show 13 (11 images + 2 dir entries)
```

## Step 5: Restart the Server

```bash
# On your SERVER

# If using PM2:
pm2 start moving-box-labels

# Or if running directly:
npm start
```

## Step 6: Verify Everything Works

1. Access the app: `http://your-server-ip:3000`
2. Log in with your group password
3. Check that both profiles ("GB" and "Liz") appear
4. View boxes - all your boxes should be visible
5. Check that images load correctly for each box
6. Test scanning a QR code from one of your printed labels

## Troubleshooting

### "Cannot access database" error
- Make sure the server was stopped before copying the database
- Check file permissions: `chmod 644 data/moving-labels.db`
- Verify the database file is not corrupted

### Profiles don't show up
- Check `profiles.json` exists and has content: `cat data/profiles.json`
- Verify file permissions: `ls -la data/profiles.json`

### Images don't load
- Verify images directory exists: `ls -la data/images/`
- Check file permissions: `chmod -R 755 data/images/`
- Check that image files actually transferred: `ls -la data/images/ | grep -v '^d'`

### Database is locked
- Stop the server completely
- Remove any .db-wal and .db-shm files if they exist
- Restart the server
