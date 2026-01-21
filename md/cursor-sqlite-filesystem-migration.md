# Cursor Prompt — Migrate Moving Labels QR to SQLite + Filesystem Images

## Context
We currently store **all data in a JSON file**, including **base64-encoded PNG images**.
This is already ~3 MB at ~15 records and will not scale safely for an active move.

We need to **refactor the application architecture** to:
- Store images on the filesystem
- Store all metadata in SQLite
- Migrate existing JSON + base64 images safely
- Add a simple, reliable backup strategy

This is a **local-first, single-household application**, not a multi-tenant SaaS.

---

## High-Level Goals
1. Images must NOT be stored in JSON or SQLite
2. SQLite becomes the source of truth for all metadata
3. Migration must preserve all existing records
4. Backups must be simple and automatable
5. Solution must be Docker-safe and VPS-safe

---

## Target Architecture

```
data/
  moving-labels.db
  images/
    box-001.png
    box-002.png
  backups/
```

---

## Step 1 — Introduce SQLite

Create a SQLite database with this schema:

```sql
CREATE TABLE boxes (
  id TEXT PRIMARY KEY,
  from_room TEXT,
  to_room TEXT,
  description TEXT,
  packed_by TEXT,
  image_path TEXT,
  created_at TEXT
);
```

---

## Step 2 — Store Images on Filesystem

Requirements:
- Decode base64 PNG images
- Write them to `data/images/`
- Deterministic file naming: `box-<id>.png`
- Store relative path in SQLite (`image_path`)

Images are written once and never rewritten.

---

## Step 3 — Migration Script: JSON → Filesystem Images

Create a one-time migration script that:
1. Loads the existing JSON file
2. Iterates through all records
3. Extracts base64 PNG
4. Writes `box-<id>.png` to `data/images/`
5. Leaves original JSON untouched
6. Is safe to re-run

---

## Step 4 — Migration Script: JSON → SQLite

Create a migration script that:
1. Initializes SQLite if missing
2. Inserts one row per box
3. Maps JSON fields to DB columns
4. Uses transactions
5. Never embeds image data

---

## Step 5 — Update Application Logic

Reads:
- Read metadata from SQLite
- Load images from filesystem

Writes:
- Insert/update SQLite rows
- Save images directly to filesystem
- Never write base64 to DB or JSON

---

## Step 6 — Backup Strategy

Implement a backup script:

```bash
tar -czf backups/backup-$(date +%Y-%m-%d-%H%M).tar.gz data/
```

Optionally:
- Keep last N backups
- Trigger backup after each new box

---

## Explicitly Forbidden
- Base64 images in JSON
- Base64 images in SQLite
- Postgres for this use case

---

## Deliverables Expected
1. SQLite schema and init code
2. Image migration script
3. Data migration script
4. Updated app read/write logic
5. Backup script

The solution must be **boring, safe, and reliable**.
