import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { LogOut, Cloud, ChevronDown } from 'lucide-react';

export const UserProfileMenu: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || (isGuest ? 'Guest User' : 'User');
  const userEmail = user?.email || (isGuest ? 'Offline Guest Mode' : '');
  const photoURL = user?.photoURL;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 pl-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/80 text-zinc-800 transition-all text-xs font-semibold focus:outline-none"
      >
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="max-w-[100px] truncate hidden sm:inline text-[12px]">{displayName}</span>
        <ChevronDown size={13} className="text-zinc-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn font-sans text-xs">
          <div className="px-3 py-2 border-b border-zinc-100 mb-1">
            <p className="font-bold text-zinc-900 truncate">{displayName}</p>
            {userEmail && <p className="text-[11px] text-zinc-500 truncate font-mono">{userEmail}</p>}
          </div>

          <div className="px-3 py-1.5 flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg text-[11px] font-mono mb-2">
            <Cloud size={12} className="text-emerald-600 shrink-0" />
            <span>{isGuest ? 'Local Storage' : 'Firebase Cloud Sync'}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-600 font-medium flex items-center gap-2 transition-colors"
          >
            <LogOut size={13} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
