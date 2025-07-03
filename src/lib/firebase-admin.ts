import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're using emulators
const isUsingEmulators = !!(
  process.env.FIREBASE_AUTH_EMULATOR_HOST || 
  process.env.FIRESTORE_EMULATOR_HOST
);

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
    const customToken = await adminAuth.createCustomToken(clerkUserId, additionalClaims);
    
    // Log successful token creation in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Custom token created successfully for user: ${clerkUserId}`);
    }
    
    return customToken;
  } catch (error) {
    console.error('❌ Error creating custom token:', error);
    
    // Enhanced error reporting with helpful hints
    if (error instanceof Error) {
      // Common error patterns with hints
      if (error.message.includes('private key')) {
        console.error('💡 HINT: Check FIREBASE_PRIVATE_KEY format and escaping');
      }
      if (error.message.includes('project')) {
        console.error('💡 HINT: Check FIREBASE_PROJECT_ID matches your Firebase project');
      }
      if (error.message.includes('service account')) {
        console.error('💡 HINT: Check FIREBASE_CLIENT_EMAIL and service account permissions');
      }
    }
    
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