# API Endpoint Protection Documentation

## Overview

This document outlines best practices for protecting API endpoints in Reflecta using Clerk's authentication system. It covers how to secure endpoints that are called from both our Next.js web application and React Native mobile app.

## Core Protection Pattern

### Using `auth.protect()`

The recommended approach for protecting API endpoints is using Clerk's `auth.protect()` method, which provides robust authentication handling with automatic error responses.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Automatically handles authentication and returns appropriate errors
    const { userId } = await auth.protect();
    
    // Your protected logic here
    // userId is guaranteed to be valid at this point
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle other errors (not auth-related)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Why `auth.protect()` over Manual Checks

**❌ Manual Authentication (Not Recommended)**
```typescript
// Don't do this - more verbose and error-prone
const { userId } = await auth();
if (!userId) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

**✅ Using `auth.protect()` (Recommended)**
```typescript
// Do this - cleaner and more robust
const { userId } = await auth.protect();
```

**Benefits of `auth.protect()`:**
- Automatic 401 errors for unauthenticated API requests
- Automatic 404 errors for authenticated but unauthorized users
- Future-proof for role/permission-based authorization
- Consistent error handling across all endpoints

## Authentication Flow

### From Next.js Web App

```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant API as API Route
    participant Clerk as Clerk Auth
    participant Firebase as Firebase Admin

    Client->>+API: POST /api/auth/firebase-token
    Note over Client,API: Clerk session cookie automatically included
    
    API->>+Clerk: auth.protect()
    Clerk->>Clerk: Validate session cookie
    alt Valid Session
        Clerk->>-API: { userId: "user_123" }
        API->>+Firebase: createCustomToken(userId)
        Firebase->>-API: Firebase custom token
        API->>-Client: { token, uid }
    else Invalid Session
        Clerk->>-API: Throws error
        API->>-Client: 401 Unauthorized (automatic)
    end
```

**Key Points:**
- Clerk session cookies are automatically included in same-origin requests
- No additional token handling required in the client
- `auth.protect()` validates the session automatically

### From React Native App

```mermaid
sequenceDiagram
    participant RN as React Native
    participant API as API Route
    participant Clerk as Clerk Auth
    participant Firebase as Firebase Admin

    RN->>+RN: getToken() from Clerk
    RN->>+API: POST /api/auth/firebase-token
    Note over RN,API: Authorization: Bearer <clerk_token>
    
    API->>+Clerk: auth.protect()
    Clerk->>Clerk: Validate bearer token
    alt Valid Token
        Clerk->>-API: { userId: "user_123" }
        API->>+Firebase: createCustomToken(userId)
        Firebase->>-API: Firebase custom token
        API->>-Client: { token, uid }
    else Invalid Token
        Clerk->>-API: Throws error
        API->>-Client: 401 Unauthorized (automatic)
    end
```

**React Native Client Implementation:**
```typescript
// In your React Native app
import { useAuth } from '@clerk/clerk-expo';

