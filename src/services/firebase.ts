import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  collection as rawCollection,
  doc as rawDoc,
  getDoc as rawGetDoc,
  getDocs as rawGetDocs,
  setDoc as rawSetDoc,
  updateDoc as rawUpdateDoc,
  deleteDoc as rawDeleteDoc,
  onSnapshot as rawOnSnapshot,
  writeBatch,
  query,
  where,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase app once
let firebaseApp: any = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

// Singleton initialization function
function initializeFirebase() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    // CRITICAL: The app will break without specifying the firestoreDatabaseId
    firebaseDb = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId);
  }
  return { firebaseApp, firebaseAuth, firebaseDb };
}

// Lazy initialize on first access
export function getFirebaseApp() {
  return initializeFirebase().firebaseApp;
}

export function getFirebaseAuth() {
  const { firebaseAuth } = initializeFirebase();
  return firebaseAuth;
}

export function getFirebaseDb() {
  const { firebaseDb } = initializeFirebase();
  return firebaseDb;
}

// For backward compatibility, export as direct references
// but they will be lazy-initialized
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();

// Active industry namespace configuration helper
export function getIndustryId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('preview_industry_id') || 'fashion';
  }
  return 'fashion';
}

// Security: Validate that other industries' data collections can NEVER be accessed
export function validateIndustryAccess(collectionName: string) {
  const activeIndustry = getIndustryId();
  
  // List of all industry keys in the application
  const knownIndustries = ['fashion', 'catering', 'retail', 'beauty', 'fitness', 'jewelry', 'home', 'hotel', 'influencer'];
  
  let pathIndustry: string | null = null;
  for (const ind of knownIndustries) {
    if (collectionName.toLowerCase().startsWith(`${ind}_`)) {
      pathIndustry = ind;
      break;
    }
  }

  // Strict check: if collection path belongs to an industry but is NOT matches with the active, throw strict error
  if (pathIndustry && pathIndustry !== activeIndustry) {
    const errorMsg = `[ValidateIndustryAccess Block] Security Violation: Current user/session industry is "${activeIndustry}", but is attempting to access isolated collection "${collectionName}" which belongs to "${pathIndustry}". Cross-industry data access is strictly prohibited!`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Validate general document or collection reference's primary key
function validateRef(ref: any) {
  if (!ref) return;
  const path = ref.path || (ref.ref && ref.ref.path) || '';
  if (path) {
    const firstSegment = path.split('/')[0];
    validateIndustryAccess(firstSegment);
  }
}

export function mapPathSegments(segments: string[]): string[] {
  if (segments.length === 0) return segments;

  // Pattern A: ['tenants', tenantId, 'industries', industryId, subCol, ...rest]
  if (segments[0] === 'tenants' && segments[2] === 'industries') {
    const industryId = segments[3];
    const subCol = segments[4];
    const rest = segments.slice(5);
    if (subCol) {
      return [`${industryId}_${subCol}`, ...rest];
    }
  }
  
  // Pattern B: ['tenants', tenantId, 'billing_logs', ...rest]
  if (segments[0] === 'tenants' && segments[2] === 'billing_logs') {
    const industryId = getIndustryId();
    const rest = segments.slice(3);
    return [`${industryId}_billing_logs`, ...rest];
  }

  // Pattern C: ['tenants', tenantId, 'kb_chunks', ...rest]
  if (segments[0] === 'tenants' && segments[2] === 'kb_chunks') {
    const industryId = getIndustryId();
    const rest = segments.slice(3);
    return [`${industryId}_kb_chunks`, ...rest];
  }

  // Pattern D: ['tenants', tenantId]
  if (segments[0] === 'tenants' && segments.length === 2 && segments[1]) {
    const industryId = getIndustryId();
    return [`${industryId}_tenants`, segments[1]];
  }

  return segments;
}

export function normalizeAndMapSegments(segments: string[]): string[] {
  let flat: string[] = [];
  for (const s of segments) {
    if (typeof s === 'string' && s.includes('/')) {
      flat.push(...s.split('/').filter(Boolean));
    } else {
      flat.push(s);
    }
  }
  return mapPathSegments(flat);
}

// Wrapper for collection with validation
export function collection(dbInstance: any, path: string, ...pathSegments: string[]): any {
  const segments = [path, ...pathSegments];
  const mapped = normalizeAndMapSegments(segments);
  const targetCol = mapped[0];

  // Intercept and validate industry access
  validateIndustryAccess(targetCol);

  return rawCollection(dbInstance, targetCol, ...mapped.slice(1));
}

// Wrapper for doc with validation
export function doc(dbInstance: any, path: string, ...pathSegments: string[]): any {
  const segments = [path, ...pathSegments];
  const mapped = normalizeAndMapSegments(segments);
  const targetCol = mapped[0];

  // Intercept and validate industry access
  validateIndustryAccess(targetCol);

  return rawDoc(dbInstance, targetCol, ...mapped.slice(1));
}

// Advanced CRUD Interceptors for airtight security
export async function getDoc(documentRef: any) {
  validateRef(documentRef);
  return await rawGetDoc(documentRef);
}

export async function getDocs(queryOrCollectionRef: any) {
  validateRef(queryOrCollectionRef);
  return await rawGetDocs(queryOrCollectionRef);
}

export async function setDoc(documentRef: any, data: any, options?: any) {
  validateRef(documentRef);
  return await rawSetDoc(documentRef, data, options);
}

export async function updateDoc(documentRef: any, ...args: any[]) {
  validateRef(documentRef);
  return await rawUpdateDoc(documentRef, ...args);
}

export async function deleteDoc(documentRef: any) {
  validateRef(documentRef);
  return await rawDeleteDoc(documentRef);
}

export function onSnapshot(reference: any, ...args: any[]) {
  validateRef(reference);
  return rawOnSnapshot(reference, ...args);
}

export { writeBatch, query, where, orderBy, firestoreLimit };

// ============================================
// Firebase Error Handling
// ============================================

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = getFirebaseAuth();
  const currentUser = currentAuth?.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('[Firebase Error]', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================
// Firebase Utility Functions
// ============================================

/**
 * Check if Firebase is properly initialized
 */
export function isFirebaseReady(): boolean {
  try {
    return !!(getFirebaseAuth() && getFirebaseDb());
  } catch {
    return false;
  }
}

/**
 * Gracefully handle Firebase initialization errors
 */
export function tryInitializeFirebase(): { success: boolean; error?: string } {
  try {
    initializeFirebase();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Firebase initialization error',
    };
  }
}
