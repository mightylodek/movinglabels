import Database from 'better-sqlite3';
import fs from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_FILE = join(DATA_DIR, 'moving-labels.db');
const IMAGES_DIR = join(DATA_DIR, 'images');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Initialize database
let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database) {
  // Create boxes table
  database.exec(`
    CREATE TABLE IF NOT EXISTS boxes (
      box_id TEXT PRIMARY KEY,
      short_description TEXT,
      from_room TEXT,
      to_room TEXT,
      packed_by TEXT,
      image_path TEXT,
      date_created TEXT,
      date_deleted TEXT,
      deleted INTEGER DEFAULT 0,
      qr_url TEXT
    );
  `);

  // Create users table for authentication
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create webauthn_credentials table for FaceID/TouchID
  database.exec(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      credential_id BLOB NOT NULL,
      public_key BLOB NOT NULL,
      counter INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create profiles table (keeping JSON for now, but could migrate later)
  // Profiles are simpler and less critical, so JSON is fine
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export { IMAGES_DIR };
