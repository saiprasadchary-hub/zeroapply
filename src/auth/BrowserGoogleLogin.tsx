import { useState } from 'react';
import { GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../services/firebase/firebaseConfig';
import { getFriendlyAuthErrorMessage } from './authPolicy';
import logo from '../assets/logo.png';

function getHandoff(): { state: string; callback: string } | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const state = params.get('state') ?? '';
  try {
    const callback = new URL(params.get('callback') ?? '');
    if (!/^[a-f0-9]{64}$/.test(state) || callback.protocol !== 'http:' || callback.hostname !== 'localhost'
      || !callback.port || callback.pathname !== '/complete' || callback.username || callback.password
      || callback.search || callback.hash) return null;
    return { state, callback: callback.href };
  } catch { return null; }
}

export function BrowserGoogleLogin(): React.JSX.Element {
  const [handoff] = useState(getHandoff);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (): Promise<void> => {
    if (!handoff || busy) return;
    setBusy(true);
    setError('');
    try {
      await setPersistence(auth, inMemoryPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.idToken) throw new Error('Google did not return a sign-in credential. Please try again.');
      const response = await fetch(handoff.callback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: handoff.state, idToken: credential.idToken }),
        signal: AbortSignal.timeout(10000),
        credentials: 'omit',
      });
      if (!response.ok) throw new Error('This sign-in request has expired. Start again in ZeroApply.');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setComplete(true);
    } catch (cause: unknown) {
      setError(cause instanceof TypeError
        ? 'Could not reach ZeroApply. Keep the desktop app open and try signing in again.'
        : cause && typeof cause === 'object' && 'code' in cause
          ? getFriendlyAuthErrorMessage(cause)
          : cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.');
    } finally {
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <img src={logo} alt="ZeroApply" className="mx-auto mb-5 h-12 w-12 object-contain" />
        <h1 className="text-2xl font-bold text-zinc-900">{complete ? 'Return to ZeroApply' : 'Sign in to ZeroApply'}</h1>
        <p className="mt-3 text-sm text-zinc-600" aria-live="polite">
          {complete ? 'Your Google sign-in was sent to the desktop app. You can close this tab.'
            : handoff ? 'Continue with your Google account. ZeroApply will bring you back to the desktop app.'
              : 'This sign-in link is invalid. Start sign-in from the ZeroApply desktop app.'}
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {!complete && handoff && (
          <button type="button" onClick={() => void signIn()} disabled={busy}
            className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? 'Completing sign-in…' : 'Continue with Google'}
          </button>
        )}
      </section>
    </main>
  );
}
