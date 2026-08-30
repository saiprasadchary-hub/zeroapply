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
      return Boolean(await bridge.chromeAgentNavigate!(nextUrl));
    },
    async executeJavaScript<T = unknown>(script: string): Promise<T> {
      return bridge.chromeAgentEvaluate!(script) as Promise<T>;
    },
    async refreshTarget(): Promise<boolean> {
      return Boolean(await bridge.chromeAgentSelectActiveTarget?.());
    },
  };
  return page;
}
