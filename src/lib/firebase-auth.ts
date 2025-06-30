import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const signUp = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
  } catch (error) {
    throw new Error(`Sign up failed: ${(error as AuthError).message}`);
  }
};

export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
  } catch (error) {
    throw new Error(`Sign in failed: ${(error as AuthError).message}`);
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(`Sign out failed: ${(error as AuthError).message}`);
  }
};

export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    } else {
      callback(null);
    }
  });
};

export { auth };