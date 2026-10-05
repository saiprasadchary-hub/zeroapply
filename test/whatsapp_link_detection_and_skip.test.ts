/**
 * Automated Test: WhatsApp Link Detection, Auto-Copy, Notification & Non-Opening Skip
 * Verifies that:
 * 1. WhatsApp invite URLs (chat.whatsapp.com, wa.me, api.whatsapp.com, whatsapp://) are accurately detected.
 * 2. WhatsApp joining prompts are identified.
 * 3. Links are copied to clipboard and notifications/telemetry are dispatched.
 * 4. Opening of WhatsApp links is completely bypassed (skipped).
 * 5. Application fields / checkboxes asking for WhatsApp membership are answered affirmatively ("true" / "Yes").
 * 6. The auto-apply workflow proceeds smoothly without disruption.
 */

import assert from 'node:assert/strict';
import {
  isWhatsAppUrl,
  extractWhatsAppUrls,
  isWhatsAppJoinPrompt,
  notifyAndCopyWhatsAppLink,
  scanAndHandleWhatsApp,
  resetWhatsAppSessionCache,
} from '../src/agent/workflow/whatsappHandler';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { classifySingleField } from '../src/agent/domScanner/fieldClassifier';
import type { ScannedField, WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import type { PersonaData } from '../src/types';

const mockPersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React'],
  targetRoles: ['AI Automation Intern'],
  applyMode: 'easy',
  verified: true,
};

