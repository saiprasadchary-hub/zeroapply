import type { WebLlmEngineState } from '../agent/llm/webLlmEngine';

export interface DesktopUpdateState {
  phase: 'idle' | 'disabled' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  latestVersion?: string;
  progressPercent: number;
  message: string;
  error?: string;
  canRestart: boolean;
}
interface ZeroApplyDesktopBridge {
  getDesktopUpdateStatus?: () => Promise<DesktopUpdateState>;
  checkDesktopUpdates?: () => Promise<DesktopUpdateState>;
  downloadDesktopUpdate?: () => Promise<DesktopUpdateState>;
  installDesktopUpdate?: () => Promise<void>;
  setAutoApplyActive?: (active: boolean) => Promise<void>;
  onDesktopUpdateState?: (callback: (state: DesktopUpdateState) => void) => () => void;
  isDesktop: boolean;
  loginWithGoogleInChrome?: () => Promise<{ ok: true; idToken: string } | { ok: false; error: string }>;
  cancelGoogleLogin?: () => Promise<void>;
  startEmbeddedLlm?: () => Promise<WebLlmEngineState>;
  getEmbeddedLlmStatus?: () => Promise<WebLlmEngineState>;
  generateEmbeddedLlm?: (payload: { prompt: string; systemPrompt: string; temperature: number; maxTokens: number; images?: string[]; responseSchema?: Record<string, unknown> }) => Promise<string>;
  stopEmbeddedLlm?: () => Promise<void>;
  onEmbeddedLlmState?: (callback: (state: WebLlmEngineState) => void) => () => void;
  launchChromeAgent?: (url: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  chromeAgentNavigate?: (url: string) => Promise<boolean>;
  chromeAgentEvaluate?: <T = unknown>(script: string) => Promise<T>;
  applicationBrowserScreenshot?: (guestId: number) => Promise<string>;
  chromeAgentScreenshot?: () => Promise<string>;
  chromeAgentSelectActiveTarget?: () => Promise<boolean>;
  launchCamoufox?: (url: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  camoufoxNavigate?: (url: string) => Promise<boolean>;
  camoufoxEvaluate?: <T = unknown>(script: string) => Promise<T>;
  camoufoxClose?: () => Promise<boolean>;
  secureGet?: (key: string) => string | null;
  secureSet?: (key: string, value: string) => Promise<boolean>;
  secureRemove?: (key: string) => Promise<boolean>;
  onBrowserEvent?: (callback: (event: { message?: string }) => void) => () => void;
  onOpenTab?: (callback: (event: { url?: string; sourceUrl?: string }) => void) => () => void;
  onBrowserCommand?: (callback: (event: { command?: string }) => void) => () => void;
}

declare global {
  interface Window {
    zeroApply?: ZeroApplyDesktopBridge;
  }
}

const memoryCache = new Map<string, string>();

const storageFailures = new Set<string>();
const failureSubscribers = new Set<() => void>();
export function hasSecureStorageFailure(): boolean { return storageFailures.size > 0; }
export function subscribeSecureStorageFailure(callback: () => void): () => void {
  failureSubscribers.add(callback);
  return () => { failureSubscribers.delete(callback); };
}
function markStorageFailure(key: string): void {
  storageFailures.add(key);
  for (const callback of failureSubscribers) callback();
}
export function assertSecureStorageHealthy(): void {
  if (hasSecureStorageFailure()) throw new Error('Saved data could not be read. Writes and automation are disabled; restart using the original storage configuration.');
}

export function getSecureItem(key: string): string | null {
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  if (bridge?.secureGet) {
    let secured: string | null;
    try { secured = bridge.secureGet(key); }
    catch (error: unknown) { markStorageFailure(key); throw error; }
    if (secured !== null) {
      memoryCache.set(key, secured);
      return secured;
    }

    const legacy = storage?.getItem(key) ?? null;
    if (legacy !== null) {
      memoryCache.set(key, legacy);
      void bridge.secureSet?.(key, legacy).then(ok => {
        if (ok) storage?.removeItem(key);
        else markStorageFailure(key);
      }).catch(() => markStorageFailure(key));
    }
    return legacy;
  }

  return storage?.getItem(key) ?? null;
}

export function setSecureItem(key: string, value: string): void {
  assertSecureStorageHealthy();
  memoryCache.set(key, value);
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (bridge?.secureSet) {
    void bridge.secureSet(key, value).then(ok => { if (!ok) markStorageFailure(key); }).catch(() => markStorageFailure(key));
    return;
  }
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

/** Await the desktop write before acknowledging recovery or submission state. */
export async function setSecureItemDurable(key: string, value: string): Promise<void> {
  assertSecureStorageHealthy();
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (bridge?.secureSet) {
    try { if (!await bridge.secureSet(key, value)) throw new Error('Secure storage did not confirm the write.'); }
    catch (error: unknown) { markStorageFailure(key); throw error; }
  } else if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  memoryCache.set(key, value);
}

export function removeSecureItem(key: string): void {
  assertSecureStorageHealthy();
  memoryCache.delete(key);
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (bridge?.secureRemove) {
    void bridge.secureRemove(key).then(ok => { if (!ok) markStorageFailure(key); }).catch(() => markStorageFailure(key));
    return;
  }
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}
