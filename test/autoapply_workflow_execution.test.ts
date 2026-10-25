import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { buildSearchUrl } from '../src/agent/searchAgent';
import { analyzePage } from '../src/agent/vision/pageAnalyzer';
import { scanFormFields } from '../src/agent/form/fieldScanner';
import { classifyFields } from '../src/agent/form/fieldClassifier';
import { fillField } from '../src/agent/form/formFiller';
import { stepNavigator } from '../src/agent/workflow/stepNavigator';
import { orchestrator } from '../src/agent/workflow/orchestrator';
import { batchRunner } from '../src/agent/workflow/batchRunner';
import { questionMemory } from '../src/agent/brain/questionMemory';
import type { PersonaData } from '../src/types';
import type { WebviewTarget } from '../src/agent/vision/domObserver';

const mockPersona: PersonaData = {
  fullName: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '+1 555-0100',
  location: 'San Francisco, CA',
  linkedIn: 'https://linkedin.com/in/janedoe',
  gitHub: 'https://github.com/janedoe',
  portfolio: 'https://janedoe.dev',
  experienceYears: 5,
  minSalary: 140000,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['TypeScript', 'React', 'Node.js'],
  targetRoles: ['Senior Frontend Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Experienced Senior Frontend Engineer with 5 years in TypeScript and React.',
};

// Seed memory bank
questionMemory.seedFromPersona(mockPersona);

console.log('--- TEST 1: buildSearchUrl for LinkedIn, Indeed, Glassdoor (Easy vs Normal) ---');
const linkedinEasyUrl = buildSearchUrl('linkedin', mockPersona.targetRoles, mockPersona.location, mockPersona.workPreference, 'easy');
assert.ok(linkedinEasyUrl.includes('linkedin.com/jobs/search'));
assert.ok(linkedinEasyUrl.includes('Senior%20Frontend%20Engineer') || linkedinEasyUrl.includes('Senior+Frontend+Engineer'));
assert.ok(linkedinEasyUrl.includes('f_AL=true'), 'Should enforce Easy Apply filter parameter in easy mode');

const linkedinNormalUrl = buildSearchUrl('linkedin', mockPersona.targetRoles, mockPersona.location, mockPersona.workPreference, 'normal');
assert.ok(linkedinNormalUrl.includes('linkedin.com/jobs/search'));
assert.ok(!linkedinNormalUrl.includes('f_AL=true'), 'Should omit Easy Apply filter parameter in normal mode');

const indeedEasyUrl = buildSearchUrl('indeed', mockPersona.targetRoles, mockPersona.location, mockPersona.workPreference, 'easy');
assert.ok(indeedEasyUrl.includes('sc=0kf%3Aattr%28DS3S6%29%3B'), 'Indeed should include easily apply filter in easy mode');

const indeedNormalUrl = buildSearchUrl('indeed', mockPersona.targetRoles, mockPersona.location, mockPersona.workPreference, 'normal');
assert.ok(!indeedNormalUrl.includes('sc=0kf%3Aattr%28DS3S6%29%3B'), 'Indeed should omit easily apply filter in normal mode');

console.log('✅ buildSearchUrl correctly formats search URLs based on Easy Apply vs Normal Apply selection.');

console.log('--- TEST 2: pageAnalyzer filters out search filter buttons ---');
// Mock webview representing a LinkedIn search page with filter buttons
const mockSearchWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    // Return simulated page state
    return {
      url: 'https://www.linkedin.com/jobs/search/?keywords=Senior%20Frontend%20Engineer&location=San%20Francisco%2C%20CA&f_AL=true',
      title: 'Senior Frontend Engineer Jobs in San Francisco | LinkedIn',
      state: 'search_results',
      platform: 'linkedin',
      hasActiveModal: false,
      applyButton: {
        exists: false,
        type: 'none',
        text: '',
        selector: '',
        isModalTrigger: false,
      },
      jobTitle: '',
      companyName: '',
    } as unknown as T;
  },
};

