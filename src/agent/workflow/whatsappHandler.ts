/**
 * ZeroApply Workflow - WhatsApp Interception & Auto-Skip Handler
 * Detects WhatsApp invite links and joining requests in job application pages/modals,
 * copies the link to the system clipboard, triggers push & UI notifications,
 * skips opening external links, and allows the application workflow to proceed unhindered.
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { communityNotificationStore } from '../tracker/communityNotificationStore';

export interface WhatsAppDetectionResult {
  detected: boolean;
  links: string[];
  copied: boolean;
  joinPromptFound: boolean;
  promptText?: string;
}

/**
 * Regular expression matching all official WhatsApp link formats:
 * - https://chat.whatsapp.com/INVITE_CODE
 * - https://wa.me/PHONE_NUMBER
 * - https://api.whatsapp.com/send?phone=...
 * - https://web.whatsapp.com/send?phone=...
 * - whatsapp://chat?code=...
 */
export const WHATSAPP_URL_REGEX =
  /(?:https?:\/\/)?(?:chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/(?:\+?[0-9]+|\w+)(?:\?[^\s"'<>]*)?|(?:api|web)\.whatsapp\.com\/(?:send\??[^\s"'<>]*|join\??[^\s"'<>]*)?|whatsapp:\/\/[^\s"'<>]+)/gi;

export const WHATSAPP_JOIN_TEXT_REGEX =
  /(?:join(?:ing)?|joined|connect|participate|follow|link).*whatsapp|(?:whatsapp).*(?:group|community|channel|link|invite|join|chat|updates)/i;

/**
 * Validates if a URL candidate points to a WhatsApp destination.
 */
export function isWhatsAppUrl(candidate: string | null | undefined): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed.startsWith('whatsapp://') ? trimmed : (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`));
    const host = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === 'whatsapp:') return true;
    if (host === 'chat.whatsapp.com' || host.endsWith('.chat.whatsapp.com')) return true;
    if (host === 'wa.me' || host.endsWith('.wa.me')) return true;
    if (host === 'whatsapp.com' || host.endsWith('.whatsapp.com')) return true;
    if (parsed.pathname.includes('/whatsapp') || parsed.searchParams.has('whatsapp')) return true;
    return false;
  } catch {
    return WHATSAPP_URL_REGEX.test(trimmed);
  }
}

/**
 * Extracts all unique WhatsApp URLs found in a block of text or HTML.
 */
export function extractWhatsAppUrls(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(WHATSAPP_URL_REGEX) || [];
  const cleanUrls: string[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    let clean = m.trim().replace(/[.,;:)\]}>]+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('whatsapp://')) {
      clean = `https://${clean}`;
    }
    if (!seen.has(clean)) {
      seen.add(clean);
      cleanUrls.push(clean);
    }
  }

  return cleanUrls;
}

/**
 * Tests whether text contains an invitation or question asking to join WhatsApp.
 */
export function isWhatsAppJoinPrompt(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return WHATSAPP_JOIN_TEXT_REGEX.test(text.trim());
}

// Session cache to prevent re-notifying repeatedly for the exact same URL within the same application
const handledLinksPerSession = new Set<string>();

/**
 * Resets the session cache of handled links. Useful between separate job application runs.
 */
export function resetWhatsAppSessionCache(): void {
  handledLinksPerSession.clear();
}

/**
 * Copies a WhatsApp link to the system clipboard, triggers native/desktop and UI notifications,
 * logs to processTracker and liveTelemetry, and guarantees the link remains un-opened.
 */
