import React from 'react';
import { Layers, LayoutDashboard, Terminal, ClipboardCheck, ShieldAlert, Sparkles } from 'lucide-react';
import type { NavTab } from './MobileBottomNav';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  errorCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, errorCount = 0 }) => {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200 flex justify-between items-center w-full px-4 sm:px-6 md:px-8 h-14 md:h-16 z-40 shrink-0 shadow-xs">
      <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md">
            Z
          </div>
          <span className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-zinc-900 font-['Inter']">
            ZeroApply
          </span>
        </div>

        {/* Desktop View Switcher Tabs (Hidden on mobile, mobile uses BottomNavBar) */}
        <nav aria-label="Desktop Navigation" className="hidden md:flex items-center bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers size={14} className={activeTab === 'dashboard' ? 'text-cyan-600 shrink-0' : 'shrink-0'} />
            <span>Persona &amp; Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'browser'
                ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <LayoutDashboard size={14} className={activeTab === 'browser' ? 'text-cyan-600 shrink-0' : 'shrink-0'} />
            <span>Live Browser</span>
          </button>

          <button
            onClick={() => setActiveTab('process')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'process'
                ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Terminal size={14} className={activeTab === 'process' ? 'text-cyan-600 shrink-0' : 'shrink-0'} />
            <span>Process Log</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'qa'
                ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                : 'text-zinc-500 hover:text-cyan-700'
            }`}
          >
            <ClipboardCheck size={14} className={activeTab === 'qa' ? 'text-cyan-600 shrink-0' : 'shrink-0'} />
            <span>QA Check</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all relative shrink-0 ${
              activeTab === 'errors'
                ? 'bg-red-500 text-white shadow-xs font-extrabold'
                : 'text-zinc-500 hover:text-red-700'
            }`}
          >
            <ShieldAlert size={14} className={activeTab === 'errors' ? 'text-white shrink-0' : 'shrink-0'} />
            <span>Errors</span>
            {errorCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[9px] text-white items-center justify-center font-bold">
                  {errorCount > 9 ? '9+' : errorCount}
                </span>
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Right-Side Status Beacon */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Sparkles size={11} className="text-emerald-600" />
          <span className="hidden sm:inline">Local AI Active</span>
          <span className="sm:hidden">Online</span>
        </span>
      </div>
    </header>
  );
};
