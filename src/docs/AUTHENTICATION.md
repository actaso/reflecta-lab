# Authentication Documentation

## Overview

Reflecta Labs implements a sophisticated authentication system that bridges [Clerk](https://clerk.dev) and [Firebase Auth](https://firebase.google.com/docs/auth), providing users with enhanced features while maintaining full offline functionality.

## Architecture

### Hybrid Authentication Design
- **Offline-first**: All core functionality works without authentication
- **Clerk Primary**: Clerk handles user interface and account management
- **Firebase Backend**: Firebase Auth powers the backend with Firestore integration
- **Token Exchange**: Seamless bridge between Clerk and Firebase tokens
- **Anonymous-to-Authenticated**: Smooth transition when users sign in

### Authentication States

1. **Anonymous Usage**: 
   - All journal functionality works normally
   - Data stored in localStorage
   - No sync capabilities

2. **Authenticated Usage**:
   - Clerk handles UI authentication
   - Firebase token exchanged automatically
   - Real-time sync with Firestore
   - Cross-device data access

## Implementation Details

### Environment Variables
Required for full authentication integration:
```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Firebase Configuration  
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# PostHog Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...
```

### Component Structure

#### Root Layout (`app/layout.tsx`)
```typescript
// ClerkProvider wraps the entire application
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

#### Authentication Hook (`hooks/useFirebaseAuth.ts`)
```typescript
export const useFirebaseAuth = () => {
  const { user: clerkUser } = useUser();
  const [firebaseUser] = useAuthState(auth);
  
  // Automatic token exchange between Clerk and Firebase
  useEffect(() => {
    if (clerkUser && !firebaseUser) {
      signInWithClerkToken();
    }
  }, [clerkUser, firebaseUser]);

  return {
    user: combinedUser,
    isAuthenticated: !!firebaseUser,
    isLoading: clerkLoading || firebaseLoading || isExchangingToken
  };
};
```

### Token Exchange System

#### Server Route (`app/api/auth/firebase-token/route.ts`)
```typescript
export async function POST(request: Request) {
  const { token } = await request.json();
  
  // Verify Clerk token and create Firebase custom token
  const decodedToken = await clerkClient.verifyToken(token);
  const firebaseToken = await admin.auth().createCustomToken(decodedToken.sub);
  
  return Response.json({ firebaseToken });
}
```

#### Client Integration (`lib/clerk-firebase-auth.ts`)
```typescript
export const signInWithClerkToken = async () => {
  const clerkToken = await getToken();
  
  // Exchange Clerk token for Firebase token
  const response = await fetch('/api/auth/firebase-token', {
    method: 'POST',
    body: JSON.stringify({ token: clerkToken })
  });
  
  const { firebaseToken } = await response.json();
  
  // Sign in to Firebase with custom token
  await signInWithCustomToken(auth, firebaseToken);
};
```

## Data Synchronization

### Sync Strategy
- **Primary Storage**: localStorage for immediate access
- **Secondary Storage**: Firestore for backup and cross-device sync
- **Sync Trigger**: Authentication state changes
- **Conflict Resolution**: Last-write-wins based on `lastUpdated` timestamps

### Anonymous-to-Authenticated Transition
```typescript
const handleAuthTransition = async () => {
  // 1. Load existing localStorage entries
  const localEntries = loadLocalEntriesFromStorage();
  
  // 2. Update UIDs from 'local-user' to authenticated UID
  const updatedEntries = localEntries.map(entry => ({
    ...entry,
    uid: user.uid
  }));
  
  // 3. Sync to Firestore
  await Promise.all(
    updatedEntries.map(entry => FirestoreService.upsertEntry(entry, user.uid))
  );
  
  // 4. Set up real-time sync
  setSyncState('synced');
};
```

## Security

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{document} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == resource.data.uid;
    }
  }
}
```

### Authentication Middleware (`middleware.ts`)
```typescript
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## Testing

### Authentication Mocking (`setupTests.ts`)
```typescript
// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: null, isLoaded: true }),
  ClerkProvider: ({ children }: any) => children,
  SignInButton: ({ children }: any) => <button>{children}</button>,
  UserButton: () => <div>UserButton</div>
}));

// Mock Firebase Auth
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: () => [null, false, null]
}));
```

## Development Setup

### Local Development with Emulators
```bash
# Start Firebase emulators
npm run firebase:emulator

# The auth emulator runs on localhost:9099
# Firestore emulator runs on localhost:8080
```

### Firebase Configuration (`firebase.json`)
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

## Error Handling

### Common Error Scenarios
1. **Network Offline**: Graceful fallback to localStorage
2. **Token Exchange Failure**: Retry mechanism with exponential backoff
3. **Firestore Permission Denied**: Clear error messaging
4. **Concurrent Edits**: Automatic conflict resolution

### Error Recovery
```typescript
try {
  await syncToFirestore(entry);
} catch (error) {
  console.warn('Sync failed, saved locally:', error);
  setSyncState('error');
  // Data remains in localStorage for next sync attempt
}
```

## Analytics Integration

### User Tracking with PostHog
```typescript
export const useAnalytics = () => {
  const { user } = useFirebaseAuth();
  
  useEffect(() => {
    if (user) {
      posthog.identify(user.uid, {
        email: user.email,
        displayName: user.displayName
      });
    }
  }, [user]);
};
```

## Best Practices

1. **Always Test Offline**: Ensure full functionality without authentication
2. **Handle Token Expiration**: Automatic refresh and re-authentication
3. **Secure API Routes**: Verify tokens on server-side endpoints
4. **Monitor Sync Status**: Provide clear UI feedback for sync state
5. **Privacy First**: Users control their data with optional authentication