import type { WebviewTarget } from '../domScanner/injectedScanner';
import { ensureVisualCursor } from '../stealth/agentCursor';

export interface PostSubmissionDismissal { dismissed: boolean; clicked: boolean; reason: string }

/** Only a confirmed receipt's own Not now button can be activated. */
export const DISMISS_SUBMISSION_RECEIPT_SCRIPT = `(async () => {
  if (window.__zeroApplyReceiptDismissal) return window.__zeroApplyReceiptDismissal;
  const task = (async () => {
    const visible = el => el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const receipt = /your application (?:was|has been) sent|application (?:has been |was )?submitted|thank you for applying|application received|received your application/i;
    const rootsUnder = node => {
      const roots = [node];
      for (let i = 0; i < roots.length; i++) for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
      return roots;
    };
    let receiptSeen = false;
    const deadline = Date.now() + 3500;
    while (Date.now() < deadline) {
      const dialogs = rootsUnder(document).flatMap(root => Array.from(root.querySelectorAll('dialog[open], [role="dialog"], .artdeco-modal'))).filter(visible);
      let matchedReceipt = false;
      for (const dialog of dialogs) {
        const roots = rootsUnder(dialog);
        const text = roots.map(root => root.innerText || root.textContent || '').join(' ');
        const confirmed = receipt.test(text);
        if (confirmed) { receiptSeen = true; matchedReceipt = true; }
        if (!confirmed && !(receiptSeen && /turn your resume into a profile|update your profile|save skills to your profile/i.test(text))) continue;
        const button = roots.flatMap(root => Array.from(root.querySelectorAll('button, [role="button"], a[role="button"]')))
          .find(el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true'
            && /^not\\s+now$/i.test((el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()));
        if (!button) continue;
        if (window.__zeroapplyCursor?.clickElement) {
          const clicked = await window.__zeroapplyCursor.clickElement(button, 'Click Not now · application confirmed');
          if (clicked === false) return { dismissed: false, clicked: false, reason: 'Visual cursor could not activate Not now.' };
        } else {
          button.scrollIntoView({ block: 'center' }); button.click();
        }
        // Never send a second click if the first one has not produced a visible effect.
        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!visible(dialog) || !visible(button)) return { dismissed: true, clicked: true, reason: 'Clicked Not now and confirmation closed.' };
        }
        return { dismissed: false, clicked: true, reason: 'Not now was clicked once; dismissal has not been confirmed.' };
      }
      if (!receiptSeen || (!matchedReceipt && !dialogs.length)) return { dismissed: false, clicked: false, reason: 'No confirmed submission dialog is open.' };
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    return { dismissed: false, clicked: false, reason: 'Confirmed receipt has no available Not now button yet.' };
  })();
  window.__zeroApplyReceiptDismissal = task;
  try { return await task; } finally { if (window.__zeroApplyReceiptDismissal === task) delete window.__zeroApplyReceiptDismissal; }
})()`;

export async function dismissSubmissionReceipt(view: WebviewTarget): Promise<PostSubmissionDismissal> {
  try {
    await ensureVisualCursor(view);
    return await view.executeJavaScript<PostSubmissionDismissal>(DISMISS_SUBMISSION_RECEIPT_SCRIPT);
  } catch (error: unknown) {
    return { dismissed: false, clicked: false, reason: error instanceof Error ? error.message : 'Receipt dismissal failed.' };
  }
}
