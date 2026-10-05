import { getVisualCursorScript } from '../agent/stealth/agentCursor';
import { getLiveAgentLightHudScript } from '../agent/ui/liveAgentLightHUD';

interface ChromeLaunchResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface ChromeAgentPage {
  src: string;
  navigate(url: string): Promise<boolean>;
  executeJavaScript<T = unknown>(script: string): Promise<T>;
  refreshTarget(): Promise<boolean>;
}

function installOptionalOverlays(page: ChromeAgentPage): void {
  // Decorations must not hold up page readiness or the first automation action.
  // Catch each separately so a disappearing document or a slow cursor cannot
  // prevent the other overlay from being attempted.
  for (const makeScript of [getVisualCursorScript, getLiveAgentLightHudScript]) {
    void Promise.resolve()
      .then(() => page.executeJavaScript(makeScript()))
      .catch(() => {});
  }
}

export async function launchChromeAgentPage(startUrl: string): Promise<ChromeAgentPage> {
  const bridge = window.zeroApply;
  if (!bridge?.launchChromeAgent || !bridge.chromeAgentEvaluate || !bridge.chromeAgentNavigate) {
    throw new Error('Real Chrome automation is available only in the ZeroApply desktop app.');
  }

  const launched = await bridge.launchChromeAgent(startUrl) as ChromeLaunchResult;
  if (!launched?.ok) throw new Error(launched?.error || 'Google Chrome could not be started.');

  let currentUrl = launched.url || startUrl;
  const page: ChromeAgentPage = {
    get src() {
      return currentUrl;
    },
    set src(nextUrl: string) {
      currentUrl = nextUrl;
      void bridge.chromeAgentNavigate?.(nextUrl).catch((error) => {
        console.error('Chrome agent navigation failed:', error);
      });
    },
    async navigate(nextUrl: string): Promise<boolean> {
      currentUrl = nextUrl;
      const ok = Boolean(await bridge.chromeAgentNavigate!(nextUrl));
      if (ok) installOptionalOverlays(page);
      return ok;
    },
    async executeJavaScript<T = unknown>(script: string): Promise<T> {
      return bridge.chromeAgentEvaluate!(script) as Promise<T>;
    },
    async refreshTarget(): Promise<boolean> {
      return Boolean(await bridge.chromeAgentSelectActiveTarget?.());
    },
  };

  installOptionalOverlays(page);

  return page;
}
