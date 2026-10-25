/**
 * ZeroApply Security - Anti-Bot & CAPTCHA Perception Engine
 * Detects security challenges (Cloudflare Turnstile, reCAPTCHA, hCaptcha,
 * Arkose Labs, LinkedIn security checkpoints, Workday verification) and provides
 * non-destructive auto-pause and seamless auto-resumption once cleared.
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';
import { liveTelemetry } from '../telemetry/liveTelemetry';

export type SecurityChallengeType =
  | 'turnstile'
  | 'recaptcha'
  | 'hcaptcha'
  | 'arkose'
  | 'linkedin_checkpoint'
  | 'workday_verification'
  | 'generic_captcha';

export interface SecurityChallengeReport {
  detected: boolean;
  type?: SecurityChallengeType;
  confidence: number;
  selector?: string;
  message?: string;
  timestamp: number;
}

export interface ChallengeResolutionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onPoll?: (elapsedMs: number) => void;
}

/**
 * Injected script string to probe for active CAPTCHA, Turnstile, or security checkpoint elements.
 */
export const DETECT_SECURITY_CHALLENGE_SCRIPT = `
(() => {
  // Helper: Verify element is visibly displayed to user with tangible dimensions
  function isVisibleChallenge(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return false;

    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') < 0.1) {
          return false;
        }
      } catch (e) {}
    }

    if (el.hidden || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    // Geometry check: real user challenge frames (recaptcha anchor/bframe, turnstile, arkose, hcaptcha)
    // always have tangible dimensions (width >= 100 and height >= 40)
    if (typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 40) {
        return false;
      }
      if (rect.bottom <= 0 || rect.right <= 0) {
        return false;
      }
    } else if (el.offsetParent === null) {
      return false;
    }

    return true;
  }

  // Helper: Check if active application modal or wizard is open
  const activeAppModal = document.querySelector(
    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], .artdeco-modal, [data-test-modal-id="easy-apply-modal"]'
  );

  // If application modal is open, verify whether any security challenge is explicitly inside it.
  // If no challenge is inside the open application modal, the user is filling a standard job application!
  if (activeAppModal && (activeAppModal.offsetParent !== null || activeAppModal.getBoundingClientRect().height > 100)) {
    const internalChallenge = activeAppModal.querySelector(
      'iframe[src*="captcha"], iframe[src*="turnstile"], iframe[src*="arkose"], iframe[src*="hcaptcha"]'
    );
    if (!internalChallenge || !isVisibleChallenge(internalChallenge)) {
      return {
        detected: false,
        confidence: 0,
        timestamp: Date.now()
      };
    }
  }

  // 1. Cloudflare Turnstile
  const turnstileEls = Array.from(document.querySelectorAll(
    'iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"], .cf-turnstile, [data-turnstile]'
  ));
  for (const turnstileEl of turnstileEls) {
    if (isVisibleChallenge(turnstileEl)) {
      return {
        detected: true,
        type: 'turnstile',
        confidence: 0.98,
        selector: 'iframe[src*="challenges.cloudflare.com"], .cf-turnstile',
        message: 'Cloudflare Turnstile verification challenge active'
      };
    }
  }

  // 2. LinkedIn Security Verification Checkpoint
  const isLinkedinUrl = window.location.href.includes('linkedin.com');
  const isCheckpointUrl = window.location.href.includes('/checkpoint/challenge');
  if (isCheckpointUrl) {
    return {
      detected: true,
      type: 'linkedin_checkpoint',
      confidence: 0.99,
      selector: '#captcha-internal, form#checkpointChallengeForm',
      message: 'LinkedIn Security Verification checkpoint active'
    };
  }
  if (isLinkedinUrl && !activeAppModal) {
    const linkedinCheckpoint = document.querySelector(
      '#captcha-internal, iframe#captcha-internal, form#checkpointChallengeForm, div.checkpoint-container'
    );
    if (linkedinCheckpoint && isVisibleChallenge(linkedinCheckpoint)) {
      return {
        detected: true,
        type: 'linkedin_checkpoint',
        confidence: 0.99,
        selector: '#captcha-internal, form#checkpointChallengeForm',
        message: 'LinkedIn Security Verification checkpoint active'
      };
    }
  }

  // 3. Google reCAPTCHA (v2 Checkbox or Challenge Puzzle)
  // Background telemetry v3/enterprise scripts are ignored unless presenting a visible challenge widget
  const recaptchaEls = Array.from(document.querySelectorAll(
    'iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha.net"], .g-recaptcha'
  ));
  for (const recaptchaEl of recaptchaEls) {
    if (isVisibleChallenge(recaptchaEl)) {
      const src = (recaptchaEl.getAttribute('src') || '').toLowerCase();
      const title = (recaptchaEl.getAttribute('title') || '').toLowerCase();
      if (src.includes('bframe') || src.includes('anchor') || title.includes('recaptcha') || recaptchaEl.classList.contains('g-recaptcha')) {
        return {
          detected: true,
          type: 'recaptcha',
          confidence: 0.95,
          selector: 'iframe[src*="recaptcha"], .g-recaptcha',
          message: 'Google reCAPTCHA verification active'
        };
      }
    }
  }

  // 4. hCaptcha
  const hcaptchaEls = Array.from(document.querySelectorAll(
    'iframe[src*="hcaptcha.com"], .h-captcha, iframe[data-hcaptcha-widget-id]'
  ));
  for (const hcaptchaEl of hcaptchaEls) {
    if (isVisibleChallenge(hcaptchaEl)) {
      return {
        detected: true,
        type: 'hcaptcha',
        confidence: 0.97,
        selector: 'iframe[src*="hcaptcha.com"], .h-captcha',
        message: 'hCaptcha verification challenge active'
      };
    }
  }

  // 5. Arkose Labs / FunCaptcha
  const arkoseEls = Array.from(document.querySelectorAll(
    'iframe[src*="arkoselabs"], iframe[src*="funcaptcha"], #fc-iframe-wrap, #arkose'
  ));
  for (const arkoseEl of arkoseEls) {
    if (isVisibleChallenge(arkoseEl)) {
      return {
        detected: true,
        type: 'arkose',
        confidence: 0.96,
        selector: '#fc-iframe-wrap, iframe[src*="arkoselabs"]',
        message: 'Arkose Labs security puzzle active'
      };
    }
  }

  // 6. Workday Verification / Bot Check
  const workdayEls = Array.from(document.querySelectorAll(
    '[data-automation-id*="securityCheck"], .geetest_holder'
  ));
  for (const workdayCheck of workdayEls) {
    if (isVisibleChallenge(workdayCheck)) {
      return {
        detected: true,
        type: 'workday_verification',
        confidence: 0.90,
        selector: '[data-automation-id*="securityCheck"], .geetest_holder',
        message: 'Workday automated bot check active'
      };
    }
  }

  return {
    detected: false,
    confidence: 0,
    timestamp: Date.now()
  };
})()
`;

