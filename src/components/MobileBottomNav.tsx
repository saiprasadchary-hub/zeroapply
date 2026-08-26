import React from 'react';
import { Layers, LayoutDashboard, ClipboardCheck, FileText } from 'lucide-react';

export type NavTab = 'dashboard' | 'browser' | 'qa' | 'resume';

interface MobileBottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    activeBg: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Persona',
      icon: Layers,
      color: 'text-cyan-600',
      activeBg: 'bg-cyan-50 text-cyan-700',
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: LayoutDashboard,
      color: 'text-cyan-600',
      activeBg: 'bg-cyan-50 text-cyan-700',
    },
    {
      id: 'qa',
      label: 'QA Check',
      icon: ClipboardCheck,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: FileText,
      color: 'text-cyan-600',
      activeBg: 'bg-cyan-50 text-cyan-700',
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-zinc-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 py-1.5 transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 group ${
                isActive ? 'scale-105' : 'hover:scale-102 opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-9 h-7 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? item.activeBg : 'text-zinc-500'
                }`}
              >
                <Icon size={18} className={isActive ? item.color : 'text-zinc-600'} />
              </div>

              <span
                className={`text-[10px] font-bold tracking-tight transition-colors mt-0.5 ${
                  isActive ? 'text-zinc-900 font-extrabold' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 absolute -bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
