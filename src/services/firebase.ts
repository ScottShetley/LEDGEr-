import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CatchLog } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Merge file config with environment variable overrides
const env = (import.meta as any).env || {};
const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  appId: (env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  firestoreDatabaseId: (env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
};

// Initialize Firebase App (strip empty string keys such as measurementId to prevent library warnings)
const cleanFirebaseConfig = Object.fromEntries(
  Object.entries(resolvedFirebaseConfig).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
);
export const app = getApps().length > 0 ? getApp() : initializeApp(cleanFirebaseConfig);

// CRITICAL: getFirestore must pass firestoreDatabaseId
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const QUOTA_STORAGE_KEY = 'firestore_quota_exhausted_until';

export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units per project')
  );
}

export function isFirestoreQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const expiry = parseInt(raw, 10);
    if (isNaN(expiry)) {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      return false;
    }
    if (Date.now() < expiry) {
      return true;
    }
    // Expired - clear it
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExhausted(): void {
  if (typeof window === 'undefined') return;
  try {
    // Next midnight Pacific Time (UTC-7/UTC-8) + 1 hour grace period
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(8, 5, 0, 0); // 00:05 PT is ~07:05/08:05 UTC
    if (nextMidnight.getTime() <= now.getTime()) {
      nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    }
    localStorage.setItem(QUOTA_STORAGE_KEY, String(nextMidnight.getTime()));
  } catch {}
}

export async function disableFirestoreNetwork(): Promise<void> {
  try {
    const { disableNetwork } = await import('firebase/firestore');
    await disableNetwork(db);
    console.info('Firestore network disabled (offline mode active)');
  } catch (err) {
    console.warn('Could not disable Firestore network:', err);
  }
}

export async function enableFirestoreNetwork(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
    const { enableNetwork } = await import('firebase/firestore');
    await enableNetwork(db);
    console.info('Firestore network re-enabled');
  } catch (err) {
    console.warn('Could not enable Firestore network:', err);
  }
}

// If quota is already marked as exhausted on startup, immediately disable network to halt retry loop
if (typeof window !== 'undefined' && isFirestoreQuotaExhausted()) {
  disableFirestoreNetwork().catch(() => {});
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Test initial connection as required by Firestore integration skill
export async function testFirestoreConnection() {
  if (isFirestoreQuotaExhausted()) {
    console.info('Firestore test connection skipped: daily free quota limit reached. Running offline.');
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markFirestoreQuotaExhausted();
      disableFirestoreNetwork().catch(() => {});
      console.warn('Firestore daily quota limit reached during test. Disabling network background retries.');
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or test connection notice:', error.message);
    }
  }
}
testFirestoreConnection();

/**
 * Sign in using Google popup (iframe-safe in AI Studio Build)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    // Sync user profile document if quota is not exhausted
    if (cred.user && !isFirestoreQuotaExhausted()) {
      await saveUserProfile(cred.user).catch((e) => {
        console.warn('Could not save user profile to cloud (continuing locally):', e);
      });
    }
    return cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ledgerfishing.com';
      const friendlyErr = new Error(
        `Domain "${currentHost}" must be authorized in Firebase. Add "${currentHost}" in Firebase Console (Project: ${resolvedFirebaseConfig.projectId}) -> Authentication -> Settings -> Authorized domains.`
      );
      (friendlyErr as any).code = 'auth/unauthorized-domain';
      console.error('Google sign-in unauthorized domain:', friendlyErr.message);
      throw friendlyErr;
    }
    console.error('Google sign-in failed:', err);
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Upsert User Profile in Firestore
 */
