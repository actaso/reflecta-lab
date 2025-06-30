# Development Environment Configuration

## Firebase Configuration for Development vs Production

This project uses Firebase emulators for development and real Firebase services for production. The configuration is controlled by environment variables that the Firebase Admin SDK automatically detects.

## Environment Variables

### Required for All Environments
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Firebase Server-side Configuration (Admin SDK)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"

# Firebase Client-side Configuration (Required for client SDK)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### Development Environment (Local .env.local)
Add these additional variables to automatically route Firebase Admin SDK to local emulators:

```bash
# Firebase Emulators (Development Only)
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

### Production Environment
**Do NOT set the emulator environment variables in production.** The Firebase Admin SDK will automatically use real Firebase services when these variables are not present.

## Development Workflow

### Option 1: Automatic Emulator Setup (Recommended)
```bash
# Starts development server with emulator environment variables
npm run dev
```

### Option 2: Manual Emulator Management
```bash
# Start Firebase emulators (in one terminal)
npm run dev:emulators

# Start Next.js development server (in another terminal)  
npm run dev
```

### Option 3: Full Development Setup
```bash
# Starts both emulators and dev server concurrently
npm run dev:full
```

## How It Works

1. **Development**: 
   - **Server-side (Admin SDK)**: When `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` are set, the Firebase Admin SDK automatically routes all calls to the local emulators.
   - **Client-side (Client SDK)**: The client SDK automatically connects to emulators running on localhost:9099 (Auth) and localhost:8080 (Firestore) when in development mode.

2. **Production**: When emulator environment variables are not set, both SDKs use the real Firebase project with the provided credentials.

3. **Token Exchange Route**: The `/api/auth/firebase-token` route automatically works in both environments without code changes - it will create custom tokens using either the emulator or real Firebase Auth based on the environment variables.

## Testing the Setup

### Development Testing
1. Start the development environment: `npm run dev`
2. Open Firebase Emulator UI: http://localhost:4000
3. Check browser console for emulator connection logs:
   - Should see "🔥 Firebase Client SDK: Connecting to emulators..."
   - Should see "✅ Auth emulator connected" and "✅ Firestore emulator connected"
4. Make a request to `/api/auth/firebase-token` - it should create tokens using the emulated Firebase Auth
5. Check the emulator logs to confirm token creation

### Production Testing
1. Deploy without emulator environment variables
2. Verify the `/api/auth/firebase-token` route creates tokens using real Firebase
3. Monitor Firebase Console for token creation activity

## Troubleshooting

### Server-side Issues
- **"Firebase project not found"**: Check that `FIREBASE_PROJECT_ID` is correctly set
- **"Private key error"**: Ensure `FIREBASE_PRIVATE_KEY` includes proper line breaks (`\n`)
- **Emulator connection failed**: Verify emulators are running on the correct ports (9099 for Auth, 8080 for Firestore)
- **Tokens work in dev but not production**: Check that emulator environment variables are not set in production

### Client-side Issues
- **"Firebase app not initialized"**: Check that all `NEXT_PUBLIC_FIREBASE_*` environment variables are set
- **Infinite re-render loops**: Fixed in latest version - ensure you're using the optimized hooks
- **Client not connecting to emulators**: Check browser console for connection logs and ensure emulators are running

### Common Environment Variable Issues
- **Missing client-side variables**: All `NEXT_PUBLIC_FIREBASE_*` variables must be set for the client SDK to work
- **Environment not loading**: Restart your development server after adding new environment variables
- **Production vs development mixing**: Ensure emulator variables are only set in development

## Quick Environment Check
Run this in your browser console to check Firebase configuration:
```javascript
// Check if Firebase is properly initialized
console.log('Firebase Config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  // Add other checks as needed
});
``` 