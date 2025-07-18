import { useEffect, useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signInWithClerkToken, signOutFromFirebase } from '@/lib/clerk-firebase-auth';
import { FirestoreService } from '@/lib/firestore';
import { useAnalytics } from '@/hooks/useAnalytics';

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
  const { trackSignIn, trackSignUp, trackSignOut } = useAnalytics();
  
  // Track if we've already processed this user to avoid duplicate events
  const processedUserRef = useRef<string | null>(null);
  // Track previous authentication state to detect sign-outs
  const wasAuthenticatedRef = useRef<boolean>(false);

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

  // Track authentication events when user completes authentication
  useEffect(() => {
    const trackAuthenticationEvent = async () => {
      // Only track if we have both Clerk and Firebase users, and haven't processed this user yet
      if (!clerkUser || !firebaseUser || processedUserRef.current === clerkUser.id) return;

      try {
        // Mark this user as processed to avoid duplicate events
        processedUserRef.current = clerkUser.id;

        // Check if this is a new user by looking at account creation time
        const userAccount = await FirestoreService.getUserAccount(firebaseUser.uid);
        const isNewUser = userAccount && userAccount.createdAt && 
          (Date.now() - userAccount.createdAt.getTime()) < 60000; // Created within last minute

        // Load anonymous entries to check if user had existing data
        const localEntries = JSON.parse(localStorage.getItem('journal-entries') || '{}');
        const anonymousEntryCount = Object.values(localEntries).flat().filter((entry: any) => 
          entry.uid === 'local-user'
        ).length;

        const trackingProperties = {
          method: 'clerk',
          hasExistingData: anonymousEntryCount > 0,
          anonymousEntryCount
        };

        if (isNewUser) {
          console.log('📊 [ANALYTICS] Tracking new user sign up');
          trackSignUp(trackingProperties);
        } else {
          console.log('📊 [ANALYTICS] Tracking existing user sign in');
          trackSignIn(trackingProperties);
        }
      } catch (error) {
        console.error('Failed to track authentication event:', error);
        // Fallback to tracking as sign-in if we can't determine
        trackSignIn({
          method: 'clerk',
          hasExistingData: false,
          anonymousEntryCount: 0
        });
      }
    };

    trackAuthenticationEvent();
  }, [clerkUser, firebaseUser, trackSignIn, trackSignUp]);

  // Track sign-out events and reset processed user when user logs out
  useEffect(() => {
    const isCurrentlyAuthenticated = !!(clerkUser && firebaseUser);
    
    // If user was authenticated but is no longer, track sign out
    if (wasAuthenticatedRef.current && !isCurrentlyAuthenticated) {
      console.log('📊 [ANALYTICS] Tracking user sign out');
      trackSignOut();
    }
    
    // Update the authentication state tracking
    wasAuthenticatedRef.current = isCurrentlyAuthenticated;
    
    // Reset processed user when user logs out
    if (!clerkUser) {
      processedUserRef.current = null;
    }
  }, [clerkUser, firebaseUser, trackSignOut]);

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