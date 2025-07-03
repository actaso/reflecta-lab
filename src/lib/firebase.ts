import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required config in development
if (process.env.NODE_ENV === 'development') {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('❌ CRITICAL: Missing required Firebase config fields:', missingFields);
    console.error('This will cause auth/configuration-not-found errors!');
  }
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Simple flag to prevent multiple connection attempts
  let emulatorsConnected = false;
  
  if (!emulatorsConnected) {
    console.log('🔥 Firebase Client SDK: Connecting to emulators...');
    
    try {
      // Connect to Auth emulator
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('   ✅ Auth emulator connected: http://localhost:9099');
    } catch {
      // Emulator connection might already be established
      console.log('   ⚠️ Auth emulator connection skipped (likely already connected)');
    }

    try {
      // Connect to Firestore emulator
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('   ✅ Firestore emulator connected: localhost:8080');
    } catch {
      // Emulator connection might already be established
      console.log('   ⚠️ Firestore emulator connection skipped (likely already connected)');
    }
    
    emulatorsConnected = true;
  }
}

export default app;