export async function notifyAndCopyWhatsAppLink(
  link: string,
  contextNote?: string
): Promise<boolean> {
  const cleanLink = link.trim();
  if (!cleanLink) return false;

  let copiedSuccessfully = false;

  // 1. Copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(cleanLink);
      copiedSuccessfully = true;
    } catch {
      copiedSuccessfully = false;
    }
  }

  // Fallback: window.electron API if available in renderer
  if (!copiedSuccessfully && typeof window !== 'undefined') {
    const electronApi = (window as unknown as { zeroApply?: { copyToClipboard?: (t: string) => boolean } }).zeroApply;
    if (electronApi && typeof electronApi.copyToClipboard === 'function') {
      try {
        copiedSuccessfully = electronApi.copyToClipboard(cleanLink);
      } catch {}
    }
  }

  // 2. Dispatch Desktop Notification (HTML5 / Electron)
  const notificationTitle = 'WhatsApp Link Copied';
  const notificationBody = `Copied WhatsApp invite link to clipboard: ${cleanLink}. Skipped opening to continue applying!`;

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, {
          body: notificationBody,
          icon: '/logo.ico',
          tag: 'zeroapply-whatsapp-invite',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(notificationTitle, {
              body: notificationBody,
              icon: '/logo.ico',
              tag: 'zeroapply-whatsapp-invite',
            });
          }
        }).catch(() => {});
      }
    } catch {}
  }

  // 3. Dispatch Global CustomEvent for UI toast banner
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('zeroapply_whatsapp_toast', {
          detail: {
            url: cleanLink,
            message: `📋 WhatsApp link copied to clipboard: ${cleanLink} (Skipped opening to continue applying)`,
          },
        })
      );
    } catch {}
  }

  // 4. Record to Live Telemetry
  liveTelemetry.emit({
    type: 'think',
    title: `WhatsApp Link Detected: Copied "${cleanLink}" to clipboard. Skipped opening & continuing application!`,
    target: 'WhatsApp Invite',
    value: cleanLink,
    status: 'completed',
  });

  // 5. Store in Community Notification Store for instant access in Notification Tab
  try {
    const isTelegram = /t\.me|telegram\.me/i.test(cleanLink);
    communityNotificationStore.addNotification({
      platform: isTelegram ? 'telegram' : 'whatsapp',
      title: contextNote || (isTelegram ? 'Job Application Telegram Channel' : 'Job Application WhatsApp Group'),
      url: cleanLink,
      description: 'Detected by ZeroApply Agent during an online job application. Click to join directly.',
      source: 'detected',
      category: 'Job Detected',
    });
  } catch {}

  return copiedSuccessfully;
}

/**
 * Injected script executed in webview to locate WhatsApp links/prompts in the active modal or document,
 * protectively disarm click navigation, copy links directly in the page world, and return discovered URLs.
 */
