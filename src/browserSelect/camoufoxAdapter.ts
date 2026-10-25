/**
 * Camoufox anti-detect Firefox adapter.
 *
 * Provides a drop-in replacement for the Chrome agent adapter, using the
 * camoufox-js (modified Firefox) browser which spoofs fingerprints at the
 * C++ engine level — undetectable by LinkedIn and other anti-bot systems.
 */

export interface CamoufoxPage {
  src: string;
  navigate(url: string): Promise<boolean>;
  executeJavaScript<T = unknown>(script: string): Promise<T>;
  refreshTarget(): Promise<boolean>;
  close(): Promise<void>;
}

interface CamoufoxLaunchResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Launch the Camoufox anti-detect Firefox browser and navigate to startUrl.
 * Returns a page handle with the same interface used by the agent engines.
 */
export async function launchCamoufoxPage(startUrl: string): Promise<CamoufoxPage> {
  const bridge = window.zeroApply;
  if (!bridge?.launchCamoufox || !bridge.camoufoxEvaluate || !bridge.camoufoxNavigate) {
    throw new Error('Camoufox is available only in the ZeroApply desktop app.');
  }

  const launched = await bridge.launchCamoufox(startUrl) as CamoufoxLaunchResult;
  if (!launched?.ok) {
    throw new Error(launched?.error || 'Camoufox Firefox could not be started. Run: npx camoufox-js fetch');
  }

  let currentUrl = launched.url || startUrl;

  const page: CamoufoxPage = {
    get src() {
      return currentUrl;
    },
    set src(nextUrl: string) {
      currentUrl = nextUrl;
      void bridge.camoufoxNavigate?.(nextUrl).catch((error) => {
        console.error('Camoufox navigation failed:', error);
      });
    },
    async navigate(nextUrl: string): Promise<boolean> {
      currentUrl = nextUrl;
      return Boolean(await bridge.camoufoxNavigate!(nextUrl));
    },
    async executeJavaScript<T = unknown>(script: string): Promise<T> {
      return bridge.camoufoxEvaluate!(script) as Promise<T>;
    },
    async refreshTarget(): Promise<boolean> {
      // Camoufox maintains a single persistent page; re-navigate to current URL
      return Boolean(await bridge.camoufoxNavigate!(currentUrl));
    },
    async close(): Promise<void> {
      await bridge.camoufoxClose?.();
    },
  };

  return page;
}
