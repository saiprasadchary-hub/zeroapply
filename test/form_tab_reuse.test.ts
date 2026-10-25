import assert from 'node:assert/strict';
import { browserNavigationKey } from '../AgentBrowser/browserSession';
const form = 'https://docs.google.com/forms/d/e/form-one/viewform';
assert.equal(browserNavigationKey(form), browserNavigationKey(form + '?pli=1&usp=sf_link'));
assert.notEqual(browserNavigationKey(form), browserNavigationKey(form.replace('form-one', 'form-two')));
assert.notEqual(browserNavigationKey(form), browserNavigationKey(form + '?entry.123=Male'));
assert.notEqual(browserNavigationKey(form + '?authuser=0'), browserNavigationKey(form + '?authuser=1'));
assert.notEqual(browserNavigationKey('https://example.com/?page=1'), browserNavigationKey('https://example.com/?page=2'));
console.log('Form tab reuse regression checks passed');
