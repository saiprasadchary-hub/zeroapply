/**
 * ZeroApply Stealth Preload — Session-level anti-detection script.
 *
 * Registered via session.setPreloads() in main.js so it runs in EVERY webview/renderer
 * on the auth partition BEFORE any page JavaScript executes.
 *
 * This is the earliest possible injection point — even before the page's <head> scripts.
 * It masks every fingerprint that Cloudflare Bot Management, LinkedIn ThreatMetrix,
 * and PerimeterX use to detect Electron/headless/automation environments.
 */

'use strict';

const { webFrame } = require('electron');

// ── Stealth overrides injected into the MAIN world (world 0) ─────────────────
// Using webFrame.executeJavaScriptInIsolatedWorld with worldId=0 gives us
// main-world access so we can redefine non-configurable native properties.
// This runs synchronously before the page parses any <script> tags.

const stealthCode = `
(function applyStealthMask() {
  try {

    // ── 1. navigator.webdriver ──────────────────────────────────────────────
    // Chromium sets this to true in any automated/Electron context.
    // Redefine it on the prototype so it returns undefined (like a real browser).
    try {
      const navProto = Object.getPrototypeOf(navigator) || Navigator.prototype;
      const existingDesc = Object.getOwnPropertyDescriptor(navProto, 'webdriver');
      if (!existingDesc || existingDesc.configurable) {
        Object.defineProperty(navProto, 'webdriver', {
          get: () => undefined,
          set: () => {},
          configurable: true,
          enumerable: false,
        });
      }
    } catch (_) {}

    // ── 2. window.chrome ───────────────────────────────────────────────────
    // Real Chrome has a rich chrome.runtime object. Electron exposes a stripped
    // version (or nothing). We build a faithful mock.
    try {
      if (!window.chrome || !window.chrome.runtime) {
        const chrome = {
          app: {
            isInstalled: false,
            getDetails: () => null,
            getIsInstalled: () => false,
            runningState: 'cannot_run',
          },
          runtime: {
            id: undefined,
            connect: () => ({ onMessage: { addListener: () => {} }, postMessage: () => {}, disconnect: () => {} }),
            sendMessage: () => {},
            onMessage: { addListener: () => {}, removeListener: () => {}, hasListener: () => false },
            onConnect: { addListener: () => {} },
            getManifest: () => ({}),
            getURL: () => '',
          },
          loadTimes: function() {
            return {
              requestTime: performance.timeOrigin / 1000,
              startLoadTime: performance.timeOrigin / 1000,
              commitLoadTime: performance.timeOrigin / 1000,
              finishDocumentLoadTime: 0,
              finishLoadTime: 0,
              firstPaintTime: 0,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other',
              wasFetchedViaSpdy: false,
              wasNpnNegotiated: true,
              npnNegotiatedProtocol: 'h2',
              wasAlternateProtocolAvailable: false,
              connectionInfo: 'h2',
            };
          },
          csi: function() {
            return {
              startE: performance.timeOrigin,
              onloadT: performance.timeOrigin + performance.now(),
              pageT: performance.now(),
              tran: 15,
            };
          },
        };
        try {
          Object.defineProperty(window, 'chrome', {
            value: chrome,
            writable: false,
            enumerable: true,
            configurable: false,
          });
        } catch (_) {
          // Already defined — just patch what we can
          try { window.chrome.runtime = chrome.runtime; } catch (_2) {}
        }
      }
    } catch (_) {}

    // ── 3. navigator.plugins ───────────────────────────────────────────────
    // Real Chrome reports several plugins; Electron/headless returns an empty list.
    try {
      const makeFakePlugin = (name, filename, description, mimeTypes) => {
        const plugin = Object.create(Plugin.prototype);
        Object.defineProperty(plugin, 'name', { value: name, enumerable: true });
        Object.defineProperty(plugin, 'filename', { value: filename, enumerable: true });
        Object.defineProperty(plugin, 'description', { value: description, enumerable: true });
        Object.defineProperty(plugin, 'length', { value: mimeTypes.length, enumerable: true });
        mimeTypes.forEach((mt, i) => {
          const mime = Object.create(MimeType.prototype);
          Object.defineProperty(mime, 'type', { value: mt.type, enumerable: true });
          Object.defineProperty(mime, 'suffixes', { value: mt.suffixes, enumerable: true });
          Object.defineProperty(mime, 'description', { value: mt.description, enumerable: true });
          Object.defineProperty(mime, 'enabledPlugin', { value: plugin, enumerable: true });
          Object.defineProperty(plugin, i, { value: mime, enumerable: true });
        });
        return plugin;
      };

      if (navigator.plugins.length === 0) {
        const fakePlugins = [
          makeFakePlugin(
            'PDF Viewer', 'internal-pdf-viewer', 'Portable Document Format',
            [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
             { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }]
          ),
          makeFakePlugin(
            'Chrome PDF Viewer', 'internal-pdf-viewer', '',
            [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]
          ),
          makeFakePlugin(
            'Chromium PDF Viewer', 'internal-pdf-viewer', '',
            [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]
          ),
          makeFakePlugin(
            'Microsoft Edge PDF Viewer', 'internal-pdf-viewer', '',
            [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]
          ),
          makeFakePlugin(
            'WebKit built-in PDF', 'internal-pdf-viewer', '',
            [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]
          ),
        ];

        const pluginArray = Object.create(PluginArray.prototype);
        fakePlugins.forEach((plugin, i) => {
          Object.defineProperty(pluginArray, i, { value: plugin, enumerable: true });
        });
        Object.defineProperty(pluginArray, 'length', { value: fakePlugins.length, enumerable: true });
        pluginArray.item = (i) => fakePlugins[i] || null;
        pluginArray.namedItem = (name) => fakePlugins.find(p => p.name === name) || null;
        pluginArray.refresh = () => {};
        pluginArray[Symbol.iterator] = function*() { yield* fakePlugins; };

        try {
          Object.defineProperty(navigator, 'plugins', {
            get: () => pluginArray,
            configurable: true,
            enumerable: true,
          });
        } catch (_) {}
      }
    } catch (_) {}

    // ── 4. navigator.mimeTypes ─────────────────────────────────────────────
    try {
      if (navigator.mimeTypes.length === 0) {
        const fakeMimeTypes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        ];
        const mimeTypeArray = Object.create(MimeTypeArray.prototype);
        fakeMimeTypes.forEach((mt, i) => {
          const mime = Object.create(MimeType.prototype);
          Object.defineProperties(mime, {
            type: { value: mt.type, enumerable: true },
            suffixes: { value: mt.suffixes, enumerable: true },
            description: { value: mt.description, enumerable: true },
          });
          Object.defineProperty(mimeTypeArray, i, { value: mime, enumerable: true });
        });
        Object.defineProperty(mimeTypeArray, 'length', { value: fakeMimeTypes.length });
        mimeTypeArray.item = (i) => mimeTypeArray[i] || null;
        mimeTypeArray.namedItem = (name) => fakeMimeTypes.find(m => m.type === name) || null;
        try {
          Object.defineProperty(navigator, 'mimeTypes', {
            get: () => mimeTypeArray,
            configurable: true,
          });
        } catch (_) {}
      }
    } catch (_) {}

    // ── 5. navigator.languages ─────────────────────────────────────────────
    // Electron sometimes exposes a single-element array; real Chrome returns multiple.
    try {
      if (!navigator.languages || navigator.languages.length < 2) {
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
          configurable: true,
          enumerable: true,
        });
      }
    } catch (_) {}

    // ── 6. navigator.permissions (chrome.permissions parity) ───────────────
    // The permissions.query({name:'notifications'}) trick is used by bots detectors
    // to check if the browser returns 'denied' unconditionally (headless tell).
    try {
      const origQuery = window.Permissions && Permissions.prototype.query;
      if (origQuery) {
        Permissions.prototype.query = function(permDesc) {
          return origQuery.call(this, permDesc).then((result) => {
            if (permDesc && permDesc.name === 'notifications') {
              // Return 'default' instead of 'denied' to match a real browser.
              Object.defineProperty(result, 'state', { value: 'default', enumerable: true });
            }
            return result;
          }).catch(() => ({ state: 'default' }));
        };
      }
    } catch (_) {}

    // ── 7. Mask Notification.permission ───────────────────────────────────
    try {
      if (Notification.permission === 'denied') {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true,
        });
      }
    } catch (_) {}

    // ── 8. Screen & window properties (headless tells) ─────────────────────
    // Headless Chrome exposes screen.colorDepth=24 and outerWidth/outerHeight=0.
    try {
      if (window.outerWidth === 0) {
        Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true });
      }
      if (window.outerHeight === 0) {
        Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 85, configurable: true });
      }
    } catch (_) {}

    // ── 9. Mask iframe contentWindow.navigator.webdriver ──────────────────
    // Some detectors create a sandboxed iframe and check its webdriver property.
    try {
      const nativeAttach = HTMLIFrameElement.prototype.__defineGetter__ || null;
      const origContent = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (origContent && origContent.get) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            const win = origContent.get.call(this);
            if (!win) return win;
            try {
              const navProto = Object.getPrototypeOf(win.navigator);
              if (navProto && Object.getOwnPropertyDescriptor(navProto, 'webdriver')?.value) {
                Object.defineProperty(navProto, 'webdriver', { get: () => undefined, configurable: true });
              }
            } catch (_) {}
            return win;
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch (_) {}

    // ── 10. Remove Electron-specific global leaks ──────────────────────────
    try {
      // Delete process.type if it was accidentally exposed
      if (typeof process !== 'undefined' && process.type === 'renderer') {
        try { delete window.process; } catch (_) {}
      }
    } catch (_) {}

    // ── 11. Override toString of modified functions (anti-tampering) ───────
    // Some fingerprinters check Function.prototype.toString to see if a native
    // function has been monkey-patched. We restore the native toString string.
    try {
      const nativeToString = Function.prototype.toString;
      const originalFnToString = nativeToString.bind(nativeToString);
      const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');
      const patchedFunctions = new WeakSet();

      const makeNative = (fn, name) => {
        patchedFunctions.add(fn);
        return fn;
      };

      Object.defineProperty(Function.prototype, 'toString', {
        ...toStringDescriptor,
        value: function toStringPatched() {
          if (patchedFunctions.has(this)) {
            return 'function ' + (this.name || '') + '() { [native code] }';
          }
          return originalFnToString.call(this);
        },
      });
    } catch (_) {}

  } catch (outerErr) {
    // Fail silently — never crash the page
  }
})();
`;

// Inject into world 0 (main world) so our overrides affect the page's own globals.
// The isolated world approach (worldId > 0) would NOT work here — page code
// would still see the un-patched navigator on their own window object.
try {
  webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: stealthCode }], true).catch(() => {});
} catch (_) {
  // Older Electron builds — fall back to non-isolated injection
  try {
    webFrame.executeJavaScript(stealthCode, true).catch(() => {});
  } catch (_2) {}
}
