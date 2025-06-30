import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';

export interface TokenExchangeResponse {
  token: string;
  uid: string;
}

export const exchangeClerkTokenForFirebase = async (): Promise<TokenExchangeResponse> => {
  try {
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token exchange failed');
    }

    const data: TokenExchangeResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

export const signInWithClerkToken = async (): Promise<void> => {
  try {
    // Exchange Clerk token for Firebase custom token
    const { token } = await exchangeClerkTokenForFirebase();
    
    // Sign in to Firebase with the custom token
    await signInWithCustomToken(auth, token);
  } catch (error) {
    console.error('Firebase sign-in with Clerk token failed:', error);
    throw error;
  }
};

export const signOutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign-out failed:', error);
    throw error;
  }
};