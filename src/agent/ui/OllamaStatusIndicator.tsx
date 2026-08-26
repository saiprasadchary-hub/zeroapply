import React, { useEffect, useState } from 'react';
import { checkOllamaStatus, type OllamaStatus } from '../llm/ollamaClient';
import { Cpu, CheckCircle2, Sparkles } from 'lucide-react';

export const OllamaStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<OllamaStatus>({
    online: false,
    modelAvailable: false,
    modelName: 'qwen2.5:1.5b',
  });
  const [loading, setLoading] = useState(true);
  const isReady = status.online && status.modelAvailable;

  useEffect(() => {
    let mounted = true;
    const verifyStatus = async () => {
      const res = await checkOllamaStatus();
      if (mounted) {
        setStatus(res);
        setLoading(false);
      }
    };

    verifyStatus();
    const interval = setInterval(verifyStatus, 10000); // Check every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all ${
        isReady
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'bg-zinc-100 text-zinc-600 border-zinc-300'
      }`}
      title={isReady ? 'qwen2.5:1.5b is connected and active' : 'qwen2.5:1.5b is unavailable; deterministic fallback is active'}
    >
      <Cpu size={12} className={isReady ? 'text-emerald-600 animate-pulse' : 'text-zinc-500'} />
      <span>
        {loading
          ? 'Connecting AI...'
          : isReady
          ? 'Qwen 1.5B: Active'
          : 'AI Engine: Standby'}
      </span>
      {isReady ? (
        <CheckCircle2 size={11} className="text-emerald-600" />
      ) : (
        <Sparkles size={11} className="text-zinc-400" />
      )}
    </div>
  );
};
