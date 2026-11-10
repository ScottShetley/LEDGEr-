import { CatchLog, StoredPhotoRecord } from '../types';
import { normalizeBaitName } from './baitNormalizer';

const DB_NAME = 'ledger_river_log_v2';
const DB_VERSION = 1;

const STORES = {
  CATCHES: 'catches',
  PHOTOS: 'photos',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open and initialize IndexedDB with object stores and indexes
 */
export function getIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Catches store
        if (!db.objectStoreNames.contains(STORES.CATCHES)) {
          const catchStore = db.createObjectStore(STORES.CATCHES, { keyPath: 'id' });
          catchStore.createIndex('isSynced', 'isSynced', { unique: false });
          catchStore.createIndex('timestamp', 'timestamp', { unique: false });
          catchStore.createIndex('species', 'species', { unique: false });
          catchStore.createIndex('isBait', 'isBait', { unique: false });
        }

        // Photos store for raw Blobs
        if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
          const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' });
          photoStore.createIndex('catchId', 'catchId', { unique: false });
          photoStore.createIndex('isSynced', 'isSynced', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  return dbPromise;
}

/**
 * Save or update a single catch in IndexedDB, optionally storing the raw photo Blob
 */
export async function saveCatchToIndexedDB(
  catchLog: CatchLog,
  photoBlob?: Blob | null
): Promise<void> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
    const catchStore = transaction.objectStore(STORES.CATCHES);
    const photoStore = transaction.objectStore(STORES.PHOTOS);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (e) => {
      console.error('Transaction error saving catch to IndexedDB:', (e.target as IDBTransaction).error);
      reject((e.target as IDBTransaction).error);
    };

    // Save photo blob if present
    if (photoBlob) {
      const photoId = catchLog.photoBlobId || `photo-${catchLog.id}`;
      const photoRecord: StoredPhotoRecord = {
        id: photoId,
        catchId: catchLog.id,
        blob: photoBlob,
        mimeType: photoBlob.type || 'image/jpeg',
        sizeBytes: photoBlob.size,
        createdAt: Date.now(),
        isSynced: Boolean(catchLog.isSynced),
        permanentUrl: catchLog.photoUrl?.startsWith('http') ? catchLog.photoUrl : undefined,
      };

      photoStore.put(photoRecord);
      catchLog.photoBlobId = photoId;
      catchLog.photoSizeBytes = photoBlob.size;
    }

    // Save catch log record
    catchStore.put(catchLog);
  });
}

/**
 * Save multiple catches in batch (e.g. migration from localStorage or sample data)
 */
export async function saveAllCatchesToIndexedDB(catches: CatchLog[]): Promise<void> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES], 'readwrite');
    const catchStore = transaction.objectStore(STORES.CATCHES);

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject((e.target as IDBTransaction).error);

    for (const c of catches) {
      catchStore.put(c);
    }
  });
}

/**
 * Hydrate catches with active live object URLs from IndexedDB STORES.PHOTOS.
 * This guarantees offline persistence across app restarts without dead blob: URLs.
 */
export async function hydrateCatchesWithStoredPhotos(catches: CatchLog[]): Promise<CatchLog[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.PHOTOS], 'readonly');
      const photoStore = transaction.objectStore(STORES.PHOTOS);
      const allPhotosReq = photoStore.getAll();

      allPhotosReq.onsuccess = () => {
        const photoRecords = (allPhotosReq.result as StoredPhotoRecord[]) || [];
        const photoMapByCatchId = new Map<string, StoredPhotoRecord>();
        const photoMapById = new Map<string, StoredPhotoRecord>();

        for (const pr of photoRecords) {
          if (pr.catchId) photoMapByCatchId.set(pr.catchId, pr);
          if (pr.id) photoMapById.set(pr.id, pr);
        }

        const hydrated = catches.map((c) => {
          const rec = photoMapByCatchId.get(c.id) || (c.photoBlobId ? photoMapById.get(c.photoBlobId) : undefined);
          if (rec && rec.blob) {
            // Always prefer active live object URL from IndexedDB for zero-lag offline display
            try {
              const freshUrl = URL.createObjectURL(rec.blob);
              return {
                ...c,
                photoUrl: freshUrl,
                photoBlobId: rec.id,
                photoSizeBytes: rec.sizeBytes || rec.blob.size,
              };
            } catch (e) {
              console.warn('Could not create Object URL for photo:', e);
            }
          }
          return c;
        });

        resolve(hydrated);
      };

      allPhotosReq.onerror = () => resolve(catches);
    });
  } catch {
    return catches;
  }
}

