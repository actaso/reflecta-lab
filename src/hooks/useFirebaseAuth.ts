import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signInWithClerkToken, signOutFromFirebase } from '@/lib/clerk-firebase-auth';
import { FirestoreService } from '@/lib/firestore';

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
  }, [clerkUser, firebaseUser, clerkLoaded]);

  // Initialize user document in Firestore when authentication is established
  useEffect(() => {
    const initializeUserDocument = async () => {
      if (!firebaseUser?.uid) return;

      try {
        // Ensure user document exists in Firestore
        await FirestoreService.getUserAccount(firebaseUser.uid);
        console.log('✅ User document initialized for:', firebaseUser.uid);
      } catch (error) {
        console.error('Failed to initialize user document:', error);
        // Don't throw error here as this is not critical for basic functionality
      }
    };

    initializeUserDocument();
  }, [firebaseUser?.uid]); // Only run when firebaseUser.uid changes

  // Memoize the authUser object to prevent unnecessary re-renders
  const authUser: AuthUser | null = useMemo(() => {
    if (!firebaseUser || !clerkUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || clerkUser.primaryEmailAddress?.emailAddress || null,
      displayName: firebaseUser.displayName || clerkUser.fullName,
      clerkUserId: clerkUser.id
    };
  }, [clerkUser, firebaseUser]);

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