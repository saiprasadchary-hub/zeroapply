import React from 'react';
import { OllamaStatusIndicator } from './OllamaStatusIndicator';
import { Play, Sparkles, RefreshCw, CheckCircle, Layers, Search, Globe } from 'lucide-react';
import type { AgentState } from '../stateMachine/appStateMachine';

export const SUPPORTED_PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'unstop', label: 'Unstop', loginUrl: 'https://unstop.com/auth/login' },
  { id: 'indeed', label: 'Indeed', loginUrl: 'https://secure.indeed.com/account/login' },
  { id: 'glassdoor', label: 'Glassdoor', loginUrl: 'https://www.glassdoor.com/profile/login_input.htm' },
  { id: 'naukri', label: 'Naukri', loginUrl: 'https://www.naukri.com/nlogin/login' },
  { id: 'testbed', label: 'LinkedIn Demo (Clone)', loginUrl: 'http://localhost:5173/clone-linkedin/index.html' },
  { id: 'auto', label: 'Auto-Detect', loginUrl: '' },
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]['id'];

import type { BrowserMode } from '../../browserSelect/types';

interface AgentControlBarProps {
  agentState: AgentState;
  detectedCount: number;
  filledCount: number;
  selectedPlatform: PlatformId;
  onSelectPlatform: (platform: PlatformId) => void;
  browserMode?: BrowserMode;
  onSelectBrowserMode?: (mode: BrowserMode) => void;
  onRunAutofill: () => void;
  onRunStep: () => void;
  onSearchAndApply: () => void;
  onAutoFillAndApply: () => void;
  isAutoApplying?: boolean;
  batchLimit?: number;
}

export const AgentControlBar: React.FC<AgentControlBarProps> = ({
  agentState,
  detectedCount,
  filledCount,
  selectedPlatform,
  onSelectPlatform,
  browserMode,
  onSelectBrowserMode,
  onRunAutofill,
  onRunStep,
  onSearchAndApply,
  onAutoFillAndApply,
  isAutoApplying,
  batchLimit,
}) => {
  const isBusy = agentState === 'SCANNING' || agentState === 'MATCHING' || agentState === 'FILLING' || isAutoApplying;

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2.5 shadow-md shrink-0 text-xs border-b border-zinc-700/50 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-tight font-mono text-[11px] uppercase">
          <Sparkles size={14} className="animate-spin-slow" />
          <span>ZeroApply Agent</span>
        </div>
        <div className="h-3.5 w-px bg-zinc-700 mx-1" />
        <OllamaStatusIndicator />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        {/* Browser Target Mode Toggle (In-App Webview vs Real Chrome) */}
        {onSelectBrowserMode && (
          <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-700/80 rounded-md p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => onSelectBrowserMode('own')}
              className={`px-2 py-0.5 rounded cursor-pointer font-semibold transition-all flex items-center gap-1 ${
                browserMode !== 'agent'
                  ? 'bg-cyan-500 text-black shadow-xs font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="In-App Browser: Run inside the ZeroApply desktop tab"
            >
              <span>🖥️ In-App</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectBrowserMode('agent')}
              className={`px-2 py-0.5 rounded cursor-pointer font-semibold transition-all flex items-center gap-1 ${
                browserMode === 'agent'
                  ? 'bg-emerald-500 text-black shadow-xs font-bold'
                  : 'text-zinc-400 hover:text-emerald-400'
              }`}
              title="Real Chrome: Run in real Google Chrome with your saved LinkedIn logins and persistent profile"
            >
              <span>🚀 Real Chrome</span>
            </button>
          </div>
        )}

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
          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center gap-1.5 transition-all shadow disabled:opacity-50 text-[11px] cursor-pointer hover:shadow-cyan-500/20 hover:shadow-md"
          title="Detect and auto-fill fields on the current page using Persona and local Qwen 2.5 LLM"
        >
          {isBusy ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
          <span>{isBusy ? 'Auto-Filling...' : 'Auto-Fill'}</span>
        </button>

        <button
          type="button"
          onClick={onRunStep}
          disabled={isBusy}
          className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold rounded-lg flex items-center gap-1 transition-all text-[11px] cursor-pointer disabled:opacity-50"
          title="Auto-Advance to next step on the current application form"
        >
          <CheckCircle size={12} />
          <span>Next Step</span>
        </button>

        <div className="h-4 w-px bg-zinc-600 mx-1 hidden sm:block" />

        <button
          type="button"
          onClick={onSearchAndApply}
          disabled={isBusy}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1 transition-all text-[11px] cursor-pointer disabled:opacity-50"
          title="Search for target jobs using your persona keywords"
        >
          <Search size={12} />
          <span>Search Jobs</span>
        </button>

        <button
          type="button"
          onClick={onAutoFillAndApply}
          className={`px-3 py-1 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow text-[11px] cursor-pointer ${
            isAutoApplying
              ? 'bg-rose-600 hover:bg-rose-500 animate-pulse shadow-rose-500/30 shadow-md'
              : 'bg-fuchsia-600 hover:bg-fuchsia-500 hover:shadow-fuchsia-500/25 hover:shadow-md'
          }`}
          title={isAutoApplying ? 'Stop the autonomous batch run safely' : `Start autonomous batch application on this portal (Batch Limit: ${batchLimit ?? 5} jobs max)`}
        >
          {isAutoApplying ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span>{isAutoApplying ? 'Stop Applying' : 'Fill & Apply'}</span>
          {batchLimit !== undefined && !isAutoApplying && (
            <span className="text-[9px] bg-white/20 text-white font-mono font-semibold px-1.5 py-0.5 rounded ml-0.5" title={`Batch Limit: up to ${batchLimit} job(s) per run`}>
              {batchLimit} max
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
