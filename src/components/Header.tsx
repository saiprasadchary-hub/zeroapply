import React from 'react';
import { User, Globe, ClipboardCheck, FileText } from 'lucide-react';
import type { NavTab } from './MobileBottomNav';
import { UserProfileMenu } from '../auth/UserProfileMenu';
import logoImg from '../assets/logo.png';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-white border-b border-zinc-200/90 flex justify-between items-center w-full px-4 sm:px-6 md:px-8 h-14 md:h-16 z-40 shrink-0 shadow-2xs">
      <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1">
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
        <nav aria-label="Desktop Navigation" className="hidden md:flex items-center bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70 text-xs font-semibold">
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
            <ClipboardCheck size={13} className={activeTab === 'qa' ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'} />
            <span>Submission Check</span>
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
        </nav>
      </div>

      {/* Right-Side User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <UserProfileMenu />
      </div>
    </header>
  );
};
