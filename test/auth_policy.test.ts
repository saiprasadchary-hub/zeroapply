import { strict as assert } from 'node:assert';
import {
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS,
  getFriendlyAuthErrorMessage,
  requiresEmailVerification,
} from '../src/auth/authPolicy';

assert.equal(PASSWORD_PATTERN.test('Production1'), true);
assert.equal(PASSWORD_PATTERN.test('weakpass'), false);
assert.equal(getFriendlyAuthErrorMessage({ code: 'auth/weak-password' }), PASSWORD_REQUIREMENTS);
assert.equal(
  getFriendlyAuthErrorMessage({ code: 'auth/user-not-found' }),
  getFriendlyAuthErrorMessage({ code: 'auth/invalid-credential' })
);
assert.equal(requiresEmailVerification({ emailVerified: false, providerData: [{ providerId: 'password' }] }), true);
assert.equal(requiresEmailVerification({ emailVerified: true, providerData: [{ providerId: 'password' }] }), false);
assert.equal(requiresEmailVerification({ emailVerified: false, providerData: [{ providerId: 'google.com' }] }), false);
assert.equal(getFriendlyAuthErrorMessage(new Error('internal provider detail')), 'Authentication failed. Please try again.');

console.log('Auth policy tests passed (8/8).');
