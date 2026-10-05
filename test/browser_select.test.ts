import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeBrowserMode } from '../src/browserSelect/types';

assert.equal(normalizeBrowserMode('own'), 'own');
assert.equal(normalizeBrowserMode('agent'), 'agent');
assert.equal(normalizeBrowserMode(undefined), 'agent');
assert.equal(normalizeBrowserMode('chrome'), 'agent');

const selector = fs.readFileSync('src/browserSelect/BrowserSelector.tsx', 'utf8');
const adapter = fs.readFileSync('src/browserSelect/chromeAgentAdapter.ts', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');
const preload = fs.readFileSync('preload-popup.cjs', 'utf8');
const persona = fs.readFileSync('src/components/PersonaForm.tsx', 'utf8');

assert.match(selector, /In-app browser/);
assert.match(selector, /Real Chrome/);
assert.match(selector, /dedicated ZeroApply Chrome profile/);
assert.match(persona, /<BrowserSelector/);
assert.match(adapter, /launchChromeAgent/);
assert.match(adapter, /chromeAgentEvaluate/);
assert.match(main, /--remote-debugging-address=127\.0\.0\.1/);
assert.match(main, /isSafeChromeAgentUrl/);
assert.match(main, /requireTrustedIpcSender\(event\)/);
assert.match(preload, /chrome-agent-launch/);

console.log('Browser selection tests passed (14/14).');

