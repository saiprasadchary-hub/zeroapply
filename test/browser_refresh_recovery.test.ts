import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync('main.js', 'utf8');
const start = main.indexOf('    let recoveryTimer = null;');
const end = main.indexOf("  } else if (contents.getType() === 'window')", start);
const handlers = new Map<string, (...args: unknown[]) => void>();
const timers = new Map<number, () => void>();
let nextTimer = 0;
let loads = 0;
const contents = {
  on(name: string, callback: (...args: unknown[]) => void): void { handlers.set(name, callback); },
  once(name: string, callback: (...args: unknown[]) => void): void { handlers.set(name, callback); },
  isDestroyed: (): boolean => false,
  loadURL: async (): Promise<void> => { loads++; },
};
vm.runInNewContext(main.slice(start, end), {
  contents, webviewRecoveryState: new WeakMap(),
  setTimeout: (callback: () => void): number => { timers.set(++nextTimer, callback); return nextTimer; },
  clearTimeout: (id: number): void => { timers.delete(id); },
  sendBrowserEvent: (): void => {}, console: { warn(): void {} },
  getAuthSession: () => ({ cookies: { flushStore: async (): Promise<void> => {} } }),
});
const fail = (): void => handlers.get('did-fail-load')?.({}, -21, 'network changed', 'https://example.com/login', true);
fail();
assert.equal(timers.size, 1);
handlers.get('did-finish-load')?.();
assert.equal(timers.size, 0, 'Successful loads must cancel stale refreshes');
fail();
handlers.get('did-start-navigation')?.({}, 'https://example.com/callback', false, true);
assert.equal(timers.size, 0, 'New navigation must cancel retries for the old page');
fail();
assert.equal(timers.size, 0, 'Successful loads must not reset the retry budget into a loop');
assert.equal(loads, 0);
console.log('Stale refresh cancellation and bounded retry tests passed.');
