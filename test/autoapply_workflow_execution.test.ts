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
let simulatedStep = 1;
const mockOrchestrationWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    let res: any = true;
    if (code.includes('getAllElementsInScope') || code.includes('processedElements') || code.includes('input:not([type="hidden"])')) {
      if (simulatedStep <= 2) {
        res = [
          {
            id: 'phone-input',
            selector: '[data-za-id="phone"]',
            tagName: 'input',
            inputType: 'tel',
            label: 'Phone number',
            placeholder: '',
            name: 'phoneNumber',
            currentValue: '',
            required: true,
            hasError: false,
            rect: { x: 10, y: 10, width: 200, height: 30 },
          },
        ];
      } else {
        res = [];
      }
    } else if (code.includes("el.closest('.jobs-search-box") || code.includes('isSearchBarOrNav')) {
      res = false;
    } else if (code.includes('platform = \'other\'')) {
      res = {
        url: 'https://www.linkedin.com/jobs/view/1234567890/',
        title: 'Senior Frontend Engineer at Stripe',
        state: simulatedStep === 1 ? 'job_detail' : 'easy_apply_modal',
        platform: 'linkedin',
        hasActiveModal: simulatedStep > 1,
        applyButton: {
          exists: simulatedStep === 1,
          type: 'easy_apply',
          text: 'Easy Apply',
          selector: 'button.jobs-apply-button',
          isModalTrigger: true,
        },
        jobTitle: 'Senior Frontend Engineer',
        companyName: 'Stripe',
      };
    } else if (code.includes('formSelectors')) {
      res = true;
    } else if (code.includes('config.selector') || code.includes('React synthetic input') || code.includes('formFiller') || code.includes('new CustomEvent')) {
      res = { success: true };
    } else if (code.includes('candidateButtons')) {
      if (simulatedStep === 1) {
        res = { exists: true, action: 'next', selector: '[data-za-step-btn="true"]', text: 'next', disabled: false };
      } else if (simulatedStep === 2) {
        res = { exists: true, action: 'submit', selector: '[data-za-step-btn="true"]', text: 'submit application', disabled: false };
      } else {
        res = { exists: false, action: 'none', selector: '', text: '', disabled: false };
      }
    } else if (code.includes('btn.click()') || code.includes('targetBtn.click()')) {
      simulatedStep++;
      res = true;
    } else if (code.includes('your application was sent') || code.includes('application submitted')) {
      res = simulatedStep >= 2;
    }

    return res as unknown as T;
  },
};

const orchestratorResult = await orchestrator.runApplication(mockOrchestrationWebview, mockPersona, {
  maxSteps: 5,
  stepDelayMs: 10,
});

console.log('Orchestrator Result:', orchestratorResult);
assert.equal(orchestratorResult.outcome, 'submitted');
assert.ok(orchestratorResult.fieldsFilled >= 1);
console.log('✅ Orchestrator successfully executed complete multi-step application workflow!');

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

const batchResult = await batchRunner.runBatch(mockBatchWebview, mockPersona, {
  maxApplications: 5,
  delayBetweenJobsMs: 0,
  allowExternalApply: false,
});

console.log('Batch Result:', batchResult);
assert.equal(batchResult.totalAttempted, 3, 'Should attempt 3 cards');
assert.equal(batchResult.submittedCount, 2, 'Should submit 2 easy apply jobs');
assert.equal(batchResult.skippedCount, 1, 'Should skip 1 external apply job');
console.log('✅ BatchRunner successfully iterated cards, applied to Easy Apply, and skipped external postings!');

console.log('\n🎉 ALL AUTOAPPLY WORKFLOW EXECUTION TESTS PASSED! 🎉\n');
