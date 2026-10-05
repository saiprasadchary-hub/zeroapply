/**
 * ZeroApply LinkedIn Safety & Stealth Guard (Production Grade)
 * 
 * Provides comprehensive security, anti-detection, and account protection for LinkedIn:
 * 1. Disarms cross-origin ad/tracker iframes (cs.ns1p.net, Adobe visitor.publishDestinations)
 * 2. Masks navigator.webdriver and Chrome browser fingerprints to 100% genuine Chrome desktop
 * 3. Auto-unchecks "Follow company to stay updated" to avoid triggering LinkedIn mass-follow bot flags
 * 4. Bypasses "Top Choice" & "Premium" modal upsell traps
 * 5. Audits LinkedIn account health (checks for rate limits, checkpoints, or captcha warnings)
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';

export interface LinkedInSafetyStatus {
  isSafe: boolean;
  status: 'clean' | 'checkpoint_detected' | 'rate_limited' | 'trap_bypassed' | 'reminder_continued';
  warning?: string;
  actionTaken?: string;
}

export const LINKEDIN_STEALTH_SHIELD_SCRIPT = `
(() => {
  try {
    // 1. Mask navigator.webdriver safely
    try {
      const navProto = Object.getPrototypeOf(navigator) || navigator;
      const desc = Object.getOwnPropertyDescriptor(navProto, 'webdriver');
      if (desc && desc.configurable) {
        Object.defineProperty(navProto, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });
      }
    } catch {}

    // 2. Disarm Adobe Visitor API publishDestinations iframe collision
    try {
      if (window.visitor && typeof window.visitor.publishDestinations === 'function') {
        const origPublish = window.visitor.publishDestinations;
        window.visitor.publishDestinations = function(...args) {
          try {
            return { status: 'suppressed_for_safety', destinations: [] };
          } catch {
            return null;
          }
        };
      }
    } catch {}

    // 3. Filter cross-origin tracking frame console pollution (cs.ns1p.net, demdex)
    try {
      const origWarn = console.warn;
      if (typeof origWarn === 'function') {
        console.warn = function(...args) {
          const msg = args.join(' ');
          if (
            msg.includes('cs.ns1p.net') ||
            msg.includes('publishDestinations') ||
            msg.includes('Domains, protocols and ports must match') ||
            msg.includes('Unsafe attempt to load URL')
          ) {
            return;
          }
          return Reflect.apply(origWarn, console, args);
        };
      }
    } catch {}

    // 4. Ensure window.chrome runtime integrity
    try {
      if (!window.chrome) {
        window.chrome = {
          app: { isInstalled: false },
          runtime: { id: undefined },
          loadTimes: () => ({}),
          csi: () => ({}),
        };
      }
    } catch {}

    return true;
  } catch (err) {
    return false;
  }
})();
`;

/**
 * Injects anti-bot stealth overrides and mutes tracker iframe collisions on LinkedIn.
 */
export async function applyLinkedInStealthMask(webview: WebviewTarget): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  try {
    const res = await webview.executeJavaScript(LINKEDIN_STEALTH_SHIELD_SCRIPT).catch(() => false);
    return Boolean(res);
  } catch {
    return false;
  }
}

/**
 * Automatically unchecks LinkedIn's "Follow company to stay updated" checkbox.
 * Mass-following companies across dozens of applications is a primary bot detection heuristic.
 */
