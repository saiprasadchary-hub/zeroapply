import { ensureVisualCursor } from '../stealth/agentCursor';
import { waitForPageSettled } from '../navigation/pageSettler';
import type { TabBridgeCallbacks } from './normalApplyTypes';

export class TabLifecycleManager {
  private activeAutomationView: any | null = null;
  private isTabOpen = false;

  public constructor(private callbacks: TabBridgeCallbacks) {}

  /**
   * Safely opens an external application in a new tab, waits for redirects and hydration to settle,
   * attaches the stealth visual cursor, and returns the active webview.
   */
  public async openAndSettleExternalTab(
    targetUrl?: string,
    timeoutMs = 15000
  ): Promise<any | null> {
    const { openTab, notifyStatus, notifyLog } = this.callbacks;

    if (!openTab) {
      notifyLog?.('Tab bridge unavailable: no openTab handler provided.', 'error');
      return null;
    }

    notifyStatus?.(`Opening external portal in new tab${targetUrl ? ` (${new URL(targetUrl).hostname})` : ''}...`);
    notifyLog?.(`Initiating new tab for external apply: ${targetUrl || 'pending popup target'}`, 'info');

    let view: any = null;
    try {
      view = await openTab(targetUrl);
    } catch (err) {
      notifyLog?.(`Failed to open new tab: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return null;
    }

    if (!view || typeof view.executeJavaScript !== 'function') {
      notifyLog?.('New tab view is not ready or executeJavaScript is missing.', 'error');
      return null;
    }

    this.activeAutomationView = view;
    this.isTabOpen = true;

    // Wait for the new tab to settle (handling redirects like LinkedIn tracking -> ATS portal)
    notifyStatus?.('Waiting for external application portal to settle & load...');
    await this.waitForRedirectsAndHydration(view, timeoutMs);

    // Attach 3D Purple Visual Cursor to the new tab
    try {
      await ensureVisualCursor(view);
    } catch {}

    return view;
  }

  /**
   * Monitors the webview URL and DOM readiness to ensure tracking redirects
   * (e.g. linkedin.com/jobs/view/externalApply/... or bit.ly) have finished loading the real ATS.
   */
  private async waitForRedirectsAndHydration(view: any, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const minSettledMs = 1200;

    // Check for intermediate redirect domains
    const isRedirectUrl = (url: string): boolean => {
      const lower = (url || '').toLowerCase();
      return (
        lower.includes('linkedin.com/jobs/view/externalapply') ||
        lower.includes('linkedin.com/redir') ||
        lower.includes('bit.ly') ||
        lower.includes('t.co') ||
        lower.includes('cs.ns1p.net')
      );
    };

    while (Date.now() - startTime < timeoutMs) {
      try {
        const currentUrl = typeof view.getURL === 'function' ? String(view.getURL() || '') : '';
        if (currentUrl && !isRedirectUrl(currentUrl) && currentUrl !== 'about:blank') {
          // Page arrived at actual ATS portal destination; let DOM settle
          await waitForPageSettled(view, {
            timeoutMs: Math.min(8000, timeoutMs - (Date.now() - startTime)),
            minStableMs: minSettledMs,
            checkLoaders: true,
          }).catch(() => {});
          return;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Fallback wait if timeout reached
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  /**
   * Cleanly closes the automation tab and restores focus/address to the primary search tab.
   */
  public async closeAndReturnToMainTab(): Promise<void> {
    const { closeTabAndReturn, notifyStatus, notifyLog } = this.callbacks;
    if (!this.isTabOpen) return;

    try {
      notifyStatus?.('Closing new tab and returning focus to main search list...');
      notifyLog?.('Finished external application in new tab. Closing tab & switching back to main tab...', 'info');

      if (closeTabAndReturn) {
        await closeTabAndReturn(this.activeAutomationView);
        // Pacing pause to ensure main tab DOM and webview have resumed rendering
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (err) {
      notifyLog?.(`Notice during tab close: ${err instanceof Error ? err.message : String(err)}`, 'warning');
    } finally {
      this.activeAutomationView = null;
      this.isTabOpen = false;
      notifyStatus?.('Returned to main search tab.');
    }
  }

  public hasOpenTab(): boolean {
    return this.isTabOpen;
  }
}