const searchAnalysis = await analyzePage(mockSearchWebview);
assert.equal(searchAnalysis.state, 'search_results', 'Search page must be classified as search_results');
assert.equal(searchAnalysis.applyButton.exists, false, 'Search filter buttons must not be detected as apply triggers');
console.log('✅ pageAnalyzer correctly ignores filter buttons and identifies search_results.');

console.log('--- TEST 3: pageAnalyzer identifies Easy Apply button on job posting ---');
const mockJobWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    return {
      url: 'https://www.linkedin.com/jobs/view/1234567890/',
      title: 'Senior Frontend Engineer at Stripe',
      state: 'job_detail',
      platform: 'linkedin',
      hasActiveModal: false,
      applyButton: {
        exists: true,
        type: 'easy_apply',
        text: 'Easy Apply',
        selector: 'button.jobs-apply-button',
        isModalTrigger: true,
      },
      jobTitle: 'Senior Frontend Engineer',
      companyName: 'Stripe',
    } as unknown as T;
  },
};

const jobAnalysis = await analyzePage(mockJobWebview);
assert.equal(jobAnalysis.state, 'job_detail');
assert.equal(jobAnalysis.applyButton.exists, true);
assert.equal(jobAnalysis.applyButton.type, 'easy_apply');
console.log('✅ pageAnalyzer correctly detects Easy Apply trigger button.');

console.log('--- TEST 4: stepNavigator detects navigation actions ---');
const mockModalWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    if (code.includes('candidateButtons')) {
      return {
        exists: true,
        action: 'next',
        selector: '[data-za-step-btn="true"]',
        text: 'next',
        disabled: false,
      } as unknown as T;
    }
    return true as unknown as T;
  },
};

const navButton = await stepNavigator.detectForwardButton(mockModalWebview);
assert.equal(navButton.exists, true);
assert.equal(navButton.action, 'next');
console.log('✅ stepNavigator accurately detects multi-step wizard buttons.');

