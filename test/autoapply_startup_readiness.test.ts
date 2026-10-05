import assert from 'node:assert/strict';
import vm from 'node:vm';
import { AUTO_APPLY_STARTUP_SCRIPT, matchesStartupDestination, waitForAutoApplyPage } from '../src/agent/navigation/autoApplyStartup';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';

const target = 'https://www.linkedin.com/jobs/search/?keywords=python';
assert.equal(matchesStartupDestination(target + '&currentJobId=42', target), true);
assert.equal(matchesStartupDestination(target.replace('python', 'java'), target), false);
assert.equal(matchesStartupDestination('https://www.linkedin.com.attacker.example/jobs/search/?keywords=python', target), false);
assert.equal(matchesStartupDestination('https://www.linkedin.com/login', target), false);
const docState = vm.runInNewContext(AUTO_APPLY_STARTUP_SCRIPT, {
  location: { href: target, pathname: '/jobs/search/' },
  document: { readyState: 'interactive', title: 'Jobs', querySelector: () => null },
});
assert.equal(docState.ready, true);
let probes = 0;
const readyView: WebviewTarget = { executeJavaScript: async <T>(): Promise<T> => { probes++; return docState as T; } };
assert.equal(await waitForAutoApplyPage(() => readyView, target, () => true, () => {}), readyView);
assert.equal(probes, 1, 'A ready page must start from the first probe');
let active = true;
let loginMessages = 0;
const loginView: WebviewTarget = { executeJavaScript: async <T>(): Promise<T> => ({ ...docState, url: 'https://www.linkedin.com/login', loginRequired: true }) as T };
assert.equal(await waitForAutoApplyPage(() => loginView, target, () => active, () => { loginMessages++; active = false; }), null);
assert.equal(loginMessages, 1);
let release: ((value: unknown) => void) | undefined;
active = true;
const delayedView: WebviewTarget = { executeJavaScript: <T>(): Promise<T> => new Promise<T>((resolve) => { release = resolve as (value: unknown) => void; }) };
const pending = waitForAutoApplyPage(() => delayedView, target, () => active, () => {});
active = false;
release?.(docState);
assert.equal(await pending, null, 'Stopping during readiness must never start an engine');
await assert.rejects(waitForAutoApplyPage(() => undefined, target, () => true, () => {}, 1), /not ready/);
const blockedView: WebviewTarget = { executeJavaScript: async <T>(): Promise<T> => ({ ...docState, blocked: true }) as T };
await assert.rejects(waitForAutoApplyPage(() => blockedView, target, () => true, () => {}), /denied access/);
console.log('Immediate readiness, correct destination, login, stop, block and timeout checks passed.');
