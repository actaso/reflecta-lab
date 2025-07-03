import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signInWithClerkToken, signOutFromFirebase } from '@/lib/clerk-firebase-auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  clerkUserId?: string;
}

export const useFirebaseAuth = () => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [firebaseUser, firebaseLoading, firebaseError] = useAuthState(auth);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exchange Clerk token for Firebase token when Clerk user changes
  useEffect(() => {
    const handleTokenExchange = async () => {
      if (!clerkLoaded) return;

      try {
        if (clerkUser && !firebaseUser) {
          // Clerk user is signed in but Firebase user is not - exchange tokens
          setIsExchangingToken(true);
          setError(null);
          await signInWithClerkToken();
        } else if (!clerkUser && firebaseUser) {
          // Clerk user is signed out but Firebase user is still signed in - sign out from Firebase
          await signOutFromFirebase();
        }
      } catch (err) {
        console.error('Token exchange failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsExchangingToken(false);
      }
    };

    handleTokenExchange();
  }, [clerkUser?.id, firebaseUser?.uid, clerkLoaded, clerkUser, firebaseUser]); // Use stable IDs instead of full objects

  // Memoize the authUser object to prevent unnecessary re-renders
  const authUser: AuthUser | null = useMemo(() => {
    if (!firebaseUser || !clerkUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || clerkUser.primaryEmailAddress?.emailAddress || null,
      displayName: firebaseUser.displayName || clerkUser.fullName,
      clerkUserId: clerkUser.id
    };
  }, [
    firebaseUser?.uid, 
    firebaseUser?.email, 
    firebaseUser?.displayName,
    clerkUser?.id,
    clerkUser?.primaryEmailAddress?.emailAddress,
    clerkUser?.fullName
  ]);

  const loading = !clerkLoaded || firebaseLoading || isExchangingToken;
  const finalError = error || firebaseError;
  const isAuthenticated = !!(clerkUser && firebaseUser);

  return {
    user: authUser,
    loading,
    error: finalError,
    clerkUser,
    firebaseUser,
    isAuthenticated
  };
};