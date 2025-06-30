import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're using emulators
const isUsingEmulators = !!(
  process.env.FIREBASE_AUTH_EMULATOR_HOST || 
  process.env.FIRESTORE_EMULATOR_HOST
);

// Log environment information (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔥 Firebase Admin SDK Environment:');
  console.log(`   Using emulators: ${isUsingEmulators ? '✅ YES' : '❌ NO'}`);
  if (isUsingEmulators) {
    console.log(`   Auth emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set'}`);
    console.log(`   Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
  } else {
    console.log(`   Using production Firebase project: ${process.env.FIREBASE_PROJECT_ID}`);
  }
}

// Initialize Firebase Admin SDK only if it hasn't been initialized already
const app = getApps().length === 0 
  ? initializeApp(
      isUsingEmulators 
        ? {
            // For emulators, we only need a project ID - no real credentials required
            projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
          }
        : {
            // For production, use real credentials
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
          }
    )
  : getApps()[0];

export const adminAuth = getAuth(app);

// Helper function to create custom token for Clerk users
export const createCustomToken = async (clerkUserId: string, additionalClaims?: Record<string, unknown>) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎫 Creating custom token for user: ${clerkUserId} (${isUsingEmulators ? 'emulator' : 'production'})`);
    }
    
    const customToken = await adminAuth.createCustomToken(clerkUserId, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    
    // Provide more helpful error messages based on environment
    if (isUsingEmulators && error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Firebase emulators are not running. Start them with: npm run dev:emulators');
      }
    }
    
    throw new Error('Failed to create custom token');
  }
};

export default app;