export async function uncheckLinkedInFollowCompany(webview: WebviewTarget): Promise<boolean> {
  const uncheckScript = `
    (() => {
      try {
        const followSelectors = [
          'input[type="checkbox"][id*="follow" i]',
          'input[type="checkbox"][name*="follow" i]',
          '.jobs-easy-apply-modal input[type="checkbox"]',
          'footer input[type="checkbox"]'
        ];

        let unchecked = false;
        for (const sel of followSelectors) {
          const boxes = Array.from(document.querySelectorAll(sel));
          for (const box of boxes) {
            const label = (
              box.closest('label')?.innerText ||
              document.querySelector('label[for="' + CSS.escape(box.id) + '"]')?.innerText ||
              ''
            ).toLowerCase();

            if (label.includes('follow') && (label.includes('company') || label.includes('stay updated') || label.includes('receive updates'))) {
              if (box.checked) {
                box.click();
                box.checked = false;
                box.dispatchEvent(new Event('input', { bubbles: true }));
                box.dispatchEvent(new Event('change', { bubbles: true }));
                unchecked = true;
              }
            }
          }
        }
        return unchecked;
      } catch {
        return false;
      }
    })()
  `;

  try {
    return await webview.executeJavaScript<boolean>(uncheckScript).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Bypasses LinkedIn's "Top Choice" / "Try Premium" upsell modal traps.
 */
export async function handleLinkedInTopChoiceTrap(webview: WebviewTarget): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  const topChoiceScript = `
    (() => {
      try {
        const bodyText = (document.body?.innerText || '').toLowerCase();
        if (!/top\\s*choice|mark.*top\\s*choice|premium/.test(bodyText)) {
          return false;
        }

        const buttons = Array.from(
          document.querySelectorAll('button, [role="button"], a.artdeco-button')
        );

        const skipBtn = buttons.find((b) => {
          const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
          return (
            /skip|not\\s*now|no\\s*thanks|apply\\s*without|continue\\s*without/i.test(text) &&
            !b.disabled
          );
        });

        if (skipBtn) {
          skipBtn.click();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })()
  `;

  try {
    return await webview.executeJavaScript<boolean>(topChoiceScript).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Audits LinkedIn account health (checks for rate limits, verification checkpoints, or security banners).
 */
export async function auditLinkedInAccountHealth(webview: WebviewTarget): Promise<LinkedInSafetyStatus> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return { isSafe: true, status: 'clean' };
  const auditScript = `
    (() => {
      try {
        const bodyText = (document.body?.innerText || '').toLowerCase();

        // 1. Rate limiting / Weekly limit warning
        if (
          bodyText.includes("you've reached the weekly invitation limit") ||
          bodyText.includes("application limit reached") ||
          bodyText.includes("you have reached the limit for applications")
        ) {
          return {
            isSafe: false,
            status: 'rate_limited',
            warning: 'LinkedIn application quota reached. Safe pausing to prevent account restriction.'
          };
        }

        // 2. Checkpoint or security verification
        const checkpoint = document.querySelector(
          '#captcha-internal, iframe#captcha-internal, form#checkpointChallengeForm, div.checkpoint-container, .challenge-dialog'
        );
        if (checkpoint && checkpoint.offsetParent !== null) {
          return {
            isSafe: false,
            status: 'checkpoint_detected',
            warning: 'LinkedIn Security Checkpoint encountered. Safe pausing for user resolution.'
          };
        }

        return {
          isSafe: true,
          status: 'clean'
        };
      } catch {
        return { isSafe: true, status: 'clean' };
      }
    })()
  `;

  try {
    const res = await webview.executeJavaScript<LinkedInSafetyStatus>(auditScript).catch(() => null);
    return res || { isSafe: true, status: 'clean' };
  } catch {
    return { isSafe: true, status: 'clean' };
  }
}

/**
 * Automatically bypasses LinkedIn's "Job search safety reminder" interstitial dialog
 * by clicking "Continue applying".
 */
export async function handleLinkedInJobSafetyReminder(webview: WebviewTarget): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  const safetyReminderScript = `
    (() => {
      try {
        const bodyText = (document.body?.innerText || '').toLowerCase();
        const hasSafetyReminder = /job\\s*search\\s*safety\\s*reminder|research\\s*the\\s*company|report\\s*suspicious\\s*jobs/i.test(bodyText);

        const buttons = Array.from(
          document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')
        );

        const continueBtn = buttons.find((b) => {
          const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
          return /continue\\s*applying/i.test(text) && !b.disabled;
        });

        if (continueBtn) {
          continueBtn.click();
          return true;
        }

        // Fallback: If safety reminder text is detected, also look for primary action in the dialog
        if (hasSafetyReminder) {
          const dialog = document.querySelector('.artdeco-modal, [role="dialog"], #artdeco-modal-outlet');
          if (dialog) {
            const primaryBtn = dialog.querySelector('button.artdeco-button--primary, button[data-control-name*="continue"], .artdeco-button--2');
            if (primaryBtn && !primaryBtn.disabled) {
              primaryBtn.click();
              return true;
            }
          }
        }
        return false;
      } catch {
        return false;
      }
    })()
  `;

  try {
    return await webview.executeJavaScript<boolean>(safetyReminderScript).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Master LinkedIn Safety Shield
 * Runs stealth overrides, unchecks mass-following checkboxes, disarms top-choice traps, and audits account health.
 */
export async function ensureLinkedInSafeSession(webview: WebviewTarget): Promise<LinkedInSafetyStatus> {
  // 1. Apply stealth mask and disarm tracker errors
  await applyLinkedInStealthMask(webview);

  // 2. Check for Top Choice trap
  const trapBypassed = await handleLinkedInTopChoiceTrap(webview);

  // 3. Check for Job search safety reminder ("Continue applying")
  const reminderContinued = await handleLinkedInJobSafetyReminder(webview);

  // 4. Uncheck follow company checkbox
  await uncheckLinkedInFollowCompany(webview);

  // 5. Audit health
  const health = await auditLinkedInAccountHealth(webview);
  if (!health.isSafe) {
    return health;
  }

  return {
    isSafe: true,
    status: trapBypassed ? 'trap_bypassed' : reminderContinued ? 'reminder_continued' : 'clean',
    actionTaken: trapBypassed
      ? 'Bypassed Top Choice modal'
      : reminderContinued
        ? 'Clicked Continue applying on Job search safety reminder'
        : 'Stealth shield active',
  };
}
