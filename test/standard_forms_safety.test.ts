import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runStandardFormWorkflow } from '../src/agent/All supported forms/workflow';
import {
  classifyStandardPageError,
  createStandardJobExtractorScript,
  createStandardStepScript,
  isStandardApplicationFormCandidate,
  STANDARD_BROWSER_CONTEXT_SCRIPT,
  STANDARD_FORM_ENTRY_SCRIPT,
  STANDARD_FORM_STATE_SCRIPT,
  STANDARD_FORM_VALIDATION_SCRIPT,
  STANDARD_SUBMISSION_CONFIRMATION_SCRIPT,
} from '../src/agent/All supported forms/scripts';
import {
  getStandardSiteAdapter,
  isAdapterUrl,
  isSafeHttpsUrl,
} from '../src/agent/All supported forms/siteAdapters';

function workflowOptions(options: { allowSubmit: boolean; confirmAfterSubmit?: boolean; securityMessage?: string }) {
  let submitClicked = false;
  return {
    maxSteps: 2,
    allowSubmit: options.allowSubmit,
    isActive: () => true,
    wait: async () => true,
    fillCurrentStep: async () => ({
      success: !options.securityMessage,
      detectedCount: 2,
      filledCount: options.securityMessage ? 0 : 2,
      message: options.securityMessage || 'filled',
    }),
    advanceStep: async (allowSubmit: boolean) => {
      if (!allowSubmit) return { success: false, action: 'submit' as const, requiresConfirmation: true };
      submitClicked = true;
      return { success: true, action: 'submit' as const };
    },
    executeScript: async <T>(script: string): Promise<T> => {
      if (script === STANDARD_FORM_VALIDATION_SCRIPT) {
        return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
      }
      if (script === STANDARD_SUBMISSION_CONFIRMATION_SCRIPT) {
        return { confirmed: Boolean(options.confirmAfterSubmit && submitClicked), evidence: 'application submitted' } as T;
      }
      throw new Error('Unexpected script');
    },
    onStatus: () => undefined,
  };
}

const withoutConsent = await runStandardFormWorkflow(workflowOptions({ allowSubmit: false }));
assert.equal(withoutConsent.outcome, 'review_ready');

const unconfirmed = await runStandardFormWorkflow(workflowOptions({ allowSubmit: true }));
assert.equal(unconfirmed.outcome, 'needs_human');

const confirmed = await runStandardFormWorkflow(workflowOptions({ allowSubmit: true, confirmAfterSubmit: true }));
assert.equal(confirmed.outcome, 'submitted');

const securityPause = await runStandardFormWorkflow(workflowOptions({
  allowSubmit: true,
  securityMessage: 'Security checkpoint: CAPTCHA challenge required',
}));
assert.equal(securityPause.outcome, 'needs_human');

let validationFailureAdvanced = false;
const validationFailureBase = workflowOptions({ allowSubmit: true });
const validationFailure = await runStandardFormWorkflow({
  ...validationFailureBase,
  advanceStep: async () => {
    validationFailureAdvanced = true;
    return { success: true, action: 'submit' as const };
  },
  executeScript: async <T>(script: string): Promise<T> => {
    if (script === STANDARD_FORM_VALIDATION_SCRIPT) throw new Error('Execution context destroyed');
    if (script === STANDARD_SUBMISSION_CONFIRMATION_SCRIPT) return { confirmed: false } as T;
    throw new Error('Unexpected script');
  },
});
assert.equal(validationFailure.outcome, 'needs_human');
assert.equal(validationFailureAdvanced, false);

let transientScanAttempts = 0;
const transientScanBase = workflowOptions({ allowSubmit: true, confirmAfterSubmit: true });
const transientScanRecovery = await runStandardFormWorkflow({
  ...transientScanBase,
  fillCurrentStep: async () => {
    transientScanAttempts++;
    return transientScanAttempts < 3
      ? { success: false, detectedCount: 0, filledCount: 0, message: 'DOM scan failed' }
      : { success: true, detectedCount: 2, filledCount: 2, message: 'filled' };
  },
});
assert.equal(transientScanRecovery.outcome, 'submitted');
assert.equal(transientScanAttempts, 3);

