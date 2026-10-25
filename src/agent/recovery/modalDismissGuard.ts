/**
 * ZeroApply Recovery - Modal Dismiss Guard
 * Auto-detects and dismisses interrupting dialogs, popups, discard confirmations,
 * and cookie banners that block the agent from progressing.
 */

export interface ModalDismissResult {
  dismissed: boolean;
  modalType?: 'discard_confirmation' | 'cookie_consent' | 'feedback_survey' | 'generic_dialog';
  actionTaken?: string;
}

/**
 * In-browser injection script to detect and dismiss interrupting popups.
 */
export const DISMISS_INTERRUPTING_MODALS_SCRIPT = `
(function() {
  // Guard: NEVER dismiss or close an in-progress Easy Apply application form!
  const activeEasyApply = document.querySelector('.jobs-easy-apply-modal, #easy-apply-modal-overlay.active, .jobs-easy-apply-content');
  if (activeEasyApply) {
    const isSubmitted = /your application was sent|application submitted|thank you for applying|application received|received your application|turn your resume into a profile|update your profile|save skills to your profile|add skills to your profile/i.test(
      (activeEasyApply.textContent || '') + ' ' + (document.body ? document.body.innerText : '')
    );
    const hasNotNow = Array.from(activeEasyApply.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
      const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
    });
    if (!isSubmitted && !hasNotNow) {
      // Easy Apply is actively open and being processed - do not dismiss!
      return { dismissed: false };
    }
  }

  // 1.4. Job Search Safety Reminder Dialog ("Continue applying")
  const allPageButtons = Array.from(document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
  const continueApplyingBtn = allPageButtons.find(b => {
    const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
    return /continue\\s*applying/i.test(t);
  });
  if (continueApplyingBtn) {
    continueApplyingBtn.click();
    return {
      dismissed: true,
      modalType: 'generic_dialog',
      actionTaken: 'Clicked "Continue applying" on Job search safety reminder'
    };
  }

  // 1.5. Post-Submission Confirmation / Upsell Dialog (e.g. "Update your profile" or "Your application was sent to...")
  const successUpsellModal = document.querySelector('.artdeco-modal, [role="dialog"], #easy-apply-modal-overlay');
  if (successUpsellModal) {
    const text = (successUpsellModal.textContent || '').toLowerCase();
    const isPostSubmitDialog = text.includes('application was sent') ||
      text.includes('turn your resume into a profile') ||
      text.includes('application submitted') ||
      text.includes('update your profile') ||
      text.includes('save skills to your profile') ||
      text.includes('add skills to your profile');

    // Priority 1: "Not now" button on the post-submission upsell dialog (Never update profile)
    const allButtons = Array.from(successUpsellModal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
    const notNowBtn = allButtons.find(b => {
      const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      if (/update.*profile|save.*profile|add.*skills.*profile|add.*to.*profile/i.test(t)) return false;
      return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
    });
    if (notNowBtn) {
      notNowBtn.click();
      return {
        dismissed: true,
        modalType: 'generic_dialog',
        actionTaken: 'Clicked Not now button (Skipped profile update)'
      };
    }

    // Priority 2: Dismiss / Close button
    if (isPostSubmitDialog) {
      const dismissBtn = successUpsellModal.querySelector(
        'button.artdeco-modal__dismiss, button[aria-label*="Dismiss" i], button[aria-label*="Close" i], [data-test-modal-close-btn], button:has(li-icon[type="cancel-icon"]), button:has(svg[data-test-icon*="close"])'
      );
      if (dismissBtn) {
        dismissBtn.click();
        return {
          dismissed: true,
          modalType: 'generic_dialog',
          actionTaken: 'Clicked post-submission dismiss button ("X")'
        };
      }
    }
  }

  // 1. Discard Application Confirmation (e.g. LinkedIn "Discard application?" / "Save as draft?")
  const discardDialog = document.querySelector('[role="alertdialog"], .artdeco-modal--layer-default');
  // Check for discard confirmation buttons directly
  const allDiscardBtns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => {
    const t = (btn.textContent || '').trim().toLowerCase();
    return (
      t === 'discard' ||
      t.includes('discard') ||
      btn.getAttribute('data-control-name') === 'discard_application_confirm_btn' ||
      btn.getAttribute('data-test-dialog-secondary-action') !== null
    );
  });
  if (allDiscardBtns.length > 0) {
    allDiscardBtns[0].click();
    return {
      dismissed: true,
      modalType: 'discard_confirmation',
      actionTaken: 'Clicked Discard button'
    };
  }

  if (discardDialog) {
    const text = (discardDialog.textContent || '').toLowerCase();

    // Check if it's a discard / exit confirmation modal
    if (text.includes('discard') || text.includes('save') || text.includes('unsubmitted') || text.includes('leave')) {
      const discardBtn = Array.from(discardDialog.querySelectorAll('button')).find(btn => {
        const btnText = (btn.textContent || '').toLowerCase().trim();
        return (
          btnText === 'discard' ||
          btnText.includes('discard') ||
          btnText === 'leave' ||
          btn.getAttribute('data-test-dialog-secondary-action') !== null ||
          btn.getAttribute('data-control-name') === 'discard_application_confirm_btn'
        );
      });

      if (discardBtn) {
        discardBtn.click();
        return {
          dismissed: true,
          modalType: 'discard_confirmation',
          actionTaken: 'Clicked Discard button'
        };
      }
    }

    // Check if it's a generic close/dismiss button
    const closeBtn = discardDialog.querySelector(
      'button[aria-label="Dismiss"], button[aria-label="Close"], button.artdeco-modal__dismiss, [data-test-modal-close-btn]'
    );
    if (closeBtn) {
      closeBtn.click();
      return {
        dismissed: true,
        modalType: 'generic_dialog',
        actionTaken: 'Clicked modal Dismiss/Close button'
      };
    }
  }

  // 2. Cookie consent banners
  const cookieBanner = document.querySelector('#onetrust-banner-sdk, .cookie-banner, [aria-label*="cookie"]');
  if (cookieBanner) {
    const acceptBtn = cookieBanner.querySelector(
      'button#onetrust-accept-btn-handler, button.accept-cookies, button[aria-label*="Accept"]'
    );
    if (acceptBtn) {
      acceptBtn.click();
      return {
        dismissed: true,
        modalType: 'cookie_consent',
        actionTaken: 'Accepted cookie consent banner'
      };
    }
  }

  return { dismissed: false };
})();
`;

