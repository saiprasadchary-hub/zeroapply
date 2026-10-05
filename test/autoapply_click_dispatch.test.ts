import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { matchesStartupDestination, waitForAutoApplyPage } from '../src/agent/navigation/autoApplyStartup';

// Execute the real pending-action effect with browser boundaries mocked out.
const source = fs.readFileSync('AgentBrowser/AgentBrowser.tsx', 'utf8');
const start = source.indexOf('  useEffect(() => {\n    if (!pendingAction');
const end = source.indexOf('  }, [pendingAction', start);
const effectSource = ts.transpile(source.slice(start, end) + '  });', { target: ts.ScriptTarget.ES2022 });
const target = 'https://www.linkedin.com/jobs/search/?keywords=python';
let invocations = 0;
let runEffect: (() => void) | undefined;
let finishRun: (() => void) | undefined;
let expectedTab = '';
let expectedPlatform = '';
let modelStops = 0;
const runPending = new Promise<void>((resolve) => { finishRun = resolve; });
const view = { getURL: (): string => target, executeJavaScript: async <T>(): Promise<T> => ({ url: target, ready: true }) as T };
const patches: Record<string, unknown>[] = [];
const context = vm.createContext({
  stopEmbeddedModel: async (): Promise<void> => { modelStops++; },
  useEffect: (effect: () => void): void => { runEffect = effect; },
  pendingAction: { action: 'autoApply', platform: 'linkedin', timestamp: 1 },
  lastStartupRequestRef: { current: null }, lastHandledActionTimeRef: { current: 0 },
  isAutoApplyingRef: { current: false }, agentActionInFlightRef: { current: false },
  browserMode: 'own', persona: { browserMode: 'own', targetRoles: ['python'], applyMode: 'easy' },
  normalizeBrowserMode: (mode: string): string => mode,
  PLATFORMS: [{ id: 'linkedin', label: 'LinkedIn' }],
  buildSearchUrl: (): string => target,
  activeTabIdRef: { current: 'requested-tab' },
  webviewRefs: { current: new Map([['requested-tab', view]]) },
  matchesStartupDestination, waitForAutoApplyPage,
  updateTab: (_id: string, patch: Record<string, unknown>): void => { patches.push(patch); },
  onSaveToast: (): void => {}, setAddress: (): void => {}, setIsAutoApplying: (): void => {},
  actionsRef: { current: { handleAutoFillAndApply: async (_force: boolean, requested: { tabId: string; platform: string }): Promise<void> => {
    invocations++; expectedTab = requested.tabId; expectedPlatform = requested.platform;
    await runPending;
  } } },
});
vm.runInContext(effectSource, context);
runEffect?.();
assert.equal(context.isAutoApplyingRef.current, true, 'Click must start the request synchronously');
// A tab switch before readiness resolves must not redirect the job to another tab.
context.activeTabIdRef.current = 'unrelated-tab';
await new Promise<void>((resolve) => setImmediate(resolve));
assert.equal(invocations, 1);
assert.equal(expectedTab, 'requested-tab');
assert.equal(expectedPlatform, 'linkedin');
assert.ok(!('loadUrl' in patches[0]), 'An already-open search must not be refreshed');
context.pendingAction = { action: 'autoApply', platform: 'indeed', timestamp: 2 };
runEffect?.();
assert.equal(context.lastHandledActionTimeRef.current, 1, 'Duplicate click must not cancel the active startup token');
assert.equal(invocations, 1);
finishRun?.();
await new Promise<void>((resolve) => setImmediate(resolve));
assert.equal(context.isAutoApplyingRef.current, false);
assert.equal(modelStops, 1, 'Finishing a startup request must unload the model');
console.log('Real click effect: immediate dispatch, pinned tab/platform, no refresh, duplicate suppression passed.');
