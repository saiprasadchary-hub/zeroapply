import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { getWebLlmState, subscribeWebLlmState } from '../llm/webLlmEngine';

export const OllamaStatusIndicator: React.FC = () => {
  const [state, setState] = useState(getWebLlmState);
  useEffect(() => subscribeWebLlmState(setState), []);
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-700 text-zinc-400"
      title={state.error || (state.isReady ? 'Built-in AI is running locally.' : 'Built-in AI loads only after Review & start AutoApply.')}>
      <Cpu size={10} />
      <span>{state.isLoading ? `LOADING AI ${state.progressPercent ?? 0}%` : state.isReady ? 'BUILT-IN AI READY' : 'AI STANDBY'}</span>
    </div>
  );
};