/**
 * Executes a fast, non-blocking perception scan for security challenges in the webview.
 */
export async function detectSecurityChallenge(
  webview: WebviewTarget
): Promise<SecurityChallengeReport> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return {
      detected: false,
      confidence: 0,
      timestamp: Date.now(),
    };
  }

  try {
    const raw = await webview.executeJavaScript<Partial<SecurityChallengeReport>>(
      DETECT_SECURITY_CHALLENGE_SCRIPT
    );

    return {
      detected: !!raw?.detected,
      type: raw?.type,
      confidence: raw?.confidence || 0,
      selector: raw?.selector,
      message: raw?.message,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      detected: false,
      confidence: 0,
      timestamp: Date.now(),
    };
  }
}

/**
 * Pauses agent execution and periodically polls until the user resolves the security challenge.
 * Returns true if cleared, or false if the wait timed out.
 */
export async function waitForChallengeResolution(
  webview: WebviewTarget,
  options: ChallengeResolutionOptions = {}
): Promise<boolean> {
  const {
    timeoutMs = 180000, // 3 minutes human resolution allowance
    pollIntervalMs = 1500,
    onPoll,
  } = options;

  const startTime = Date.now();

  liveTelemetry.emit({
    type: 'status',
    title: '⚠️ Security Verification Required: Auto-pausing agent queue',
    target: 'Security Checkpoint',
    status: 'paused',
  });

  while (Date.now() - startTime < timeoutMs) {
    const elapsed = Date.now() - startTime;
    if (onPoll) onPoll(elapsed);

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const check = await detectSecurityChallenge(webview);
    if (!check.detected) {
      liveTelemetry.emit({
        type: 'status',
        title: '✓ Security Challenge Cleared! Resuming auto-apply pipeline...',
        target: 'Security Checkpoint',
        status: 'completed',
      });
      return true;
    }
  }

  liveTelemetry.emit({
    type: 'status',
    title: 'Challenge resolution timeout exceeded (3m). Halting session safely.',
    target: 'Security Checkpoint',
    status: 'failed',
  });

  return false;
}