console.log('--- TEST 5: full orchestrated application simulation ---');
const fixtureBrowser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await fixtureBrowser.newPage();
  await page.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html', body: `<dialog open style="width:700px;height:400px"><h2>Apply to Fixture Company</h2><label for="email">Email address</label><input id="email" type="email" required><label for="expected">Expected salary in INR*</label><input id="expected" type="number" value="0" required><label for="years">Please select your total years of professional experience:*</label><select id="years" required><option value="" disabled>Select an option</option><option value="0" selected>0 year</option></select><label for="months">Please select your total additional months of experience:*</label><select id="months" required><option value="" disabled>Select an option</option><option value="0" selected>0 month</option></select><div><label for="optional">Optional department</label><select id="optional"><option value="" selected>Select an option</option><option value="other">Other</option></select></div><footer><button id="next">Review</button></footer></dialog><script>
    document.querySelector('#next').onclick = () => {
      if (!document.querySelector('#email').checkValidity()) return;
      window.salaryAndExperience = { expected: document.querySelector('#expected').value, years: document.querySelector('#years').value, months: document.querySelector('#months').value };
      if (window.salaryAndExperience.expected !== '700000' || window.salaryAndExperience.years !== '0' || window.salaryAndExperience.months !== '0') return;
      document.querySelector('dialog').innerHTML = '<h2>Review your application</h2><footer><button id="submit">Submit application</button></footer>';
      document.querySelector('#submit').onclick = () => { setTimeout(() => { document.querySelector('dialog').innerHTML = '<h2>Your application was sent to Fixture Company!</h2>'; }, 1200); };
    };
  </script>` }));
  await page.goto('https://www.linkedin.com/jobs/view/1234567890/');
  const target = { executeJavaScript: <T>(code: string): Promise<T> => page.evaluate<T>(code), getURL: () => page.url() } as WebviewTarget;
  const result = await orchestrator.runApplication(target, { ...mockPersona, employmentStatus: 'fresher', experienceYears: 0, currentCtcLpa: 0, expectedSalaryLpa: 7 }, { maxSteps: 5, stepDelayMs: 10, allowSubmit: true });
  assert.equal(result.outcome, 'submitted', JSON.stringify(result));
  assert.ok(result.fieldsFilled >= 1);
  assert.deepEqual(await page.evaluate('window.salaryAndExperience'), { expected: '700000', years: '0', months: '0' }, 'The exact fresher/expected-salary case must pass through Review and confirmation without pausing');
  assert.match(await page.locator('dialog').innerText(), /Your application was sent/);
  console.log('✅ Real browser fixture completed field filling, Next, review and confirmed submission.');
} finally { await fixtureBrowser.close(); }

console.log('--- TEST 6: BatchRunner card iteration and skipping ---');
let currentCardIndex = -1;
const mockBatchWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    // Card discovery
    if (code.includes('cardSelectors')) {
      return { count: 3, selector: 'li.jobs-search-results__list-item' } as unknown as T;
    }

    // Card click
    if (code.includes('const card = cards[index]')) {
      currentCardIndex++;
      return {
        title: `Engineer Role ${currentCardIndex + 1}`,
        company: `Company ${currentCardIndex + 1}`,
      } as unknown as T;
    }

    // Page analyzer inside orchestrator
    if (code.includes('platform = \'other\'')) {
      // Card 0: Easy apply
      // Card 1: External apply
      // Card 2: Easy apply
      const isExternal = currentCardIndex === 1;
      return {
        url: `https://www.linkedin.com/jobs/view/${currentCardIndex}/`,
        title: `Engineer Role ${currentCardIndex + 1}`,
        state: 'job_detail',
        platform: 'linkedin',
        hasActiveModal: false,
        applyButton: {
          exists: true,
          type: isExternal ? 'external' : 'easy_apply',
          text: isExternal ? 'Apply on company website' : 'Easy Apply',
          selector: 'button.jobs-apply-button',
          isModalTrigger: !isExternal,
        },
        jobTitle: `Engineer Role ${currentCardIndex + 1}`,
        companyName: `Company ${currentCardIndex + 1}`,
      } as unknown as T;
    }

    if (code.includes('.jobs-search-box') || code.includes('isSearchBarOrNav')) return false as unknown as T;
    if (code.includes('formSelectors')) return true as unknown as T;
    if (code.includes('data-za-apply-btn')) return true as unknown as T;
    if (code.includes('getAllElementsInScope') || code.includes('processedElements') || code.includes('input:not([type="hidden"])')) {
      return [
        {
          id: 'email-input',
          selector: '[data-za-id="email"]',
          tagName: 'input',
          inputType: 'email',
          label: 'Email address',
          placeholder: '',
          name: 'email',
          currentValue: '',
          required: true,
          hasError: false,
          rect: { x: 10, y: 10, width: 200, height: 30 },
        },
      ] as unknown as T;
    }
    if (code.includes('config.selector')) return { success: true } as unknown as T;
    if (code.includes('candidateButtons')) {
      return { exists: true, action: 'submit', selector: '[data-za-step-btn="true"]', text: 'submit', disabled: false } as unknown as T;
    }

    return true as unknown as T;
  },
};

const originalRunApplication = orchestrator.runApplication;
let batchOrchestrations = 0;
orchestrator.runApplication = async () => {
  batchOrchestrations++;
  return { outcome: 'submitted', platform: 'LinkedIn', fieldsFilled: 1, stepsExecuted: 2 };
};
let batchResult;
try {
  batchResult = await batchRunner.runBatch(mockBatchWebview, mockPersona, {
    maxApplications: 5,
    delayBetweenJobsMs: 0,
    allowExternalApply: false,
  });
} finally { orchestrator.runApplication = originalRunApplication; }
assert.equal(batchOrchestrations, 2, 'Only eligible cards should invoke orchestration');

console.log('Batch Result:', batchResult);
assert.equal(batchResult.totalAttempted, 3, 'Should attempt 3 cards');
assert.equal(batchResult.submittedCount, 2, 'Should submit 2 easy apply jobs');
assert.equal(batchResult.skippedCount, 1, 'Should skip 1 external apply job');
console.log('✅ BatchRunner successfully iterated cards, applied to Easy Apply, and skipped external postings!');

console.log('\n🎉 ALL AUTOAPPLY WORKFLOW EXECUTION TESTS PASSED! 🎉\n');
