import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { launchChromeAgentPage } from '../src/browserSelect/chromeAgentAdapter';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const overlays: Deferred<unknown>[] = [];
const navigations: Deferred<boolean>[] = [];
let launchOk = true;
let rejectOverlays = false;
const bridge = {
  launchChromeAgent: async (url: string): Promise<{ ok: boolean; url: string; error?: string }> => ({
    ok: launchOk, url, error: launchOk ? undefined : 'Chrome unavailable',
  }),
  chromeAgentNavigate: (_url: string): Promise<boolean> => {
    const navigation = deferred<boolean>();
    navigations.push(navigation);
    return navigation.promise;
  },
  chromeAgentEvaluate: (script: string): Promise<unknown> => {
    if (script === 'readiness-probe') return Promise.resolve('ready');
    if (rejectOverlays) return Promise.reject(new Error('Document replaced'));
    const overlay = deferred<unknown>();
    overlays.push(overlay);
    return overlay.promise;
  },
};

Object.defineProperty(globalThis, 'window', { configurable: true, value: { zeroApply: bridge } });

try {
  let launched = false;
  const launching = launchChromeAgentPage('https://example.com/jobs').then((page) => {
    launched = true;
    return page;
  });
  await nextTurn();
  assert.equal(launched, true, 'Pending overlay scripts must not delay Chrome launch');
  assert.equal(overlays.length, 2, 'Both decorations start independently');
  const page = await launching;
  assert.equal(await page.executeJavaScript('readiness-probe'), 'ready', 'The agent can probe while decoration is pending');

  let navigated = false;
  const navigating = page.navigate('https://example.com/apply').then((ok) => {
    navigated = true;
    return ok;
  });
  await nextTurn();
  assert.equal(navigated, false, 'Actual browser navigation must still be awaited');
  navigations[0].resolve(true);
  await nextTurn();
  assert.equal(navigated, true, 'Pending decorations must not delay navigation completion');
  assert.equal(await navigating, true);
  assert.equal(overlays.length, 4);
  overlays.forEach((overlay) => overlay.reject(new Error('Navigation replaced the document')));
  await nextTurn();

  rejectOverlays = true;
  const pageAfterFailure = await launchChromeAgentPage('https://example.com/jobs');
  await nextTurn();
  assert.equal(await pageAfterFailure.executeJavaScript('readiness-probe'), 'ready', 'Rejected decoration does not disable the agent');

  const failedNavigation = pageAfterFailure.navigate('https://example.com/failed');
  navigations[1].reject(new Error('Navigation failed'));
  await assert.rejects(failedNavigation, /Navigation failed/);
  launchOk = false;
  await assert.rejects(launchChromeAgentPage('https://example.com/jobs'), /Chrome unavailable/);
  console.log('Chrome startup tests passed: optional overlays do not block launch, navigation, or readiness probes.');
} finally {
  overlays.forEach((overlay) => overlay.resolve(undefined));
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
