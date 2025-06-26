import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  enableIndexedDbPersistence, 
  type Firestore 
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

/**
 * Check if we're in development mode with emulators
 */
function isUsingEmulators(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let firestoreEmulatorConnected = false;
let authEmulatorConnected = false;

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  if (isUsingEmulators()) {
    // Always configured in development mode
    return true;
  }
  
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

/**
 * Initialize Firebase app
 */
function initializeFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase is not configured. Please set the required environment variables.'
      );
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Ensure Firestore emulator is connected before operations
 */
async function ensureFirestoreEmulatorConnected(): Promise<void> {
  if (!isUsingEmulators() || typeof window === 'undefined') {
    return;
  }

  // Wait a bit for emulator to be ready
  if (!firestoreEmulatorConnected) {
    console.log('⏳ Waiting for Firestore emulator connection...');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Get Firestore instance with emulator support and offline persistence
 */
export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = initializeFirebaseApp();
    db = getFirestore(firebaseApp);

    // Connect to emulator in development environment
    if (
      isUsingEmulators() && 
      !firestoreEmulatorConnected &&
      typeof window !== 'undefined' // Only in browser environment
    ) {
      try {
        // Set Firestore emulator settings explicitly
        connectFirestoreEmulator(db, 'localhost', 8080);
        firestoreEmulatorConnected = true; // Mark as connected
        console.log('🔥 Connected to Firestore emulator at localhost:8080');
      } catch (error) {
        // Check if it's already connected error
        if (error instanceof Error && error.message.includes('already been connected')) {
          console.log('🔥 Firestore emulator already connected');
          firestoreEmulatorConnected = true;
        } else {
          console.error('❌ Failed to connect to Firestore emulator:', error);
          firestoreEmulatorConnected = true; // Prevent retry loop
        }
      }
    }

    // Enable offline persistence in production (not needed for emulator)
    if (!isUsingEmulators() && typeof window !== 'undefined') {
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log('✅ Firestore offline persistence enabled');
        })
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, offline persistence disabled');
          } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser does not support offline persistence');
          } else {
            console.error('❌ Failed to enable offline persistence:', err);
          }
        });
    }
  }
  return db;
}

/**
 * Get Firestore instance with ensured emulator connection
 */
export async function getFirestoreDbAsync(): Promise<Firestore> {
  await ensureFirestoreEmulatorConnected();
  return getFirestoreDb();
}

/**
 * Get Firebase Auth instance with emulator support
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = initializeFirebaseApp();
    auth = getAuth(firebaseApp);

    // Connect to auth emulator in development environment
    if (
      isUsingEmulators() && 
      !authEmulatorConnected &&
      typeof window !== 'undefined' // Only in browser environment
    ) {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log('🔥 Connected to Auth emulator');
        authEmulatorConnected = true;
      } catch (error) {
        // Emulator connection might already exist, ignore error
        console.log('Auth emulator connection already exists or failed:', error);
        authEmulatorConnected = true; // Mark as connected to avoid retry
      }
    }
  }
  return auth;
}

/**
 * Get Firebase project ID
 */
export function getProjectId(): string {
  if (!firebaseConfig.projectId) {
    throw new Error('Firebase project ID is not configured');
  }
  return firebaseConfig.projectId;
}

/**
 * Debug helper to log Firebase configuration
 */
export function debugFirebaseConfig(): void {
  console.log('🔧 Firebase Debug Info:');
  console.log('- Environment:', process.env.NODE_ENV);
  console.log('- Using emulators:', isUsingEmulators());
  console.log('- Project ID:', firebaseConfig.projectId);
  console.log('- Auth emulator connected:', authEmulatorConnected);
  console.log('- Firestore emulator connected:', firestoreEmulatorConnected);
  console.log('- Firebase configured:', isFirebaseConfigured());
  
  if (isUsingEmulators()) {
    console.log('- Firestore emulator: localhost:8080');
    console.log('- Auth emulator: localhost:9099');
  }
}

// Export configured instances
export { app, db, auth };