export interface WebviewTarget {
  executeJavaScript: <T>(code: string) => Promise<T>;
}

/**
 * Executes dismissal of interrupting popups or discard confirmations.
 */
export async function dismissInterruptingModals(webview: WebviewTarget): Promise<ModalDismissResult> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return { dismissed: false };
  }
  try {
    const res = await webview.executeJavaScript<ModalDismissResult>(DISMISS_INTERRUPTING_MODALS_SCRIPT);
    return res || { dismissed: false };
  } catch {
    return { dismissed: false };
  }
}

/**
 * Ensures any lingering Easy Apply modals or discard alerts are fully closed.
 */
export async function ensureAllModalsClosed(webview: WebviewTarget): Promise<void> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return;

  try {
    await webview.executeJavaScript(`
      (() => {
        const allBtns = Array.from(document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
        // Step 0: If Job search safety reminder ("Continue applying") button is present, click it
        const continueBtn = allBtns.find(b => {
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
          return /continue\\s*applying/i.test(t);
        });
        if (continueBtn) {
          continueBtn.click();
          return;
        }

        // Step 1: If "Not now" / "No thanks" button is present, click it first to skip profile upsells cleanly
        const notNowBtn = allBtns.find(b => {
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
          if (/update.*profile|save.*profile|add.*skills.*profile|add.*to.*profile/i.test(t)) return false;
          return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
        });
        if (notNowBtn) {
          notNowBtn.click();
          return;
        }

        // Step 2: Click close / dismiss / 'X' ("wrong") button on active modal if open
        const closeBtn = document.querySelector(
          '#easy-apply-modal-overlay.active button.artdeco-modal__dismiss, ' +
          '.jobs-easy-apply-modal button.artdeco-modal__dismiss, ' +
          'button.artdeco-modal__dismiss, ' +
          '[data-test-modal-close-btn], button[aria-label*="Dismiss" i], button[aria-label*="Close" i], ' +
          'button:has(li-icon[type="cancel-icon"]), button:has(svg[data-test-icon*="close"]), #modal-close-btn'
        );
        if (closeBtn) {
          closeBtn.click();
          return;
        }

        // Step 3: Success "Done" button (not update profile)
        const doneBtn = document.querySelector('#btn-success-done, [data-test-modal-close-btn], .success-view button');
        if (doneBtn) {
          const t = (doneBtn.textContent || '').trim().toLowerCase();
          if (!/update.*profile|save.*profile/i.test(t)) {
            doneBtn.click();
          }
        }
      })()
    `);

    await new Promise((r) => setTimeout(r, 400));

    // Step 2: Dismiss any discard confirmation dialog if it appeared
    await dismissInterruptingModals(webview);
  } catch {}
}

/**
 * Checks whether an active dialog is currently blocking the screen.
 */
export function hasBlockingDialog(dialogHtml: string): boolean {
  if (!dialogHtml) return false;
  const lower = dialogHtml.toLowerCase();
  return (
    lower.includes('alertdialog') ||
    lower.includes('discard application') ||
    lower.includes('save your changes') ||
    lower.includes('leave page')
  );
}

