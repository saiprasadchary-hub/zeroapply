import React, { useEffect, useState } from 'react';
import { User, Globe, Bell, FileText, Cpu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { NavTab } from './MobileBottomNav';
import { UserProfileMenu } from '../auth/UserProfileMenu';
import { getWebLlmState, subscribeWebLlmState, type WebLlmEngineState } from '../agent/llm/webLlmEngine';
import { DesktopUpdates } from './DesktopUpdates';
import logoImg from '../assets/logo.png';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [webState, setWebState] = useState<WebLlmEngineState>(getWebLlmState());

  const isReady = webState.isReady;
  const isLoading = webState.isLoading;

  useEffect(() => subscribeWebLlmState(setWebState), []);

  return (
    <header className="bg-white border-b border-zinc-200/90 flex justify-between items-center w-full px-4 sm:px-6 md:px-8 h-14 md:h-16 z-40 shrink-0 shadow-2xs">
      <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src={logoImg}
            alt="ZeroApply Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
          />
          <span className="font-black text-base sm:text-lg md:text-xl tracking-tight text-zinc-900 font-sans">
            ZeroApply
          </span>
        </div>

        {/* Desktop View Switcher Tabs (Segmented Control) */}
        <div className="hidden md:flex items-center gap-2.5">
          <nav aria-label="Desktop Navigation" className="flex items-center bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <User size={13} className={activeTab === 'dashboard' ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'} />
              <span>Persona &amp; Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('browser')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'browser'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Globe size={13} className={activeTab === 'browser' ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'} />
              <span>Agent Browser</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'qa'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Bell size={13} className={activeTab === 'qa' ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'} />
              <span>Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resume')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'resume'
                  ? 'bg-zinc-900 text-white shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <FileText size={13} className={activeTab === 'resume' ? 'text-white shrink-0' : 'text-zinc-400 shrink-0'} />
              <span>Resume Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-zinc-900 text-white shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <User size={13} className={activeTab === 'profile' ? 'text-white shrink-0' : 'text-zinc-400 shrink-0'} />
              <span>Profile</span>
            </button>
          </nav>

          {/* LLM Status Indicator Beside Resume Studio */}
          <div
            role="status"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all shrink-0 shadow-2xs ${
              isReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
                : isLoading
                ? 'bg-amber-50 text-amber-700 border-amber-300/80 animate-pulse'
                : webState.error ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}
            title={
              isReady
                ? `Local LLM (${webState.modelName || 'Built-in AI'}) is active and ready to solve screening questions.`
                : isLoading
                ? `Loading local model weights (${webState.progressPercent}%)... ${webState.progressText}`
                : webState.error
                ? `LLM Error: ${webState.error}. Click Review & start AutoApply to retry.`
                : 'Built-in AI stays unloaded until you click Review & start AutoApply.'
            }
          >
            {isLoading ? (
              <Loader2 size={12} className="text-amber-600 animate-spin shrink-0" />
            ) : isReady ? (
              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            ) : webState.error ? (
              <XCircle size={12} className="text-rose-600 shrink-0" />
            ) : (
              <Cpu size={12} className="text-zinc-500 shrink-0" />
            )}
            <span className="tracking-tight">
              {isLoading
                ? `Loading AI (${webState.progressPercent ?? 0}%)`
                : isReady
                ? `Built-in AI active`
                : 'AI standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Right-Side User Profile & Mobile LLM Indicator */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          role="status"
          className={`md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold border transition-all ${
            isReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : isLoading
              ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
          }`}
          title={isReady ? 'Local AI Active' : isLoading ? `Loading AI (${webState.progressPercent}%)` : 'AI Standby'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500' : isLoading ? 'bg-amber-500' : 'bg-zinc-400'}`} />
          <span>{isLoading ? `${webState.progressPercent}%` : isReady ? 'AI ON' : 'AI OFF'}</span>
        </div>

        <DesktopUpdates />
        <UserProfileMenu />
      </div>
    </header>
  );
};
