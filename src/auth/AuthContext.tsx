import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase/firebaseConfig';
import { AuthService, getFriendlyAuthErrorMessage } from './authService';
import { requiresEmailVerification } from './authPolicy';
import { watchAuthStartup } from './authStartup';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'zeroapply_is_guest_mode';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  // Initialize to false to avoid reading localStorage during the first render
  // (which causes React hydration mismatch error #418). We restore from
  // localStorage inside the first useEffect so it runs safely after mount.
  const [isGuest, setIsGuest] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const cancelTimeout = watchAuthStartup((): void => {
      if (!mounted) return;
      setAuthError('Sign-in is taking longer than expected. You can try signing in or continue as guest.');
      setLoading(false);
    });
    try {
      if (localStorage.getItem(GUEST_STORAGE_KEY) === 'true') {
        setIsGuest(true);
        setLoading(false);
      }
    } catch {
      // Restricted local storage must not prevent the login screen opening.
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser): void => {
      if (!mounted) return;
      cancelTimeout();
      const verifiedUser = currentUser && !requiresEmailVerification(currentUser) ? currentUser : null;
      setUser(verifiedUser);
      setAuthError(null);
      if (verifiedUser) {
        setIsGuest(false);
        try { localStorage.removeItem(GUEST_STORAGE_KEY); } catch { /* Auth remains valid without the guest flag. */ }
      }
      setLoading(false);
    }, (error): void => {
      if (!mounted) return;
      cancelTimeout();
      setAuthError(getFriendlyAuthErrorMessage(error));
      setLoading(false);
    });
    return (): void => {
      mounted = false;
      cancelTimeout();
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await AuthService.loginWithGoogle();
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: unknown) {
      setAuthError(getFriendlyAuthErrorMessage(err));
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await AuthService.loginWithEmail(email, pass);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: unknown) {
      setAuthError(getFriendlyAuthErrorMessage(err));
      throw err;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    setAuthError(null);
    try {
      await AuthService.signupWithEmail(email, pass, name);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: unknown) {
      setAuthError(getFriendlyAuthErrorMessage(err));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setLoading(false);
    try { localStorage.setItem(GUEST_STORAGE_KEY, 'true'); } catch { /* Guest mode also works without persistence. */ }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        continueAsGuest,
        authError,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components -- colocating the context hook keeps its contract private.
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
