import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're using emulators
const isUsingEmulators = !!(
  process.env.FIREBASE_AUTH_EMULATOR_HOST || 
  process.env.FIRESTORE_EMULATOR_HOST
);

// Debug function for server-side Firebase admin configuration
const debugFirebaseAdminConfig = () => {
  console.log('🔍 Firebase Admin SDK Configuration Debug');
  console.log('==========================================');
  
  console.log('\n🔒 SERVER-SIDE CONFIG:');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING');
  console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ SET (length: ' + (process.env.FIREBASE_PRIVATE_KEY?.length || 0) + ')' : '❌ MISSING');
  
  console.log('\n🧪 ENVIRONMENT STATUS:');
  console.log('Node ENV:', process.env.NODE_ENV);
  console.log('Using emulators:', isUsingEmulators ? '✅ YES' : '❌ NO');
  if (isUsingEmulators) {
    console.log('Auth emulator:', process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set');
    console.log('Firestore emulator:', process.env.FIRESTORE_EMULATOR_HOST || 'not set');
  } else {
    console.log('Production Firebase project:', process.env.FIREBASE_PROJECT_ID || 'NOT SET');
  }
  
  // Validate private key format
  if (process.env.FIREBASE_PRIVATE_KEY && !isUsingEmulators) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('⚠️ WARNING: FIREBASE_PRIVATE_KEY might be malformed (missing BEGIN PRIVATE KEY header)');
    }
    if (!privateKey.includes('\\n') && privateKey.includes('\n')) {
      console.log('⚠️ WARNING: FIREBASE_PRIVATE_KEY might need \\n escaping for environment variables');
    }
  }
  
  console.log('\n==========================================');
};

// Log admin configuration debug info
debugFirebaseAdminConfig();

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
    
    // Log successful token creation (without exposing the token)
    console.log(`✅ Custom token created successfully for user: ${clerkUserId}`);
    
    return customToken;
  } catch (error) {
    console.error('❌ Error creating custom token:', error);
    
    // Enhanced error reporting
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Common error patterns
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