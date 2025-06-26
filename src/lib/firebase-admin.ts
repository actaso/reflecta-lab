import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

/**
 * Check if we're in development mode with emulators
 */
function isUsingEmulators(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Initialize Firebase Admin SDK
 * Uses emulators in development, production credentials in production
 */
function initializeFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    if (isUsingEmulators()) {
      // Development mode: use emulators with minimal config
      console.log('🔧 Initializing Firebase Admin for emulator use');
      
      // Set emulator environment variables
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      
      adminApp = initializeApp({
        projectId: 'demo-project', // Use demo project for emulators
      });
    } else {
      // Production mode: use real credentials
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
        );
      }

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Handle newlines in private key
        }),
        projectId,
      });
    }

    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    const app = initializeFirebaseAdmin();
    adminAuth = getAuth(app);
  }
  return adminAuth;
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const app = initializeFirebaseAdmin();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

/**
 * Create a custom token for Firebase Authentication using Clerk user ID
 * @param clerkUserId - The Clerk user ID to use as the Firebase UID
 * @param additionalClaims - Optional additional claims to include in the token
 * @returns Promise<string> - The custom token
 */
export async function createCustomToken(
  clerkUserId: string,
  additionalClaims?: Record<string, any>
): Promise<string> {
  try {
    const auth = getAdminAuth();
    const customToken = await auth.createCustomToken(clerkUserId, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Failed to create custom token:', error);
    throw new Error('Failed to create Firebase custom token');
  }
}

/**
 * Verify a Firebase ID token
 * @param idToken - The Firebase ID token to verify
 * @returns Promise<DecodedIdToken> - The decoded token
 */
export async function verifyIdToken(idToken: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Failed to verify ID token:', error);
    throw new Error('Invalid Firebase ID token');
  }
}