const useFirebaseToken = () => {
  const { getToken } = useAuth();
  
  const getFirebaseToken = async () => {
    try {
      // Get Clerk token
      const clerkToken = await getToken();
      
      // Call your API with Authorization header
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claims: { /* additional claims if needed */ }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get Firebase token:', error);
      throw error;
    }
  };
  
  return { getFirebaseToken };
};
```

## Advanced Protection Patterns

### Role-Based Protection

```typescript
export async function POST(request: NextRequest) {
  try {
    // Protect with role requirement
    const { userId } = await auth.protect({ role: 'admin' });
    
    // Only admin users can proceed
    return NextResponse.json({ adminData: true });
  } catch (error) {
    // auth.protect() automatically returns 404 for insufficient permissions
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Permission-Based Protection

```typescript
export async function POST(request: NextRequest) {
  try {
    // Protect with specific permission
    const { userId } = await auth.protect({ 
      permission: 'coaching:interaction:create' 
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Custom Authorization Logic

```typescript
export async function POST(request: NextRequest) {
  try {
    // Custom authorization function
    const { userId, has } = await auth.protect({
      has: ({ role, permission }) => {
        return role === 'premium' || permission === 'beta:access';
      }
    });
    
    return NextResponse.json({ premiumFeature: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Machine Token Support (API Keys, OAuth)

```typescript
export async function POST(request: NextRequest) {
  try {
    // Accept both session tokens and API keys
    const { userId } = await auth.protect({ 
      token: ['session_token', 'api_key'] 
    });
    
    return NextResponse.json({ data: 'accessible via session or API key' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Error Handling Matrix

| Authentication Status | Authorization Status | `auth.protect()` Response |
|----------------------|---------------------|--------------------------|
| ✅ Authenticated | ✅ Authorized | Returns Auth object |
| ✅ Authenticated | ❌ Not Authorized | 404 Error (automatic) |
| ❌ Not Authenticated | N/A | 401 Error (automatic) |

### Custom Error URLs

```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth.protect({
      role: 'premium',
      unauthorizedUrl: '/upgrade',  // Redirect if wrong role
      unauthenticatedUrl: '/login'  // Redirect if not signed in
    });
    
    return NextResponse.json({ premiumContent: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Real-World Examples

### Firebase Token Exchange (Current Implementation)

```typescript
// src/app/api/auth/firebase-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCustomToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Robust authentication protection
    const { userId } = await auth.protect();
    
    // Extract additional claims from request
    const body = await request.json().catch(() => ({}));
    const additionalClaims = body.claims || {};

    // Add user ID to claims for Firestore security rules
    const claims = {
      ...additionalClaims,
      clerk_user_id: userId,
    };

    // Create Firebase custom token
    const customToken = await createCustomToken(userId, claims);

    return NextResponse.json({ 
      token: customToken,
      uid: userId 
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    
    // Handle Firebase-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Firebase project not found')) {
        return NextResponse.json(
          { error: 'Firebase configuration error' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('private key')) {
        return NextResponse.json(
          { error: 'Firebase service account configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
```

### Coaching Interaction Endpoint

```typescript
// src/app/api/coaching-interaction/route.ts
export async function POST(request: NextRequest) {
  try {
    // Only authenticated users can create coaching interactions
    const { userId } = await auth.protect();
    
    const interaction = await request.json();
    
    // Add user context to interaction
    const enrichedInteraction = {
      ...interaction,
      userId,
      timestamp: new Date().toISOString(),
    };
    
    // Process coaching interaction
    const result = await processCoachingInteraction(enrichedInteraction);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Coaching interaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process coaching interaction' },
      { status: 500 }
    );
  }
}
```

## Testing Protected Endpoints

### Unit Testing

```typescript
// __tests__/api/auth/firebase-token.test.ts
import { auth } from '@clerk/nextjs/server';
import { POST } from '@/app/api/auth/firebase-token/route';

// Mock auth.protect()
jest.mock('@clerk/nextjs/server', () => ({
  auth: {
    protect: jest.fn(),
  },
}));

describe('/api/auth/firebase-token', () => {
  const mockAuth = auth as jest.Mocked<typeof auth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    // Mock auth.protect() to throw (simulating unauthenticated user)
    mockAuth.protect.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = new Request('http://localhost/api/auth/firebase-token', {
      method: 'POST',
    });

    // The auth.protect() error should bubble up
    await expect(POST(request)).rejects.toThrow('Unauthorized');
  });

  it('should return Firebase token for authenticated user', async () => {
    // Mock successful authentication
    mockAuth.protect.mockResolvedValueOnce({ 
      userId: 'user_123' 
    } as any);

    const request = new Request('http://localhost/api/auth/firebase-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.uid).toBe('user_123');
    expect(data.token).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// Test with actual Clerk tokens in development
describe('Integration: Protected Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get real Clerk token in test environment
    authToken = await getTestClerkToken();
  });

  it('should allow authenticated requests', async () => {
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(200);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(401);
  });
});
```

## Best Practices Summary

### ✅ Do

1. **Always use `auth.protect()`** for API route protection
2. **Handle errors gracefully** with specific error messages for different failure types
3. **Test both authenticated and unauthenticated scenarios**
4. **Use role/permission parameters** when you need fine-grained access control
5. **Include user context** in your business logic (userId is guaranteed to be valid)
6. **Log authentication failures** for monitoring and debugging

### ❌ Don't

1. **Don't manually check `userId`** - use `auth.protect()` instead
2. **Don't forget error handling** - always wrap in try/catch
3. **Don't expose sensitive errors** - return generic error messages to clients
4. **Don't skip authentication** on sensitive endpoints
5. **Don't hardcode user IDs** - always get them from `auth.protect()`

### Performance Considerations

- `auth.protect()` is fast - it validates JWT tokens locally when possible
- No additional database calls for basic authentication
- Role/permission checks may require additional Clerk API calls
- Consider caching user permissions for high-traffic endpoints

### Monitoring

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { userId } = await auth.protect();
    
    // Your business logic
    
    // Log successful authentication
    console.log(`Auth success for user ${userId} in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log authentication failures
    console.error(`Auth failed in ${Date.now() - startTime}ms:`, error);
    throw error;
  }
}
```

This documentation ensures consistent, secure, and maintainable API endpoint protection across both web and mobile applications in the Reflecta ecosystem. 