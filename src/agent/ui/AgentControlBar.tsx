import React from 'react';
import { OllamaStatusIndicator } from './OllamaStatusIndicator';
import { Play, Sparkles, RefreshCw, CheckCircle, Layers, Search, Globe } from 'lucide-react';
import type { AgentState } from '../stateMachine/appStateMachine';

const SUPPORTED_PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'unstop', label: 'Unstop', loginUrl: 'https://unstop.com/auth/login' },
  { id: 'indeed', label: 'Indeed', loginUrl: 'https://secure.indeed.com/account/login' },
  { id: 'glassdoor', label: 'Glassdoor', loginUrl: 'https://www.glassdoor.com/profile/login_input.htm' },
  { id: 'naukri', label: 'Naukri', loginUrl: 'https://www.naukri.com/nlogin/login' },
  { id: 'auto', label: 'Auto-Detect', loginUrl: '' },
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]['id'];

interface AgentControlBarProps {
  agentState: AgentState;
  detectedCount: number;
  filledCount: number;
  selectedPlatform: PlatformId;
  onSelectPlatform: (platform: PlatformId) => void;
  onRunAutofill: () => void;
  onRunStep: () => void;
  onSearchAndApply: () => void;
  onAutoFillAndApply: () => void;
  isAutoApplying?: boolean;
}

export const AgentControlBar: React.FC<AgentControlBarProps> = ({
  agentState,
  detectedCount,
  filledCount,
  selectedPlatform,
  onSelectPlatform,
  onRunAutofill,
  onRunStep,
  onSearchAndApply,
  onAutoFillAndApply,
  isAutoApplying,
}) => {
  const isBusy = agentState === 'SCANNING' || agentState === 'MATCHING' || agentState === 'FILLING' || isAutoApplying;

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0 text-xs">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-tight font-mono text-[11px] uppercase">
          <Sparkles size={14} className="animate-spin-slow" />
          <span>ZeroApply Agent</span>
        </div>
        <div className="h-3.5 w-px bg-zinc-700 mx-1" />
        <OllamaStatusIndicator />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Platform Selection */}
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700/80 rounded-md px-2 py-0.5 text-[11px] font-mono">
          <Globe size={11} className="text-cyan-400 shrink-0" />
          <span className="text-zinc-400 hidden sm:inline">Platform:</span>
          <select
            value={selectedPlatform}
            onChange={(e) => onSelectPlatform(e.target.value as PlatformId)}
            className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
            aria-label="Target Platform"
          >
            {SUPPORTED_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {detectedCount > 0 && (
          <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1">
            <Layers size={11} className="text-cyan-400" />
            <span>Fields: {filledCount}/{detectedCount}</span>
          </span>
        )}

        <button
          type="button"
          onClick={onRunAutofill}
          disabled={isBusy}
          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md flex items-center gap-1.5 transition-all shadow disabled:opacity-50 text-[11px]"
        >
          {isBusy ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
          <span>{isBusy ? 'Auto-Filling...' : 'Auto-Fill'}</span>
        </button>

        <button
          type="button"
          onClick={onRunStep}
          disabled={isBusy}
          className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold rounded-md flex items-center gap-1 transition-all text-[11px]"
          title="Auto-Advance to next step"
        >
          <CheckCircle size={12} />
          <span>Next Step</span>
        </button>

        <div className="h-4 w-px bg-zinc-600 mx-1 hidden sm:block" />



        <button
          type="button"
          onClick={onSearchAndApply}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md flex items-center gap-1 transition-all text-[11px]"
          title="Search for jobs using your persona data"
        >
          <Search size={12} />
          <span>Search Jobs</span>
        </button>

        <button
          type="button"
          onClick={onAutoFillAndApply}
          className={`px-3 py-1 text-white font-bold rounded-md flex items-center gap-1.5 transition-all shadow text-[11px] ${isAutoApplying ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}
          title={isAutoApplying ? 'Stop the current batch safely' : 'Autonomously fill and apply to jobs on this page'}
        >
          {isAutoApplying ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span>{isAutoApplying ? 'Stop Applying' : 'Fill & Apply'}</span>
        </button>
      </div>
    </div>
  );
};
