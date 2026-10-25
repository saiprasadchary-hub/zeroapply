const { ipcRenderer, webFrame } = require('electron');

// Observe the page world's window.open arguments without exposing Electron APIs
// to the remote website. This runs before site scripts and preserves native open.
const windowOpenNonce = `zeroapply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
window.addEventListener('message', (event) => {
  const payload = event?.data;
  if (event.source !== window || payload?.type !== 'zeroapply-window-open' || payload?.nonce !== windowOpenNonce) return;
  if (typeof payload.url !== 'string' || payload.url.length > 8_192) return;
  ipcRenderer.send('zeroapply-webview-window-open', { url: payload.url });
});

const observerCode = `(() => {
  if (window.__zeroApplyWindowOpenObserved) return;
  Object.defineProperty(window, '__zeroApplyWindowOpenObserved', { value: true });
  const nativeOpen = window.open;
  if (typeof nativeOpen !== 'function') return;
  window.open = function(url, ...args) {
    try {
      const uStr = String(url || '');
      const isInternal = uStr && (
        uStr.includes('/jobs/search') ||
        uStr.includes('currentJobId=') ||
        uStr.includes('/jobs/collections')
      );
      if (!isInternal) {
        window.postMessage({ type: 'zeroapply-window-open', nonce: ${JSON.stringify(windowOpenNonce)}, url: uStr }, '*');
      } else {
        return window;
      }
    } catch {}
    return Reflect.apply(nativeOpen, this, [url, ...args]);
  };
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function(input, init) {
      const u = typeof input === 'string' ? input : (input?.url || '');
      if (typeof u === 'string' && u.startsWith('chrome-extension://')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Reflect.apply(origFetch, this, [input, init]);
    };
  }
})();`;
void webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: observerCode }], true).catch(() => {});

// 1. Mark popup gestures on user interactions
const extractCleanUrl = (candidate) => {
  if (typeof candidate !== 'string' || !candidate.trim() || candidate.length > 8_192) return null;
  try {
    const parsed = new URL(candidate, window.location.href);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    // Check if it is a LinkedIn safety URL
    if ((parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com')) && /^\/safety\/go\/?$/i.test(parsed.pathname)) {
      const keys = ['url', 'target', 'destination', 'redirect', 'dest', 'redirectUrl', 'redirect_url', 'u', 'href', 'next', 'r', 'link', 'out', 'external_url'];
      for (const k of keys) {
        let nested = parsed.searchParams.get(k);
        if (nested) {
          if (nested.includes('%')) {
            try { nested = decodeURIComponent(nested); } catch {}
          }
          try {
            const nestedParsed = new URL(nested);
            if (['http:', 'https:'].includes(nestedParsed.protocol)) return nestedParsed.toString();
          } catch {}
        }
      }
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const linkCandidatesFromEvent = (event) => {
  if (!event) return [];
  const element = event.target instanceof Element ? event.target : null;
  const clickable = element?.closest('a, button, [role="button"], [data-url], [data-href]');
  if (!clickable) return [];
  const raw = [
    clickable instanceof HTMLAnchorElement ? clickable.href : '',
    clickable.getAttribute('href'),
    clickable.getAttribute('data-url'),
    clickable.getAttribute('data-href'),
    clickable.getAttribute('data-redirect-url'),
    clickable.getAttribute('data-destination'),
    clickable.getAttribute('formaction'),
    typeof clickable.formAction === 'string' ? clickable.formAction : '',
    clickable.querySelector('a[href]')?.href,
    clickable.querySelector('a[href]')?.getAttribute('href'),
  ];
  const cleaned = raw.map(extractCleanUrl).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 6);
};

const markPopupGesture = (event) => {
  if (event?.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  try {
    const element = event.target instanceof Element ? event.target : null;
    const clickable = element?.closest('a, button, [role="button"], [data-url], [data-href]');
    const label = String(clickable?.getAttribute('aria-label') || clickable?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const candidates = linkCandidatesFromEvent(event);

    ipcRenderer.send('zeroapply-webview-popup-gesture', {
      candidates,
      label,
    });

    if (['pointerdown', 'mousedown'].includes(event?.type) && clickable) {
      const href = clickable.href || clickable.getAttribute?.('href') || clickable.getAttribute?.('data-href') || '';
      if (href && (href.includes('/jobs/') || href.includes('currentJobId=') || href.includes('/search'))) {
        clickable.removeAttribute('target');
        clickable.setAttribute('target', '_self');
      }
      const card = clickable.closest('li, .job-card, [data-job-id], div.job_seen_beacon');
      if (card) {
        const blanks = card.querySelectorAll('a[target="_blank"]');
        for (let i = 0; i < blanks.length; i++) {
          blanks[i].removeAttribute('target');
          blanks[i].setAttribute('target', '_self');
        }
      }
    }

    const host = location.hostname.toLowerCase();
    if ((host === 'linkedin.com' || host.endsWith('.linkedin.com')) && /\bapply\b/i.test(label) && !/\beasy apply\b/i.test(label)) {
      const jobId = location.href.match(/\/jobs\/view\/(\d+)/)?.[1]
        || new URL(location.href).searchParams.get('currentJobId')
        || '';
      ipcRenderer.send('zeroapply-linkedin-apply-click', { jobId, label });
    }

    // If user clicked an anchor with target="_blank" or external link, open in new tab directly
    if (event?.type === 'click' && clickable instanceof HTMLAnchorElement && clickable.href) {
      const targetAttr = clickable.getAttribute('target');
      const resolvedUrl = extractCleanUrl(clickable.href);

      const isWhatsAppTarget = (targetUrl) => {
        if (typeof targetUrl !== 'string' || !targetUrl.trim()) return false;
        return /(?:chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:\/\/)/i.test(targetUrl);
      };

      if (resolvedUrl && isWhatsAppTarget(resolvedUrl)) {
        ipcRenderer.sendToHost('zeroapply-whatsapp-detected', { url: resolvedUrl });
        return;
      }

      const isExternal = resolvedUrl && (() => {
        try {
          const targetHost = new URL(resolvedUrl).hostname.toLowerCase();
          const currentHost = location.hostname.toLowerCase();
          return targetHost !== currentHost && !targetHost.endsWith('.' + currentHost) && !currentHost.endsWith('.' + targetHost);
        } catch {
          return false;
        }
      })();

      // Never open a new tab for internal job search cards, job listings, or same-domain navigation
      const isInternalJobCard = resolvedUrl && (() => {
        try {
          const u = new URL(resolvedUrl);
          const currentHost = location.hostname.toLowerCase();
          const targetHost = u.hostname.toLowerCase();
          const isSameDomain = targetHost === currentHost || targetHost.endsWith('.' + currentHost) || currentHost.endsWith('.' + targetHost);
          if (isSameDomain) {
            if (u.pathname.includes('/jobs/') || u.searchParams.has('currentJobId') || u.pathname.includes('/search/')) {
              return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      })();

      if (isInternalJobCard) {
        // Disarm target="_blank" so LinkedIn's SPA displays job details in-place
        clickable.removeAttribute('target');
        return;
      }

      if (resolvedUrl && isExternal) {
        ipcRenderer.sendToHost('zeroapply-open-tab', { url: resolvedUrl });
      }
    }
  } catch {}
};

document.addEventListener('pointerdown', markPopupGesture, true);
document.addEventListener('mousedown', markPopupGesture, true);
document.addEventListener('click', markPopupGesture, true);
document.addEventListener('keydown', markPopupGesture, true);
document.addEventListener('touchstart', markPopupGesture, true);

ipcRenderer.on('zeroapply-allow-popup', () => markPopupGesture());

// 2. Question & Answer Telemetry Capture. Browser globals remain native Chromium
// values so server rendering and client hydration observe one consistent browser.
const readLabel = (element) => {
  const explicit = element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
  const wrapped = element.closest('label');
  return String(
    explicit?.textContent
    || wrapped?.textContent
    || element.getAttribute('aria-label')
    || element.getAttribute('placeholder')
    || element.name
    || ''
  ).replace(/\s+/g, ' ').trim().slice(0, 500);
};

document.addEventListener('change', (event) => {
  const element = event.target;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return;
  if (element instanceof HTMLInputElement && (element.type === 'password' || element.type === 'hidden')) return;

  const answer = element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')
    ? (element.checked ? element.value || 'selected' : '')
    : element.value;
  const question = readLabel(element);
  if (!question || !answer) return;

  try {
    ipcRenderer.sendToHost('zeroapply-telemetry', {
      question,
      answer: String(answer).slice(0, 2000),
    });
  } catch {}
}, true);