/**
 * Resolve a fresh object URL for a given catch or photo ID from IndexedDB with server backup recovery
 */
export async function resolvePhotoBlobUrl(idOrCatchId: string): Promise<string | null> {
  if (!idOrCatchId) return null;
  const cleanId = idOrCatchId.replace(/^(photo-|catch-)/, '');
  const record =
    (await getStoredPhotoFromIndexedDB(idOrCatchId)) ||
    (await getStoredPhotoFromIndexedDB(`photo-${cleanId}`)) ||
    (await getStoredPhotoFromIndexedDB(`catch-${cleanId}`)) ||
    (await getStoredPhotoFromIndexedDB(cleanId));

  if (record && record.blob) {
    try {
      return URL.createObjectURL(record.blob);
    } catch {
      // fallback
    }
  }

  // Self-heal: fetch from server photo backup and persist to IndexedDB
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch(`/api/photo-backup/${encodeURIComponent(idOrCatchId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.dataUrl) {
          const blobRes = await fetch(data.dataUrl);
          const blob = await blobRes.blob();
          const db = await getIndexedDB();
          const photoId = `photo-${cleanId}`;
          const photoRecord: StoredPhotoRecord = {
            id: photoId,
            catchId: idOrCatchId,
            blob,
            mimeType: blob.type || 'image/jpeg',
            sizeBytes: blob.size,
            createdAt: Date.now(),
            isSynced: true,
            permanentUrl: data.photoUrl,
          };
          await new Promise<void>((resPut) => {
            const tx = db.transaction([STORES.PHOTOS], 'readwrite');
            tx.oncomplete = () => resPut();
            tx.onerror = () => resPut();
            tx.objectStore(STORES.PHOTOS).put(photoRecord);
          });
          return URL.createObjectURL(blob);
        }
      }
    } catch {
      // Offline fallback
    }
  }

  return null;
}

/**
 * Retrieve all stored photo records from IndexedDB
 */
export async function getAllStoredPhotosFromIndexedDB(): Promise<StoredPhotoRecord[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.PHOTOS], 'readonly');
      const photoStore = transaction.objectStore(STORES.PHOTOS);
      const req = photoStore.getAll();
      req.onsuccess = () => resolve((req.result as StoredPhotoRecord[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Load all catches from IndexedDB, ordered newest first and hydrated with live photo object URLs
 */
export async function loadCatchesFromIndexedDB(): Promise<CatchLog[]> {
  try {
    const db = await getIndexedDB();

    const rawCatches = await new Promise<CatchLog[]>((resolve, reject) => {
      const transaction = db.transaction([STORES.CATCHES], 'readonly');
      const catchStore = transaction.objectStore(STORES.CATCHES);
      const request = catchStore.getAll();

      request.onsuccess = () => {
        resolve((request.result as CatchLog[]) || []);
      };

      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });

    const realResults = rawCatches.filter((c) => !c.id.startsWith('sample-'));
    if (realResults.length !== rawCatches.length) {
      // Clean up demo sample catches in background
      for (const c of rawCatches) {
        if (c.id.startsWith('sample-')) {
          deleteCatchFromIndexedDB(c.id).catch(() => {});
        }
      }
    }
    // Sort by timestamp descending
    realResults.sort((a, b) => b.timestamp - a.timestamp);

    // Normalize any bait names (e.g. legacy 'Cutbait Gizzard Shad' -> 'Cut Gizzard Shad')
    for (const c of realResults) {
      if (!c.isBait && c.baitRig) {
        const normalized = normalizeBaitName(c.baitRig);
        if (normalized !== c.baitRig) {
          c.baitRig = normalized;
          updateCatchInIndexedDB(c.id, { baitRig: normalized }).catch(() => {});
        }
      }
    }

    // Hydrate photo URLs with fresh session object URLs from STORES.PHOTOS
    return await hydrateCatchesWithStoredPhotos(realResults);
  } catch (err) {
    console.warn('Could not read from IndexedDB, returning empty array:', err);
    return [];
  }
}

/**
 * Retrieve all records where isSynced === false or syncedAt is missing
 */
export async function getUnsyncedCatchesFromIndexedDB(): Promise<CatchLog[]> {
  try {
    const all = await loadCatchesFromIndexedDB();
    return all.filter((c) => {
      // Catch is considered synced if isSynced is true and syncedAt is recorded
      if (c.isSynced === true && typeof c.syncedAt === 'number') {
        return false;
      }
      return true;
    });
  } catch (err) {
    console.error('Error fetching unsynced catches:', err);
    return [];
  }
}

/**
 * Repair existing catches: recovers all orphaned photo blobs, re-links them to their catch records,
 * and resets sync status for any records that need cloud upload.
 */
export async function repairAndResyncLocalCatches(): Promise<{
  repairedCount: number;
  totalPhotosFound: number;
  catches: CatchLog[];
}> {
  try {
    const db = await getIndexedDB();
    const allCatches = await loadCatchesFromIndexedDB();
    const existingPhotos = await getAllStoredPhotosFromIndexedDB();

    const photoMap = new Map<string, StoredPhotoRecord>();
    for (const p of existingPhotos) {
      if (p.catchId) photoMap.set(p.catchId, p);
      if (p.id) photoMap.set(p.id, p);
    }

    // Check if any catches are missing their photo blob, and fetch server backups if online
    let serverBackups: Record<string, string> = {};
    const hasMissingPhotos = allCatches.some(
      (c) => c.photoUrl && !photoMap.get(c.id) && !(c.photoBlobId && photoMap.get(c.photoBlobId))
    );

    if (hasMissingPhotos && typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/all-photos-backup');
        if (res.ok) {
          const data = await res.json();
          if (data.photos) serverBackups = data.photos;
        }
      } catch {
        // Offline fallback
      }
    }

    // Prepare all restored photo records and updated catches in memory BEFORE starting write transaction
    const newPhotosToSave: StoredPhotoRecord[] = [];
    const catchesToUpdate: CatchLog[] = [];
    const updatedCatches: CatchLog[] = [];
    let repairedCount = 0;

    for (const c of allCatches) {
      let photoRecord = photoMap.get(c.id) || (c.photoBlobId ? photoMap.get(c.photoBlobId) : undefined);
      let wasRepaired = false;
      let freshUrl = c.photoUrl;

      // If missing local blob, try to reconstruct from server backup
      if ((!photoRecord || !photoRecord.blob) && Object.keys(serverBackups).length > 0) {
        const matchedKey = Object.keys(serverBackups).find(
          (k) => k.includes(c.id) || (c.photoUrl && c.photoUrl.includes(k))
        );
        if (matchedKey && serverBackups[matchedKey]) {
          try {
            const b64 = serverBackups[matchedKey];
            const blobRes = await fetch(`data:image/jpeg;base64,${b64}`);
            const blob = await blobRes.blob();
            const photoId = c.photoBlobId || `photo-${c.id}`;
            photoRecord = {
              id: photoId,
              catchId: c.id,
              blob,
              mimeType: 'image/jpeg',
              sizeBytes: blob.size,
              createdAt: Date.now(),
              isSynced: true,
              permanentUrl: `/uploads/${matchedKey}`,
            };
            newPhotosToSave.push(photoRecord);
            photoMap.set(c.id, photoRecord);
            photoMap.set(photoId, photoRecord);
            wasRepaired = true;
          } catch (healErr) {
            console.warn(`Could not restore photo for ${c.id}:`, healErr);
          }
        }
      }

      if (photoRecord && photoRecord.blob) {
        try {
          freshUrl = URL.createObjectURL(photoRecord.blob);
          wasRepaired = true;
        } catch {}
      }

      const updated: CatchLog = {
        ...c,
        photoUrl: freshUrl,
        photoBlobId: photoRecord?.id || c.photoBlobId,
        photoSizeBytes: photoRecord?.sizeBytes || c.photoSizeBytes,
      };

      if (wasRepaired) {
        repairedCount++;
        catchesToUpdate.push(updated);
      }

      updatedCatches.push(updated);
    }

    // Now execute all writes in a single, focused, synchronous IndexedDB transaction
    if (newPhotosToSave.length > 0 || catchesToUpdate.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
        const catchStore = transaction.objectStore(STORES.CATCHES);
        const photoStore = transaction.objectStore(STORES.PHOTOS);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject((e.target as IDBTransaction).error);

        for (const p of newPhotosToSave) {
          photoStore.put(p);
        }
        for (const c of catchesToUpdate) {
          catchStore.put(c);
        }
      });
    }

    return {
      repairedCount,
      totalPhotosFound: existingPhotos.length + newPhotosToSave.length,
      catches: updatedCatches,
    };
  } catch (err) {
    console.error('Error in repairAndResyncLocalCatches:', err);
    return {
      repairedCount: 0,
      totalPhotosFound: 0,
      catches: [],
    };
  }
}

/**
 * Get stored photo record and blob by photoId or catchId
 */
export async function getStoredPhotoFromIndexedDB(
  idOrCatchId: string
): Promise<StoredPhotoRecord | null> {
  try {
    const db = await getIndexedDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.PHOTOS], 'readonly');
      const photoStore = transaction.objectStore(STORES.PHOTOS);

      // Try direct id get
      const request = photoStore.get(idOrCatchId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as StoredPhotoRecord);
          return;
        }

        // Try query by catchId index
        try {
          const index = photoStore.index('catchId');
          const catchRequest = index.get(idOrCatchId);
          catchRequest.onsuccess = () => {
            resolve((catchRequest.result as StoredPhotoRecord) || null);
          };
          catchRequest.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Update specific fields of a catch in IndexedDB, optionally replacing the photo blob
 */
export async function updateCatchInIndexedDB(
  id: string,
  updates: Partial<CatchLog>,
  photoBlob?: Blob | null
): Promise<CatchLog | null> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
    const catchStore = transaction.objectStore(STORES.CATCHES);
    const photoStore = transaction.objectStore(STORES.PHOTOS);

    let updatedResult: CatchLog | null = null;
    const getReq = catchStore.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as CatchLog | undefined;
      const photoId = existing?.photoBlobId || updates.photoBlobId || `photo-${id}`;

      if (photoBlob) {
        const photoRecord: StoredPhotoRecord = {
          id: photoId,
          catchId: id,
          blob: photoBlob,
          mimeType: photoBlob.type || 'image/jpeg',
          sizeBytes: photoBlob.size,
          createdAt: Date.now(),
          isSynced: false,
          permanentUrl: (updates.photoUrl || existing?.photoUrl)?.startsWith('http')
            ? (updates.photoUrl || existing?.photoUrl)
            : undefined,
        };
        photoStore.put(photoRecord);
      }

      if (existing) {
        updatedResult = { ...existing, ...updates };
        if (photoBlob) {
          updatedResult.photoBlobId = photoId;
          updatedResult.photoSizeBytes = photoBlob.size;
        }
        catchStore.put(updatedResult);
      } else {
        // If catch doesn't exist in IndexedDB store yet, return null so storage.ts does full saveCatchToIndexedDB
        resolve(null);
        return;
      }
    };

    getReq.onerror = (e) => reject((e.target as IDBRequest).error);
    transaction.oncomplete = () => resolve(updatedResult);
    transaction.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}

/**
 * Mark a catch as synced and update permanent photo URL if returned
 */
export async function markCatchAsSyncedInIndexedDB(
  id: string,
  permanentPhotoUrl?: string
): Promise<void> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
    const catchStore = transaction.objectStore(STORES.CATCHES);
    const photoStore = transaction.objectStore(STORES.PHOTOS);

    const getReq = catchStore.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as CatchLog | undefined;
      if (item) {
        item.isSynced = true;
        item.syncedAt = Date.now();
        item.syncError = undefined;
        if (permanentPhotoUrl) {
          item.photoUrl = permanentPhotoUrl;
        }
        catchStore.put(item);
      }

      // Also update photo record
      const photoId = item?.photoBlobId || `photo-${id}`;
      const photoReq = photoStore.get(photoId);
      photoReq.onsuccess = () => {
        const p = photoReq.result as StoredPhotoRecord | undefined;
        if (p) {
          p.isSynced = true;
          if (permanentPhotoUrl) p.permanentUrl = permanentPhotoUrl;
          photoStore.put(p);
        }
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}

/**
 * Delete a catch and its associated photo blob from IndexedDB
 */
export async function deleteCatchFromIndexedDB(id: string): Promise<void> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
    const catchStore = transaction.objectStore(STORES.CATCHES);
    const photoStore = transaction.objectStore(STORES.PHOTOS);

    catchStore.delete(id);

    // Delete photo
    const photoId = `photo-${id}`;
    photoStore.delete(photoId);
    photoStore.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}

/**
 * Clear all catches and photos from IndexedDB
 */
export async function clearAllIndexedDB(): Promise<void> {
  const db = await getIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CATCHES, STORES.PHOTOS], 'readwrite');
    transaction.objectStore(STORES.CATCHES).clear();
    transaction.objectStore(STORES.PHOTOS).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}
