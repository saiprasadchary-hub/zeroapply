/**
 * Automated Test: Custom Checkbox Detection & Mobile Number Normalization
 * Verifies that custom Tailwind/React checkboxes (verification and WhatsApp group)
 * and 10-digit mobile phone normalization execute with full React _valueTracker sync.
 */

import assert from 'node:assert/strict';
import { classifySingleField } from '../src/agent/domScanner/fieldClassifier';
import { normalizePhoneForField } from '../src/agent/autofill/humanSimulator';
import { buildSyntheticEventScript } from '../src/agent/formFiller/syntheticEventDispatcher';
import type { ScannedField } from '../src/agent/domScanner/injectedScanner';
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

async function runTests() {
  console.log('🧪 Testing Custom Checkbox & Mobile Phone Filling Verification...\n');

  // Test 1: Custom Verification Checkbox Classification
  console.log('1. Custom Verification Checkbox Classification...');
  const verifyField: ScannedField = {
    id: 'verify-checkbox',
    selector: '[data-za-field-id="za-field-1"]',
    tagName: 'label',
    inputType: 'checkbox',
    label: '* I verify that the information provided is accurate and I agree to receive official communications from UM Base Project regarding my application.',
    placeholder: '',
    name: '',
    required: true,
    currentValue: 'false',
    isCustomComponent: true,
  };

  const classifiedVerify = classifySingleField(verifyField, mockPersona);
  assert.equal(classifiedVerify.fieldType, 'terms', 'Verification checkbox should be classified as terms');
  assert.equal(classifiedVerify.mappedValue, 'true', 'Verification checkbox mappedValue must be "true"');
  console.log('   ✓ Verification Checkbox classified as terms with mappedValue: "true"');

  // Test 2: WhatsApp Community Group Checkbox Classification
  console.log('2. WhatsApp Community Group Checkbox Classification...');
  const whatsappField: ScannedField = {
    id: 'whatsapp-checkbox',
    selector: '[data-za-field-id="za-field-2"]',
    tagName: 'label',
    inputType: 'checkbox',
    label: 'I have joined the WhatsApp community group.',
    placeholder: '',
    name: '',
    required: false,
    currentValue: 'false',
    isCustomComponent: true,
  };

  const classifiedWhatsapp = classifySingleField(whatsappField, mockPersona);
  assert.equal(classifiedWhatsapp.fieldType, 'terms', 'WhatsApp checkbox should be classified as terms/consent');
  assert.equal(classifiedWhatsapp.mappedValue, 'true', 'WhatsApp checkbox mappedValue must be "true"');
  console.log('   ✓ WhatsApp Checkbox classified as terms with mappedValue: "true"');

  // Test 2.5: Resume Card / Picker Exclusion (Must not be classified as a generic terms checkbox)
  console.log('2.5. Resume Card & Picker Exclusion Verification...');
  const resumeDeselectField: ScannedField = {
    id: 'resume-card-1',
    selector: '[data-za-field-id="za-field-r1"]',
    tagName: 'button',
    inputType: 'checkbox',
    label: 'Deselect resume KSPChary_Resume_1Page.pdf',
    placeholder: '',
    name: '',
    required: false,
    currentValue: 'true',
    isCustomComponent: true,
  };
  const classifiedResumeDeselect = classifySingleField(resumeDeselectField, mockPersona);
  assert.equal(classifiedResumeDeselect.fieldType, 'resume_upload', 'Deselect resume card must be classified as resume_upload, not terms');

  const resumeSelectField: ScannedField = {
    id: 'resume-card-2',
    selector: '[data-za-field-id="za-field-r2"]',
    tagName: 'button',
    inputType: 'checkbox',
    label: 'Select resume KSPChary_Resume_1Page (1).pdf',
    placeholder: '',
    name: '',
    required: false,
    currentValue: 'false',
    isCustomComponent: true,
  };
  const classifiedResumeSelect = classifySingleField(resumeSelectField, mockPersona);
  assert.equal(classifiedResumeSelect.fieldType, 'resume_upload', 'Select resume card must be classified as resume_upload, not terms');
  console.log('   ✓ Resume cards correctly classified as "resume_upload" (excluded from generic terms checkboxes)');

  // Test 3: Phone Number Input Normalization for 10-Digit Mobile Fields
  console.log('3. Phone Number Normalization to 10-Digit Mobile Number...');
  const normalizedIndianPhone = normalizePhoneForField(mockPersona.phone, 10);
  assert.equal(normalizedIndianPhone, '8374370572', 'Must normalize "+91 83743 70572" to 10-digit "8374370572"');

  const normalizedUSPhone = normalizePhoneForField('+1 555 123 4567', 10);
  assert.equal(normalizedUSPhone, '5551234567', 'Must normalize US phone with +1 prefix to 10 digits');

  const direct10Digit = normalizePhoneForField('9876543210', 10);
  assert.equal(direct10Digit, '9876543210', 'Direct 10-digit number must remain intact');
  console.log('   ✓ Phone number normalized cleanly to 10 digits:', normalizedIndianPhone);

  // Test 4: Synthetic Event Script contains React _valueTracker sync for inputs
  console.log('4. React _valueTracker Sync in Synthetic Script...');
  const telScript = buildSyntheticEventScript('#phone', '8374370572', 'tel');
  assert.ok(telScript.includes('_valueTracker'), 'Synthetic script must synchronize React _valueTracker');
  assert.ok(telScript.includes('tracker.setValue(previousValue)'), 'Synthetic script must set previousValue on tracker');
  console.log('   ✓ React _valueTracker synchronization verified in input dispatcher');

  // Test 5: Synthetic Event Script for Custom Checkbox prevents double-click toggle
  console.log('5. Custom Checkbox Resilient Click & State Detection in Synthetic Script...');
  const checkboxScript = buildSyntheticEventScript('[data-za-field-id="za-field-1"]', 'true', 'checkbox');
  assert.ok(checkboxScript.includes('isCustomChecked'), 'Script must have custom checked state detector');
  assert.ok(checkboxScript.includes('pointerdown'), 'Script must dispatch pointerdown for custom components');
  assert.ok(checkboxScript.includes('pointerup'), 'Script must dispatch pointerup for custom components');
  assert.ok(checkboxScript.includes('isCurrentChecked !== shouldBeChecked'), 'Script must guard against double-clicking when already in desired state');
  console.log('   ✓ Custom checkbox guarded state and pointer sequence verified');

  // Test 6: Injected Scripts Syntax Validity (Must compile without syntax errors in browser)
  console.log('6. Injected Scripts Syntax Validity Check (new Function)...');
  const { DOM_SCANNER_SCRIPT } = await import('../src/agent/domScanner/injectedScanner');
  const { FORM_AUDITOR_SCRIPT } = await import('../src/agent/formFiller/formAuditor');

  assert.doesNotThrow(() => {
    new Function(DOM_SCANNER_SCRIPT);
  }, 'DOM_SCANNER_SCRIPT must compile without syntax errors');
  console.log('   ✓ DOM_SCANNER_SCRIPT compiles with zero syntax errors');

  assert.doesNotThrow(() => {
    new Function(FORM_AUDITOR_SCRIPT);
  }, 'FORM_AUDITOR_SCRIPT must compile without syntax errors');
  console.log('   ✓ FORM_AUDITOR_SCRIPT compiles with zero syntax errors');

  assert.doesNotThrow(() => {
    new Function(checkboxScript);
  }, 'buildSyntheticEventScript (checkbox) must compile without syntax errors');
  console.log('   ✓ buildSyntheticEventScript compiles with zero syntax errors');

  const { getVisualCursorScript } = await import('../src/agent/stealth/agentCursor');
  assert.doesNotThrow(() => {
    new Function(getVisualCursorScript());
  }, 'getVisualCursorScript must compile without syntax errors');
  console.log('   ✓ getVisualCursorScript compiles with zero syntax errors');

  console.log('\n🎉 ALL 6/6 CUSTOM CHECKBOX, MOBILE NUMBER & INJECTED SCRIPT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
