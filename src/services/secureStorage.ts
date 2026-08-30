interface ZeroApplyDesktopBridge {
  isDesktop: boolean;
  autoInstallLLM?: boolean;
  installOllama?: () => Promise<unknown>;
  startOllama?: () => Promise<boolean>;
  launchChromeAgent?: (url: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  chromeAgentNavigate?: (url: string) => Promise<boolean>;
  chromeAgentEvaluate?: <T = unknown>(script: string) => Promise<T>;
  chromeAgentSelectActiveTarget?: () => Promise<boolean>;
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

export function getSecureItem(key: string): string | null {
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  if (bridge?.secureGet) {
    const secured = bridge.secureGet(key);
    if (secured !== null) {
      memoryCache.set(key, secured);
      return secured;
    }

    const legacy = storage?.getItem(key) ?? null;
    if (legacy !== null) {
      memoryCache.set(key, legacy);
      void bridge.secureSet?.(key, legacy).then(() => storage?.removeItem(key)).catch((error) => {
        console.warn('Secure storage migration failed:', error);
      });
    }
    return legacy;
  }

  return storage?.getItem(key) ?? null;
}

export function setSecureItem(key: string, value: string): void {
  memoryCache.set(key, value);
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (bridge?.secureSet) {
    void bridge.secureSet(key, value).catch((error) => console.warn('Secure storage write failed:', error));
    return;
  }
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export function removeSecureItem(key: string): void {
  memoryCache.delete(key);
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (bridge?.secureRemove) {
    void bridge.secureRemove(key).catch((error) => console.warn('Secure storage removal failed:', error));
    return;
  }
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}
