import assert from 'node:assert/strict';
import {
  isLinkedInSafetyUrl,
  isLinkedInTrackerUrl,
  isDeferredPopupUrl,
  normalizeGestureCandidates,
  resolveGestureDestination,
  resolvePopupDestination,
} from '../AgentBrowser/browser-navigation.js';

const direct = resolvePopupDestination('https://www.linkedin.com/jobs/view/123');
assert.equal(direct?.toString(), 'https://www.linkedin.com/jobs/view/123');

const employerUrl = 'https://jobs.example.com/apply?id=42';
const wrapped = `https://www.linkedin.com/safety/go/?url=${encodeURIComponent(employerUrl)}&_l=en_US`;
assert.equal(resolvePopupDestination(wrapped)?.toString(), employerUrl);
assert.equal(resolvePopupDestination('https://www.linkedin.com/safety/go/?_l=en_US'), null);
assert.equal(resolvePopupDestination('https://www.linkedin.com/safety/go/?url=javascript%3Aalert(1)'), null);
assert.equal(resolvePopupDestination('not a URL'), null);

const candidates = normalizeGestureCandidates([
  '/jobs/view/456',
  employerUrl,
  'javascript:alert(1)',
  'https://user:password@example.com/private',
], 'https://www.linkedin.com/jobs/search/');
assert.deepEqual(candidates, [
  'https://www.linkedin.com/jobs/view/456',
  employerUrl,
]);
assert.equal(resolveGestureDestination({ candidates: [employerUrl] })?.toString(), employerUrl);
assert.deepEqual(normalizeGestureCandidates([employerUrl, employerUrl], 'https://www.linkedin.com'), [employerUrl]);
assert.equal(resolveGestureDestination({ candidates: ['javascript:alert(1)'] }), null);
assert.equal(isLinkedInSafetyUrl('https://www.linkedin.com/safety/go/?_l=en_US'), true);
assert.equal(isLinkedInSafetyUrl('https://www.linkedin.com/jobs/view/123'), false);
assert.equal(isDeferredPopupUrl('about:blank'), true);
assert.equal(isDeferredPopupUrl(''), true);
assert.equal(isDeferredPopupUrl('https://example.com'), false);
assert.equal(isLinkedInTrackerUrl('https://www.linkedin.com/jobs-tracker/?stage=clicked_apply'), true);
assert.equal(isLinkedInTrackerUrl('https://www.linkedin.com/jobs/view/4459184795'), false);

console.log('Browser navigation tests passed (16/16).');
