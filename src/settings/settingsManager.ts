import { loadStoredCursorId, saveStoredCursorId, DEFAULT_CURSOR_ID } from '../cursors';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  textSize: 'small' | 'medium' | 'large';
  accentColor: 'cyan' | 'indigo' | 'emerald' | 'violet' | 'amber';
  cursorTheme: string;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  autoScrollJobs: boolean;
  visualCursorVisible: boolean;
  cursorBadgeVisible: boolean; // Controls on-cursor "ZeroApply AI: [Action]" text badge
  liveHudVisible: boolean;
  liveAgentInspectorVisible: boolean; // Controls on-screen "Live Agent Inspector"
  liveAgentActivityVisible: boolean;  // Controls in-browser "Live Agent Activity"
  agentControlBarVisible: boolean;    // Controls top cockpit toolbar in Agent Browser (Platform, In-App/Chrome, Auto-Fill, Apply buttons)
  reducedMotion: boolean;
  cacheAnswersInMemory: boolean;
  autoClearCookiesOnExit: boolean;
}

export const SETTINGS_STORAGE_KEY = 'zeroapply_user_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  textSize: 'medium',
  accentColor: 'cyan',
  cursorTheme: DEFAULT_CURSOR_ID,
  soundEnabled: true,
  desktopNotifications: true,
  autoScrollJobs: true,
  visualCursorVisible: true,
  cursorBadgeVisible: true,
  liveHudVisible: true,
  liveAgentInspectorVisible: true,
  liveAgentActivityVisible: true,
  agentControlBarVisible: true,
  reducedMotion: false,
  cacheAnswersInMemory: true,
  autoClearCookiesOnExit: false,
};

let inMemorySettings: AppSettings | null = null;

export function loadStoredSettings(): AppSettings {
  const initialCursor = loadStoredCursorId();
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const resolved: AppSettings = {
          ...DEFAULT_SETTINGS,
          cursorTheme: initialCursor,
          ...parsed,
          cursorBadgeVisible:
            parsed.cursorBadgeVisible !== undefined
              ? Boolean(parsed.cursorBadgeVisible)
              : true,
          liveAgentInspectorVisible:
            parsed.liveAgentInspectorVisible !== undefined
              ? Boolean(parsed.liveAgentInspectorVisible)
              : parsed.liveHudVisible !== undefined
              ? Boolean(parsed.liveHudVisible)
              : true,
          liveAgentActivityVisible:
            parsed.liveAgentActivityVisible !== undefined
              ? Boolean(parsed.liveAgentActivityVisible)
              : parsed.liveHudVisible !== undefined
              ? Boolean(parsed.liveHudVisible)
              : true,
          agentControlBarVisible:
            parsed.agentControlBarVisible !== undefined
              ? Boolean(parsed.agentControlBarVisible)
              : true,
        };
        inMemorySettings = resolved;
        return resolved;
      }
    } catch {
      // fallback
    }
  }
  if (inMemorySettings) {
    return { ...DEFAULT_SETTINGS, ...inMemorySettings, cursorTheme: inMemorySettings.cursorTheme ?? initialCursor };
  }
  return { ...DEFAULT_SETTINGS, cursorTheme: initialCursor };
}

export function saveStoredSettings(settings: AppSettings): void {
  inMemorySettings = { ...settings };
  if (settings.cursorTheme) {
    saveStoredCursorId(settings.cursorTheme);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_settings_updated', { detail: settings }));
      }, 0);
    } catch {}
  }
}

export function isCursorBadgeEnabled(): boolean {
  return loadStoredSettings().cursorBadgeVisible !== false;
}

export function isLiveAgentInspectorEnabled(): boolean {
  return loadStoredSettings().liveAgentInspectorVisible !== false;
}

export function isLiveAgentActivityEnabled(): boolean {
  return loadStoredSettings().liveAgentActivityVisible !== false;
}

export function isAgentControlBarEnabled(): boolean {
  return loadStoredSettings().agentControlBarVisible !== false;
}
