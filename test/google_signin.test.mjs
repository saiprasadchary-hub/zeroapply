import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldOpenGoogleSignInInChrome as route } from '../AgentBrowser/google-signin.js';

test('direct Google sign-in and add-account links open in Chrome', () => {
  assert.equal(route('https://accounts.google.com/ServiceLogin?continue=https://www.google.com/', 'https://www.google.com/'), true);
  assert.equal(route('https://accounts.google.com/AddSession', 'https://myaccount.google.com/'), true);
});
test('new tabs, searches, and LinkedIn OAuth remain in the original context', () => {
  assert.equal(route('https://www.google.com/', 'https://www.google.com/'), false);
  assert.equal(route('https://www.google.com/search?q=jobs', 'https://www.google.com/'), false);
  assert.equal(route('https://accounts.google.com/o/oauth2/v2/auth', 'https://www.google.com/'), false);
  assert.equal(route('https://accounts.google.com/ServiceLogin', 'https://www.linkedin.com/login'), false);
});
test('unsafe and lookalike hosts are excluded', () => {
  assert.equal(route('https://accounts.google.com.evil.test/ServiceLogin', 'https://www.google.com/'), false);
  assert.equal(route('https://accounts.google.com/ServiceLogin', 'https://evilgoogle.com/'), false);
  assert.equal(route('https://user:password@accounts.google.com/ServiceLogin', 'https://www.google.com/'), false);
  assert.equal(route('javascript:alert(1)', 'https://www.google.com/'), false);
});
