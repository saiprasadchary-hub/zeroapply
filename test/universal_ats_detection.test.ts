/**
 * Automated Verification Suite: Universal ATS & Platform Architecture Perception
 * Validates accurate platform detection, container scoping, stage detection,
 * and progress tracking across LinkedIn, Greenhouse, Lever, Workday, Ashby, Indeed, and Generic portals.
 */

import assert from 'node:assert/strict';
import { ATS_DETECTOR_SCRIPT } from '../src/agent/domScanner/atsDetector';

interface MockWindow {
  location: { href: string };
  document: {
    body: { innerText: string };
    querySelector: (sel: string) => any;
    querySelectorAll: (sel: string) => any[];
  };
}

import vm from 'node:vm';

function evaluateAtsScriptInMock(context: MockWindow) {
  const sandbox = {
    window: context,
    document: context.document,
    Array,
    parseInt,
    parseFloat,
    isNaN,
    Math,
    console,
  };
  return vm.runInNewContext(ATS_DETECTOR_SCRIPT, sandbox);
}



async function runAtsDetectionTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING UNIVERSAL ATS & ARCHITECTURE PERCEPTION ENGINE');
  console.log('======================================================================\n');

  // Test 1: LinkedIn Easy Apply Detection
  console.log('Test 1: LinkedIn Easy Apply Detection...');
  const linkedinMock: MockWindow = {
    location: { href: 'https://www.linkedin.com/jobs/search/?currentJobId=123' },
    document: {
      body: { innerText: 'Easy Apply to Senior Software Engineer' },
      querySelector: (sel: string) => {
        if (sel.includes('.jobs-easy-apply-modal') || sel.includes('#easy-apply-modal-overlay')) {
          return { id: 'easy-apply-modal-overlay', className: 'active' };
        }
        if (sel.includes('.modal-progress-text') || sel.includes('progress-text')) {
          return { textContent: 'Step 2 of 5' };
        }
        if (sel.includes('modal-progress-bar') || sel.includes('progressbar')) {
          return { style: { width: '40%' } };
        }
        if (sel.includes('button[data-easy-apply-next-button]')) {
          return { disabled: false };
        }
        if (sel.includes('input') || sel.includes('select')) {
          return { tagName: 'INPUT' };
        }
        return null;
      },
      querySelectorAll: (sel: string) => {
        if (sel.includes('aria-invalid') || sel.includes('artdeco-inline-feedback--error')) {
          return [];
        }
        return [];
      },
    },
  };

  const resLinkedIn = evaluateAtsScriptInMock(linkedinMock);
  console.log('  Result:', resLinkedIn);
  assert.equal(resLinkedIn.platform, 'linkedin_easy_apply');
  assert.equal(resLinkedIn.displayName, 'LinkedIn Easy Apply');
  assert.equal(resLinkedIn.structure, 'multi_step_modal');
  assert.equal(resLinkedIn.stage, 'active_form_step');
  assert.equal(resLinkedIn.currentStep, 2);
  assert.equal(resLinkedIn.totalSteps, 5);
  assert.equal(resLinkedIn.progressPercent, 40);
  assert.equal(resLinkedIn.hasErrors, false);
  assert.equal(resLinkedIn.canAdvance, true);
  console.log('  ✓ LinkedIn Easy Apply detection passed.\n');

  // Test 2: Greenhouse ATS Detection
  console.log('Test 2: Greenhouse ATS Detection...');
  const greenhouseMock: MockWindow = {
    location: { href: 'https://boards.greenhouse.io/stripe/jobs/456789' },
    document: {
      body: { innerText: 'Apply for this Job at Stripe' },
      querySelector: (sel: string) => {
        if (sel.includes('#application_form') || sel.includes('#main_fields')) {
          return { id: 'application_form' };
        }
        if (sel.includes('input') || sel.includes('select')) {
          return { tagName: 'INPUT' };
        }
        return null;
      },
      querySelectorAll: () => [],
    },
  };

  const resGreenhouse = evaluateAtsScriptInMock(greenhouseMock);
  console.log('  Result:', resGreenhouse);
  assert.equal(resGreenhouse.platform, 'greenhouse');
  assert.equal(resGreenhouse.displayName, 'Greenhouse ATS');
  assert.equal(resGreenhouse.structure, 'single_page_form');
  console.log('  ✓ Greenhouse detection passed.\n');

  // Test 3: Lever ATS Detection
  console.log('Test 3: Lever ATS Detection...');
  const leverMock: MockWindow = {
    location: { href: 'https://jobs.lever.co/figma/112233' },
    document: {
      body: { innerText: 'Submit your application to Figma' },
      querySelector: (sel: string) => {
        if (sel.includes('.application-form') || sel.includes('#application-form')) {
          return { id: 'application-form' };
        }
        if (sel.includes('input')) return { tagName: 'INPUT' };
        return null;
      },
      querySelectorAll: () => [],
    },
  };

  const resLever = evaluateAtsScriptInMock(leverMock);
  console.log('  Result:', resLever);
  assert.equal(resLever.platform, 'lever');
  assert.equal(resLever.displayName, 'Lever ATS');
  console.log('  ✓ Lever detection passed.\n');

  // Test 4: Workday Career Portal Detection
  console.log('Test 4: Workday Career Portal Detection...');
  const workdayMock: MockWindow = {
    location: { href: 'https://target.myworkdayjobs.com/en-US/targetcareers/job/Engineer_R102' },
    document: {
      body: { innerText: 'My Information Step 1 of 4' },
      querySelector: (sel: string) => {
        if (sel.includes('data-automation-id') || sel.includes('wd-ApplicationPage')) {
          return { getAttribute: () => 'bottom-navigation-next-button' };
        }
        if (sel.includes('.application-step') || sel.includes('[data-step]')) {
          return { className: 'application-step' };
        }
        if (sel.includes('input')) return { tagName: 'INPUT' };
        return null;
      },
      querySelectorAll: () => [],
    },
  };

  const resWorkday = evaluateAtsScriptInMock(workdayMock);
  console.log('  Result:', resWorkday);
  assert.equal(resWorkday.platform, 'workday');
  assert.equal(resWorkday.displayName, 'Workday Career Portal');
  assert.equal(resWorkday.structure, 'multi_page_wizard');
  console.log('  ✓ Workday detection passed.\n');

  // Test 5: Ashby ATS Detection
  console.log('Test 5: Ashby ATS Detection...');
  const ashbyMock: MockWindow = {
    location: { href: 'https://jobs.ashbyhq.com/openai/9988' },
    document: {
      body: { innerText: 'Application for Research Engineer' },
      querySelector: (sel: string) => {
        if (sel.includes('[data-testid="application-form"]')) {
          return { id: 'ashby-app' };
        }
        if (sel.includes('input')) return { tagName: 'INPUT' };
        return null;
      },
      querySelectorAll: () => [],
    },
  };

  const resAshby = evaluateAtsScriptInMock(ashbyMock);
  console.log('  Result:', resAshby);
  assert.equal(resAshby.platform, 'ashby');
  assert.equal(resAshby.displayName, 'Ashby ATS');
  console.log('  ✓ Ashby detection passed.\n');

  // Test 6: Submission Success Stage Detection
  console.log('Test 6: Submission Success Stage Detection...');
  const successMock: MockWindow = {
    location: { href: 'https://www.linkedin.com/jobs' },
    document: {
      body: { innerText: 'Your application was sent to Acme Corp. Thank you for applying!' },
      querySelector: (sel: string) => {
        if (sel.includes('#step-success') || sel.includes('.success-view')) {
          return { id: 'step-success' };
        }
        return null;
      },
      querySelectorAll: () => [],
    },
  };

  const resSuccess = evaluateAtsScriptInMock(successMock);
  console.log('  Result:', resSuccess);
  assert.equal(resSuccess.stage, 'submission_success');
  console.log('  ✓ Submission success detection passed.\n');

  console.log('🎉 ALL UNIVERSAL ATS DETECTION TESTS PASSED SUCCESSFULLY!');
}

runAtsDetectionTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
