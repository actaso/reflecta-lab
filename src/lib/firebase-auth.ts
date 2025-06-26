'use client';

import { signInWithCustomToken, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for Firebase authentication state
 */
export function useFirebaseAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  /**
   * Sign in to Firebase using Clerk session
   */
  const signInToFirebase = useCallback(async (): Promise<boolean> => {
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured');
      return false;
    }

    if (!clerkUser) {
      setError('No Clerk user found');
      return false;
    }

    try {
      setError(null);
      
      // Exchange Clerk session for Firebase custom token
      const response = await fetch('/api/firebase-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Firebase token');
      }

      const { token } = await response.json();

      // Sign in to Firebase with custom token
      const auth = getFirebaseAuth();
      await signInWithCustomToken(auth, token);

      return true;
    } catch (error) {
      console.error('Firebase sign-in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in to Firebase');
      return false;
    }
  }, [clerkUser]);

  /**
   * Sign out from Firebase
   */
  const signOutFromFirebase = useCallback(async (): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setError(null);
    } catch (error) {
      console.error('Firebase sign-out error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out from Firebase');
    }
  }, []);

  /**
   * Effect to handle Clerk user changes and Firebase authentication
   */
  useEffect(() => {
    if (!clerkLoaded || !isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // Set up Firebase auth state listener
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    // Auto sign-in when Clerk user is available and Firebase user is not
    if (clerkUser && !firebaseUser) {
      signInToFirebase();
    }

    // Auto sign-out when Clerk user is removed
    if (!clerkUser && firebaseUser) {
      signOutFromFirebase();
    }

    return unsubscribe;
  }, [clerkUser, clerkLoaded, firebaseUser, signInToFirebase, signOutFromFirebase]);

  return {
    firebaseUser,
    isLoading,
    error,
    isAuthenticated: !!firebaseUser,
    signInToFirebase,
    signOutFromFirebase,
    isFirebaseConfigured: isFirebaseConfigured(),
  };
}

/**
 * Get Firebase ID token for the current user
 * Useful for authenticated API calls
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }

    const idToken = await user.getIdToken();
    return idToken;
  } catch (error) {
    console.error('Failed to get Firebase ID token:', error);
    return null;
  }
}

/**
 * Refresh Firebase authentication token
 * Call this if you suspect the token has expired
 */
export async function refreshFirebaseToken(): Promise<boolean> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return false;
    }

    await user.getIdToken(true); // Force refresh
    return true;
  } catch (error) {
    console.error('Failed to refresh Firebase token:', error);
    return false;
  }
}