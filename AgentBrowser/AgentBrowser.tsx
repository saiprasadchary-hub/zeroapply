import { ensureEmbeddedModelReady, stopEmbeddedModel, subscribeWebLlmState } from '../src/agent/llm/webLlmEngine';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Lock, 
  RotateCw, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Plus,
  X,
  AlertTriangle,
  LoaderCircle,
  Home,
  Search,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Unlock,
} from 'lucide-react';
import type { PersonaData } from '../src/types';
import { AgentEngine } from '../src/agent/orchestrator/agentEngine';
import { buildSearchUrl, searchAndNavigate } from '../src/agent/search';
import type { StateMachineContext } from '../src/agent/stateMachine/appStateMachine';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { StandardFormsEngine } from '../src/agent/All supported forms';
import { AgentLiveHUD } from '../src/agent/ui/AgentLiveHUD';
import { isLiveAgentInspectorEnabled, isAgentControlBarEnabled, loadStoredSettings, saveStoredSettings } from '../src/settings/settingsManager';
import { QuestionMemoryBank } from '../src/agent/memory/questionMemory';
import { launchChromeAgentPage, normalizeBrowserMode, type ChromeAgentPage, type BrowserMode } from '../src/browserSelect';
import { PersonaManager } from '../src/persona/personaManager';
import { ErrorLogger } from '../src/agent/tracker/errorLogger';
import { isRecoverableWorkflowError } from '../src/agent/recovery/workflowRecovery';
import { matchesStartupDestination, waitForAutoApplyPage } from '../src/agent/navigation/autoApplyStartup';
import {
  ensureVisualCursor,
  cursorSetTheme,
  cursorSetCombination,
  cursorSetPointer,
  cursorSetAvatar,
  cursorSetDisplayMode,
} from '../src/agent/stealth/agentCursor';
import {
  loadStoredCursorId,
  loadStoredPointerId,
  loadStoredAvatarId,
  loadStoredDisplayMode,
  getPointerOption,
  getAvatarOption,
  type CursorPointerId,
  type CursorAvatarId,
  type CursorDisplayMode,
} from '../src/cursors';
import { processTracker } from '../src/agent/tracker/processTracker';
import { isWhatsAppUrl, notifyAndCopyWhatsAppLink } from '../src/agent/workflow/whatsappHandler';
import {
  DEFAULT_HOME_URL,
  MAX_BROWSER_TABS,
  createBrowserTab,
  resolveOmniboxInput,
  restoreBrowserSession,
  safeBrowserUrl,
  saveBrowserSession,
  titleFromUrl,
  type BrowserTab,
} from './browserSession';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
}

import { AgentControlBar, type PlatformId } from '../src/agent/ui/AgentControlBar';

interface EmbeddedStartTarget { tabId: string; platform: PlatformId }

interface AgentBrowserProps {
  persona: PersonaData;
  onSaveToast: (message: string) => void;
  onGlobalLog?: (log: any) => void;
  pendingAction?: { action: 'search' | 'fillApply' | 'autoApply'; platform: PlatformId; timestamp: number } | null;
}

const LINKEDIN_SIGNUP_URL = 'https://www.linkedin.com/signup/cold-join';

const PLATFORMS: Array<{ id: PlatformId; label: string; loginUrl: string }> = [
  { id: 'linkedin', label: 'LinkedIn', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'unstop', label: 'Unstop', loginUrl: 'https://unstop.com/auth/login' },
  { id: 'indeed', label: 'Indeed', loginUrl: 'https://secure.indeed.com/account/login' },
  { id: 'glassdoor', label: 'Glassdoor', loginUrl: 'https://www.glassdoor.com/profile/login_input.htm' },
  { id: 'naukri', label: 'Naukri', loginUrl: 'https://www.naukri.com/nlogin/login' },
  { id: 'testbed', label: 'LinkedIn Demo (Clone)', loginUrl: 'http://localhost:5173/clone-linkedin/index.html' },
  { id: 'auto', label: 'Auto-Detect', loginUrl: 'https://www.google.com' },
];

interface BrowserWebviewProps {
  tab: BrowserTab;
  active: boolean;
  onReady: (tabId: string, view: any | null) => void;
  onNavigate: (tabId: string, url: string) => void;
  onTitle: (tabId: string, title: string) => void;
  onLoading: (tabId: string, loading: boolean) => void;
  onError: (tabId: string, message?: string) => void;
  onFavicon: (tabId: string, favicon?: string) => void;
  onFound: (tabId: string, activeMatch: number, matches: number) => void;
  onIpcMessage: (tabId: string, event: { channel?: string; args?: unknown[] }) => void;
  onNewWindow?: (tabId: string, url: string) => void;
}

// React must serialize Electron's nonstandard boolean attribute as a string.
const WEBVIEW_POPUP_ATTRIBUTES: Record<string, string> = { allowpopups: 'true' };

const BrowserWebview: React.FC<BrowserWebviewProps> = ({
  tab,
  active,
  onReady,
  onNavigate,
  onTitle,
  onLoading,
  onError,
  onFavicon,
  onFound,
  onIpcMessage,
  onNewWindow,
}) => {
  const ref = useRef<any>(null);
  const initialUrl = useRef(tab.loadUrl);
  const requestedUrl = useRef(tab.loadUrl);

  const callbacksRef = useRef({
    onReady,
    onNavigate,
    onTitle,
    onLoading,
    onError,
    onFavicon,
    onFound,
    onIpcMessage,
    onNewWindow,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onNavigate,
      onTitle,
      onLoading,
      onError,
      onFavicon,
      onFound,
      onIpcMessage,
      onNewWindow,
    };
  });

  useEffect(() => {
    const view = ref.current;
    if (!view) return;

    const handleNavigate = (event: { url?: string; isMainFrame?: boolean }) => {
      if (event.isMainFrame === false) return;
      const actualUrl = typeof view.getURL === 'function' ? view.getURL() : event.url;
      const targetUrl = actualUrl || event.url;
      if (targetUrl) {
        try {
          const host = new URL(targetUrl).hostname.toLowerCase();
          if (host.includes('cs.ns1p.net') || host.endsWith('.ns1p.net')) return;
        } catch {}
        callbacksRef.current.onNavigate(tab.id, targetUrl);
      }
    };
    const handleTitle = (event: { title?: string }) => {
      if (event.title) callbacksRef.current.onTitle(tab.id, event.title);
    };
    const handleFinished = () => {
      const title = typeof view.getTitle === 'function' ? view.getTitle() : '';
      if (title) callbacksRef.current.onTitle(tab.id, title);
      const currentUrl = typeof view.getURL === 'function' ? view.getURL() : '';
      if (currentUrl) {
        try {
          const host = new URL(currentUrl).hostname.toLowerCase();
          if (!host.includes('cs.ns1p.net') && !host.endsWith('.ns1p.net')) {
            callbacksRef.current.onNavigate(tab.id, currentUrl);
          }
        } catch {}
      }
      void ensureVisualCursor(view).catch(() => {});
    };
    const handleStartLoading = (event: { isMainFrame?: boolean; isInPlace?: boolean }): void => {
      if (event.isMainFrame === true && !event.isInPlace) {
        callbacksRef.current.onLoading(tab.id, true);
      }
    };
    const handleStopLoading = () => callbacksRef.current.onLoading(tab.id, false);
    const handleLoadFailure = (event: { errorCode?: number; errorDescription?: string; isMainFrame?: boolean }) => {
      if (event.isMainFrame === false || event.errorCode === -3 || event.errorCode === -21) return;
      const detail = `${event.errorDescription || 'Page failed to load'}${event.errorCode ? ` (${event.errorCode})` : ''}`;
      callbacksRef.current.onError(tab.id, detail);
    };
    const handleRendererGone = (event: { reason?: string; details?: { reason?: string } }) => {
      const reason = event.details?.reason || event.reason;
      callbacksRef.current.onError(tab.id, `The page process stopped${reason ? `: ${reason}` : '.'}`);
    };
    const handleFavicon = (event: { favicons?: string[] }) => {
      const favicon = event.favicons?.find((candidate) => /^https?:|^data:image\//i.test(candidate));
      callbacksRef.current.onFavicon(tab.id, favicon);
    };
    const handleFound = (event: { result?: { activeMatchOrdinal?: number; matches?: number } }) => {
      callbacksRef.current.onFound(tab.id, event.result?.activeMatchOrdinal || 0, event.result?.matches || 0);
    };
    const handleDomReady = () => {
      callbacksRef.current.onLoading(tab.id, false);
      callbacksRef.current.onReady(tab.id, view);
      void ensureVisualCursor(view).catch(() => {});
    };
    const handleIpc = (event: { channel?: string; args?: unknown[] }) => callbacksRef.current.onIpcMessage(tab.id, event);
    const handleNewWindow = (event: { url?: string }) => {
      if (event?.url && callbacksRef.current.onNewWindow) {
        callbacksRef.current.onNewWindow(tab.id, event.url);
      }
    };

    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('did-navigate', handleNavigate);
    view.addEventListener('did-navigate-in-page', handleNavigate);
    view.addEventListener('page-title-updated', handleTitle);
    view.addEventListener('did-finish-load', handleFinished);
    view.addEventListener('did-start-navigation', handleStartLoading);
    view.addEventListener('did-stop-loading', handleStopLoading);
    view.addEventListener('did-fail-load', handleLoadFailure);
    view.addEventListener('render-process-gone', handleRendererGone);
    view.addEventListener('page-favicon-updated', handleFavicon);
    view.addEventListener('found-in-page', handleFound);
    view.addEventListener('ipc-message', handleIpc);
    view.addEventListener('new-window', handleNewWindow);

    return () => {
      view.removeEventListener('dom-ready', handleDomReady);
      view.removeEventListener('did-navigate', handleNavigate);
      view.removeEventListener('did-navigate-in-page', handleNavigate);
      view.removeEventListener('page-title-updated', handleTitle);
      view.removeEventListener('did-finish-load', handleFinished);
      view.removeEventListener('did-start-navigation', handleStartLoading);
      view.removeEventListener('did-stop-loading', handleStopLoading);
      view.removeEventListener('did-fail-load', handleLoadFailure);
      view.removeEventListener('render-process-gone', handleRendererGone);
      view.removeEventListener('page-favicon-updated', handleFavicon);
      view.removeEventListener('found-in-page', handleFound);
      view.removeEventListener('ipc-message', handleIpc);
      view.removeEventListener('new-window', handleNewWindow);
      callbacksRef.current.onReady(tab.id, null);
    };
  }, [tab.id]);

  useEffect(() => {
    const view = ref.current;
    if (!view || requestedUrl.current === tab.loadUrl) return;
    requestedUrl.current = tab.loadUrl;
    try {
      view.src = tab.loadUrl;
    } catch {}
  }, [tab.loadUrl]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
        zIndex: active ? 1 : 0,
      }}
    >
      <webview
        ref={ref}
        src={initialUrl.current}
        partition="persist:zeroapply_auth"
        {...WEBVIEW_POPUP_ATTRIBUTES}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

