import { PatrolRecord, ReportConfig } from '../types';

const DB_NAME = 'SiPatroliDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'records_store';
const STORE_CONFIG = 'config_store';

export const STORAGE_KEY_RECORDS = 'sipatroli_dcktrp_records_v1';
export const STORAGE_KEY_CONFIG = 'sipatroli_dcktrp_config_v1';

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS);
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save records with IndexedDB primary & graceful localStorage fallback
export async function saveRecords(records: PatrolRecord[]): Promise<void> {
  // 1. Always save full records to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_RECORDS, 'readwrite');
      const store = transaction.objectStore(STORE_RECORDS);
      const req = store.put(records, 'all_records');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('Could not save to IndexedDB, fallback to localStorage:', idbErr);
  }

  // 2. Save to localStorage with quota safety
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (quotaErr) {
    console.warn('LocalStorage quota exceeded. Saving lightweight metadata copy to localStorage.');
    try {
      // Remove heavy photo base64 strings from localStorage copy to stay within quota
      const lightweight = records.map((r) => {
        if (!r.foto || (Array.isArray(r.foto) && r.foto.length === 0)) {
          return r;
        }
        return {
          ...r,
          foto: Array.isArray(r.foto) ? [] : undefined,
        };
      });
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(lightweight));
    } catch {
      // If even lightweight copy cannot fit, clear old key to prevent recurring errors
      try {
        localStorage.removeItem(STORAGE_KEY_RECORDS);
      } catch {
        // ignore
      }
    }
  }
}

// Load records from IndexedDB first, then localStorage
export async function loadRecords(): Promise<PatrolRecord[] | null> {
  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const records = await new Promise<PatrolRecord[] | null>((resolve) => {
      const transaction = db.transaction(STORE_RECORDS, 'readonly');
      const store = transaction.objectStore(STORE_RECORDS);
      const req = store.get('all_records');
      req.onsuccess = () => {
        if (req.result !== undefined && Array.isArray(req.result)) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });

    if (records !== null && Array.isArray(records)) {
      return records;
    }
  } catch {
    // fallback to localStorage
  }

  // 2. Fallback to localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

// Save config
export async function saveConfig(config: ReportConfig): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_CONFIG, 'readwrite');
      const store = transaction.objectStore(STORE_CONFIG);
      const req = store.put(config, 'current_config');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // ignore
  }
}

// Load config
export async function loadConfig(): Promise<ReportConfig | null> {
  try {
    const db = await openDB();
    const cfg = await new Promise<ReportConfig | null>((resolve) => {
      const transaction = db.transaction(STORE_CONFIG, 'readonly');
      const store = transaction.objectStore(STORE_CONFIG);
      const req = store.get('current_config');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (cfg) return cfg;
  } catch {
    // ignore
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }

  return null;
}

// High performance image compressor (reduces 5-10MB camera shots down to ~80-120KB)
export function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
