#!/usr/bin/env node
/**
 * Backup script: Creates a compressed archive of the data directory
 * Usage: node backup.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const BACKUPS_DIR = join(DATA_DIR, 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  console.log('Created backups directory:', BACKUPS_DIR);
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = join(BACKUPS_DIR, `backup-${timestamp}.tar.gz`);

try {
  // Create compressed archive of data directory
  execSync(`tar -czf "${backupFile}" -C "${DATA_DIR}" .`, {
    cwd: DATA_DIR,
    stdio: 'inherit'
  });

  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n✓ Backup created: ${backupFile}`);
  console.log(`  Size: ${sizeMB} MB`);

  // Optional: Keep only last N backups (default: 10)
  const KEEP_LAST = parseInt(process.env.KEEP_BACKUPS || '10');
  if (KEEP_LAST > 0) {
    const backups = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.tar.gz'))
      .map(f => ({
        name: f,
        path: join(BACKUPS_DIR, f),
        mtime: fs.statSync(join(BACKUPS_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backups.length > KEEP_LAST) {
      const toDelete = backups.slice(KEEP_LAST);
      for (const backup of toDelete) {
        fs.unlinkSync(backup.path);
        console.log(`  Deleted old backup: ${backup.name}`);
      }
    }
  }

  console.log(`\nTotal backups: ${fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith('backup-')).length}`);
} catch (error) {
  console.error('Error creating backup:', error.message);
  process.exit(1);
}