function isInternalJobUrl(targetUrl: string, sourceUrl?: string): boolean {
  if (!targetUrl) return false;
  try {
    const targetObj = new URL(targetUrl);
    const targetHost = targetObj.hostname.toLowerCase();

    // Check if target is LinkedIn job search / card / listing / collections
    if (targetHost === 'linkedin.com' || targetHost.endsWith('.linkedin.com')) {
      if (
        targetObj.pathname.includes('/jobs/search') ||
        targetObj.pathname.includes('/jobs/view') ||
        targetObj.pathname.includes('/jobs/') ||
        targetObj.searchParams.has('currentJobId') ||
        targetObj.pathname.includes('/jobs/collections') ||
        targetObj.pathname.includes('/jobs/tracker')
      ) {
        return true;
      }
    }

    if (sourceUrl) {
      const sourceObj = new URL(sourceUrl);
      const sourceHost = sourceObj.hostname.toLowerCase();
      const isSameHost = targetHost === sourceHost || targetHost.endsWith('.' + sourceHost) || sourceHost.endsWith('.' + targetHost);
      if (isSameHost) {
        const portalHosts = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'naukri.com', 'unstop.com'];
        if (portalHosts.some((h) => targetHost === h || targetHost.endsWith('.' + h))) {
          if (
            targetObj.pathname.includes('/jobs/') ||
            targetObj.pathname.includes('/search') ||
            targetObj.pathname.includes('/job/') ||
            targetObj.pathname.includes('/viewjob') ||
            targetObj.searchParams.has('currentJobId') ||
            targetObj.searchParams.has('jk') ||
            targetObj.searchParams.has('vjk')
          ) {
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const AgentBrowser: React.FC<AgentBrowserProps> = ({ persona, onSaveToast, onGlobalLog, pendingAction }) => {
  const initialSession = useMemo(() => restoreBrowserSession(PLATFORMS[0].loginUrl, 'linkedin'), []);
  const initialActiveTab = initialSession.tabs.find((tab) => tab.id === initialSession.activeTabId) || initialSession.tabs[0];
  const [tabs, setTabs] = useState<BrowserTab[]>(initialSession.tabs);
  const [activeTabId, setActiveTabId] = useState(initialActiveTab.id);
  const [address, setAddress] = useState(initialActiveTab.url);
  const [isElectron] = useState(() => window.zeroApply?.isDesktop === true);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResult, setFindResult] = useState({ active: 0, total: 0 });
  const [browserMenuOpen, setBrowserMenuOpen] = useState(false);
  const webviewRefs = useRef<Map<string, any>>(new Map());
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const closedTabsRef = useRef<BrowserTab[]>([]);
  const browserCommandsRef = useRef<Record<string, () => void>>({});
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const automationTabIdRef = useRef<string | null>(null);
  const pendingAutomationPopupTabIdRef = useRef<string | null>(null);
  const isAutoApplyingRef = useRef(false);
  const lastHandledActionTimeRef = useRef<number>(0);
  const lastStartupRequestRef = useRef<typeof pendingAction>(null);
  useEffect(() => () => {
    isAutoApplyingRef.current = false;
    lastHandledActionTimeRef.current = -1;
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const selectedPlatform = activeTab?.platform || 'linkedin';
  const activeUrl = activeTab?.url || PLATFORMS[0].loginUrl;

  const agentEngineRef = useRef<AgentEngine>(new AgentEngine());
  const autoApplyEngineRef = useRef<AutoApplyEngine>(new AutoApplyEngine());
  const standardFormsEngineRef = useRef<StandardFormsEngine>(new StandardFormsEngine());
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  useEffect(() => {
    void window.zeroApply?.setAutoApplyActive?.(isAutoApplying).catch(() => {});
    return () => { void window.zeroApply?.setAutoApplyActive?.(false).catch(() => {}); };
  }, [isAutoApplying]);
  const [inspectorVisible, setInspectorVisible] = useState(() => isLiveAgentInspectorEnabled());
  const [controlBarVisible, setControlBarVisible] = useState(() => isAgentControlBarEnabled());
  const [browserMode, setBrowserMode] = useState<BrowserMode>(() => normalizeBrowserMode(persona?.browserMode));

  const [activeCursorPointerId, setActiveCursorPointerId] = useState<CursorPointerId>(() => loadStoredPointerId());
  const [activeCursorAvatarId, setActiveCursorAvatarId] = useState<CursorAvatarId>(() => loadStoredAvatarId());
  const [activeCursorDisplayMode, setActiveCursorDisplayMode] = useState<CursorDisplayMode>(() => loadStoredDisplayMode());

  const activePointerOpt = useMemo(() => getPointerOption(activeCursorPointerId), [activeCursorPointerId]);
  const activeAvatarOpt = useMemo(() => getAvatarOption(activeCursorAvatarId), [activeCursorAvatarId]);

  const handleSelectBrowserMode = useCallback((mode: BrowserMode) => {
    setBrowserMode(mode);
    try {
      PersonaManager.updateActiveProfileData({ browserMode: mode });
    } catch {}
    onSaveToast(
      mode === 'agent'
        ? '🚀 Switched to Real Chrome Agent: Applications run in your persistent Chrome browser with real saved logins.'
        : '🖥️ Switched to In-App Embedded Browser: Applications run inside this ZeroApply window.'
    );
  }, [onSaveToast]);

  const [isOpeningChromeLogin, setIsOpeningChromeLogin] = useState(false);
  const openChromeLogin = useCallback(async (): Promise<void> => {
    if (isOpeningChromeLogin || isAutoApplyingRef.current) return;
    setIsOpeningChromeLogin(true);
    try {
      const destination = new URL(activeUrl);
      if (!/^https?:$/.test(destination.protocol) || destination.username || destination.password) {
        throw new Error('Enter a valid website address before opening Chrome.');
      }
      const loginUrl = destination.href;
      agentPageRef.current = await launchChromeAgentPage(loginUrl);
      handleSelectBrowserMode('agent');
      onSaveToast('Continue in Chrome, then return to ZeroApply. This Chrome profile keeps its own saved logins; no application has been started.');
    } catch (error: unknown) {
      onSaveToast(error instanceof Error ? error.message : 'Could not open Chrome for sign-in.');
    } finally {
      setIsOpeningChromeLogin(false);
    }
  }, [activeUrl, isOpeningChromeLogin, handleSelectBrowserMode, onSaveToast]);

  useEffect(() => {
    if (persona?.browserMode) {
      setBrowserMode(normalizeBrowserMode(persona.browserMode));
    }
  }, [persona?.browserMode]);

  useEffect(() => {
    const syncCursorToWebviews = (
      themeIdOverride?: string,
      pointerIdOverride?: CursorPointerId,
      avatarIdOverride?: CursorAvatarId,
      modeOverride?: CursorDisplayMode
    ) => {
      const targetTheme = themeIdOverride || loadStoredCursorId();
      const targetPointer = pointerIdOverride || loadStoredPointerId();
      const targetAvatar = avatarIdOverride || loadStoredAvatarId();
      const targetMode = modeOverride || loadStoredDisplayMode();

      queueMicrotask(() => {
        setActiveCursorPointerId(targetPointer);
        setActiveCursorAvatarId(targetAvatar);
        setActiveCursorDisplayMode(targetMode);
      });

      for (const view of webviewRefs.current.values()) {
        if (view && typeof view.executeJavaScript === 'function') {
          void cursorSetTheme(view, targetTheme, targetPointer, targetAvatar).catch(() => {});
          void cursorSetCombination(view, targetPointer, targetAvatar).catch(() => {});
          void cursorSetDisplayMode(view, targetMode).catch(() => {});
        }
      }

      if (agentPageRef.current && typeof agentPageRef.current.executeJavaScript === 'function') {
        void cursorSetTheme(agentPageRef.current, targetTheme, targetPointer, targetAvatar).catch(() => {});
        void cursorSetCombination(agentPageRef.current, targetPointer, targetAvatar).catch(() => {});
        void cursorSetDisplayMode(agentPageRef.current, targetMode).catch(() => {});
      }
    };

    const handleCursorChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      syncCursorToWebviews(customEvent.detail?.id);
    };

    const handlePointerChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: CursorPointerId }>;
      if (customEvent.detail?.id) {
        syncCursorToWebviews(undefined, customEvent.detail.id);
      }
    };

    const handleAvatarChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: CursorAvatarId }>;
      if (customEvent.detail?.id) {
        syncCursorToWebviews(undefined, undefined, customEvent.detail.id);
      }
    };

    const handleCombinationChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        pointerId?: CursorPointerId;
        avatarId?: CursorAvatarId;
        mode?: CursorDisplayMode;
        baseThemeId?: string;
      }>;
      if (customEvent.detail) {
        syncCursorToWebviews(
          customEvent.detail.baseThemeId,
          customEvent.detail.pointerId,
          customEvent.detail.avatarId,
          customEvent.detail.mode
        );
      }
    };

    const handleDisplayModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: CursorDisplayMode }>;
      if (customEvent.detail?.mode) {
        syncCursorToWebviews(undefined, undefined, undefined, customEvent.detail.mode);
      }
    };

    const handleSettingsUpdate = (e: Event) => {
      queueMicrotask(() => {
        setInspectorVisible(isLiveAgentInspectorEnabled());
        setControlBarVisible(isAgentControlBarEnabled());
        const customEvent = e as CustomEvent<{ cursorTheme?: string }>;
        syncCursorToWebviews(customEvent.detail?.cursorTheme);
      });
    };

    const handleSync = () => {
      syncCursorToWebviews();
      queueMicrotask(() => {
        setControlBarVisible(isAgentControlBarEnabled());
      });
    };

    window.addEventListener('zeroapply_cursor_changed', handleCursorChange);
    window.addEventListener('zeroapply_cursor_pointer_changed', handlePointerChange);
    window.addEventListener('zeroapply_cursor_avatar_changed', handleAvatarChange);
    window.addEventListener('zeroapply_cursor_combination_changed', handleCombinationChange);
    window.addEventListener('zeroapply_cursor_display_mode_changed', handleDisplayModeChange);
    window.addEventListener('zeroapply_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Initial sync
    syncCursorToWebviews();

    return () => {
      window.removeEventListener('zeroapply_cursor_changed', handleCursorChange);
      window.removeEventListener('zeroapply_cursor_pointer_changed', handlePointerChange);
      window.removeEventListener('zeroapply_cursor_avatar_changed', handleAvatarChange);
      window.removeEventListener('zeroapply_cursor_combination_changed', handleCombinationChange);
      window.removeEventListener('zeroapply_cursor_display_mode_changed', handleDisplayModeChange);
      window.removeEventListener('zeroapply_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);
  
  const [agentContext, setAgentContext] = useState<StateMachineContext>(() =>
    agentEngineRef.current.getStateMachine().getContext()
  );

  const actionsRef = useRef<{ handleSearchAndApply: () => Promise<void>; handleAutoFillAndApply: (forceStart?: boolean, target?: EmbeddedStartTarget) => Promise<void> }>({
    handleSearchAndApply: async () => {},
    handleAutoFillAndApply: async () => {},
  });
  // The agent uses the dedicated persistent Chrome profile.
  const agentPageRef = useRef<ChromeAgentPage | null>(null);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
    const view = (browserMode === 'agent' && agentPageRef.current) ? agentPageRef.current : webviewRefs.current.get(activeTabId);
    if (view && typeof view.executeJavaScript === 'function') {
      void ensureVisualCursor(
        view,
        loadStoredCursorId(),
        loadStoredPointerId(),
        loadStoredAvatarId(),
        loadStoredDisplayMode()
      ).catch(() => {});
    }
  }, [activeTabId, browserMode]);

  useEffect(() => {
    const timer = setTimeout(() => saveBrowserSession(tabs, activeTabId), 300);
    return () => clearTimeout(timer);
  }, [activeTabId, tabs]);

  const updateTab = useCallback((tabId: string, updates: Partial<BrowserTab>) => {
    setTabs((current) => {
      const nextTabs = current.map((tab) => tab.id === tabId ? { ...tab, ...updates } : tab);
      tabsRef.current = nextTabs;
      return nextTabs;
    });
  }, []);

  const registerWebview = useCallback((tabId: string, view: any | null) => {
    if (view) {
      webviewRefs.current.set(tabId, view);
      const tab = tabsRef.current.find((candidate) => candidate.id === tabId);
      if (tab && typeof view.setZoomFactor === 'function') view.setZoomFactor(tab.zoomFactor);
    }
    else webviewRefs.current.delete(tabId);
  }, []);

  const lastOpenedUrlRef = useRef<{ url: string; time: number }>({ url: '', time: 0 });

  const openBrowserTab = useCallback((candidate: string, platform: PlatformId) => {
    const normalized = safeBrowserUrl(candidate);
    if (!normalized) {
      onSaveToast('Blocked an invalid or unsafe new-tab address.');
      return;
    }
    const now = Date.now();
    if (lastOpenedUrlRef.current.url === normalized && now - lastOpenedUrlRef.current.time < 3000) {
      return;
    }

    // Duplicate tab check: if an open tab already matches the target URL, switch to it
    const normalizeForDup = (u: string) => {
      try {
        const p = new URL(u);
        return `${p.origin}${p.pathname.replace(/\/+$/, '')}${p.search}`;
      } catch {
        return u;
      }
    };
    const normTarget = normalizeForDup(normalized);
    const existing = tabsRef.current.find((t) => {
      if (normalizeForDup(t.url) === normTarget) return true;
      const v = webviewRefs.current.get(t.id);
      try {
        const curUrl = v?.getURL?.();
        if (curUrl && normalizeForDup(curUrl) === normTarget) return true;
      } catch {}
      return false;
    });

    if (existing) {
      activeTabIdRef.current = existing.id;
      setActiveTabId(existing.id);
      setAddress(existing.url);
      return existing.id;
    }

    lastOpenedUrlRef.current = { url: normalized, time: now };

    if (tabsRef.current.length >= MAX_BROWSER_TABS) {
      onSaveToast(`Close a browser tab before opening another (maximum ${MAX_BROWSER_TABS}).`);
      return;
    }

    const lower = normalized.toLowerCase();
    let initialPlatform: PlatformId = platform;
    if (lower.includes('linkedin.com')) initialPlatform = 'linkedin';
    else if (lower.includes('unstop.com')) initialPlatform = 'unstop';
    else if (lower.includes('indeed.com')) initialPlatform = 'indeed';
    else if (lower.includes('glassdoor.com')) initialPlatform = 'glassdoor';
    else if (lower.includes('naukri.com')) initialPlatform = 'naukri';
    else if (lower.includes('clone-linkedin') || lower.includes('5173/clone')) initialPlatform = 'testbed';
    else if (!lower.includes('linkedin.com')) initialPlatform = 'auto';

    const nextTab = createBrowserTab(normalized, initialPlatform);
    tabsRef.current = [...tabsRef.current, nextTab];
    setTabs(tabsRef.current);
    activeTabIdRef.current = nextTab.id;
    setActiveTabId(nextTab.id);
    setAddress(nextTab.url);
    onSaveToast(`Opened ${nextTab.title} in a new tab.`);
    return nextTab.id;
  }, [onSaveToast]);

  const openAutomationTab = useCallback(async (candidate: string | undefined, platform: PlatformId): Promise<any | null> => {
    if (!candidate) {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        // 1. Check pendingAutomationPopupTabIdRef or automationTabIdRef
        const pendingTabId = pendingAutomationPopupTabIdRef.current || automationTabIdRef.current;
        if (pendingTabId) {
          const pendingView = webviewRefs.current.get(pendingTabId);
          if (pendingView) {
            const currentUrl = typeof pendingView.getURL === 'function' ? String(pendingView.getURL() || '') : '';
            if (currentUrl && currentUrl !== 'about:blank') {
              pendingAutomationPopupTabIdRef.current = null;
              return pendingView;
            }
          }
        }
        // 2. Check if activeTab is not the main tab (first tab)
        const firstTabId = tabsRef.current[0]?.id;
        const currentActiveId = activeTabIdRef.current;
        if (currentActiveId && currentActiveId !== firstTabId) {
          const activeView = webviewRefs.current.get(currentActiveId);
          if (activeView) {
            const currentUrl = typeof activeView.getURL === 'function' ? String(activeView.getURL() || '') : '';
            if (currentUrl && currentUrl !== 'about:blank') {
              automationTabIdRef.current = currentActiveId;
              return activeView;
            }
          }
        }
        // 3. Check if any second tab exists in tabsRef
        if (tabsRef.current.length > 1) {
          const secondTab = tabsRef.current[tabsRef.current.length - 1];
          if (secondTab && secondTab.id !== firstTabId) {
            const secondView = webviewRefs.current.get(secondTab.id);
            if (secondView) {
              const currentUrl = typeof secondView.getURL === 'function' ? String(secondView.getURL() || '') : '';
              if (currentUrl && currentUrl !== 'about:blank') {
                automationTabIdRef.current = secondTab.id;
                return secondView;
              }
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      return null;
    }

    const normalized = safeBrowserUrl(candidate);
    if (!normalized) return null;

    // Never open an automation tab for internal job searches or listings on the same platform
    if (isInternalJobUrl(normalized, activeUrl)) {
      return null;
    }

    const reusableTab = tabsRef.current.find((tab) => tab.id === automationTabIdRef.current);
    const previousUrl = reusableTab?.url || '';
    let tabId = reusableTab?.id;
    if (tabId) {
      updateTab(tabId, {
        url: normalized,
        loadUrl: normalized,
        title: titleFromUrl(normalized),
        platform,
        loading: true,
        error: undefined,
      });
      activeTabIdRef.current = tabId;
      setActiveTabId(tabId);
      setAddress(normalized);
    } else {
      tabId = openBrowserTab(normalized, platform);
      if (!tabId) return null;
      automationTabIdRef.current = tabId;
    }

    const deadline = Date.now() + 8000;
    let mountedView: any | null = null;
    while (Date.now() < deadline) {
      const view = webviewRefs.current.get(tabId);
      if (view) {
        mountedView = view;
        const currentUrl = typeof view.getURL === 'function' ? String(view.getURL() || '') : '';
        if (currentUrl && (!previousUrl || currentUrl === normalized || currentUrl !== previousUrl)) return view;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return mountedView;
  }, [openBrowserTab, updateTab]);

  const closeTab = useCallback((tabId: string) => {
    const currentTabs = tabsRef.current;
    const closingIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (closingIndex < 0) return;

    closedTabsRef.current = [currentTabs[closingIndex], ...closedTabsRef.current].slice(0, 10);

    if (currentTabs.length === 1) {
      updateTab(tabId, {
        platform: 'auto',
        url: DEFAULT_HOME_URL,
        loadUrl: DEFAULT_HOME_URL,
        title: 'New tab',
        loading: true,
        error: undefined,
        favicon: undefined,
        zoomFactor: 1,
      });
      setAddress(DEFAULT_HOME_URL);
      return;
    }

    const remainingTabs = currentTabs.filter((tab) => tab.id !== tabId);
    if (automationTabIdRef.current === tabId) automationTabIdRef.current = null;
    tabsRef.current = remainingTabs;
    setTabs(remainingTabs);
    if (activeTabIdRef.current === tabId) {
      const nextTab = remainingTabs[Math.min(closingIndex, remainingTabs.length - 1)];
      activeTabIdRef.current = nextTab.id;
      setActiveTabId(nextTab.id);
      setAddress(nextTab.url);
    }
  }, [updateTab]);

  const closeAutomationTabAndReturn = useCallback(async () => {
    const autoTabId = automationTabIdRef.current;
    const firstTab = tabsRef.current[0];
    if (autoTabId && firstTab && autoTabId !== firstTab.id) {
      closeTab(autoTabId);
      if (firstTab?.id) {
        activeTabIdRef.current = firstTab.id;
        setActiveTabId(firstTab.id);
        setAddress(firstTab.url);
      }
    } else if (firstTab?.id) {
      activeTabIdRef.current = firstTab.id;
      setActiveTabId(firstTab.id);
      setAddress(firstTab.url);
    }
    automationTabIdRef.current = null;
    pendingAutomationPopupTabIdRef.current = null;
  }, [closeTab]);

  const handleNewWindow = useCallback((tabId: string, url: string) => {
    const sourceTab = tabsRef.current.find((t) => t.id === tabId);
    const platform = sourceTab?.platform || selectedPlatform;

    // WhatsApp Interception Guard: Copy, notify, and never open new tab
    if (isWhatsAppUrl(url)) {
      void notifyAndCopyWhatsAppLink(url);
      onSaveToast(`📋 WhatsApp link copied to clipboard: ${url} (Skipped opening to continue applying)`);
      return;
    }

    // Never open a new tab for internal job search cards, job listings, or same-domain navigation
    if (isInternalJobUrl(url, sourceTab?.url)) {
      return;
    }

    processTracker.recordTabOpened('new_tab', url);
    if (isAutoApplyingRef.current) {
      const newTabId = openBrowserTab(url, platform);
      if (newTabId) {
        automationTabIdRef.current = newTabId;
        pendingAutomationPopupTabIdRef.current = newTabId;
        activeTabIdRef.current = newTabId;
        setActiveTabId(newTabId);
        setAddress(url);
      }
    } else {
      openBrowserTab(url, platform);
    }
  }, [openBrowserTab, selectedPlatform]);

  const handleWebviewNavigate = useCallback((tabId: string, candidate: string) => {
    const normalized = safeBrowserUrl(candidate);
    if (!normalized) return;
    try {
      const host = new URL(normalized).hostname.toLowerCase();
      if (host.includes('cs.ns1p.net') || host.endsWith('.ns1p.net')) return;
    } catch {}

    const lower = normalized.toLowerCase();
    let detectedPlatform: PlatformId = 'auto';
    if (lower.includes('linkedin.com')) detectedPlatform = 'linkedin';
    else if (lower.includes('unstop.com')) detectedPlatform = 'unstop';
    else if (lower.includes('indeed.com')) detectedPlatform = 'indeed';
    else if (lower.includes('glassdoor.com')) detectedPlatform = 'glassdoor';
    else if (lower.includes('naukri.com')) detectedPlatform = 'naukri';
    else if (lower.includes('clone-linkedin') || lower.includes('5173/clone')) detectedPlatform = 'testbed';

    updateTab(tabId, { url: normalized, platform: detectedPlatform });
    if (activeTabIdRef.current === tabId) setAddress(normalized);
  }, [updateTab]);

  const handleWebviewTitle = useCallback((tabId: string, title: string) => {
    const cleanTitle = title.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (cleanTitle) updateTab(tabId, { title: cleanTitle });
  }, [updateTab]);

  const handleWebviewFavicon = useCallback((tabId: string, favicon?: string) => {
    updateTab(tabId, { favicon });
  }, [updateTab]);

  const handleFindResult = useCallback((tabId: string, active: number, total: number) => {
    if (activeTabIdRef.current === tabId) setFindResult({ active, total });
  }, []);

  const handleWebviewLoading = useCallback((tabId: string, loading: boolean) => {
    updateTab(tabId, loading ? { loading: true, error: undefined } : { loading: false });
  }, [updateTab]);

  const handleWebviewError = useCallback((tabId: string, message?: string) => {
    const safeMessage = message || 'The page stopped responding.';
    const tab = tabsRef.current.find((candidate) => candidate.id === tabId);
    updateTab(tabId, { loading: false, error: safeMessage });
    ErrorLogger.log({
      source: 'BrowserTab',
      message: safeMessage,
      portal: tab ? titleFromUrl(tab.url) : undefined,
      severity: 'NETWORK',
      resolved: false,
    });
  }, [updateTab]);

  const handleWebviewIpc = useCallback((tabId: string, event: { channel?: string; args?: unknown[] }) => {
    const sourceTab = tabsRef.current.find((tab) => tab.id === tabId);
    if (!sourceTab) return;

    if (event.channel === 'zeroapply-tab-error') {
      const payload = event.args?.[0] as { message?: unknown } | undefined;
      onSaveToast(typeof payload?.message === 'string' ? payload.message.slice(0, 300) : 'The website blocked an invalid new-tab address.');
      return;
    }
    if (event.channel === 'zeroapply-whatsapp-detected') {
      const payload = event.args?.[0] as { url?: unknown } | undefined;
      const url = typeof payload?.url === 'string' ? payload.url.trim() : '';
      if (url) {
        void notifyAndCopyWhatsAppLink(url);
        onSaveToast(`📋 WhatsApp link copied to clipboard: ${url} (Skipped opening to continue applying)`);
      }
      return;
    }
    if (event.channel === 'zeroapply-open-tab') {
      const payload = event.args?.[0] as { url?: unknown } | undefined;
      if (typeof payload?.url === 'string') {
        const targetUrl = payload.url.trim();
        if (isWhatsAppUrl(targetUrl)) {
          void notifyAndCopyWhatsAppLink(targetUrl);
          onSaveToast(`📋 WhatsApp link copied to clipboard: ${targetUrl} (Skipped opening to continue applying)`);
          return;
        }
        if (isInternalJobUrl(targetUrl, sourceTab.url)) {
          return;
        }
        processTracker.recordTabOpened('new_tab', payload.url);
        if (isAutoApplyingRef.current) {
          const openingTab = openAutomationTab(payload.url, sourceTab.platform);
          pendingAutomationPopupTabIdRef.current = automationTabIdRef.current;
          void openingTab;
        } else {
          openBrowserTab(payload.url, sourceTab.platform);
        }
      }
      return;
    }
    if (event.channel !== 'zeroapply-telemetry') return;

    try {
      const sourceView = webviewRefs.current.get(tabId);
      const hostname = new URL(sourceView?.getURL?.() || sourceTab.url).hostname.toLowerCase();
      const supportedHosts = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'naukri.com', 'unstop.com'];
      if (!supportedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return;

      const payload = event.args?.[0] as { question?: unknown; answer?: unknown } | undefined;
      if (typeof payload?.question !== 'string' || typeof payload.answer !== 'string') return;
      const question = payload.question.trim().slice(0, 500);
      const answer = payload.answer.trim().slice(0, 2000);
      if (!question || !answer) return;
      QuestionMemoryBank.addOrUpdateEntry(question, answer, 'custom');
      processTracker.recordQuestionAnswer(question, answer, 'memory');
      onSaveToast(`Learned custom answer for "${question}"!`);
    } catch (error) {
      console.warn('Rejected malformed webview message:', error);
    }
  }, [onSaveToast, openAutomationTab, openBrowserTab]);

  const selectPlatform = useCallback((platformId: (typeof PLATFORMS)[number]['id']) => {
    const platform = PLATFORMS.find((item) => item.id === platformId);
    if (!platform) return;
    updateTab(activeTabIdRef.current, {
      platform: platformId,
      url: platform.loginUrl,
      loadUrl: platform.loginUrl,
      title: platform.label,
      loading: true,
      error: undefined,
    });
    setAddress(platform.loginUrl);
  }, [updateTab]);

  const agentActionInFlightRef = useRef(false);
  const runAgentAction = useCallback(async (
    action: 'search' | 'fillApply' | 'autoApply',
    platformId: PlatformId,
  ) => {
    if (window.zeroApply?.isDesktop !== true) {
      onSaveToast('Real Chrome Agent is available only in the ZeroApply desktop app.');
      return;
    }
    if (agentActionInFlightRef.current) return;
    agentActionInFlightRef.current = true;
    if (action !== 'search') {
      isAutoApplyingRef.current = true;
      setIsAutoApplying(true);
    }
    const platform = PLATFORMS.find((item) => item.id === platformId) || PLATFORMS[0];
    const roleKeyword = persona.targetRoles?.[0]?.trim() || (persona.techStack?.[0] ? `${persona.techStack[0]} Developer` : 'Software Engineer');

    try {
      if (action !== 'search') await ensureEmbeddedModelReady();
      if (action !== 'search' && !isAutoApplyingRef.current) return;
      const searchUrl = (action === 'search' || action === 'autoApply')
        ? buildSearchUrl(platformId, roleKeyword, persona.location || '', persona.workPreference, persona.applyMode)
        : platform.loginUrl;

      onSaveToast(`🚀 Connecting to Real Chrome with your saved ${platform.label} profile...`);
      const page = await launchChromeAgentPage(searchUrl);
      agentPageRef.current = page;

      if (action === 'search') {
        onSaveToast(`🚀 Real Chrome opened on ${platform.label} for "${roleKeyword}"!`);
        return;
      }

      if (action === 'autoApply' || action === 'fillApply') {
        if (!isAutoApplyingRef.current) return;
        const readyPage = await waitForAutoApplyPage(
          () => page, searchUrl, () => isAutoApplyingRef.current,
          () => onSaveToast('Sign in in Chrome to continue AutoApply.'),
        );
        if (!readyPage) return;
        const allowSubmit = true;
        const isAutoApplyPlatform = platformId === 'linkedin' || platformId === 'testbed';

        for (let restart = 1; restart <= 3; restart++) {
          try {
            if (isAutoApplyPlatform) {
              await autoApplyEngineRef.current.startBatchApply(
                page,
                persona,
                platform.label,
                allowSubmit,
                async (target?: string) => {
                  if (target) await page.navigate(target);
                  return page;
                },
                closeAutomationTabAndReturn,
                { maxJobs: persona.applicationLimit }
              );
            } else {
              await standardFormsEngineRef.current.startBatchApply(
                page,
                persona,
                platformId,
                allowSubmit,
                async (target) => {
                  if (target) await page.navigate(target);
                  else await page.refreshTarget();
                  return page;
                },
              );
            }
            break;
          } catch (error) {
            if (restart >= 3 || !isRecoverableWorkflowError(error) || !isAutoApplyingRef.current) throw error;
            onSaveToast(`Reconnecting to the current Chrome page (${restart + 1}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 2000 * restart));
            if (!isAutoApplyingRef.current) break;
            if (!await page.refreshTarget()) throw error;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Real Chrome automation failed.';
      ErrorLogger.log({
        source: 'RealChromeAgentBrowser',
        message,
        stack: error instanceof Error ? error.stack : undefined,
        portal: platform?.label,
        severity: 'CRITICAL',
        resolved: false,
      });
      onSaveToast(`🚀 Real Chrome stopped: ${message.slice(0, 180)}`);
    } finally {
      if (action !== 'search') await stopEmbeddedModel().catch(() => {});
      agentActionInFlightRef.current = false;
      isAutoApplyingRef.current = false;
      setIsAutoApplying(false);
    }
  }, [onSaveToast, persona, closeAutomationTabAndReturn]);

  useEffect(() => {
    if (!pendingAction || lastStartupRequestRef.current === pendingAction) return;
    lastStartupRequestRef.current = pendingAction;
    if (pendingAction.timestamp && pendingAction.timestamp === lastHandledActionTimeRef.current) {
      return;
    }
    if (isAutoApplyingRef.current || agentActionInFlightRef.current) {
      onSaveToast('AutoApply is already starting or running.');
      return;
    }
    lastHandledActionTimeRef.current = pendingAction.timestamp || Date.now();
    const { action, platform } = pendingAction;
    const effectiveMode = browserMode === 'agent' || normalizeBrowserMode(persona.browserMode) === 'agent' ? 'agent' : 'own';
    if (effectiveMode === 'agent') {
      void runAgentAction(action, platform);
      return;
    }

    const roleKeyword = persona.targetRoles?.[0]?.trim() || (persona.techStack?.[0] ? `${persona.techStack[0]} Developer` : 'Software Engineer');
    const location = persona.location || '';
    const platformItem = PLATFORMS.find((item) => item.id === platform);
    const platformLabel = platformItem?.label || platform;

    if (action === 'search' || action === 'autoApply') {
      const searchUrl = buildSearchUrl(platform, roleKeyword, location, persona.workPreference, persona.applyMode);
      const startupTabId = activeTabIdRef.current;
      const currentView = webviewRefs.current.get(startupTabId);
      let currentUrl = '';
      try { currentUrl = currentView?.getURL?.() || ''; } catch {}
      const reusePage = matchesStartupDestination(currentUrl, searchUrl);
      updateTab(startupTabId, {
        platform,
        url: searchUrl,
        ...(reusePage ? {} : { loadUrl: searchUrl }),
        title: `${platformLabel} Jobs (${persona.applyMode === 'normal' ? 'Normal' : 'Easy Apply'}): ${roleKeyword}`,
        loading: !reusePage,
        error: undefined,
      });
      setAddress(searchUrl);

      if (action === 'search') {
        onSaveToast(`Searching ${platformLabel} for "${roleKeyword}"...`);
        return;
      }

      if (action === 'autoApply') {
        onSaveToast(`🚀 Auto-Apply launched for "${roleKeyword}" on ${platformLabel}!`);
        const sessionTime = pendingAction.timestamp || Date.now();
        lastHandledActionTimeRef.current = sessionTime;
        isAutoApplyingRef.current = true;
        setIsAutoApplying(true);
        const initiateAutoApply = async (): Promise<void> => {
          const isCurrent = (): boolean => isAutoApplyingRef.current && lastHandledActionTimeRef.current === sessionTime;
          try {
            const readyView = await waitForAutoApplyPage(
              () => webviewRefs.current.get(startupTabId), searchUrl, isCurrent,
              () => onSaveToast(`Sign in to ${platformLabel} to continue AutoApply.`),
            );
            if (readyView && isCurrent()) {
              await actionsRef.current.handleAutoFillAndApply(true, { tabId: startupTabId, platform });
            }
          } catch (error: unknown) {
            if (isCurrent()) onSaveToast(error instanceof Error ? error.message : 'AutoApply could not start.');
          } finally {
            if (lastHandledActionTimeRef.current === sessionTime) {
              await stopEmbeddedModel().catch(() => {});
              isAutoApplyingRef.current = false;
              setIsAutoApplying(false);
            }
          }
        };
        void initiateAutoApply();
      }
    } else if (action === 'fillApply') {
      selectPlatform(platform);
      const timer = setTimeout(() => {
        void actionsRef.current.handleAutoFillAndApply(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingAction, onSaveToast, persona.browserMode, persona.targetRoles, persona.location, persona.workPreference, persona.applyMode, persona.techStack, browserMode, runAgentAction, selectPlatform, updateTab]);

  useEffect(() => {
    const unsubscribe = agentEngineRef.current.getStateMachine().subscribe((ctx) => {
      setAgentContext(ctx);
      if (onGlobalLog && ctx.lastMessage) {
        const now = new Date();
        const timestamp = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0') + ':' + 
                          now.getSeconds().toString().padStart(2, '0');
        
        let type: 'info' | 'success' | 'error' | 'warning' = 'info';
        if (ctx.currentState === 'ERROR') type = 'error';
        else if (ctx.currentState === 'SUBMITTED' || ctx.currentState === 'REVIEW_READY' || ctx.currentState === 'VERIFYING') type = 'success';
        else if (ctx.currentState === 'SCANNING') type = 'warning';
        
        onGlobalLog({
          id: Math.random().toString(36).substring(2, 9),
          timestamp,
          message: ctx.lastMessage,
          type
        });
      }
    });
    const autoApplyEngine = autoApplyEngineRef.current;
    const standardFormsEngine = standardFormsEngineRef.current;

    autoApplyEngine.setStatusCallback((status) => {
      onSaveToast(status);
    });
    standardFormsEngine.setStatusCallback((status) => {
      onSaveToast(status);
    });
    if (onGlobalLog) {
      autoApplyEngine.setLogCallback(onGlobalLog);
      standardFormsEngine.setLogCallback(onGlobalLog);
    }

    return () => {
      unsubscribe();
      autoApplyEngine.stop();
      standardFormsEngine.stop();
    };
  }, [onGlobalLog, onSaveToast]);

  useEffect(() => {
    const unsubscribeEvent = window.zeroApply?.onBrowserEvent?.((event) => {
      if (typeof event?.message === 'string' && event.message.trim()) {
        onSaveToast(event.message.trim().slice(0, 300));
      }
    });
    const unsubscribeTab = window.zeroApply?.onOpenTab?.((event) => {
      if (typeof event?.url === 'string' && event.url.trim()) {
        const targetUrl = event.url.trim();
        const sourceTab = typeof event.sourceUrl === 'string'
          ? tabsRef.current.find((tab) => {
            const view = webviewRefs.current.get(tab.id);
            try {
              return view?.getURL?.() === event.sourceUrl || tab.url === event.sourceUrl;
            } catch {
              return tab.url === event.sourceUrl;
            }
          })
          : undefined;
        if (isInternalJobUrl(targetUrl, sourceTab?.url || event.sourceUrl)) {
          return;
        }
        openBrowserTab(targetUrl, sourceTab?.platform || selectedPlatform);
      }
    });
    const unsubscribeCommand = window.zeroApply?.onBrowserCommand?.((event) => {
      if (typeof event?.command === 'string') browserCommandsRef.current[event.command]?.();
    });

    const handleWaToast = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; message: string }>).detail;
      if (detail?.message) {
        onSaveToast(detail.message);
      }
    };
    window.addEventListener('zeroapply_whatsapp_toast', handleWaToast);

    return () => {
      unsubscribeEvent?.();
      unsubscribeTab?.();
      unsubscribeCommand?.();
      window.removeEventListener('zeroapply_whatsapp_toast', handleWaToast);
    };
  }, [onSaveToast, openBrowserTab, selectedPlatform]);

  const navigate = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = resolveOmniboxInput(address);
    if (!normalized) {
      onSaveToast('Enter a website address or search terms.');
      return;
    }
    updateTab(activeTabId, {
      url: normalized,
      loadUrl: normalized,
      title: titleFromUrl(normalized),
      loading: true,
      error: undefined,
    });
    setAddress(normalized);
  };

  const go = (method: 'goBack' | 'goForward' | 'reload') => {
    const view = webviewRefs.current.get(activeTabId);
    if (!view) return;
    if (method === 'goBack' && !view.canGoBack()) return;
    if (method === 'goForward' && !view.canGoForward()) return;
    if (method === 'reload') updateTab(activeTabId, { loading: true, error: undefined });
    view[method]();
  };

  const openLinkedInSignup = () => {
    updateTab(activeTabId, {
      platform: 'linkedin',
      url: LINKEDIN_SIGNUP_URL,
      loadUrl: LINKEDIN_SIGNUP_URL,
      title: 'LinkedIn signup',
      loading: true,
      error: undefined,
    });
    setAddress(LINKEDIN_SIGNUP_URL);
  };

  const activateTab = (tabId: string) => {
    const nextTab = tabsRef.current.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    activeTabIdRef.current = tabId;
    setActiveTabId(tabId);
    setAddress(nextTab.url);
  };

  const openNewTab = () => openBrowserTab(DEFAULT_HOME_URL, 'auto');

  const reopenClosedTab = () => {
    const closedTab = closedTabsRef.current.shift();
    if (!closedTab) {
      onSaveToast('There are no recently closed tabs.');
      return;
    }
    if (tabsRef.current.length >= MAX_BROWSER_TABS) {
      closedTabsRef.current.unshift(closedTab);
      onSaveToast(`Close a tab first (maximum ${MAX_BROWSER_TABS}).`);
      return;
    }
    const restored = {
      ...createBrowserTab(closedTab.url, closedTab.platform),
      title: closedTab.title,
      zoomFactor: closedTab.zoomFactor,
    };
    tabsRef.current = [...tabsRef.current, restored];
    setTabs(tabsRef.current);
    activateTab(restored.id);
  };

  const duplicateActiveTab = () => {
    if (!activeTab) return;
    if (tabsRef.current.length >= MAX_BROWSER_TABS) {
      onSaveToast(`Close a tab first (maximum ${MAX_BROWSER_TABS}).`);
      return;
    }
    const duplicate = {
      ...createBrowserTab(activeTab.url, activeTab.platform),
      title: activeTab.title,
      zoomFactor: activeTab.zoomFactor,
    };
    tabsRef.current = [...tabsRef.current, duplicate];
    setTabs(tabsRef.current);
    activateTab(duplicate.id);
  };

  const cycleTab = (direction: 1 | -1) => {
    const currentTabs = tabsRef.current;
    if (currentTabs.length < 2) return;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === activeTabIdRef.current);
    const nextIndex = (currentIndex + direction + currentTabs.length) % currentTabs.length;
    activateTab(currentTabs[nextIndex].id);
  };

  const changeZoom = (change: number | 'reset') => {
    const current = tabsRef.current.find((tab) => tab.id === activeTabIdRef.current);
    const view = webviewRefs.current.get(activeTabIdRef.current);
    if (!current || !view) return;
    const next = change === 'reset'
      ? 1
      : Math.min(2, Math.max(0.5, Math.round((current.zoomFactor + change) * 10) / 10));
    if (typeof view.setZoomFactor === 'function') view.setZoomFactor(next);
    updateTab(current.id, { zoomFactor: next });
  };

  const scrollActivePage = useCallback((deltaY: number | 'top' | 'bottom') => {
    const view = webviewRefs.current.get(activeTabIdRef.current);
    if (!view || typeof view.executeJavaScript !== 'function') return;
    const script = deltaY === 'top'
      ? `window.scrollTo({ top: 0, behavior: 'smooth' })`
      : deltaY === 'bottom'
      ? `window.scrollTo({ top: document.body.scrollHeight || 99999, behavior: 'smooth' })`
      : `(() => {
          const scrollTarget = Array.from(document.querySelectorAll(
            '.jobs-search-results-list, .scaffold-layout__list-detail-inner, [role="dialog"], .jobs-easy-apply-modal, [data-view-name="job-search-results-list"]'
          )).find(el => el && el.scrollHeight > el.clientHeight);
          if (scrollTarget) {
            scrollTarget.scrollBy({ top: ${deltaY}, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: ${deltaY}, behavior: 'smooth' });
          }
        })()`;
    view.executeJavaScript(script).catch(() => {});
  }, []);

  const printActivePage = async () => {
    const view = webviewRefs.current.get(activeTabIdRef.current);
    if (!view || typeof view.print !== 'function') return;
    try {
      await view.print({ printBackground: true });
    } catch (error) {
      console.warn('Print failed:', error);
      onSaveToast('The page could not be printed. Retry after it finishes loading.');
    }
  };

  const focusAddress = () => {
    setBrowserMenuOpen(false);
    requestAnimationFrame(() => addressInputRef.current?.select());
  };

  const openFind = () => {
    setBrowserMenuOpen(false);
    setFindOpen(true);
    requestAnimationFrame(() => findInputRef.current?.focus());
  };

  const closeFind = () => {
    const view = webviewRefs.current.get(activeTabIdRef.current);
    if (view && typeof view.stopFindInPage === 'function') view.stopFindInPage('clearSelection');
    setFindOpen(false);
    setFindResult({ active: 0, total: 0 });
  };

  const findNext = (forward = true) => {
    const view = webviewRefs.current.get(activeTabIdRef.current);
    if (!view || !findQuery || typeof view.findInPage !== 'function') return;
    view.findInPage(findQuery, { findNext: true, forward });
  };

  useEffect(() => {
    const view = webviewRefs.current.get(activeTabId);
    if (!findOpen || !view || typeof view.findInPage !== 'function') return;
    if (findQuery) view.findInPage(findQuery, { findNext: false, forward: true });
    else {
      view.stopFindInPage?.('clearSelection');
      queueMicrotask(() => {
        setFindResult({ active: 0, total: 0 });
      });
    }
  }, [activeTabId, findOpen, findQuery]);

  browserCommandsRef.current = {
    'focus-address': focusAddress,
    'new-tab': openNewTab,
    'close-tab': () => closeTab(activeTabIdRef.current),
    'reopen-tab': reopenClosedTab,
    reload: () => go('reload'),
    'hard-reload': () => {
      const view = webviewRefs.current.get(activeTabIdRef.current);
      updateTab(activeTabIdRef.current, { loading: true, error: undefined });
      view?.reloadIgnoringCache?.();
    },
    back: () => go('goBack'),
    forward: () => go('goForward'),
    home: () => {
      updateTab(activeTabIdRef.current, { url: DEFAULT_HOME_URL, loadUrl: DEFAULT_HOME_URL, title: 'New tab', loading: true, error: undefined });
      setAddress(DEFAULT_HOME_URL);
    },
    find: openFind,
    print: () => void printActivePage(),
    'zoom-in': () => changeZoom(0.1),
    'zoom-out': () => changeZoom(-0.1),
    'zoom-reset': () => changeZoom('reset'),
    'scroll-down': () => scrollActivePage(380),
    'scroll-up': () => scrollActivePage(-380),
    'scroll-top': () => scrollActivePage('top'),
    'scroll-bottom': () => scrollActivePage('bottom'),
    'next-tab': () => cycleTab(1),
    'previous-tab': () => cycleTab(-1),
  };

  const handleRunAutofill = async () => {
    const isRealChrome = browserMode === 'agent';
    const view = (isRealChrome && agentPageRef.current) ? agentPageRef.current : webviewRefs.current.get(activeTabId);
    if (!view) {
      if (isRealChrome) {
        onSaveToast('Real Chrome is not running. Click "Search Jobs" or "Fill & Apply" to launch it first.');
      } else {
        onSaveToast('The active browser tab is still loading. Please try again in a moment.');
      }
      return;
    }
    const platformLabel = PLATFORMS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform;
    try {
      onSaveToast(`⚡ Scanning page and auto-filling fields on ${isRealChrome ? 'Real Chrome' : 'In-App Browser'} with local Qwen 2.5 LLM...`);
      const result = await agentEngineRef.current.autoFillCurrentPage(view, persona, platformLabel);
      if (result.success) {
        onSaveToast(`✅ Successfully filled ${result.filledCount} of ${result.detectedCount} fields!`);
      } else {
        onSaveToast(result.message || `Autofill completed: ${result.filledCount} fields filled.`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Autofill error';
      onSaveToast(`Autofill stopped: ${msg}`);
    }
  };

  const handleRunStep = async () => {
    const isRealChrome = browserMode === 'agent';
    const view = (isRealChrome && agentPageRef.current) ? agentPageRef.current : webviewRefs.current.get(activeTabId);
    if (!view) {
      if (isRealChrome) {
        onSaveToast('Real Chrome is not running. Click "Search Jobs" or "Fill & Apply" to launch it first.');
      } else {
        onSaveToast('The active browser tab is still loading. Please try again in a moment.');
      }
      return;
    }
    try {
      onSaveToast(`Advancing to next application step on ${isRealChrome ? 'Real Chrome' : 'In-App Browser'}...`);
      const success = await agentEngineRef.current.advanceNextStep(view);
      if (success) {
        onSaveToast('✅ Step advanced successfully!');
      } else {
        onSaveToast('Could not detect a safe "Next" or "Review" button to advance.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Step error';
      onSaveToast(`Advance step failed: ${msg}`);
    }
  };

  const handleSearchAndApply = async () => {
    const roleKeyword = persona.targetRoles?.[0] || '';
    const location = persona.location || '';

    if (!roleKeyword.trim()) {
      onSaveToast('Please fill in at least one Target Role in your Persona before searching.');
      return;
    }

    if (browserMode === 'agent') {
      await runAgentAction('search', selectedPlatform);
      return;
    }

    const view = webviewRefs.current.get(activeTabId);
    if (!view) {
      onSaveToast('The active browser tab is still loading. Please try again in a moment.');
      return;
    }
    const platformLabel = PLATFORMS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform;

    onSaveToast(`Searching ${platformLabel} (Easy + Quick Continue) for "${roleKeyword}" in "${location || 'Any'}"...`);
    try {
      await searchAndNavigate(view, selectedPlatform as any, roleKeyword, location);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      ErrorLogger.log({
        source: 'JobSearch',
        message,
        stack: error instanceof Error ? error.stack : undefined,
        portal: platformLabel,
        severity: 'NETWORK',
        resolved: false,
      });
      onSaveToast(`Search stopped safely: ${message.slice(0, 160)}. Retry when the page is ready.`);
    }
  };

  const handleAutoFillAndApply = async (forceStart = false, startupTarget?: EmbeddedStartTarget): Promise<void> => {
    if (isAutoApplying && !forceStart) {
      autoApplyEngineRef.current.stop();
      standardFormsEngineRef.current.stop();
      isAutoApplyingRef.current = false;
      setIsAutoApplying(false);
      await stopEmbeddedModel().catch(() => {});
      onSaveToast('Stopping Auto-Apply...');
      return;
    }

    const requestedPlatform = startupTarget?.platform || selectedPlatform;
    const effectiveMode = browserMode === 'agent' || normalizeBrowserMode(persona.browserMode) === 'agent' ? 'agent' : 'own';
    if (!startupTarget && effectiveMode === 'agent') {
      await runAgentAction('autoApply', requestedPlatform);
      return;
    }
    
    isAutoApplyingRef.current = true;
    setIsAutoApplying(true);
    let view = webviewRefs.current.get(startupTarget?.tabId || activeTabIdRef.current);
    if (!view) {
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((r) => setTimeout(r, 400));
        view = webviewRefs.current.get(startupTarget?.tabId || activeTabIdRef.current);
        if (view) break;
      }
    }
    if (!view) {
      await stopEmbeddedModel().catch(() => {});
      isAutoApplyingRef.current = false;
      setIsAutoApplying(false);
      onSaveToast('The active browser tab is still loading. Please try again in a moment.');
      return;
    }
    const platformLabel = PLATFORMS.find((p) => p.id === requestedPlatform)?.label || requestedPlatform;
    
    try {
      await ensureEmbeddedModelReady();
      if (!isAutoApplyingRef.current) return;
      const allowSubmit = true;

      for (let restart = 1; restart <= 3; restart++) {
        try {
          const currentUrl = (typeof view.getURL === 'function' ? view.getURL() : '') || activeUrl;
          const isActualLinkedIn = !!(currentUrl && (currentUrl.includes('linkedin.com') || currentUrl.includes('clone-linkedin')));
          const isExternalOrGeneric = !!(currentUrl && (
            currentUrl.includes('docs.google.com') ||
            currentUrl.includes('forms.gle') ||
            currentUrl.includes('greenhouse.io') ||
            currentUrl.includes('lever.co') ||
            activeUrl.includes('workday') ||
            activeUrl.includes('smartrecruiters') ||
            activeUrl.includes('ashbyhq') ||
            activeUrl.includes('taleo') ||
            activeUrl.includes('icims')
          ));
          const isAutoApplyPlatform = (isActualLinkedIn || requestedPlatform === 'testbed' || (requestedPlatform === 'linkedin' && !isExternalOrGeneric));
          if (isAutoApplyPlatform) {
            await autoApplyEngineRef.current.startBatchApply(
              view,
              persona,
              platformLabel,
              allowSubmit,
              (target?: string) => openAutomationTab(target, requestedPlatform),
              closeAutomationTabAndReturn,
              { maxJobs: persona.applicationLimit }
            );
          } else {
            await standardFormsEngineRef.current.startBatchApply(
              view,
              persona,
              requestedPlatform,
              allowSubmit,
              (target) => openAutomationTab(target, requestedPlatform),
            );
          }
          break;
        } catch (error) {
          if (restart >= 3 || !isRecoverableWorkflowError(error) || !isAutoApplyingRef.current) throw error;
          onSaveToast(`Browser interruption detected. Auto-restarting from saved application logs (${restart + 1}/3)...`);
          await new Promise((resolve) => setTimeout(resolve, 1800 * restart));
          if (!isAutoApplyingRef.current) break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown automation error';
      console.error(error);
      ErrorLogger.log({
        source: 'AutoApply',
        message,
        stack: error instanceof Error ? error.stack : undefined,
        portal: platformLabel,
        severity: 'CRITICAL',
        resolved: false,
      });
      onSaveToast(`Auto-Apply stopped safely: ${message.slice(0, 160)}. Review the page before retrying.`);
    } finally {
      await stopEmbeddedModel().catch(() => {});
      isAutoApplyingRef.current = false;
      setIsAutoApplying(false);
    }
  };

  useEffect(() => () => { void stopEmbeddedModel().catch(() => {}); }, []);

  useEffect(() => subscribeWebLlmState((state) => {
    if (!state.error || state.isLoading || !isAutoApplyingRef.current) return;
    isAutoApplyingRef.current = false;
    autoApplyEngineRef.current.stop();
    standardFormsEngineRef.current.stop();
    setIsAutoApplying(false);
    onSaveToast(`AutoApply paused: ${state.error}`);
  }), [onSaveToast]);

  actionsRef.current = { handleSearchAndApply, handleAutoFillAndApply };

  // Calculate clean hostname
  let displayHost = 'Portal View';
  try {
    const parsed = new URL(address);
    displayHost = parsed.hostname.replace(/^www\./, '');
  } catch {}

  return (
    <div className="flex-1 bg-white flex flex-col h-full relative overflow-hidden font-sans">
      <div className="flex-1 bg-white flex flex-col overflow-hidden">

        {/* Persistent in-app tabs keep each application page and login session alive. */}
        <div className="h-10 bg-[#E8EEF5] border-b border-zinc-300/80 px-2 pt-1.5 flex items-end gap-1 shrink-0 overflow-x-auto" role="tablist" aria-label="Browser tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group min-w-[150px] max-w-[230px] h-8 rounded-t-xl border border-b-0 flex items-center gap-2 pl-3 pr-1 transition-colors ${
                tab.id === activeTabId
                  ? 'bg-[#F1F5F9] border-zinc-300 text-zinc-900'
                  : 'bg-transparent border-transparent text-zinc-600 hover:bg-white/60'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab.id === activeTabId}
                onClick={() => activateTab(tab.id)}
                className="min-w-0 flex-1 flex items-center gap-2 text-left"
                title={tab.title}
              >
                {tab.loading
                  ? <LoaderCircle size={13} className="shrink-0 text-cyan-700 animate-spin" />
                  : tab.error
                    ? <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                    : tab.favicon
                      ? <img src={tab.favicon} alt="" className="h-[13px] w-[13px] shrink-0 rounded-sm" />
                      : <Globe size={13} className="shrink-0 text-cyan-700" />}
                <span className="truncate text-[11px] font-semibold">{tab.title}</span>
              </button>
              <button
                type="button"
                onClick={() => closeTab(tab.id)}
                className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-zinc-200"
                aria-label={`Close ${tab.title}`}
                title="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={openNewTab}
            className="mb-1 p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white/70 shrink-0"
            aria-label="New browser tab"
            title="New tab"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* High-Tech Cockpit Address & Portal Bar */}
        <div className="bg-[#F1F5F9] border-b border-zinc-200/90 px-3 py-2 flex items-center justify-between gap-2.5 shrink-0 shadow-2xs">
          
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 text-zinc-600">
            <button type="button" onClick={() => go('goBack')} className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors" title="Back">
              <ArrowLeft size={14} />
            </button>
            <button type="button" onClick={() => go('goForward')} className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors" title="Forward">
              <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => go('reload')} className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors" title="Reload">
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => browserCommandsRef.current.home?.()}
              className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors hidden sm:block"
              title="Home"
              aria-label="Home"
            >
              <Home size={14} />
            </button>
          </div>

          {/* Unified URL & Security Indicator */}
          <form onSubmit={navigate} className="flex-1 flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200/90 focus-within:border-cyan-500 shadow-2xs max-w-2xl min-w-0">
            {activeUrl.startsWith('https:')
              ? <Lock size={12} className="text-emerald-600 shrink-0" />
              : <Unlock size={12} className="text-amber-600 shrink-0" />}
            <span className="text-[11px] font-bold text-zinc-400 font-mono hidden sm:inline">{displayHost}</span>
            <input
              ref={addressInputRef}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs text-zinc-800 bg-transparent w-full outline-none truncate"
              aria-label="Search or enter website address"
              placeholder="Search or enter address"
            />
          </form>

          {/* Portal & Security Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active Visual Agent Cursor Rig Badge */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-sky-50 to-indigo-50/70 text-sky-950 border border-sky-200/90 rounded-xl text-[11px] font-bold shadow-2xs"
              title={`Visual Agent Cursor Studio: ${activePointerOpt.name} + ${activeAvatarOpt.name} (${activeCursorDisplayMode})`}
            >
              <Sparkles size={12} className="text-sky-600 animate-pulse shrink-0" />
              <span className="truncate max-w-[210px]">
                {activeCursorDisplayMode === 'cursor'
                  ? activePointerOpt.name
                  : activeCursorDisplayMode === 'avatar'
                    ? activeAvatarOpt.name
                    : `${activePointerOpt.name} + ${activeAvatarOpt.name}`}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold shadow-2xs">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>In-app browser</span>
            </div>

            {isElectron && (
              <button type="button" onClick={() => void openChromeLogin()}
                disabled={isOpeningChromeLogin || isAutoApplying}
                className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 disabled:opacity-50"
                title="Open this website in installed Google Chrome with your saved ZeroApply logins">
                {isOpeningChromeLogin ? 'Opening Chrome…' : 'Open real Chrome'}
              </button>
            )}

            <select
              value={selectedPlatform}
              onChange={(event) => selectPlatform(event.target.value as (typeof PLATFORMS)[number]['id'])}
              className="bg-white border border-zinc-200/90 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold text-zinc-800 outline-none focus:border-cyan-500 cursor-pointer shadow-2xs max-w-[100px] sm:max-w-none"
              aria-label="Job platform"
            >
              {PLATFORMS.map((platform) => <option key={platform.id} value={platform.id}>{platform.label}</option>)}
            </select>

            <button
              type="button"
              onClick={openFind}
              className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 hidden sm:block"
              title="Find in page (Ctrl+F)"
              aria-label="Find in page"
            >
              <Search size={15} />
            </button>

            <div className="hidden md:flex items-center gap-0.5 border-l border-zinc-200/80 pl-1">
              <button
                type="button"
                onClick={() => scrollActivePage(-380)}
                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
                title="Scroll page up"
                aria-label="Scroll page up"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => scrollActivePage(380)}
                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
                title="Scroll page down"
                aria-label="Scroll page down"
              >
                <ChevronDown size={15} />
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setBrowserMenuOpen((open) => !open)}
                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                title="Browser menu"
                aria-label="Browser menu"
                aria-expanded={browserMenuOpen}
              >
                <MoreVertical size={16} />
              </button>
              {browserMenuOpen && (
                <div className="absolute right-0 top-9 z-50 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 text-xs text-zinc-800 shadow-xl" role="menu">
                  <button type="button" onClick={() => { openNewTab(); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">New tab <span className="float-right text-zinc-400">Ctrl+T</span></button>
                  <button type="button" onClick={() => { duplicateActiveTab(); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Duplicate tab</button>
                  <button type="button" onClick={() => { reopenClosedTab(); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Reopen closed tab <span className="float-right text-zinc-400">Ctrl+Shift+T</span></button>
                  <div className="my-1 border-t border-zinc-100" />
                  <button type="button" onClick={() => { scrollActivePage('top'); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Scroll to top</button>
                  <button type="button" onClick={() => { scrollActivePage('bottom'); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Scroll to bottom</button>
                  <div className="my-1 border-t border-zinc-100" />
                  <button type="button" onClick={openFind} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Find in page <span className="float-right text-zinc-400">Ctrl+F</span></button>
                  <button type="button" onClick={() => { void printActivePage(); setBrowserMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100">Print <span className="float-right text-zinc-400">Ctrl+P</span></button>
                  <div className="my-1 border-t border-zinc-100" />
                  <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5">
                    <span>Zoom</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => changeZoom(-0.1)} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Zoom out"><ZoomOut size={14} /></button>
                      <button type="button" onClick={() => changeZoom('reset')} className="min-w-11 rounded-md px-1 py-1 text-center hover:bg-zinc-100">{Math.round((activeTab?.zoomFactor || 1) * 100)}%</button>
                      <button type="button" onClick={() => changeZoom(0.1)} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Zoom in"><ZoomIn size={14} /></button>
                    </div>
                  </div>
                  <div className="my-1 border-t border-zinc-100" />
                  <button
                    type="button"
                    onClick={() => {
                      const next = !controlBarVisible;
                      setControlBarVisible(next);
                      const current = loadStoredSettings();
                      saveStoredSettings({ ...current, agentControlBarVisible: next });
                      setBrowserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-100 cursor-pointer"
                  >
                    <span>Agent Control Bar</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      controlBarVisible ? 'bg-cyan-100 text-cyan-800' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {controlBarVisible ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Cockpit Command Bar */}
        {controlBarVisible && (
          <AgentControlBar
            agentState={agentContext.currentState}
            detectedCount={agentContext.detectedFieldsCount || 0}
            filledCount={agentContext.filledFieldsCount || 0}
            selectedPlatform={selectedPlatform}
            onSelectPlatform={(p) => selectPlatform(p)}
            browserMode={browserMode}
            onSelectBrowserMode={handleSelectBrowserMode}
            onRunAutofill={handleRunAutofill}
            onRunStep={handleRunStep}
            onSearchAndApply={handleSearchAndApply}
            onAutoFillAndApply={handleAutoFillAndApply}
            isAutoApplying={isAutoApplying}
            batchLimit={persona?.applicationLimit ?? 5}
          />
        )}

        {/* Sign-in advisory banner if user is on an authentication or guest page */}
        {(activeUrl.includes('/login') || activeUrl.includes('/signup') || activeUrl.includes('/auth') || activeUrl.includes('/checkpoint')) && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold">⚠️ Sign-in detected:</span>
              <span>Please log in to your account above. Once logged in, click <strong>Fill & Apply</strong> or <strong>Auto-Fill</strong>.</span>
            </div>
            {isElectron && (
              <button
                type="button"
                onClick={() => void openChromeLogin()}
                disabled={isOpeningChromeLogin || isAutoApplying}
                className="mx-2 shrink-0 rounded border border-amber-300 px-2 py-1 font-semibold disabled:opacity-50"
                title="Use a persistent Chrome profile when a website does not support embedded sign-in"
              >
                {isOpeningChromeLogin ? 'Opening Chrome…' : 'Sign in with Chrome'}
              </button>
            )}
            {selectedPlatform === 'linkedin' && (
              <button
                type="button"
                onClick={openLinkedInSignup}
                className="text-amber-800 underline hover:text-amber-950 text-[11px] font-semibold cursor-pointer"
              >
                Create Account
              </button>
            )}
          </div>
        )}

        {/* Webview Content */}
        <div className="flex-1 bg-white min-h-0 relative overflow-hidden">
          {/* Real-time God-Level Agent HUD Overlay */}
          {inspectorVisible && isLiveAgentInspectorEnabled() && <AgentLiveHUD isAutoApplying={isAutoApplying} />}

          {findOpen && (
            <form
              className="absolute right-4 top-3 z-40 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl"
              onSubmit={(event) => { event.preventDefault(); findNext(true); }}
            >
              <input
                ref={findInputRef}
                value={findQuery}
                onChange={(event) => setFindQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeFind();
                  if (event.key === 'Enter') { event.preventDefault(); findNext(!event.shiftKey); }
                }}
                className="w-52 bg-transparent px-2 py-1 text-xs text-zinc-800 outline-none"
                placeholder="Find in page"
                aria-label="Find in page"
              />
              <span className="min-w-12 text-center text-[10px] text-zinc-500">{findResult.total ? `${findResult.active}/${findResult.total}` : '0/0'}</span>
              <button type="button" onClick={() => findNext(false)} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Previous match"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => findNext(true)} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Next match"><ChevronDown size={14} /></button>
              <button type="button" onClick={closeFind} className="rounded-md p-1 hover:bg-zinc-100" aria-label="Close find"><X size={14} /></button>
            </form>
          )}
          
          {isElectron ? (
            tabs.map((tab) => (
              <BrowserWebview
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId}
                onReady={registerWebview}
                onNavigate={handleWebviewNavigate}
                onTitle={handleWebviewTitle}
                onLoading={handleWebviewLoading}
                onError={handleWebviewError}
                onFavicon={handleWebviewFavicon}
                onFound={handleFindResult}
                onIpcMessage={handleWebviewIpc}
                onNewWindow={handleNewWindow}
              />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 bg-zinc-50/50">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100/60 text-cyan-600 flex items-center justify-center mb-4 ambient-shadow">
                <Globe size={32} />
              </div>
              <h2 className="font-bold text-lg text-zinc-900 tracking-tight flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-600" />
                <span>{PLATFORMS.find(p => p.id === selectedPlatform)?.label || 'Job Portal'} Live Access</span>
              </h2>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                In Web Browser mode. Launch directly or open in Electron desktop container for embedded sign-in persistence.
              </p>
              
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-md hover:scale-105"
                >
                  <ExternalLink size={15} />
                  <span>Open {PLATFORMS.find(p => p.id === selectedPlatform)?.label} ↗</span>
                </a>
                {selectedPlatform === 'linkedin' && (
                  <a
                    href={LINKEDIN_SIGNUP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-800 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-zinc-100 transition-all"
                  >
                    <ExternalLink size={15} />
                    <span>Create LinkedIn account</span>
                  </a>
                )}
              </div>

              <div className="mt-8 border border-zinc-200 bg-white rounded-xl p-4 max-w-md w-full text-left space-y-2 text-xs ambient-shadow">
                <span className="font-mono font-bold text-zinc-700 block uppercase">Quick Launch Portals:</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PLATFORMS.map((p) => (
                    <a
                      key={p.id}
                      href={p.loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 border border-zinc-200 rounded-lg text-zinc-700 font-semibold transition-all flex items-center gap-1"
                    >
                      <span>{p.label}</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isElectron && activeTab?.loading && (
            <div className="absolute left-0 right-0 top-0 z-20 h-0.5 overflow-hidden bg-cyan-100" aria-label="Page loading">
              <div className="h-full w-1/3 bg-cyan-500 animate-pulse" />
            </div>
          )}
          {isElectron && activeTab?.error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-8 text-center">
              <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-lg">
                <AlertTriangle size={30} className="mx-auto text-amber-600" />
                <h2 className="mt-3 text-lg font-bold text-zinc-900">This page could not finish loading</h2>
                <p className="mt-2 text-sm text-zinc-600">{activeTab.error}</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => go('reload')}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                  >
                    Retry page
                  </button>
                  <button
                    type="button"
                    onClick={() => go('goBack')}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100"
                  >
                    Go back
                  </button>
                </div>
              </div>
            </div>
          )}
          {isElectron && selectedPlatform === 'linkedin' && activeUrl.includes('linkedin.com/login') && (
            <div className="absolute bottom-4 right-4 z-10">
              <button
                type="button"
                onClick={openLinkedInSignup}
                className="rounded-lg bg-white/95 border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-md hover:bg-zinc-50"
              >
                New to LinkedIn? Create an account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
