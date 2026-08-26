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
      window.postMessage({ type: 'zeroapply-window-open', nonce: ${JSON.stringify(windowOpenNonce)}, url: String(url || '') }, '*');
    } catch {}
    return Reflect.apply(nativeOpen, this, [url, ...args]);
  };
})();`;
void webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: observerCode }], true).catch(() => {});

// 1. Mark popup gestures on user interactions
const linkCandidatesFromEvent = (event) => {
  if (!event || event.isTrusted !== true) return [];
  const element = event.target instanceof Element ? event.target : null;
  const clickable = element?.closest('a, button, [role="button"]');
  if (!clickable) return [];
  const candidates = [
    clickable instanceof HTMLAnchorElement ? clickable.href : '',
    clickable.getAttribute('href'),
    clickable.getAttribute('data-url'),
    clickable.getAttribute('data-href'),
    clickable.getAttribute('data-redirect-url'),
    clickable.getAttribute('formaction'),
    typeof clickable.formAction === 'string' ? clickable.formAction : '',
    clickable.querySelector('a[href]')?.href,
  ];
  return [...new Set(candidates.filter((value) => typeof value === 'string' && value.length <= 8_192))].slice(0, 6);
};

const markPopupGesture = (event) => {
  if (event?.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  try {
    const element = event.target instanceof Element ? event.target : null;
    const clickable = element?.closest('a, button, [role="button"]');
    const label = String(clickable?.getAttribute('aria-label') || clickable?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    ipcRenderer.send('zeroapply-webview-popup-gesture', {
      candidates: linkCandidatesFromEvent(event),
      label,
    });
    const host = location.hostname.toLowerCase();
    if ((host === 'linkedin.com' || host.endsWith('.linkedin.com')) && /\bapply\b/i.test(label) && !/\beasy apply\b/i.test(label)) {
      const jobId = location.href.match(/\/jobs\/view\/(\d+)/)?.[1]
        || new URL(location.href).searchParams.get('currentJobId')
        || '';
      ipcRenderer.send('zeroapply-linkedin-apply-click', { jobId, label });
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