const INJECTED_WHATSAPP_SCANNER_SCRIPT = `
(() => {
  try {
    const WHATSAPP_REGEX = /(?:https?:\\/\\/)?(?:chat\\.whatsapp\\.com\\/[A-Za-z0-9_-]+|wa\\.me\\/(?:\\+?[0-9]+|\\w+)(?:\\?[^\\s"'<>]*)?|(?:api|web)\\.whatsapp\\.com\\/(?:send\\??[^\\s"'<>]*|join\\??[^\\s"'<>]*)?|whatsapp:\\/\\/[^\\s"'<>]+)/gi;
    const JOIN_PROMPT_REGEX = /(?:join(?:ing)?|joined|connect|participate|follow|link).*whatsapp|(?:whatsapp).*(?:group|community|channel|link|invite|join|chat|updates)/i;

    const modal = document.querySelector('#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal');
    const root = modal || document.body || document.documentElement;

    const detectedUrls = new Set();
    let promptFound = false;
    let promptTextSample = '';

    // 1. Scan all <a> anchors in container
    const anchors = Array.from(root.querySelectorAll('a, [role="button"], button, [data-href], [data-url]'));
    for (const el of anchors) {
      const href = el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url') || '';
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();

      const hrefMatches = href.match(WHATSAPP_REGEX) || [];
      const textMatches = text.match(WHATSAPP_REGEX) || [];

      for (const m of [...hrefMatches, ...textMatches]) {
        let clean = m.trim().replace(/[.,;:)\]}>]+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('whatsapp://')) {
          clean = 'https://' + clean;
        }
        detectedUrls.add(clean);
      }

      if (JOIN_PROMPT_REGEX.test(text) || JOIN_PROMPT_REGEX.test(href)) {
        promptFound = true;
        if (!promptTextSample && text) promptTextSample = text.slice(0, 150);

        // Arm protective interceptor: prevent clicks from opening WhatsApp in new window/tab
        if (!el.__zeroapplyWhatsAppGuard) {
          el.__zeroapplyWhatsAppGuard = true;
          const disarmHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          };
          el.addEventListener('click', disarmHandler, true);
          el.addEventListener('mousedown', disarmHandler, true);
        }
      }
    }

    // 2. Scan text in active modal / form
    const containerText = root.innerText || root.textContent || '';
    const textUrls = containerText.match(WHATSAPP_REGEX) || [];
    for (const m of textUrls) {
      let clean = m.trim().replace(/[.,;:)\]}>]+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('whatsapp://')) {
        clean = 'https://' + clean;
      }
      detectedUrls.add(clean);
    }

    if (!promptFound && JOIN_PROMPT_REGEX.test(containerText)) {
      promptFound = true;
      promptTextSample = 'Join WhatsApp Community prompt detected in form description';
    }

    const urlList = Array.from(detectedUrls);

    // If URLs found, attempt direct in-page clipboard copy as an immediate fallback
    let inPageCopied = false;
    if (urlList.length > 0) {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(urlList[0]).then(() => {}).catch(() => {});
          inPageCopied = true;
        }
      } catch {}
    }

    return {
      success: true,
      detected: urlList.length > 0 || promptFound,
      links: urlList,
      copied: inPageCopied,
      joinPromptFound: promptFound,
      promptText: promptTextSample
    };
  } catch (err) {
    return {
      success: false,
      detected: false,
      links: [],
      copied: false,
      joinPromptFound: false,
      error: String(err)
    };
  }
})()
`;

/**
 * Scans the target webview DOM for WhatsApp invite links or join prompts,
 * automatically disarms in-page opening, copies the link to the clipboard,
 * emits notifications and telemetry, and returns the detection outcome.
 */
export async function scanAndHandleWhatsApp(
  webview: WebviewTarget
): Promise<WhatsAppDetectionResult> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return { detected: false, links: [], copied: false, joinPromptFound: false };
  }

  try {
    const rawResult = await webview.executeJavaScript<{
      success: boolean;
      detected: boolean;
      links: string[];
      copied: boolean;
      joinPromptFound: boolean;
      promptText?: string;
    }>(INJECTED_WHATSAPP_SCANNER_SCRIPT);

    if (!rawResult || !rawResult.detected) {
      return { detected: false, links: [], copied: false, joinPromptFound: false };
    }

    const links = rawResult.links || [];
    let anyCopied = rawResult.copied || false;

    // For any discovered link not yet processed this session, notify and copy
    for (const link of links) {
      if (!handledLinksPerSession.has(link)) {
        handledLinksPerSession.add(link);
        const copied = await notifyAndCopyWhatsAppLink(link, rawResult.promptText);
        if (copied) anyCopied = true;
      }
    }

    // If join prompt was found but no explicit URL extracted, notify user of the prompt
    if (links.length === 0 && rawResult.joinPromptFound) {
      const promptSummary = rawResult.promptText || 'Employer asked to join WhatsApp group';
      if (!handledLinksPerSession.has(promptSummary)) {
        handledLinksPerSession.add(promptSummary);
        liveTelemetry.emit({
          type: 'think',
          title: `WhatsApp Request Detected: "${promptSummary}". Answered affirmatively & continuing application.`,
          status: 'completed',
        });
      }
    }

    return {
      detected: true,
      links,
      copied: anyCopied,
      joinPromptFound: rawResult.joinPromptFound,
      promptText: rawResult.promptText,
    };
  } catch {
    return { detected: false, links: [], copied: false, joinPromptFound: false };
  }
}
