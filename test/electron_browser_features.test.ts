import assert from 'node:assert/strict';
import {
  browserCommandForInput,
  isExternalProtocol,
  parseWebDestination,
  sanitizedPageFilename,
} from '../AgentBrowser/electron-browser-features.js';

assert.equal(browserCommandForInput({ type: 'keyDown', control: true, key: 'L' }), 'focus-address');
assert.equal(browserCommandForInput({ type: 'keyDown', control: true, key: 'T' }), 'new-tab');
assert.equal(browserCommandForInput({ type: 'keyDown', control: true, shift: true, key: 'T' }), 'reopen-tab');
assert.equal(browserCommandForInput({ type: 'keyDown', control: true, key: 'S' }), 'save-page');
assert.equal(browserCommandForInput({ type: 'keyDown', control: true, key: 'Tab' }), 'next-tab');
assert.equal(browserCommandForInput({ type: 'keyDown', control: true, shift: true, key: 'Tab' }), 'previous-tab');
assert.equal(browserCommandForInput({ type: 'keyDown', alt: true, key: 'Left' }), 'back');
assert.equal(browserCommandForInput({ type: 'keyDown', key: 'a' }), null);
assert.equal(browserCommandForInput({ type: 'keyUp', control: true, key: 'L' }), null);
assert.equal(parseWebDestination('http://example.com')?.hostname, 'example.com');
assert.equal(parseWebDestination('https://user:secret@example.com'), null);
assert.equal(parseWebDestination('file:///c:/secret.txt'), null);
assert.equal(isExternalProtocol('mailto:test@example.com'), true);
assert.equal(isExternalProtocol('tel:+15551234567'), true);
assert.equal(isExternalProtocol('javascript:alert(1)'), false);
assert.equal(sanitizedPageFilename('Example: Home'), 'Example_ Home.html');

console.log('Electron browser feature tests passed (16/16).');
