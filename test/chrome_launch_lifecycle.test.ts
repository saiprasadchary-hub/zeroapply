import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { matchesStartupDestination } from '../AgentBrowser/browser-navigation.js';

const main = fs.readFileSync('main.js', 'utf8');
const source = main.slice(main.indexOf('async function navigateChromeStartup(startUrl)'), main.indexOf('// Camoufox anti-detect Firefox agent\n//'));
let spawnCount = 0;
let navigations = 0;
let currentUrl = 'https://example.com';
let args: string[] = [];
const handlers = new Map<string, (...values: unknown[]) => void>();
const child = { exitCode: null, once(name: string, callback: (...values: unknown[]) => void): void { handlers.set(name, callback); } };
const connection = { socket: { readyState: 1 }, close(): void {}, async call(method: string, params?: { url: string }): Promise<unknown> {
  if (method === 'Runtime.evaluate') return { result: { value: currentUrl } };
  if (method === 'Page.navigate') { navigations++; currentUrl = params?.url || currentUrl; }
} };
const context = vm.createContext({
  matchesStartupDestination,
  isSafeChromeAgentUrl: (url: string): boolean => url.startsWith('https://'),
  findChromeExecutable: (): string => '/chrome',
  chromeAgentLaunchQueue: Promise.resolve(), chromeAgentConnection: null,
  chromeAgentProcess: null, chromeAgentPort: null,
  fs: { mkdirSync(): void {} }, CHROME_AGENT_PROFILE_PATH: '/agent-profile',
  reserveLoopbackPort: async (): Promise<number> => 12345,
  spawn: (_binary: string, options: string[]): typeof child => { spawnCount++; args = options; return child; },
  WebSocket: { OPEN: 1 }, setTimeout,
});
context.connectChromeAgentTarget = async (): Promise<{ url: string }> => {
  context.chromeAgentConnection = connection;
  return { url: 'https://example.com' };
};
vm.runInContext(source, context);
await Promise.all([
  context.launchChromeAgent('https://example.com'),
  context.launchChromeAgent('https://example.org'),
]);
assert.equal(spawnCount, 1, 'Concurrent requests must reuse one Chrome process');
assert.equal(navigations, 1);
assert.ok(args.includes('--remote-allow-origins=http://127.0.0.1'));
assert.ok(!args.includes('--remote-allow-origins=*'));
context.chromeAgentConnection = null;
await context.launchChromeAgent('https://example.net');
assert.equal(spawnCount, 1, 'Lost page connections must reconnect without reopening the profile');
assert.equal(navigations, 2);
await context.launchChromeAgent('https://example.net');
assert.equal(navigations, 2, 'An existing requested page must be reused without refreshing');
await assert.rejects(context.launchChromeAgent('file:///secret'), /unsafe/);
handlers.get('exit')?.();
assert.equal(context.chromeAgentProcess, null);
context.spawn = (): typeof child => {
  const failed = { ...child, exitCode: 1 };
  return failed;
};
await assert.rejects(context.launchChromeAgent('https://example.com'), /Close any existing/);
assert.equal(context.chromeAgentProcess, null);
console.log('Chrome startup serialization, reconnect, profile preservation, and failure handling passed.');