export async function saveUserProfile(user: User): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const data = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    lastActiveAt: new Date().toISOString(),
  };
  try {
    await setDoc(userRef, data, { merge: true });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markFirestoreQuotaExhausted();
      disableFirestoreNetwork().catch(() => {});
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Push an individual catch to Firestore under users/{uid}/catches/{catchId}
 */
export async function uploadCatchToFirestore(userId: string, catchLog: CatchLog): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    throw new Error('Firestore daily free write quota limit reached. Catches are safely preserved offline.');
  }

  const catchDocRef = doc(db, 'users', userId, 'catches', catchLog.id);
  
  // Clean environmentalSnapshot to remove any undefined properties
  const cleanEnvSnapshot: Record<string, any> = {};
  if (catchLog.environmentalSnapshot && typeof catchLog.environmentalSnapshot === 'object') {
    Object.entries(catchLog.environmentalSnapshot).forEach(([k, v]) => {
      if (v !== undefined) {
        cleanEnvSnapshot[k] = v;
      }
    });
  }

  const data: Record<string, any> = {
    id: String(catchLog.id),
    userId,
    timestamp: typeof catchLog.timestamp === 'number' ? catchLog.timestamp : Date.now(),
    lat: Number(catchLog.lat) || 0,
    lon: Number(catchLog.lon) || 0,
    accuracyMeters: catchLog.accuracyMeters != null ? Number(catchLog.accuracyMeters) : null,
    mode: catchLog.mode || 'boat',
    species: catchLog.species || 'Other',
    isBait: Boolean(catchLog.isBait),
    baitRig: catchLog.baitRig || '',
    presentation: catchLog.presentation || '',
    waterDepthFeet: catchLog.waterDepthFeet != null ? Number(catchLog.waterDepthFeet) : null,
    current: catchLog.current || 'Moderate',
    bottomStructure: catchLog.bottomStructure || 'Ledge / Channel Edge',
    waterClarity: catchLog.waterClarity || 'Muddy',
    weightLbs: catchLog.weightLbs != null ? Number(catchLog.weightLbs) : null,
    lengthInches: catchLog.lengthInches != null ? Number(catchLog.lengthInches) : null,
    notes: catchLog.notes || '',
    photoUrl: catchLog.photoUrl || '',
    photoFit: catchLog.photoFit || 'cover',
    photoPosition: catchLog.photoPosition || 'center',
    photoRotation: catchLog.photoRotation || 0,
    title: catchLog.title || '',
    environmentalSnapshot: cleanEnvSnapshot,
    updatedAt: new Date().toISOString(),
  };

  // Strip any accidental undefined values
  Object.keys(data).forEach((k) => {
    if (data[k] === undefined) {
      delete data[k];
    }
  });

  try {
    await Promise.race([
      setDoc(catchDocRef, data, { merge: true }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write request timed out (possible quota limit)')), 8000)
      ),
    ]);
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markFirestoreQuotaExhausted();
      disableFirestoreNetwork().catch(() => {});
      throw new Error('Firestore daily free write quota limit reached. Catches are safely preserved offline.');
    }
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/catches/${catchLog.id}`);
  }
}

/**
 * Fetch all cloud catches for user from Firestore
 */
export async function fetchCatchesFromFirestore(userId: string): Promise<CatchLog[]> {
  if (isFirestoreQuotaExhausted()) {
    return [];
  }

  const collRef = collection(db, 'users', userId, 'catches');
  try {
    const snap = await Promise.race([
      getDocs(collRef),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore read request timed out')), 8000)
      ),
    ]);
    const results: CatchLog[] = [];
    snap.forEach((d: any) => {
      const data = d.data() as any;
      results.push({
        ...data,
        isSynced: true,
      });
    });
    return results;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markFirestoreQuotaExhausted();
      disableFirestoreNetwork().catch(() => {});
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/catches`);
  }
}

/**
 * Delete a catch from Firestore
 */
export async function deleteCatchFromFirestore(userId: string, catchId: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }

  const docRef = doc(db, 'users', userId, 'catches', catchId);
  try {
    await Promise.race([
      deleteDoc(docRef),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore delete timed out')), 8000)
      ),
    ]);
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markFirestoreQuotaExhausted();
      disableFirestoreNetwork().catch(() => {});
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/catches/${catchId}`);
  }
}

/**
 * Real-time listener for user catches
 */
export function subscribeToUserCatches(
  userId: string,
  onUpdate: (catches: CatchLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (isFirestoreQuotaExhausted()) {
    return () => {};
  }

  const collRef = collection(db, 'users', userId, 'catches');
  return onSnapshot(
    collRef,
    (snapshot) => {
      const items: CatchLog[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as any;
        items.push({
          ...d,
          isSynced: true,
        });
      });
      onUpdate(items);
    },
    (err) => {
      if (isQuotaExhaustedError(err)) {
        markFirestoreQuotaExhausted();
        disableFirestoreNetwork().catch(() => {});
        return;
      }
      try {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/catches`);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}
