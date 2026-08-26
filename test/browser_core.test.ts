import assert from 'node:assert/strict';
import {
  DEFAULT_HOME_URL,
  MAX_BROWSER_TABS,
  createBrowserTab,
  resolveOmniboxInput,
  safeBrowserUrl,
  titleFromUrl,
} from '../AgentBrowser/browserSession';

assert.equal(MAX_BROWSER_TABS, 20);
assert.equal(DEFAULT_HOME_URL, 'https://www.google.com/');
assert.equal(safeBrowserUrl('https://example.com/path'), 'https://example.com/path');
assert.equal(safeBrowserUrl('http://example.com/path'), 'http://example.com/path');
assert.equal(safeBrowserUrl('https://user:secret@example.com'), null);
assert.equal(safeBrowserUrl('javascript:alert(1)'), null);
assert.equal(resolveOmniboxInput('example.com'), 'https://example.com/');
assert.equal(resolveOmniboxInput('localhost:5173'), 'http://localhost:5173/');
assert.equal(resolveOmniboxInput('browser product testing'), 'https://www.google.com/search?q=browser%20product%20testing');
assert.equal(resolveOmniboxInput(''), null);
assert.equal(titleFromUrl('https://www.example.com/a'), 'example.com');
const tab = createBrowserTab('https://example.com/', 'auto');
assert.equal(tab.zoomFactor, 1);
assert.equal(tab.loading, true);
assert.ok(tab.id);

console.log('Browser core tests passed (14/14).');
