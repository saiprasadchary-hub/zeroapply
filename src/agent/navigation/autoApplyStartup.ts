import { matchesStartupDestination } from '../../../AgentBrowser/browser-navigation.js';
export { matchesStartupDestination };
import type { WebviewTarget } from '../domScanner/injectedScanner';

interface StartupPageState {
  url: string;
  ready: boolean;
  loginRequired: boolean;
  blocked: boolean;
}

export const AUTO_APPLY_STARTUP_SCRIPT = `(() => {
  const url = location.href;
  const heading = (document.querySelector('h1')?.textContent || '').trim();
  return {
    url,
    ready: document.readyState === 'interactive' || document.readyState === 'complete',
    loginRequired: /\\/(?:login|signin|sign-in|authwall|checkpoint)(?:[/?#]|$)/i.test(location.pathname),
    blocked: /^(sorry,? you have been blocked|access denied|you have been blocked)/i.test(heading)
      || /attention required.*cloudflare/i.test(document.title || '')
  };
})()`;

/** Probe immediately, then wait only while the requested document is unavailable. */
export async function waitForAutoApplyPage(
  getView: () => WebviewTarget | undefined,
  requestedUrl: string,
  isActive: () => boolean,
  onLoginRequired: () => void,
  timeoutMs = 30_000,
): Promise<WebviewTarget | null> {
  const deadline = Date.now() + timeoutMs;
  let notifiedLogin = false;
  let pendingProbe: Promise<StartupPageState> | undefined;
  let probeView: WebviewTarget | undefined;
  while (isActive() && Date.now() < deadline) {
    const view = getView();
    if (view) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let state: StartupPageState | undefined;
      try {
        if (!pendingProbe || probeView !== view) {
          probeView = view;
          pendingProbe = view.executeJavaScript<StartupPageState>(AUTO_APPLY_STARTUP_SCRIPT);
        }
        state = await Promise.race([
          pendingProbe,
          new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), Math.min(1000, Math.max(0, deadline - Date.now()))); }),
        ]);
        if (state !== undefined) pendingProbe = undefined;
      } catch {
        pendingProbe = undefined;
        // Navigation can replace the execution context between probes.
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
      if (!isActive()) return null;
      if (state?.blocked && matchesStartupDestination(state.url, requestedUrl)) throw new Error('This website denied access. Resolve access in the browser before starting AutoApply.');
      if (state?.loginRequired) {
        if (!notifiedLogin) { onLoginRequired(); notifiedLogin = true; }
      } else if (state?.ready && matchesStartupDestination(state.url, requestedUrl)) {
        return view;
      }
    }
    if (!isActive()) return null;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(100, Math.max(0, deadline - Date.now()))));
  }
  if (!isActive()) return null;
  throw new Error(notifiedLogin ? 'Sign in to the website, then start AutoApply again.' : 'The requested page is not ready. Check the browser page, then start AutoApply again.');
}
