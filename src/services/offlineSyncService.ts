import { CatchLog, SyncStatusInfo, StoredPhotoRecord } from '../types';
import {
  getUnsyncedCatchesFromIndexedDB,
  loadCatchesFromIndexedDB,
  markCatchAsSyncedInIndexedDB,
  getStoredPhotoFromIndexedDB,
  saveCatchToIndexedDB,
  saveAllCatchesToIndexedDB,
} from '../utils/indexedDb';
import {
  auth,
  uploadCatchToFirestore,
  fetchCatchesFromFirestore,
  subscribeToUserCatches,
  deleteCatchFromFirestore,
  isFirestoreQuotaExhausted,
  markFirestoreQuotaExhausted,
  disableFirestoreNetwork,
  enableFirestoreNetwork,
} from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { compressForCloudSync } from '../utils/imageCompressor';

type SyncListener = (status: SyncStatusInfo) => void;
type CatchesUpdateListener = (updatedCatches: CatchLog[]) => void;
type AuthUserListener = (user: User | null) => void;

export interface SyncDetailedProgress {
  isSyncing: boolean;
  stage: 'idle' | 'uploading' | 'downloading' | 'complete' | 'error';
  current: number;
  total: number;
  species: string;
  pushedCount: number;
  failedCount: number;
  message: string;
}

type DetailedProgressListener = (prog: SyncDetailedProgress) => void;

class OfflineSyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: number | null = null;
  private currentUser: User | null = null;
  private listeners: Set<SyncListener> = new Set();
  private catchesListeners: Set<CatchesUpdateListener> = new Set();
  private authListeners: Set<AuthUserListener> = new Set();
  private progressListeners: Set<DetailedProgressListener> = new Set();
  private lastDetailedProgress: SyncDetailedProgress = {
    isSyncing: false,
    stage: 'idle',
    current: 0,
    total: 0,
    species: '',
    pushedCount: 0,
    failedCount: 0,
    message: '',
  };
  private firestoreUnsubscribe: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatus();
        // Only trigger sync on reconnect if not quota exhausted
        if (!isFirestoreQuotaExhausted()) {
          this.triggerSync();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyStatus();
      });

      // Listen to Firebase Auth state
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.authListeners.forEach((fn) => {
          try {
            fn(user);
          } catch (e) {
            console.error('Error in auth listener:', e);
          }
        });

        // Detach previous firestore listener if user changed
        if (this.firestoreUnsubscribe) {
          this.firestoreUnsubscribe();
          this.firestoreUnsubscribe = null;
        }

        if (user) {
          // If Firestore quota is exhausted, do not attempt cloud writes; keep app safely offline
          if (isFirestoreQuotaExhausted()) {
            this.notifyStatus();
            return;
          }

          // Immediately perform two-way reconciliation:
          // 1. Upload local unsynced catches to Firestore
          // 2. Download cloud catches from Firestore and merge
          await this.syncWithCloudNow();

          // Attach real-time Firestore listener for live updates across devices
          this.firestoreUnsubscribe = subscribeToUserCatches(
            user.uid,
            async (cloudCatches) => {
              if (cloudCatches && cloudCatches.length > 0) {
                await this.mergeCloudCatchesIntoLocal(cloudCatches);
              }
            },
            (err) => {
              console.warn('Real-time cloud subscription error:', err);
            }
          );
        } else {
          this.notifyStatus();
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    this.getSyncStatus().then((status) => listener(status));
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeCatchesUpdate(listener: CatchesUpdateListener): () => void {
    this.catchesListeners.add(listener);
    return () => {
      this.catchesListeners.delete(listener);
    };
  }

  public subscribeAuthUser(listener: AuthUserListener): () => void {
    this.authListeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.authListeners.delete(listener);
    };
  }

  public subscribeDetailedProgress(listener: DetailedProgressListener): () => void {
    this.progressListeners.add(listener);
    listener(this.lastDetailedProgress);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  public notifyDetailedProgress(prog: SyncDetailedProgress): void {
    this.lastDetailedProgress = prog;
    this.progressListeners.forEach((fn) => {
      try {
        fn(prog);
      } catch (err) {
        console.error('Error in progress listener:', err);
      }
    });
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public async getSyncStatus(): Promise<SyncStatusInfo> {
    try {
      const unsynced = await getUnsyncedCatchesFromIndexedDB();
      const all = await loadCatchesFromIndexedDB();
      const unsyncedCount = unsynced.length;

      let state: SyncStatusInfo['state'] = 'synced';
      if (this.isSyncing) {
        state = 'syncing';
      } else if (!this.isOnline || unsyncedCount > 0) {
        state = 'offline_pending';
      }

      return {
        state,
        isOnline: this.isOnline,
        unsyncedCount,
        totalCount: all.length,
        lastSyncedAt: this.lastSyncedAt,
        isSyncing: this.isSyncing,
      };
    } catch {
      return {
        state: this.isOnline ? 'synced' : 'offline_pending',
        isOnline: this.isOnline,
        unsyncedCount: 0,
        totalCount: 0,
        lastSyncedAt: this.lastSyncedAt,
        isSyncing: this.isSyncing,
      };
    }
  }

  public async notifyStatus(): Promise<void> {
    const status = await this.getSyncStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in sync status listener:', err);
      }
    });
  }

  /**
   * Reconcile Cloud Firestore catches into local IndexedDB and React state
   */
  public async mergeCloudCatchesIntoLocal(cloudCatches: CatchLog[]): Promise<CatchLog[]> {
    try {
      const localCatches = await loadCatchesFromIndexedDB();
      const localMap = new Map<string, CatchLog>(localCatches.map((c) => [c.id, c]));

      let hasNewData = false;
      for (const cloudCatch of cloudCatches) {
        let photoUrlToUse = cloudCatch.photoUrl;

        // If cloud catch contains a data:image base64 photo, cache it in local IndexedDB
        if (cloudCatch.photoUrl && cloudCatch.photoUrl.startsWith('data:image/')) {
          try {
            const res = await fetch(cloudCatch.photoUrl);
            const blob = await res.blob();
            await saveCatchToIndexedDB(cloudCatch, blob);
          } catch {}
        } else if (cloudCatch.photoUrl && cloudCatch.photoUrl.startsWith('blob:')) {
          // A blob: URL from another device is invalid locally
          const localPhoto = await getStoredPhotoFromIndexedDB(cloudCatch.id);
          if (!localPhoto?.blob) {
            photoUrlToUse = '';
          }
        }

        const existing = localMap.get(cloudCatch.id);
        if (!existing) {
          localMap.set(cloudCatch.id, { ...cloudCatch, photoUrl: photoUrlToUse, isSynced: true });
          hasNewData = true;
        } else {
          // If the local catch has pending unsynced changes (e.g. freshly replaced photo or unpushed edit),
          // do NOT let the stale cloud copy overwrite it!
          if (existing.isSynced === false) {
            continue;
          }
          // Prioritize local photo if present and valid, falling back to cloud photo
          const bestPhoto = existing.photoUrl || photoUrlToUse || '';
          localMap.set(cloudCatch.id, {
            ...existing,
            ...cloudCatch,
            photoBlobId: existing.photoBlobId || cloudCatch.photoBlobId,
            photoUrl: bestPhoto,
            photoRotation: existing.photoRotation !== undefined ? existing.photoRotation : cloudCatch.photoRotation,
            isSynced: true,
          });
          hasNewData = true;
        }
      }

      const merged = Array.from(localMap.values()).sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );

      if (hasNewData) {
        await saveAllCatchesToIndexedDB(merged);
        try {
          const { saveCatches } = await import('../utils/storage');
          saveCatches(merged);
        } catch {}

        this.catchesListeners.forEach((fn) => {
          try {
            fn(merged);
          } catch (e) {
            console.error('Error updating catches listeners:', e);
          }
        });
      }

      return merged;
    } catch (err) {
      console.error('Error merging cloud catches:', err);
      return [];
    }
  }

  /**
   * Two-Way Cloud Sync:
   * 1. Push all local un-synced catches to Firestore
   * 2. Pull all cloud catches from Firestore to local
   */
  public async syncWithCloudNow(forceAll: boolean = false): Promise<{
    success: boolean;
    pushedCount: number;
    pulledCount: number;
    error?: string;
  }> {
    if (!this.currentUser) {
      // If not logged in, trigger regular offline sync
      const res = await this.triggerSync();
      return { success: res.success, pushedCount: res.syncedCount, pulledCount: 0 };
    }

    if (!this.isOnline) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: 'Offline' };
    }

    // Circuit breaker: If Google Cloud daily write quota is exhausted, operate safely in 100% offline mode
    if (isFirestoreQuotaExhausted()) {
      this.isSyncing = false;
      this.notifyStatus();
      this.notifyDetailedProgress({
        isSyncing: false,
        stage: 'idle',
        current: 0,
        total: 0,
        species: '',
        pushedCount: 0,
        failedCount: 0,
        message: 'Cloud Sync Paused: Daily free quota limit reached (resets daily at midnight PT). Local catches remain 100% saved offline.',
      });
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        error: 'Cloud Sync Paused: Daily free write quota reached (resets at midnight PT). Catches are safely stored offline on this device.',
      };
    }

    this.isSyncing = true;
    this.notifyStatus();

    try {
      const userId = this.currentUser.uid;

      // 1. Get catches that actually need uploading
      const localCatches = await loadCatchesFromIndexedDB();
      const catchesToPush = forceAll
        ? localCatches
        : localCatches.filter(
            (c) => !c.isSynced || typeof c.syncedAt !== 'number'
          );

      let pushedCount = 0;
      const failedErrors: string[] = [];

      if (catchesToPush.length === 0) {
        this.notifyDetailedProgress({
          isSyncing: true,
          stage: 'downloading',
          current: 0,
          total: 0,
          species: '',
          pushedCount: 0,
          failedCount: 0,
          message: 'Local catches up to date. Fetching latest cloud catches...',
        });
      }

      for (let i = 0; i < catchesToPush.length; i++) {
        const catchLog = catchesToPush[i];
        let permanentPhotoUrl = catchLog.photoUrl;

        this.notifyDetailedProgress({
          isSyncing: true,
          stage: 'uploading',
          current: i + 1,
          total: catchesToPush.length,
          species: catchLog.species || 'Catfish',
          pushedCount,
          failedCount: failedErrors.length,
          message: `Syncing catch ${i + 1} of ${catchesToPush.length}: ${catchLog.species || 'Catfish'}...`,
        });

        // Convert photo into a cloud-safe self-contained data URL (< 220KB)
        try {
          const photoRecord = await getStoredPhotoFromIndexedDB(catchLog.id);
          if (photoRecord?.blob) {
            const cloudDataUrl = await compressForCloudSync(photoRecord.blob);
            if (cloudDataUrl) {
              permanentPhotoUrl = cloudDataUrl;
            }
          } else if (
            catchLog.photoUrl &&
            (catchLog.photoUrl.startsWith('data:image/') || catchLog.photoUrl.startsWith('blob:'))
          ) {
            const cloudDataUrl = await compressForCloudSync(catchLog.photoUrl);
            if (cloudDataUrl) {
              permanentPhotoUrl = cloudDataUrl;
            }
          }
        } catch (photoErr) {
          console.warn(`Photo cloud compression skipped for ${catchLog.id}:`, photoErr);
        }

        // Avoid persisting dead foreign blob URLs to Firestore
        if (permanentPhotoUrl && permanentPhotoUrl.startsWith('blob:')) {
          const localRecord = await getStoredPhotoFromIndexedDB(catchLog.id);
          if (!localRecord?.blob) {
            permanentPhotoUrl = '';
          }
        }

        try {
          const preparedCatch: CatchLog = {
            ...catchLog,
            photoUrl: permanentPhotoUrl,
            isSynced: true,
            syncedAt: Date.now(),
          };

          // Upload catch document to Firestore under users/{userId}/catches/{catchId}
          await uploadCatchToFirestore(userId, preparedCatch);
          await markCatchAsSyncedInIndexedDB(catchLog.id, permanentPhotoUrl);
          pushedCount++;
        } catch (uploadErr: any) {
          const errString = uploadErr?.message || String(uploadErr);
          console.warn(`Failed to push catch ${catchLog.id} (${catchLog.species}) to Firestore:`, uploadErr);
          
          if (
            errString.includes('resource-exhausted') ||
            errString.includes('Quota limit exceeded') ||
            isFirestoreQuotaExhausted()
          ) {
            markFirestoreQuotaExhausted();
            disableFirestoreNetwork().catch(() => {});
            failedErrors.push('Firebase daily free write quota limit reached (resets daily at midnight PT). Local catches remain 100% saved offline.');
            // Stop attempting further writes today to prevent repeated errors
            break;
          } else {
            failedErrors.push(`${catchLog.species}: ${errString}`);
          }
        }
      }

      // 2. Fetch all cloud catches from Firestore
      this.notifyDetailedProgress({
        isSyncing: true,
        stage: 'downloading',
        current: localCatches.length,
        total: localCatches.length,
        species: '',
        pushedCount,
        failedCount: failedErrors.length,
        message: 'Synchronizing latest cloud catches to this device...',
      });

      const cloudCatches = await fetchCatchesFromFirestore(userId);
      const merged = await this.mergeCloudCatchesIntoLocal(cloudCatches);

      this.lastSyncedAt = Date.now();
      this.isSyncing = false;
      this.notifyStatus();

      const finalMessage = failedErrors.length > 0
        ? `Uploaded ${pushedCount} of ${localCatches.length} catches (${failedErrors.length} failed). Pulled ${cloudCatches.length} cloud records.`
        : `Successfully synced all ${pushedCount} catches with Google Cloud!`;

      this.notifyDetailedProgress({
        isSyncing: false,
        stage: failedErrors.length > 0 ? 'error' : 'complete',
        current: localCatches.length,
        total: localCatches.length,
        species: '',
        pushedCount,
        failedCount: failedErrors.length,
        message: finalMessage,
      });

      return {
        success: failedErrors.length === 0,
        pushedCount,
        pulledCount: cloudCatches.length,
        error: failedErrors.length > 0 ? failedErrors.join('; ') : undefined,
      };
    } catch (err: any) {
      console.error('Cloud sync failed:', err);
      this.isSyncing = false;
      this.notifyStatus();
      this.notifyDetailedProgress({
        isSyncing: false,
        stage: 'error',
        current: 0,
        total: 0,
        species: '',
        pushedCount: 0,
        failedCount: 1,
        message: err.message || 'Cloud sync failed',
      });
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        error: err.message || 'Cloud sync failed',
      };
    }
  }

  /**
   * Run background sync for all unsynced catches and attached photos
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      this.notifyStatus();
      return { success: false, syncedCount: 0 };
    }

    if (this.currentUser) {
      const res = await this.syncWithCloudNow();
      return { success: res.success, syncedCount: res.pushedCount };
    }

    this.isSyncing = true;
    this.notifyStatus();

    try {
      const unsyncedCatches = await getUnsyncedCatchesFromIndexedDB();

      if (unsyncedCatches.length === 0) {
        this.isSyncing = false;
        this.notifyStatus();
        return { success: true, syncedCount: 0 };
      }

      let totalSynced = 0;
      const catchesToPush: CatchLog[] = [];

      for (const catchLog of unsyncedCatches) {
        let permanentPhotoUrl = catchLog.photoUrl;
        let photoUploadFailed = false;

        // Check if there is an unsynced photo blob or base64 data to upload
        try {
          const photoRecord = await getStoredPhotoFromIndexedDB(catchLog.id);
          const hasLocalPhotoData = Boolean(
            photoRecord?.blob ||
            (catchLog.photoUrl && (catchLog.photoUrl.startsWith('data:image/') || catchLog.photoUrl.startsWith('blob:')))
          );

          const needsPhotoUpload =
            hasLocalPhotoData &&
            (!photoRecord?.isSynced || !permanentPhotoUrl?.startsWith('/uploads/'));

          if (needsPhotoUpload) {
            let photoDataToUpload: string | null = null;

            if (catchLog.photoUrl && catchLog.photoUrl.startsWith('data:image/')) {
              photoDataToUpload = catchLog.photoUrl;
            } else if (photoRecord?.blob) {
              photoDataToUpload = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                const timer = setTimeout(() => reject(new Error('FileReader timeout')), 10000);
                reader.onloadend = () => {
                  clearTimeout(timer);
                  resolve(reader.result as string);
                };
                reader.onerror = (err) => {
                  clearTimeout(timer);
                  reject(err);
                };
                reader.readAsDataURL(photoRecord.blob);
              });
            }

            if (photoDataToUpload) {
              const photoRes = await fetch('/api/upload-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  photoData: photoDataToUpload,
                  catchId: catchLog.id,
                  fileName: `catch_${catchLog.id}.jpg`,
                }),
              });

              if (photoRes.ok) {
                const photoResult = await photoRes.json();
                if (photoResult.success && photoResult.photoUrl) {
                  permanentPhotoUrl = photoResult.photoUrl;
                } else {
                  photoUploadFailed = true;
                }
              } else {
                photoUploadFailed = true;
              }
            } else {
              photoUploadFailed = true;
            }
          }
        } catch (photoErr) {
          console.warn(`Could not upload photo for catch ${catchLog.id}, queuing for retry:`, photoErr);
          photoUploadFailed = true;
        }

        const isCatchReadyForSynced = !photoUploadFailed;

        const preparedCatch: CatchLog = {
          ...catchLog,
          photoUrl: permanentPhotoUrl,
          isSynced: isCatchReadyForSynced,
          syncedAt: isCatchReadyForSynced ? Date.now() : undefined,
          syncError: photoUploadFailed ? 'Photo upload queued for retry' : undefined,
        };

        catchesToPush.push(preparedCatch);
      }

      // Push to server endpoint as fallback
      if (catchesToPush.length > 0) {
        const syncRes = await fetch('/api/sync-catches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catches: catchesToPush }),
        });

        if (syncRes.ok) {
          const syncResult = await syncRes.json();
          if (syncResult.success) {
            for (const c of catchesToPush) {
              if (c.isSynced) {
                await markCatchAsSyncedInIndexedDB(c.id, c.photoUrl);
              } else {
                await saveCatchToIndexedDB(c);
              }
            }
            totalSynced = catchesToPush.filter((c) => c.isSynced).length;
            this.lastSyncedAt = Date.now();
          }
        }
      }

      const allUpdated = await loadCatchesFromIndexedDB();
      try {
        const { saveCatches } = await import('../utils/storage');
        saveCatches(allUpdated);
      } catch {}

      this.catchesListeners.forEach((fn) => {
        try {
          fn(allUpdated);
        } catch (err) {
          console.error('Error notifying catches listeners:', err);
        }
      });

      this.isSyncing = false;
      this.notifyStatus();

      return { success: true, syncedCount: totalSynced };
    } catch (err) {
      console.error('Background sync failed:', err);
      this.isSyncing = false;
      this.notifyStatus();
      return { success: false, syncedCount: 0 };
    }
  }

  public async repairLocalCatches(): Promise<{
    success: boolean;
    repairedCount: number;
    totalPhotosFound: number;
  }> {
    try {
      const { repairAndResyncLocalCatches } = await import('../utils/indexedDb');
      const { saveCatches } = await import('../utils/storage');

      const result = await repairAndResyncLocalCatches();
      saveCatches(result.catches);

      this.catchesListeners.forEach((fn) => {
        try {
          fn(result.catches);
        } catch (err) {
          console.error('Error notifying catches listeners during repair:', err);
        }
      });

      await this.notifyStatus();

      if (this.isOnline && !isFirestoreQuotaExhausted()) {
        await this.triggerSync();
      }

      return {
        success: true,
        repairedCount: result.repairedCount,
        totalPhotosFound: result.totalPhotosFound,
      };
    } catch (err) {
      console.error('Failed to repair local catches:', err);
      return { success: false, repairedCount: 0, totalPhotosFound: 0 };
    }
  }

  public async saveCatchOfflineFirst(
    catchLog: CatchLog,
    photoBlob?: Blob | null
  ): Promise<CatchLog> {
    const isOnlineNow = typeof navigator !== 'undefined' && navigator.onLine;

    const preparedLog: CatchLog = {
      ...catchLog,
      isSynced: false,
    };

    // 1. Save immediately to IndexedDB (offline-first instant write)
    await saveCatchToIndexedDB(preparedLog, photoBlob);

    // 2. Notify sync status listeners
    this.notifyStatus();

    // 3. If online and cloud write quota is available, trigger background sync
    if (isOnlineNow && !isFirestoreQuotaExhausted()) {
      setTimeout(() => {
        this.triggerSync();
      }, 100);
    }

    return preparedLog;
  }

  public async deleteCatchEverywhere(catchId: string): Promise<void> {
    if (this.currentUser && !isFirestoreQuotaExhausted()) {
      try {
        await deleteCatchFromFirestore(this.currentUser.uid, catchId);
      } catch (err) {
        console.warn('Could not delete catch from Firestore:', err);
      }
    }
  }

  public isCloudQuotaExhausted(): boolean {
    return isFirestoreQuotaExhausted();
  }

  public async retryCloudConnection(): Promise<void> {
    await enableFirestoreNetwork();
    if (this.currentUser) {
      await this.syncWithCloudNow();
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