let delayedActionAttempts = 0;
let delayedSubmitClicked = false;
const delayedActionRecovery = await runStandardFormWorkflow({
  ...workflowOptions({ allowSubmit: true }),
  advanceStep: async () => {
    delayedActionAttempts++;
    if (delayedActionAttempts === 1) return { success: false, action: 'none' as const };
    delayedSubmitClicked = true;
    return { success: true, action: 'submit' as const };
  },
  executeScript: async <T>(script: string): Promise<T> => {
    if (script === STANDARD_FORM_VALIDATION_SCRIPT) {
      return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
    }
    if (script === STANDARD_SUBMISSION_CONFIRMATION_SCRIPT) {
      return { confirmed: delayedSubmitClicked, evidence: 'application submitted' } as T;
    }
    throw new Error('Unexpected script');
  },
});
assert.equal(delayedActionRecovery.outcome, 'submitted');
assert.equal(delayedActionAttempts, 2);

let ambiguousActionAttempts = 0;
const ambiguousAction = await runStandardFormWorkflow({
  ...workflowOptions({ allowSubmit: true }),
  advanceStep: async () => {
    ambiguousActionAttempts++;
    throw new Error('Execution context destroyed during click');
  },
});
assert.equal(ambiguousAction.outcome, 'needs_human');
assert.equal(ambiguousActionAttempts, 1);

const linkedin = getStandardSiteAdapter('linkedin');
assert.ok(linkedin);
assert.equal(isAdapterUrl('https://www.linkedin.com/jobs/search/', linkedin), true);
assert.equal(isAdapterUrl('https://fake-linkedin.com/jobs/search/', linkedin), false);
assert.equal(isSafeHttpsUrl('https://jobs.example.com/apply/123'), true);
assert.equal(isSafeHttpsUrl('http://jobs.example.com/apply/123'), false);
assert.equal(isSafeHttpsUrl('https://user:pass@jobs.example.com/apply/123'), false);
assert.equal(classifyStandardPageError('', 'Verify you are a human'), 'security_checkpoint');
assert.equal(classifyStandardPageError('', 'Please sign in to apply'), 'login_required');
assert.equal(classifyStandardPageError('Sign Up | LinkedIn', 'Join LinkedIn', 'https://www.linkedin.com/authwall?sessionRedirect=/jobs/view/1'), 'login_required');
assert.equal(classifyStandardPageError('', 'Too many requests'), 'rate_limited');
assert.equal(classifyStandardPageError('', 'This job is no longer available'), 'job_unavailable');
assert.equal(classifyStandardPageError('', 'Service temporarily unavailable'), 'transient_error');

// A job-detail page may mention application terms and expose global controls, but that is not an application form.
assert.equal(isStandardApplicationFormCandidate(2, 0, false, true, false), false);
assert.equal(isStandardApplicationFormCandidate(1, 1, false, true, false), false);
assert.equal(isStandardApplicationFormCandidate(3, 2, false, true, false), true);
assert.equal(isStandardApplicationFormCandidate(1, 1, true, true, false), true);
assert.equal(isStandardApplicationFormCandidate(1, 1, false, true, true), true);

class FakeElement {
  public readonly offsetParent = {};
  public readonly id = '';
  public readonly className = '';

  public constructor(
    public readonly innerText = '',
    private readonly attributes: Record<string, string> = {},
  ) {}

  public getAttribute(name: string): string {
    return this.attributes[name] || '';
  }

  public closest(): null {
    return null;
  }

  public querySelector(): null {
    return null;
  }

  public querySelectorAll(): FakeElement[] {
    return [];
  }
}

