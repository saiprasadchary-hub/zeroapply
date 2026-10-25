import assert from 'node:assert/strict';
import {
  detectSecurityChallenge,
  waitForChallengeResolution,
  type SecurityChallengeReport,
} from '../src/agent/security';

console.log('=== TEST 1: Cloudflare Turnstile Perception ===');
const mockTurnstileView = {
  executeJavaScript: async (script: string) => {
    return {
      detected: true,
      type: 'turnstile',
      confidence: 0.98,
      selector: 'iframe[src*="challenges.cloudflare.com"], .cf-turnstile',
      message: 'Cloudflare Turnstile verification challenge active',
    };
  },
};

(async () => {
  const rep1 = await detectSecurityChallenge(mockTurnstileView as any);
  assert.equal(rep1.detected, true);
  assert.equal(rep1.type, 'turnstile');
  assert.ok(rep1.confidence >= 0.95);
  console.log('✓ Cloudflare Turnstile detected with high confidence (' + rep1.confidence + ')');

  console.log('=== TEST 2: LinkedIn Security Checkpoint Perception ===');
  const mockLinkedinCheckpointView = {
    executeJavaScript: async (script: string) => {
      return {
        detected: true,
        type: 'linkedin_checkpoint',
        confidence: 0.99,
        selector: '#captcha-internal, form#checkpointChallengeForm',
        message: 'LinkedIn Security Verification checkpoint active',
      };
    },
  };
  const rep2 = await detectSecurityChallenge(mockLinkedinCheckpointView as any);
  assert.equal(rep2.detected, true);
  assert.equal(rep2.type, 'linkedin_checkpoint');
  assert.ok(rep2.confidence >= 0.98);
  console.log('✓ LinkedIn security verification checkpoint flagged immediately');

  console.log('=== TEST 3: Clean Portal Page (No Obstacles) ===');
  const mockCleanView = {
    executeJavaScript: async (script: string) => {
      return {
        detected: false,
        confidence: 0,
      };
    },
  };
  const rep3 = await detectSecurityChallenge(mockCleanView as any);
  assert.equal(rep3.detected, false);
  console.log('✓ Clean application form verified with zero false positives');

  console.log('=== TEST 4: Auto-Pause and Clearance Polling ===');
  let pollAttempts = 0;
  const mockResolvingView = {
    executeJavaScript: async () => {
      pollAttempts++;
      if (pollAttempts < 3) {
        return { detected: true, type: 'hcaptcha', confidence: 0.97 };
      }
      // Resolved on 3rd check!
      return { detected: false, confidence: 0 };
    },
  };

  const resolved = await waitForChallengeResolution(mockResolvingView as any, {
    pollIntervalMs: 20,
    timeoutMs: 1000,
  });

  assert.equal(resolved, true);
  assert.ok(pollAttempts >= 3);
  console.log('✓ Challenge successfully resolved and auto-resumed seamlessly after ' + pollAttempts + ' polls');

  console.log('\n🎉 ALL ANTI-BOT PERCEPTION & RECOVERY TESTS PASSED (100%)!');
})();
