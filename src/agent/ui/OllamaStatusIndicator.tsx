import React, { useEffect, useState } from 'react';
import { checkOllamaStatus, type OllamaStatus } from '../llm/ollamaClient';
import { Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export const OllamaStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<OllamaStatus>({
    online: false,
    modelAvailable: false,
    modelName: 'qwen2.5:3b',
  });
  const [loading, setLoading] = useState(true);

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
        status.online
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'bg-amber-50 text-amber-700 border-amber-300'
      }`}
      title={
        status.online
          ? `Local Ollama connected (${status.modelName}, ${status.latencyMs}ms)`
          : status.error || 'Ollama server offline at http://localhost:11434 (using heuristic fallback)'
      }
    >
      <Cpu size={12} className={status.online ? 'text-emerald-600 animate-pulse' : 'text-amber-600'} />
      <span>{loading ? 'Ollama...' : status.online ? `Ollama (${status.modelName})` : 'Ollama Offline'}</span>
      {status.online ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
    </div>
  );
};
