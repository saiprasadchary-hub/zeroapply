import {
  signInWithPopup,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, db } from '../services/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFriendlyAuthErrorMessage, requiresEmailVerification } from './authPolicy';

export { getFriendlyAuthErrorMessage } from './authPolicy';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
let persistenceReady: Promise<void> | null = null;

function ensurePersistentSession(): Promise<void> {
  persistenceReady ??= setPersistence(auth, browserLocalPersistence);
  return persistenceReady;
}

/**
 * Saves or updates user document in Firestore upon login
 */
async function syncUserToFirestore(user: User): Promise<void> {
  const userDocRef = doc(db, 'users', user.uid);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    } catch (err) {
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
      else console.warn('[AuthService] Could not sync user to Firestore after retry:', err);
    }
  }
}

export class AuthService {
  /**
   * One-click Google Authentication
   */
  public static async loginWithGoogle(): Promise<User> {
    await ensurePersistentSession();
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserToFirestore(result.user);
    return result.user;
  }

  /**
   * Standard Email & Password Sign In
   */
  public static async loginWithEmail(email: string, pass: string): Promise<User> {
    await ensurePersistentSession();
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (requiresEmailVerification(result.user)) {
      await sendEmailVerification(result.user).catch((error) => {
        console.warn('[AuthService] Could not resend email verification:', error);
      });
      await signOut(auth);
      throw Object.assign(new Error(getFriendlyAuthErrorMessage({ code: 'auth/email-not-verified' })), {
        code: 'auth/email-not-verified',
      });
    }
    await syncUserToFirestore(result.user);
    return result.user;
  }

  /**
   * New User Registration with Email & Display Name
   */
  public static async signupWithEmail(email: string, pass: string, name?: string): Promise<User> {
    await ensurePersistentSession();
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    try {
      if (name && name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      await syncUserToFirestore(result.user);
      await sendEmailVerification(result.user);
      return result.user;
    } finally {
      await signOut(auth);
    }
  }

  /**
   * Sends password reset email
   */
  public static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  /**
   * Sign Out
   */
  public static async logout(): Promise<void> {
    await signOut(auth);
  }
}
