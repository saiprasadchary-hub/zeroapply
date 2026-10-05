import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('main.js', 'utf8');
const handlers = new Map<string, (...args: unknown[]) => void>();
const timers = new Map<number, () => void>();
let timerId = 0;
let loads = 0;
let alerts = 0;
let modelStops = 0;
vm.runInNewContext(source.slice(source.indexOf('  let rendererLoadAttempts = 0;'), source.indexOf("  mainWindow.on('unresponsive'")), {
  mainWindow: {
    isDestroyed: (): boolean => false,
    loadURL: async (): Promise<void> => { loads++; },
    webContents: { on: (name: string, handler: (...args: unknown[]) => void): void => { handlers.set(name, handler); } },
    once: (name: string, handler: (...args: unknown[]) => void): void => { handlers.set(name, handler); },
  },
  autoApplyActive: true,
  rendererUrlInUse: 'http://localhost:5173', URL,
  embeddedModel: { stop: (): void => { modelStops++; } },
  setTimeout: (handler: () => void): number => { timers.set(++timerId, handler); return timerId; },
  clearTimeout: (id: number): void => { timers.delete(id); },
  dialog: { showErrorBox: (): void => { alerts++; } },
  console: { warn(): void {}, error(): void {} }, describeError: String,
});
assert.equal(loads, 1);
const fail = (): void => handlers.get('did-fail-load')?.({}, -2, 'failed', 'http://localhost:5173', true);
fail();
assert.equal(timers.size, 1);
handlers.get('did-finish-load')?.();
assert.equal(timers.size, 0, 'A recovered app must not receive a stale reload');
fail();
handlers.get('did-start-navigation')?.({}, 'http://localhost:5173', false, true);
assert.equal(timers.size, 0);
handlers.get('render-process-gone')?.({}, { reason: 'crashed' });
handlers.get('did-finish-load')?.();
handlers.get('render-process-gone')?.({}, { reason: 'crashed' });
assert.equal(alerts, 1, 'Repeated renderer crashes must stop retrying');
assert.equal(timers.size, 0);
assert.equal(modelStops, 3, 'Navigation and renderer crashes must unload built-in AI');
console.log('Renderer stale reload cancellation and crash limit passed.');