class FakeAnchor extends FakeElement {
  public constructor(text: string, public readonly href: string) {
    super(text);
  }
}

class FakeClickableAnchor extends FakeAnchor {
  public clicked = false;
  public scrollIntoView(): void {}
  public click(): void {
    this.clicked = true;
  }
}

const linkedInMain = new FakeElement('Front-End Development Intern. Experience and resume details.');
const linkedInApply = new FakeAnchor('Apply ↗', 'https://jobs.example.com/apply/123');
const globalFields = [
  new FakeElement('', { type: 'text', name: 'keywords' }),
  new FakeElement('', { type: 'email', name: 'job-alert-email' }),
];
const fakeDocument = {
  body: { innerText: 'Apply for this job. Candidate experience, resume, phone, and email.' },
  title: 'Front-End Development Intern | LinkedIn',
  querySelectorAll: (selector: string) => {
    if (selector.startsWith('form, main')) return [linkedInMain];
    if (selector.startsWith('a[href]')) return [linkedInApply];
    if (selector.startsWith('input, textarea')) return globalFields;
    return [];
  },
};
const runEntryScript = new Function(
  'document',
  'window',
  'HTMLElement',
  'HTMLAnchorElement',
  'getComputedStyle',
  'CSS',
  `return (${STANDARD_FORM_ENTRY_SCRIPT.trim().replace(/;$/, '')});`,
);
const linkedInEntry = runEntryScript(
  fakeDocument,
  { location: { href: 'https://www.linkedin.com/jobs/view/4459014059/' } },
  FakeElement,
  FakeAnchor,
  () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
  { escape: (value: string) => value },
);
assert.deepEqual(linkedInEntry, {
  state: 'navigate',
  href: 'https://jobs.example.com/apply/123',
  text: 'Apply',
});

const linkedInSafetyApply = new FakeClickableAnchor('Apply ↗', 'https://www.linkedin.com/safety/go/?_l=en_US');
const linkedInSafetyEntry = runEntryScript(
  { ...fakeDocument, querySelectorAll: (selector: string) => selector.startsWith('a[href]') ? [linkedInSafetyApply] : fakeDocument.querySelectorAll(selector) },
  { location: { href: 'https://www.linkedin.com/jobs/view/459008142/' } },
  FakeElement,
  FakeAnchor,
  () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
  { escape: (value: string) => value },
);
assert.equal(linkedInSafetyEntry.state, 'clicked');
assert.equal(linkedInSafetyApply.clicked, true);

for (const script of [
  createStandardJobExtractorScript(linkedin),
  STANDARD_BROWSER_CONTEXT_SCRIPT,
  STANDARD_FORM_ENTRY_SCRIPT,
  STANDARD_FORM_STATE_SCRIPT,
  STANDARD_FORM_VALIDATION_SCRIPT,
  createStandardStepScript(false),
  createStandardStepScript(true),
  STANDARD_SUBMISSION_CONFIRMATION_SCRIPT,
]) {
  assert.doesNotThrow(() => new Function(script));
}

const standardEngineSource = readFileSync(
  new URL('../src/agent/All supported forms/standardFormsEngine.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(standardEngineSource, /VisionAgent|capturePage|inspectScreen|screenshot|qwen2\.5vl/i);
assert.match(standardEngineSource, /DOM_SCANNER_SCRIPT/);
assert.match(standardEngineSource, /openApplicationTab\?: OpenApplicationTab/);
assert.match(standardEngineSource, /entry\.webview\.executeJavaScript/);
assert.match(STANDARD_BROWSER_CONTEXT_SCRIPT, /aria-label/);
assert.match(STANDARD_FORM_ENTRY_SCRIPT, /pageChromeSelector/);
assert.match(STANDARD_FORM_ENTRY_SCRIPT, /↗/);
assert.match(createStandardStepScript(true), /review your information/);

console.log('Standard forms safety tests passed (46/46).');
