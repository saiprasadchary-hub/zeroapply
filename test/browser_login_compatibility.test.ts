import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  isAuthenticationUrl, shouldKeepAuthenticationPopup, isDeferredPopupUrl,
  resolvePopupDestination, resolveGestureDestination,
} from '../AgentBrowser/browser-navigation.js';

assert.equal(isAuthenticationUrl('https://accounts.google.com/o/oauth2/auth'), true);
assert.equal(isAuthenticationUrl('https://login.live.com/oauth20_authorize.srf'), true);
assert.equal(isAuthenticationUrl('https://company.example/auth/sso'), true);
assert.equal(isAuthenticationUrl('/oauth/authorize', 'https://company.example'), true);
assert.equal(isAuthenticationUrl('https://accounts.google.com.attacker.example/jobs'), false);
assert.equal(isAuthenticationUrl('http://company.example/login'), false);
assert.equal(isAuthenticationUrl('https://user:password@company.example/login'), false);
assert.equal(shouldKeepAuthenticationPopup('https://company.example/callback?code=test', true), true);
assert.equal(shouldKeepAuthenticationPopup('https://company.example/callback', false), false);
assert.equal(shouldKeepAuthenticationPopup('javascript:alert(1)', true), false);
assert.equal(shouldKeepAuthenticationPopup('https://user:pass@company.example/callback', true), false);

const main = fs.readFileSync('main.js', 'utf8');
const handlerSource = main.slice(main.indexOf('const handleWindowOpen'), main.indexOf('function initializeDesktopUpdates'));
const opened: string[] = [];
let hasGesture = true;
const context = vm.createContext({
  isAuthenticationUrl, shouldKeepAuthenticationPopup, isDeferredPopupUrl,
  resolvePopupDestination, resolveGestureDestination,
  isWhatsAppUrl: (): boolean => false,
  isExternalProtocol: (): boolean => false,
  consumePopupGesture: (): { candidates: string[] } | null => hasGesture ? { candidates: [] } : null,
  isBackgroundPopup: (): boolean => false,
  isLinkedInTrackerUrl: (): boolean => false,
  sendBrowserEvent: (): void => {},
  sendOpenTab: (url: string): void => { opened.push(url); },
  AUTH_PARTITION: 'persist:zeroapply_auth',
});
vm.runInContext(`${handlerSource}\nthis.handler = handleWindowOpen;`, context);
const source = { getType: (): string => 'webview' };
const auth = context.handler({ url: 'https://company.example/oauth/authorize' }, source);
assert.equal(auth.action, 'allow');
assert.equal(auth.overrideBrowserWindowOptions.webPreferences.partition, 'persist:zeroapply_auth');
assert.equal(auth.overrideBrowserWindowOptions.webPreferences.sandbox, true);
assert.equal(auth.overrideBrowserWindowOptions.webPreferences.nodeIntegration, false);
assert.equal(opened.length, 0);
assert.equal(context.handler({ url: 'about:blank' }, source).action, 'allow');
assert.equal(context.handler({ url: 'https://jobs.example/apply/123' }, source).action, 'deny');
assert.deepEqual(opened, ['https://jobs.example/apply/123']);
hasGesture = false;
assert.equal(context.handler({ url: 'https://company.example/oauth/authorize' }, source).action, 'deny');

// Execute the real child-window navigation handler and verify an OAuth return
// keeps its original browsing context instead of closing and opening a tab.
const childHandlers = new Map<string, (event: { preventDefault(): void }, url: string) => void>();
let childClosed = false;
let prevented = false;
const child = {
  isDestroyed: (): boolean => false,
  close: (): void => { childClosed = true; },
  show: (): void => {},
  once: (): void => {},
  webContents: { on: (name: string, callback: (event: { preventDefault(): void }, url: string) => void): void => { childHandlers.set(name, callback); } },
};
Object.assign(context, {
  mainWindow: null,
  topLevelAuthWindows: new Set(),
  contents: { ...source, on: (_name: string, callback: (window: typeof child, details: { url: string }) => void): void => {
    callback(child, { url: 'https://company.example/oauth/authorize' });
  } },
  isAllowedWebviewUrl: (url: string): boolean => url.startsWith('https://'),
  setTimeout, clearTimeout,
});
const childStart = main.indexOf("  contents.on('did-create-window'");
const childEnd = main.indexOf("  contents.on('will-attach-webview'", childStart);
vm.runInContext(main.slice(childStart, childEnd), context);
childHandlers.get('will-redirect')?.({ preventDefault: (): void => { prevented = true; } }, 'https://jobs.example/callback?code=test');
assert.equal(prevented, false);
assert.equal(childClosed, false);
assert.equal(opened.length, 1);
console.log('Login popup routing, callback continuity, shared sessions, and security checks passed.');
