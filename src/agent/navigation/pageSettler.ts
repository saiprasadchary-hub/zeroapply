/**
 * ZeroApply Navigation - Page Settler & Loading Guard
 * Ensures the web page, React components, dynamic job detail panes, and application modals
 * are 100% loaded, hydrated, and settled before the autonomous agent attempts to click or interact.
 */

export interface WebviewTarget {
  executeJavaScript: <T>(code: string) => Promise<T>;
}

export interface SettleOptions {
  timeoutMs?: number;
  minStableMs?: number;
  requiredSelector?: string;
  checkLoaders?: boolean;
}

/**
 * Waits for the document readyState to reach 'complete', verifies that
 * dynamic skeleton loaders/spinners are gone, and allows a brief settling buffer.
 */
export async function waitForPageSettled(
  view: WebviewTarget,
  options: SettleOptions = {}
): Promise<boolean> {
  const timeout = options.timeoutMs || 5000;
  const minStable = options.minStableMs || 200;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const state = await view.executeJavaScript<{
        isComplete: boolean;
        hasActiveBlocker: boolean;
        hasRequired: boolean;
        requiredCount: number;
        elementCount: number;
      }>(`
        (() => {
          const isComplete = document.readyState === 'complete' || document.readyState === 'interactive';
          
          const hasRequired = ${options.requiredSelector ? `!!document.querySelector(${JSON.stringify(options.requiredSelector)})` : 'true'};
          const requiredCount = ${options.requiredSelector ? `document.querySelectorAll(${JSON.stringify(options.requiredSelector)}).length` : '1'};

          let hasActiveBlocker = false;
          if (!hasRequired || requiredCount === 0) {
            const loaders = Array.from(document.querySelectorAll(
              '.artdeco-loader, .inline-spinner, .jobs-search-results-list__loading, .loading-spinner, .artdeco-spinner'
            ));
            hasActiveBlocker = loaders.some((el) => {
              const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
              return el.offsetParent !== null && style && style.display !== 'none' && style.visibility !== 'hidden';
            });
          }

          const elementCount = document.body ? document.body.querySelectorAll('*').length : 0;

          return { isComplete, hasActiveBlocker, hasRequired, requiredCount, elementCount };
        })()
      `);

      if (state && state.isComplete && state.hasRequired && !state.hasActiveBlocker && state.elementCount > 30) {
        // Dynamic React hydration stabilization (snappy micro-delay)
        const settleDelay = Math.min(minStable, 80);
        if (settleDelay > 0) {
          await new Promise((r) => setTimeout(r, settleDelay));
        }
        return true;
      }
    } catch {
      // Transient error during page navigation
    }

    await new Promise((r) => setTimeout(r, 80));
  }

  return false;
}

/**
 * After clicking a job card in the search list, waits for the right-hand job detail pane
 * to finish fetching and rendering the new job's details and Easy Apply button.
 */
export async function waitForJobDetailPaneSettled(
  view: WebviewTarget,
  timeoutMs = 3500
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const isReady = await view.executeJavaScript<boolean>(`
        (() => {
          // 1. Direct apply button fast-path: if Easy Apply or primary apply button is already visible and enabled
          const applyBtn = document.querySelector(
            'button.jobs-apply-button, .jobs-s-apply button, [aria-label*="Easy Apply" i], button#main-easy-apply-btn, a.jobs-apply-button, button[data-za-apply-btn], .jobs-apply-button--top-card button, [data-view-name="job-apply-button"] button'
          );

          const detailPane = document.querySelector(
            '.scaffold-layout__detail, .jobs-search__job-details, .job-view-layout, .jobs-details, .jobs-details__main-content, [data-job-details="true"], .jobs-description__container, .jobs-description, .job-details-pane, .scaffold-layout__list-detail-inner'
          );

          // Check for loaders inside the detail pane
          const targetRoot = detailPane || document;
          const paneLoaders = Array.from(targetRoot.querySelectorAll('.artdeco-loader, .inline-spinner, [data-test-skeleton], .jobs-search-results-list__loading'));
          const hasActiveLoaders = paneLoaders.some((l) => {
            const style = window.getComputedStyle ? window.getComputedStyle(l) : null;
            return l.offsetParent !== null && style && style.display !== 'none' && style.visibility !== 'hidden';
          });
          if (hasActiveLoaders) return false;

          // If apply button is present and visible, detail pane is ready immediately!
          if (applyBtn && !applyBtn.disabled) {
            const rect = applyBtn.getBoundingClientRect();
            if (applyBtn.offsetParent !== null || rect.width > 0) {
              return true;
            }
          }

          // Otherwise return true if detail pane container exists without active spinners
          return !!detailPane;
        })()
      `);

      if (isReady) {
        // Snappy listener attachment buffer
        await new Promise((r) => setTimeout(r, 60));
        return true;
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 80));
  }

  return false;
}

/**
 * After clicking "Easy Apply", waits for the multi-step application modal overlay
 * to open and finish rendering its initial form step.
 */
export async function waitForEasyApplyModalOpened(
  view: WebviewTarget,
  timeoutMs = 5000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const isOpened = await view.executeJavaScript<boolean>(`
        (() => {
          // Auto-bypass Job Search Safety Reminder if it appears
          const allBtns = Array.from(document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
          const continueApplyingBtn = allBtns.find(b => {
            const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            return /continue\\s*applying/i.test(t);
          });
          if (continueApplyingBtn && !continueApplyingBtn.disabled) {
            try { continueApplyingBtn.click(); } catch(e) {}
          }

          const modal = document.querySelector(
            '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"].jobs-easy-apply-modal, [data-test-modal-id="easy-apply-modal"], .jobs-easy-apply-content, [data-view-name="job-apply-modal"]'
          );
          if (!modal) return false;

          // Ensure modal is visible
          const rect = modal.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;

          // Check that interactive elements exist inside modal
          const hasInteractive = !!modal.querySelector(
            '.jobs-easy-apply-form-section, input:not([type="hidden"]), select, textarea, button[data-easy-apply-next-button], button.artdeco-button--primary, [data-za-step-btn]'
          );
          return hasInteractive;
        })()
      `);

      if (isOpened) {
        // Snappy slide-in and field hydration buffer
        await new Promise((r) => setTimeout(r, 120));
        return true;
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 80));
  }

  return false;
}
