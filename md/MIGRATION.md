# Migration Guide: JSON + Base64 → SQLite + Filesystem

This guide will help you migrate from the old JSON + base64 storage to the new SQLite + filesystem storage.

## Prerequisites

1. Install dependencies (including better-sqlite3):
   ```bash
   npm install
   ```

## Migration Steps

### Step 1: Migrate Images

Extract base64 images from JSON and save them to the filesystem:

```bash
npm run migrate-images
```

This will:
- Read `data/boxes.json`
- Extract base64 images for each box
- Save them as PNG files in `data/images/box-{id}.png`
- Skip images that already exist (safe to re-run)

### Step 2: Migrate Data

Migrate box metadata from JSON to SQLite:

```bash
npm run migrate-data
```

This will:
- Create SQLite database at `data/moving-labels.db`
- Initialize the schema if needed
- Import all boxes from JSON
- Map image paths to filesystem locations
- Use `INSERT OR IGNORE` (safe to re-run)

### Step 3: Verify Migration

Start the server and check that everything works:

```bash
npm start
```

Then:
- Open the app in your browser
- Check that all boxes are visible
- Verify images load correctly
- Test creating a new box

### Step 4: Backup (Recommended)

Create a backup before proceeding:

```bash
npm run backup
```

This creates a compressed archive of your data directory in `data/backups/`.

## What Changed

### Storage Architecture

**Before:**
- All data in `data/boxes.json`
- Images as base64 strings in JSON
- Large JSON file (~3MB+ for 15 boxes)

**After:**
- Metadata in `data/moving-labels.db` (SQLite)
- Images in `data/images/box-{id}.png` (filesystem)
- Profiles still in `data/profiles.json` (JSON)

### Database Schema

```sql
CREATE TABLE boxes (
  box_id TEXT PRIMARY KEY,
  short_description TEXT,
  from_room TEXT,
  to_room TEXT,
  packed_by TEXT,
  image_path TEXT,           -- Relative path like "images/box-000001.png"
  date_created TEXT,
  date_deleted TEXT,
  deleted INTEGER DEFAULT 0,
  qr_url TEXT
);
```

### API Changes

- **Image URLs**: Images are now served via `/images/box-{id}.png` instead of base64 data URLs
- **Box creation**: Still accepts base64 images (they're automatically saved to filesystem)
- **All other endpoints**: Work the same way

## Backup Strategy

Run backups regularly:

```bash
npm run backup
```

Backups are stored in `data/backups/` with timestamps. The script automatically keeps only the last 10 backups (configurable via `KEEP_BACKUPS` environment variable).

## Troubleshooting

### Images not showing

1. Check that `data/images/` directory exists
2. Verify images were migrated: `ls data/images/`
3. Check image paths in database: `sqlite3 data/moving-labels.db "SELECT box_id, image_path FROM boxes;"`

### Database locked error

- Stop the server before running migrations
- Or use WAL mode (already enabled) which allows concurrent reads

### Migration fails

- The original JSON file is never modified
- You can safely re-run migrations
- Check console output for specific errors

## Rollback

If you need to rollback:

1. Stop the server
2. The original `data/boxes.json` is still intact
3. Delete `data/moving-labels.db` and `data/images/`
4. Restore from backup if needed

## Notes

- **Profiles**: Still stored in JSON (simpler, less critical)
- **Original JSON**: Never modified during migration
- **Safe to re-run**: Both migration scripts are idempotent
- **No data loss**: All original data is preserved