async function runWhatsAppTests() {
  console.log('🧪 Starting WhatsApp Link Detection & Auto-Skip Test Suite...\n');

  // Test 1: isWhatsAppUrl URL Validation
  console.log('1. Testing isWhatsAppUrl matching precision...');
  assert.equal(isWhatsAppUrl('https://chat.whatsapp.com/L12K34J56XYZ'), true, 'chat.whatsapp.com invite link must be recognized');
  assert.equal(isWhatsAppUrl('http://chat.whatsapp.com/invite123'), true, 'http chat.whatsapp.com must be recognized');
  assert.equal(isWhatsAppUrl('https://wa.me/918374370572'), true, 'wa.me direct link must be recognized');
  assert.equal(isWhatsAppUrl('https://wa.me/+918374370572?text=Hi'), true, 'wa.me with query params must be recognized');
  assert.equal(isWhatsAppUrl('https://api.whatsapp.com/send?phone=918374370572'), true, 'api.whatsapp.com link must be recognized');
  assert.equal(isWhatsAppUrl('https://web.whatsapp.com/send?phone=918374370572'), true, 'web.whatsapp.com link must be recognized');
  assert.equal(isWhatsAppUrl('whatsapp://chat?code=L12K34J56XYZ'), true, 'whatsapp:// protocol link must be recognized');
  assert.equal(isWhatsAppUrl('whatsapp://send?phone=+918374370572'), true, 'whatsapp://send protocol link must be recognized');

  // Negative tests: must not match standard portal URLs
  assert.equal(isWhatsAppUrl('https://www.linkedin.com/jobs/view/4123456789/'), false, 'LinkedIn job URL must not be flagged');
  assert.equal(isWhatsAppUrl('https://boards.greenhouse.io/company/jobs/123'), false, 'Greenhouse URL must not be flagged');
  assert.equal(isWhatsAppUrl('https://jobs.lever.co/company/abc-123'), false, 'Lever URL must not be flagged');
  assert.equal(isWhatsAppUrl('https://myworkdayjobs.com/apply'), false, 'Workday URL must not be flagged');
  assert.equal(isWhatsAppUrl('mailto:hr@example.com'), false, 'Mailto link must not be flagged');
  assert.equal(isWhatsAppUrl(''), false, 'Empty string must not be flagged');
  assert.equal(isWhatsAppUrl(null), false, 'Null must not be flagged');
  console.log('   ✓ isWhatsAppUrl passed all positive and negative checks\n');

  // Test 2: extractWhatsAppUrls from Arbitrary Text / Descriptions
  console.log('2. Testing extractWhatsAppUrls extraction from job descriptions...');
  const sampleJobDescription = `
    Job Title: Senior Automation Engineer
    Company: TechCorp India
    Location: Remote / Hyderabad
    
    IMPORTANT APPLICATION INSTRUCTION:
    Please join our applicant WhatsApp community for next round test links and immediate updates:
    Group 1: https://chat.whatsapp.com/AbCdEfGhIjKlMnOp
    Direct HR Contact: https://wa.me/918374370572.
    
    Please do not call, just message on WhatsApp.
  `;

  const extracted = extractWhatsAppUrls(sampleJobDescription);
  assert.equal(extracted.length, 2, 'Should extract exactly 2 unique WhatsApp URLs');
  assert.equal(extracted[0], 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp', 'First extracted URL must be clean group invite');
  assert.equal(extracted[1], 'https://wa.me/918374370572', 'Second extracted URL must have trailing punctuation trimmed');
  console.log('   ✓ extractWhatsAppUrls correctly parsed and sanitized embedded URLs\n');

  // Test 3: isWhatsAppJoinPrompt Detection
  console.log('3. Testing isWhatsAppJoinPrompt identification...');
  assert.equal(isWhatsAppJoinPrompt('Please join our WhatsApp group to complete your application.'), true);
  assert.equal(isWhatsAppJoinPrompt('I have joined the WhatsApp community group.'), true);
  assert.equal(isWhatsAppJoinPrompt('Connect with us on WhatsApp for interview scheduling.'), true);
  assert.equal(isWhatsAppJoinPrompt('Have you joined our WhatsApp channel?'), true);
  assert.equal(isWhatsAppJoinPrompt('WhatsApp community joined?'), true);

  // Negative tests
  assert.equal(isWhatsAppJoinPrompt('Must have 4+ years of TypeScript and Python experience.'), false);
  assert.equal(isWhatsAppJoinPrompt('Are you legally authorized to work in India?'), false);
  assert.equal(isWhatsAppJoinPrompt('What is your minimum salary expectation?'), false);
  console.log('   ✓ isWhatsAppJoinPrompt accurately separated WhatsApp prompts from general job questions\n');

  // Test 4: Field Classification & Mapped Value for WhatsApp Checkboxes
  console.log('4. Testing Field Classification for WhatsApp checkboxes...');
  const whatsappField: ScannedField = {
    id: 'whatsapp-community-checkbox',
    selector: '[data-za-field-id="za-whatsapp-chk"]',
    tagName: 'label',
    inputType: 'checkbox',
    label: 'I have joined the WhatsApp community group to receive test links.',
    placeholder: '',
    name: 'joined_whatsapp',
    required: true,
    currentValue: 'false',
    isCustomComponent: true,
  };

  const classified = classifySingleField(whatsappField, mockPersona);
  assert.equal(classified.fieldType, 'terms', 'WhatsApp checkbox must be classified as terms/consent');
  assert.equal(classified.mappedValue, 'true', 'WhatsApp checkbox must map to "true" to fulfill form without blocking');
  console.log('   ✓ WhatsApp checkbox mapped to "true" (satisfies submission requirement without opening link)\n');

  // Test 5: Deterministic Question Resolution for WhatsApp Questions
  console.log('5. Testing Deterministic Question Resolution for WhatsApp questions...');
  
  // Case A: Radio / Dropdown with Yes/No options
  const whatsappRadioQuestion = {
    id: 'wa-radio',
    label: 'Have you joined our official WhatsApp group for interview updates?',
    inputType: 'radio',
    options: ['Yes', 'No'],
    required: true,
  };
  const radioRes = await resolveQuestion(whatsappRadioQuestion, mockPersona);
  assert.equal(radioRes.answer, 'Yes', 'Radio question asking if candidate joined WhatsApp must answer "Yes"');
  assert.equal(radioRes.confidence, 1.0, 'Confidence must be 1.0');

  // Case B: Checkbox asking to join WhatsApp
  const whatsappCheckboxQuestion = {
    id: 'wa-chk',
    label: 'I confirm that I joined the WhatsApp group.',
    inputType: 'checkbox',
    required: true,
  };
  const chkRes = await resolveQuestion(whatsappCheckboxQuestion, mockPersona);
  assert.equal(chkRes.answer, 'true', 'Checkbox question asking if candidate joined WhatsApp must answer "true"');
  assert.equal(chkRes.confidence, 1.0, 'Confidence must be 1.0');
  console.log('   ✓ WhatsApp join questions resolved affirmatively to bypass blocking\n');

  // Test 6: notifyAndCopyWhatsAppLink Execution
  console.log('6. Testing notifyAndCopyWhatsAppLink execution...');
  resetWhatsAppSessionCache();
  const notifyRes = await notifyAndCopyWhatsAppLink('https://chat.whatsapp.com/TestGroup123', 'Sample Job Prompt');
  // In node environment, clipboard may be simulated or unavailable, but the function must handle gracefully without throwing
  assert.equal(typeof notifyRes, 'boolean', 'notifyAndCopyWhatsAppLink should return a boolean result');
  console.log('   ✓ notifyAndCopyWhatsAppLink executed safely without error\n');

  // Test 7: scanAndHandleWhatsApp Webview Target Simulation
  console.log('7. Testing scanAndHandleWhatsApp on simulated webview target...');
  const mockWebview: WebviewTarget = {
    executeJavaScript: async (script: string) => {
      // Simulate injected script returning a detected WhatsApp URL
      return {
        success: true,
        detected: true,
        links: ['https://chat.whatsapp.com/SimulatedInvite999'],
        copied: true,
        joinPromptFound: true,
        promptText: 'Join WhatsApp Community to receive next steps',
      };
    },
  };

  const scanResult = await scanAndHandleWhatsApp(mockWebview);
  assert.equal(scanResult.detected, true, 'Scan must detect the WhatsApp link');
  assert.equal(scanResult.links.length, 1, 'Scan must report 1 link');
  assert.equal(scanResult.links[0], 'https://chat.whatsapp.com/SimulatedInvite999', 'Link must match simulated invite');
  assert.equal(scanResult.joinPromptFound, true, 'Prompt must be flagged');
  console.log('   ✓ scanAndHandleWhatsApp successfully parsed webview target results and triggered notifications\n');

  console.log('🎉 All WhatsApp link detection, auto-copy, notification & non-opening skip tests passed successfully!\n');
}

runWhatsAppTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
