import React, { useState, useEffect, useMemo } from 'react';
import type { PersonaData } from '../types';
import { useAuth } from '../auth/AuthContext';
import { PersonaManager } from '../persona/personaManager';
import { FirebaseCloudSync } from '../services/firebase/cloudSyncService';
import type { NavTab } from '../components/MobileBottomNav';
import {
  User,
  Mail,
  ShieldCheck,
  LogOut,
  Cloud,
  Settings,
  Sun,
  Moon,
  Monitor,
  Type,
  Palette,
  Bell,
  Volume2,
  Eye,
  Zap,
  RotateCcw,
  Check,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CursorStudio } from '../cursors/CursorStudio';
import { loadStoredCursorId, saveStoredCursorId, DEFAULT_CURSOR_ID, getPointerOption, getAvatarOption } from '../cursors';

import {
  type AppSettings,
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  loadStoredSettings,
  saveStoredSettings,
} from '../settings/settingsManager';
export type { AppSettings };

interface ProfilePageProps {
  persona: PersonaData;
  onUpdatePersona: (updated: PersonaData) => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onToast?: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  persona,
  onNavigateToTab,
  onToast,
}) => {
  const { user, isGuest, logout } = useAuth();

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Apply visual settings to document root
  useEffect(() => {
    // Save to storage and notify all listeners
    saveStoredSettings(settings);

    // Apply text size
    if (settings.textSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (settings.textSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }

    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveStoredSettings(next);
    if (key === 'cursorTheme' && typeof value === 'string') {
      saveStoredCursorId(value);
    }
    if (onToast) onToast(`Updated ${key} preference.`);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveStoredCursorId(DEFAULT_CURSOR_ID);
    saveStoredSettings(DEFAULT_SETTINGS);
    if (onToast) onToast('Reset settings to factory defaults.');
  };

  const handleForceCloudSync = async () => {
    if (!user?.uid) {
      if (onToast) onToast('Sign in to sync your profile to Firebase Cloud.');
      return;
    }
    setIsSyncingCloud(true);
    try {
      const cleanProfiles = PersonaManager.getProfiles().map(({ savedResume: _savedResume, ...p }) => p);
      const profilesSaved = await FirebaseCloudSync.savePersonaProfiles(cleanProfiles, PersonaManager.getActiveProfileId(), user.uid);
      const personaSaved = await FirebaseCloudSync.savePersona(persona, user.uid);
      if (!profilesSaved || !personaSaved) throw new Error('Cloud backup did not complete');
      setCloudSynced(true);
      if (onToast) onToast('All profiles successfully backed up to Firebase Firestore!');
      setTimeout(() => setCloudSynced(false), 2500);
    } catch (err) {
      console.error('Cloud sync error:', err);
      if (onToast) onToast('Error syncing to cloud. Please check network connection.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const initials = useMemo(() => {
    const name = user?.displayName || persona?.fullName || 'Sai Prasad Chary';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }, [user?.displayName, persona?.fullName]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#f7f9fd] text-zinc-900 p-3 sm:p-4 md:p-8 font-sans selection:bg-cyan-500/20 selection:text-cyan-900 pb-24 sm:pb-20">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* 1. USER ACCOUNT & IDENTITY CARD (LIGHT THEME) */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-6 md:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="relative shrink-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Avatar'}
                    className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl object-cover ring-2 ring-zinc-200 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-white text-lg sm:text-xl font-bold tracking-wider shadow-sm">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full ring-2 sm:ring-4 ring-white flex items-center justify-center shadow-xs" title="Online Active">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                    {user?.displayName || persona?.fullName || 'Sai Prasad Chary'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={12} />
                    {user?.emailVerified ? 'Verified User' : isGuest ? 'Guest User' : 'Signed In'}
                  </span>
                  {isGuest && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Guest Mode
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-zinc-600">
                    <Mail size={13} className="text-zinc-400" />
                    {user?.email || persona?.email || 'No email provided'}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                    <Cloud size={13} />
                    {user ? (cloudSynced ? 'Firebase Cloud Synced' : 'Firebase Cloud Connected') : 'Stored on this device'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
              <button
                type="button"
                onClick={handleForceCloudSync}
                disabled={isSyncingCloud}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-zinc-200/60"
              >
                {cloudSynced ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-700">Synced!</span>
                  </>
                ) : isSyncingCloud ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-zinc-600" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} className="text-zinc-500" />
                    <span>Sync Cloud</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-rose-50 border border-zinc-200/60 hover:border-rose-200 text-zinc-600 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. APPEARANCE & DISPLAY SETTINGS CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200/60">
                <Palette size={16} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-zinc-900">Appearance & Theme</h2>
                <p className="text-xs text-zinc-500">Customize visual appearance, color mode, and UI font scale</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* Color Mode / Theme Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-800">Interface Theme</h4>
                <p className="text-[11px] text-zinc-500">Select your preferred color scheme</p>
              </div>

              <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    settings.theme === 'light'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Sun size={13} className="text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    settings.theme === 'dark'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Moon size={13} />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'system')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    settings.theme === 'system'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Monitor size={13} className="text-cyan-600" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* Text Size Scaling */}
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Type size={14} className="text-zinc-500" />
                  <span>Text Size Scaling</span>
                </h4>
                <p className="text-[11px] text-zinc-500">Adjust readability and typography proportions</p>
              </div>

              <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 gap-1 self-start sm:self-auto">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSetting('textSize', size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      settings.textSize === size
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {size === 'small' ? 'Small (14px)' : size === 'medium' ? 'Standard (16px)' : 'Large (18px)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Highlight Palette */}
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-800">Accent Highlight Palette</h4>
                <p className="text-[11px] text-zinc-500">Focus rings and interactive elements accent</p>
              </div>

              <div className="flex items-center gap-2.5">
                {[
                  { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500 ring-cyan-400' },
                  { id: 'indigo', label: 'Indigo', color: 'bg-indigo-500 ring-indigo-400' },
                  { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500 ring-emerald-400' },
                  { id: 'violet', label: 'Violet', color: 'bg-purple-500 ring-purple-400' },
                  { id: 'amber', label: 'Amber', color: 'bg-amber-500 ring-amber-400' },
                ].map((palette) => {
                  const isSelected = settings.accentColor === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => updateSetting('accentColor', palette.id as any)}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer ${palette.color} ${
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={palette.label}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. VISUAL & AUTOMATION PREFERENCES CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Zap size={16} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-zinc-900">Automation & Visual Feedback</h2>
                <p className="text-xs text-zinc-500">Control visual feedback and display indicators during auto-apply runs</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Visual 3D Stealth Cursor Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900">Visual 3D Stealth Cursor</h4>
                <p className="text-[11px] text-zinc-500">
                  Render human-like curved mouse gliding cursor and click ripples inside the browser
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('visualCursorVisible', !settings.visualCursorVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.visualCursorVisible ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.visualCursorVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Cursor Action Badge (ZeroApply AI) Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900">Cursor Action Badge (ZeroApply AI)</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    settings.cursorBadgeVisible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {settings.cursorBadgeVisible ? 'SHOW' : 'HIDE'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Display floating "ZeroApply AI: [Action]" text badge next to the cursor pointer during automated form interactions
                </p>
              </div>
              <button
                type="button"
                id="toggle-cursor-badge"
                aria-label="Toggle Cursor Action Badge"
                onClick={() => updateSetting('cursorBadgeVisible', !settings.cursorBadgeVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.cursorBadgeVisible ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.cursorBadgeVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Live Agent Inspector Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900">Live Agent Inspector</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    settings.liveAgentInspectorVisible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {settings.liveAgentInspectorVisible ? 'SHOW' : 'TURN OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Show floating on-screen HUD displaying real-time AI reasoning, solved questions, and live workflow status during AutoApply
                </p>
              </div>
              <button
                type="button"
                id="toggle-live-agent-inspector"
                aria-label="Toggle Live Agent Inspector"
                onClick={() => updateSetting('liveAgentInspectorVisible', !settings.liveAgentInspectorVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.liveAgentInspectorVisible ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.liveAgentInspectorVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Live Agent Activity Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900">Live Agent Activity</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    settings.liveAgentActivityVisible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {settings.liveAgentActivityVisible ? 'SHOW' : 'TURN OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Show in-browser activity card displaying active wizard step and live LLM thought stream inside the webpage
                </p>
              </div>
              <button
                type="button"
                id="toggle-live-agent-activity"
                aria-label="Toggle Live Agent Activity"
                onClick={() => updateSetting('liveAgentActivityVisible', !settings.liveAgentActivityVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.liveAgentActivityVisible ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.liveAgentActivityVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Agent Control Bar (Cockpit Toolbar) Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900">Agent Control Bar (Agent Browser)</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    settings.agentControlBarVisible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {settings.agentControlBarVisible ? 'SHOW' : 'HIDE'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Show or hide the cockpit command bar in Agent Browser with Platform selector, In-App / Real Chrome switch, Auto-Fill, and Apply controls
                </p>
              </div>
              <button
                type="button"
                id="toggle-agent-control-bar"
                aria-label="Toggle Agent Control Bar"
                onClick={() => updateSetting('agentControlBarVisible', !settings.agentControlBarVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.agentControlBarVisible ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.agentControlBarVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Scroll Job Feed */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900">Autonomous Job Feed Scrolling</h4>
                <p className="text-[11px] text-zinc-500">
                  Automatically scroll LinkedIn and job boards smoothly to discover subsequent listings
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('autoScrollJobs', !settings.autoScrollJobs)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.autoScrollJobs ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.autoScrollJobs ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900">Reduced Motion</h4>
                <p className="text-[11px] text-zinc-500">
                  Minimize micro-animations and page transitions across all views
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.reducedMotion ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.reducedMotion ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4. VISUAL AGENT CURSOR STUDIO CARD */}
        <CursorStudio
          selectedCursorId={settings.cursorTheme}
          onCursorChange={(newThemeId) => {
            updateSetting('cursorTheme', newThemeId);
          }}
          onCombinationChange={(pointerId, avatarId) => {
            const ptr = getPointerOption(pointerId);
            const avt = getAvatarOption(avatarId);
            if (onToast) {
              onToast(`Active cursor updated: ${ptr.name} + ${avt.name}`);
            }
          }}
          onDisplayModeChange={(mode) => {
            if (onToast) {
              onToast(`Cursor display mode set to ${mode.toUpperCase()}`);
            }
          }}
        />

        {/* 5. NOTIFICATIONS & SOUND SETTINGS CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/60">
                <Bell size={16} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-zinc-900">Notifications & Sounds</h2>
                <p className="text-xs text-zinc-500">Alerts for completed job submissions and challenge interruptions</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Audio Chime Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Volume2 size={14} className="text-zinc-500" />
                  <span>Submission Audio Chime</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Play a subtle positive confirmation chime when an application is verified by ATS
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.soundEnabled ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.soundEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Desktop Banner Notifications */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Bell size={14} className="text-zinc-500" />
                  <span>Desktop Push Notifications</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Receive a desktop alert when an application batch finishes or requires human CAPTCHA check
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('desktopNotifications', !settings.desktopNotifications)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.desktopNotifications ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.desktopNotifications ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 6. PRIVACY, CACHE & SYSTEM DEFAULTS CARD */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                <Settings size={16} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-zinc-900">Privacy & Memory Cache</h2>
                <p className="text-xs text-zinc-500">Manage on-device question cache and factory preference defaults</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Cache Answers in Memory Bank */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900">Question Memory Cache</h4>
                <p className="text-[11px] text-zinc-500">
                  Locally store answered screening questions to instantly auto-answer identical questions in future jobs
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('cacheAnswersInMemory', !settings.cacheAnswersInMemory)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.cacheAnswersInMemory ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.cacheAnswersInMemory ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Clear Cookies on Exit */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
              <div className="pr-4">
                <h4 className="text-xs font-bold text-zinc-900">Auto-Clear Browser Cookies on Exit</h4>
                <p className="text-[11px] text-zinc-500">
                  Purge transient session cookies when closing Chrome agent instance for maximum stealth
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('autoClearCookiesOnExit', !settings.autoClearCookiesOnExit)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.autoClearCookiesOnExit ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.autoClearCookiesOnExit ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Reset Settings to Factory Defaults */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">Reset Preferences</h4>
                <p className="text-[11px] text-zinc-500">Restore all appearance and notification settings to default</p>
              </div>

              <button
                type="button"
                onClick={handleResetSettings}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-zinc-200/60"
              >
                <RotateCcw size={13} className="text-zinc-500" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
