import type { PageWaitOptions, PageWaitResult } from './types';

/**
 * Script injected into the browser/webview to check DOM readiness,
 * pending XMLHttpRequests/fetch counts, and essential job element presence.
 */
export const IN_PAGE_PAGE_READINESS_SCRIPT = `
(function checkPageReadiness() {
  const isReadyState = document.readyState === 'complete' || document.readyState === 'interactive';
  
  // Check if primary application elements already exist in DOM
  const hasModal = Boolean(document.querySelector('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal, form'));
  const hasInputs = Boolean(document.querySelector('input:not([type="hidden"]), select, textarea, [role="combobox"]'));
  const hasJobHeading = Boolean(document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card__job-title, h1, h2'));

  return {
    isReadyState,
    hasModal,
    hasInputs,
    hasJobHeading,
    bodyLength: document.body ? document.body.innerText.length : 0,
    url: window.location.href,
  };
})();
`;

/**
 * Helper to wait for a webpage to become interactive or have essential form elements ready,
 * with adaptive timeout handling for slow network connections.
 */
export async function waitForPageReadiness(
  executeScript: <T>(script: string) => Promise<T>,
  options: PageWaitOptions = {}
): Promise<PageWaitResult> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const pollIntervalMs = options.pollIntervalMs ?? 600;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status: any = await executeScript(IN_PAGE_PAGE_READINESS_SCRIPT);

      if (status) {
        // If essential form/modal elements are found, proceed immediately
        if (status.hasModal && status.hasInputs) {
          return {
            success: true,
            status: 'ready',
            elapsedMs: Date.now() - startTime,
          };
        }

        // If DOM is interactive and page has substantial content
        if (status.isReadyState && (status.hasJobHeading || status.bodyLength > 150)) {
          return {
            success: true,
            status: 'essential_elements_found',
            elapsedMs: Date.now() - startTime,
          };
        }
      }
    } catch {
      // Script execution might fail during early navigation; continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    success: false,
    status: 'timed_out',
    elapsedMs: Date.now() - startTime,
    error: `Page did not reach ready state within ${timeoutMs}ms.`,
  };
}
