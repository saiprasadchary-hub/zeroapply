import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyA3im-CiKXiul7EJGYDoLP9wE4t6QcCqY0",
  authDomain: "zero-apply.firebaseapp.com",
  projectId: "zero-apply",
  storageBucket: "zero-apply.firebasestorage.app",
  messagingSenderId: "233558169610",
  appId: "1:233558169610:web:57a48838a82ea22542a7f3",
  measurementId: "G-7QJ8GVVV70"
};

// Singleton initialization
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  }).catch(() => {});
}
