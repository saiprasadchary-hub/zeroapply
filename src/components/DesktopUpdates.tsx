import { useEffect, useState } from 'react';
import type { DesktopUpdateState } from '../services/secureStorage';

export function DesktopUpdates() {
  const [state, setState] = useState<DesktopUpdateState>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    const bridge = window.zeroApply;
    void bridge?.getDesktopUpdateStatus?.().then(value => { if (mounted) setState(value); }).catch(() => {});
    const unsubscribe = bridge?.onDesktopUpdateState?.(setState);
    return () => { mounted = false; unsubscribe?.(); };
  }, []);
  if (!window.zeroApply?.isDesktop || !state) return null;
  const run = async (action: (() => Promise<unknown>) | undefined) => {
    if (!action || busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const pending = busy || state.phase === 'checking' || state.phase === 'downloading';
  return <div className="relative">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-xs rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-100">
      {state.phase === 'available' || state.phase === 'downloaded' ? 'Update available' : 'App updates'}
    </button>
    {open && <section aria-label="ZeroApply updates" className="absolute right-0 top-full mt-2 w-72 bg-white border border-zinc-200 rounded-xl p-4 shadow-lg z-50">
      <p className="font-semibold text-sm">ZeroApply {state.currentVersion}</p>
      <p role="status" className="text-xs text-zinc-600 my-3">{state.message}</p>
      {state.phase === 'downloading' && <progress aria-label="Update download" className="w-full" max={100} value={state.progressPercent} />}
      {!state.canRestart && <p className="text-xs text-zinc-600 mb-3">Finish or stop AutoApply to download or install updates.</p>}
      {(error || state.error) && <p role="alert" className="text-xs text-red-700 mb-3">{error || state.error}</p>}
      {state.phase !== 'disabled' && <button type="button" disabled={pending || ((state.phase === 'available' || state.phase === 'downloaded') && !state.canRestart)}
        className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 text-xs disabled:opacity-40"
        onClick={() => void run(state.phase === 'downloaded' ? window.zeroApply?.installDesktopUpdate : state.phase === 'available' ? window.zeroApply?.downloadDesktopUpdate : window.zeroApply?.checkDesktopUpdates)}>
        {state.phase === 'downloaded' ? 'Restart & update' : state.phase === 'available' ? 'Download update' : pending ? 'Please wait…' : 'Check for updates'}
      </button>}
    </section>}
  </div>;
}
