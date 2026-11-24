/**
 * Dragon Arena v3.0 — Tamper-Resistant IndexedDB + Checksum Save Security & Crash Telemetry
 * - Signs every save payload with a multi-round salted integrity digest (prevents casual DevTools tampering)
 * - Persists to IndexedDB (survives cache clears better on Android TWA) with localStorage mirror
 * - Records lightweight local crash telemetry ring buffer for self-healing diagnostics
 */

const DB_NAME = 'DragonArenaAAADB';
const STORE_NAME = 'saves';
const SAVE_RECORD_KEY = 'primary_v3';
const LS_KEY = 'dragon_arena_aaa_signed_v3';
const TELEMETRY_KEY = 'dragon_arena_telemetry_v3';
const INTEGRITY_SALT = 'DA3-SOVEREIGN-COLOSSEUM-9841-INTEGRITY';

/**
 * Deterministic 64-bit hex integrity digest (synchronous, zero-dependency, works in Node & Browser).
 */
export function computeSaveSignature(saveObj) {
  const payload = JSON.stringify({
    coins: saveObj.coins,
    gems: saveObj.gems,
    level: saveObj.level,
    xp: saveObj.xp,
    ownedSkins: saveObj.ownedSkins,
    dragonLevels: saveObj.dragonLevels,
    passXp: saveObj.passXp || 0,
    passPremium: !!saveObj.passPremium,
    career: saveObj.career,
  });
  let h1 = 0xdeadbeef ^ INTEGRITY_SALT.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  const full = `${INTEGRITY_SALT}|${payload}|${INTEGRITY_SALT}`;
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')).toUpperCase();
}

export function verifySignedEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || !envelope.data || !envelope.sig) {
    return { valid: false, reason: 'missing_signature' };
  }
  const expected = computeSaveSignature(envelope.data);
  if (expected !== envelope.sig) {
    return { valid: false, reason: 'checksum_mismatch' };
  }
  return { valid: true, data: envelope.data };
}

export function signSaveEnvelope(saveObj) {
  return {
    v: 3,
    ts: Date.now(),
    sig: computeSaveSignature(saveObj),
    data: saveObj,
  };
}

function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function writeSecureSave(saveObj) {
  const envelope = signSaveEnvelope(saveObj);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify(envelope));
    }
  } catch { /* ignore quota */ }

  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(envelope, SAVE_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* fallback already written to localStorage */ }
  return envelope;
}

export function readLocalMirrorSync() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const check = verifySignedEnvelope(JSON.parse(raw));
    return check.valid ? check.data : null;
  } catch {
    return null;
  }
}

export async function readIndexedDBSave() {
  try {
    const db = await openIDB();
    const envelope = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_RECORD_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!envelope) return null;
    const check = verifySignedEnvelope(envelope);
    return check.valid ? check.data : null;
  } catch {
    return null;
  }
}

export function logCrashTelemetry(source, message) {
  try {
    if (typeof localStorage === 'undefined') return;
    const list = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    list.unshift({ t: new Date().toISOString(), source: String(source), msg: String(message).slice(0, 180) });
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(list.slice(0, 15)));
  } catch { /* ignore */ }
}

export function getCrashTelemetry() {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
  } catch {
    return [];
  }
}
