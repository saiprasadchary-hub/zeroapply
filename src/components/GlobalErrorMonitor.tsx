import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { registerGlobalErrorRecovery } from '../services/globalErrorRecovery';

export const GlobalErrorMonitor: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => registerGlobalErrorRecovery((nextMessage) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(nextMessage);
    timerRef.current = setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, 8_000);
  }), []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!message) return null;
  return (
    <aside role="alert" className="fixed left-1/2 top-4 z-[100] flex w-[min(92vw,680px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-xl">
      <AlertTriangle size={18} className="shrink-0 text-amber-700" />
      <span className="min-w-0 flex-1 font-medium">{message}</span>
      <button type="button" onClick={() => window.location.reload()} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-amber-100">
        <RefreshCw size={13} /> Reload
      </button>
      <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss error" className="shrink-0 rounded-lg p-1 hover:bg-amber-100">
        <X size={15} />
      </button>
    </aside>
  );
};

