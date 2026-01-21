import { getDb } from './db.js';
import crypto from 'crypto';

// WebAuthn helper functions
export function base64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64urlToBuffer(base64urlString) {
  const base64 = base64urlString.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

// Generate challenge for WebAuthn
export function generateChallenge() {
  return crypto.randomBytes(32);
}

// Get user by username
export function getUserByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

// Get user by ID
export function getUserById(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// Create user
export function createUser(username) {
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return { id: result.lastInsertRowid, username };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username already exists');
    }
    throw error;
  }
}

// Store WebAuthn credential
export function storeCredential(userId, credentialId, publicKey) {
  const db = getDb();
  const id = base64url(credentialId);
  // Convert buffers to binary for storage
  const credentialIdBlob = credentialId instanceof Buffer ? credentialId : Buffer.from(credentialId);
  const publicKeyBlob = publicKey instanceof Buffer ? publicKey : Buffer.from(publicKey);
  db.prepare(`
    INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter)
    VALUES (?, ?, ?, ?, 0)
  `).run(id, userId, credentialIdBlob, publicKeyBlob);
  return id;
}

// Get credential by credential ID
export function getCredential(credentialIdBase64) {
  const db = getDb();
  return db.prepare('SELECT * FROM webauthn_credentials WHERE id = ?').get(credentialIdBase64);
}

// Get credentials for user
export function getUserCredentials(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM webauthn_credentials WHERE user_id = ?').all(userId);
}

// Update credential counter
export function updateCredentialCounter(credentialIdBase64, counter) {
  const db = getDb();
  db.prepare('UPDATE webauthn_credentials SET counter = ? WHERE id = ?').run(counter, credentialIdBase64);
}
