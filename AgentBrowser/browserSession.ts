import type { PlatformId } from '../src/agent/ui/AgentControlBar';
import { getSecureItem, setSecureItem } from '../src/services/secureStorage';

export const DEFAULT_HOME_URL = 'https://www.google.com/';
export const MAX_BROWSER_TABS = 20;
const SESSION_KEY = 'zeroapply_browser_session_v2';
const VALID_PLATFORMS = new Set<PlatformId>(['linkedin', 'unstop', 'indeed', 'glassdoor', 'naukri', 'testbed', 'auto']);

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  loadUrl: string;
  platform: PlatformId;
  loading: boolean;
  error?: string;
  favicon?: string;
  zoomFactor: number;
}

interface PersistedBrowserSession {
  activeTabId: string;
  tabs: Array<Pick<BrowserTab, 'id' | 'title' | 'url' | 'platform' | 'zoomFactor'>>;
}

interface BrowserSession {
  activeTabId: string;
  tabs: BrowserTab[];
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function safeBrowserUrl(candidate: string): string | null {
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveOmniboxInput(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  const explicit = safeBrowserUrl(candidate);
  if (explicit) return explicit;

  const looksLikeHost = !/\s/.test(candidate)
    && (candidate === 'localhost' || candidate.startsWith('localhost:') || candidate.includes('.'));
  if (looksLikeHost) {
    const scheme = candidate === 'localhost' || candidate.startsWith('localhost:') ? 'http' : 'https';
    const hostUrl = safeBrowserUrl(`${scheme}://${candidate}`);
    if (hostUrl) return hostUrl;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(candidate)}`;
}

export function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'New tab';
  } catch {
    return 'New tab';
  }
}

export function createBrowserTab(url: string, platform: PlatformId): BrowserTab {
  return {
    id: newId(),
    title: titleFromUrl(url),
    url,
    loadUrl: url,
    platform,
    loading: true,
    zoomFactor: 1,
  };
}

export function restoreBrowserSession(defaultUrl: string, defaultPlatform: PlatformId): BrowserSession {
  const fallback = createBrowserTab(defaultUrl, defaultPlatform);
  try {
    const raw = getSecureItem(SESSION_KEY);
    if (!raw) return { activeTabId: fallback.id, tabs: [fallback] };
    const parsed = JSON.parse(raw) as Partial<PersistedBrowserSession>;
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.flatMap((tab) => {
        const url = safeBrowserUrl(String(tab?.url || ''));
        const platform = tab?.platform as PlatformId;
        if (!url || !VALID_PLATFORMS.has(platform)) return [];
        const zoomFactor = Number(tab?.zoomFactor);
        return [{
          id: typeof tab?.id === 'string' && tab.id.length <= 100 ? tab.id : newId(),
          title: typeof tab?.title === 'string' ? tab.title.replace(/\s+/g, ' ').trim().slice(0, 80) || titleFromUrl(url) : titleFromUrl(url),
          url,
          loadUrl: url,
          platform,
          loading: true,
          zoomFactor: Number.isFinite(zoomFactor) ? Math.min(2, Math.max(0.5, zoomFactor)) : 1,
        } satisfies BrowserTab];
      }).slice(0, MAX_BROWSER_TABS)
      : [];
    if (tabs.length === 0) return { activeTabId: fallback.id, tabs: [fallback] };
    const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId) ? String(parsed.activeTabId) : tabs[0].id;
    return { activeTabId, tabs };
  } catch {
    return { activeTabId: fallback.id, tabs: [fallback] };
  }
}

export function saveBrowserSession(tabs: BrowserTab[], activeTabId: string): void {
  const payload: PersistedBrowserSession = {
    activeTabId,
    tabs: tabs.slice(0, MAX_BROWSER_TABS).map(({ id, title, url, platform, zoomFactor }) => ({
      id,
      title,
      url,
      platform,
      zoomFactor,
    })),
  };
  setSecureItem(SESSION_KEY, JSON.stringify(payload));
}
