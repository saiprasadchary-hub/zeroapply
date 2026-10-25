/**
 * Test Suite: LinkedIn Easy Apply Step Advance & Submission Telemetry Verification
 * 
 * Verifies:
 * 1. DETECT_FORWARD_BUTTON_SCRIPT correctly resolves the visible modal and bubbles up
 *    from inner content divs so footer buttons (Next, Review, Submit) are detected.
 * 2. Closed/hidden modals are ignored in favor of the active visible modal dialog.
 * 3. Primary button priority and aria-label matching ("Continue to next step").
 * 4. File upload / resume attachment emits type: 'status' (NOT 'submit') so processTracker
 *    does not prematurely record submission.
 * 5. processTracker correctly updates session.status to 'failed' on failure and deduplicates steps.
 * 6. advance() returns hasErrors: true when forward button is disabled to trigger self-healing.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DETECT_FORWARD_BUTTON_SCRIPT, WizardStepNavigator } from '../src/agent/navigation/wizardStepNavigator';
import { FORM_AUDITOR_SCRIPT } from '../src/agent/formFiller/formAuditor';
import { processTracker } from '../src/agent/tracker/processTracker';
import { liveTelemetry } from '../src/agent/telemetry/liveTelemetry';

function createMockElement(tag: string, options: {
  id?: string;
  className?: string;
  attributes?: Record<string, string>;
  textContent?: string;
  style?: Record<string, string>;
  disabled?: boolean;
  children?: any[];
  offsetWidth?: number;
  offsetHeight?: number;
} = {}): any {
  const attrs: Record<string, string> = { ...(options.attributes || {}) };
  if (options.id) attrs['id'] = options.id;
  if (options.className) attrs['class'] = options.className;

  const el: any = {
    tagName: tag.toUpperCase(),
    id: options.id || '',
    className: options.className || '',
    textContent: options.textContent || '',
    innerText: options.textContent || '',
    disabled: Boolean(options.disabled),
    style: options.style || {},
    hidden: false,
    offsetWidth: options.offsetWidth ?? 100,
    offsetHeight: options.offsetHeight ?? 40,
    children: options.children || [],
    attributes: attrs,
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
    setAttribute(name: string, val: string) {
      attrs[name] = String(val);
    },
    removeAttribute(name: string) {
      delete attrs[name];
    },
    hasAttribute(name: string) {
      return name in attrs;
    },
    getBoundingClientRect() {
      if (this.style?.display === 'none' || this.hidden) {
        return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0 };
      }
      return {
        width: this.offsetWidth,
        height: this.offsetHeight,
        top: 50,
        left: 50,
        bottom: 50 + this.offsetHeight,
        right: 50 + this.offsetWidth,
        x: 50,
        y: 50,
      };
    },
    matches(sel: string) {
      const cls = (this.className || '').split(/\s+/);
      const selParts = sel.split(',').map(s => s.trim());
      return selParts.some(part => {
        if (part.startsWith('.')) {
          const reqClass = part.slice(1);
          return cls.includes(reqClass);
        }
        if (part.toLowerCase() === tag.toLowerCase()) return true;
        return false;
      });
    },
    closest(sel: string) {
      let cur: any = this;
      while (cur) {
        if (typeof cur.matches === 'function' && cur.matches(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    contains(child: any) {
      if (!child) return false;
      let cur: any = child;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentElement;
      }
      return false;
    },
    querySelectorAll(sel: string) {
      const results: any[] = [];
      function recurse(node: any) {
        for (const child of node.children || []) {
          child.parentElement = node;
          if (matchesSimple(child, sel)) {
            results.push(child);
          }
          recurse(child);
        }
      }
      recurse(this);
      return results;
    },
    querySelector(sel: string) {
      return this.querySelectorAll(sel)[0] || null;
    },
  };

  for (const c of el.children) {
    c.parentElement = el;
  }

  return el;
}

function matchesSimple(el: any, sel: string): boolean {
  const parts = sel.split(',').map(s => s.trim());
  return parts.some(part => {
    if (part.includes('button') && el.tagName === 'BUTTON') return true;
    if (part.startsWith('.') && (el.className || '').includes(part.slice(1))) return true;
    if (part.startsWith('#') && el.id === part.slice(1)) return true;
    if (part.includes('artdeco-button--primary') && (el.className || '').includes('artdeco-button--primary')) return true;
    if (part.includes('aria-label') && el.getAttribute('aria-label')) return true;
    return false;
  });
}

function createMockDocAndWindow(rootElements: any[]) {
  const doc = {
    querySelectorAll(sel: string) {
      const results: any[] = [];
      function recurse(node: any) {
        for (const child of node.children || []) {
          if (matchesSimple(child, sel)) results.push(child);
          recurse(child);
        }
      }
      for (const root of rootElements) {
        if (matchesSimple(root, sel)) results.push(root);
        recurse(root);
      }
      return results;
    },
    querySelector(sel: string) {
      return this.querySelectorAll(sel)[0] || null;
    },
    body: {
      innerText: '',
    },
  };

  const win = {
    getComputedStyle: (el: any) => ({
      display: el.style?.display || 'block',
      visibility: el.style?.visibility || 'visible',
      opacity: el.style?.opacity || '1',
    }),
  };

  return { doc, win };
}

describe('LinkedIn Easy Apply Step Advance & Submission Telemetry', () => {
  it('1. DETECT_FORWARD_BUTTON_SCRIPT detects Next button inside modal footer even when .jobs-easy-apply-modal is on inner content', () => {
    const nextBtn = createMockElement('button', {
      className: 'artdeco-button artdeco-button--2 artdeco-button--primary ember-view',
      attributes: { 'aria-label': 'Continue to next step' },
      textContent: 'Next',
      offsetWidth: 90,
      offsetHeight: 36,
    });

    const footer = createMockElement('footer', {
      className: 'artdeco-modal__actionbar jobs-easy-apply-footer',
      children: [
        createMockElement('button', { textContent: 'Cancel', className: 'artdeco-button--secondary' }),
        nextBtn,
      ],
      offsetWidth: 500,
      offsetHeight: 60,
    });

    const innerContent = createMockElement('div', {
      className: 'artdeco-modal__content jobs-easy-apply-modal',
      children: [
        createMockElement('input', { id: 'email', attributes: { value: 'kspchary077@gmail.com' } }),
      ],
      offsetWidth: 500,
      offsetHeight: 400,
    });

    const modalDialog = createMockElement('div', {
      className: 'artdeco-modal artdeco-modal--layer-default',
      attributes: { role: 'dialog', 'aria-modal': 'true' },
      children: [innerContent, footer],
      offsetWidth: 550,
      offsetHeight: 600,
    });

    const outlet = createMockElement('div', {
      id: 'artdeco-modal-outlet',
      children: [modalDialog],
      offsetWidth: 600,
      offsetHeight: 700,
    });

    const { doc, win } = createMockDocAndWindow([outlet]);
    const fn = new Function('document', 'window', `return (${DETECT_FORWARD_BUTTON_SCRIPT});`);
    const result = fn(doc, win);

    assert.equal(result.exists, true, 'Forward button must exist');
    assert.equal(result.action, 'next', 'Action must be next');
    assert.match(result.text, /next|continue/i, 'Text must match Next or Continue');
  });

  it('2. DETECT_FORWARD_BUTTON_SCRIPT ignores closed/hidden modals and finds active modal', () => {
    const hiddenModal = createMockElement('div', {
      className: 'artdeco-modal',
      attributes: { role: 'dialog', 'aria-hidden': 'true' },
      style: { display: 'none' },
      children: [
        createMockElement('button', { className: 'artdeco-button--primary', textContent: 'Old Submit' }),
      ],
      offsetWidth: 0,
      offsetHeight: 0,
    });

    const reviewBtn = createMockElement('button', {
      className: 'artdeco-button artdeco-button--primary',
      attributes: { 'aria-label': 'Review your application' },
      textContent: 'Review',
      offsetWidth: 100,
      offsetHeight: 36,
    });

    const activeModal = createMockElement('div', {
      className: 'artdeco-modal jobs-easy-apply-modal',
      attributes: { role: 'dialog', 'aria-modal': 'true' },
      children: [
        createMockElement('div', { className: 'artdeco-modal__actionbar', children: [reviewBtn] }),
      ],
      offsetWidth: 500,
      offsetHeight: 500,
    });

    const { doc, win } = createMockDocAndWindow([hiddenModal, activeModal]);
    const fn = new Function('document', 'window', `return (${DETECT_FORWARD_BUTTON_SCRIPT});`);
    const result = fn(doc, win);

    assert.equal(result.exists, true, 'Active forward button should be detected');
    assert.equal(result.action, 'review', 'Action should be review for review step');
  });

  it('3. DETECT_FORWARD_BUTTON_SCRIPT detects Submit application button on final step', () => {
    const submitBtn = createMockElement('button', {
      className: 'artdeco-button artdeco-button--primary',
      attributes: { 'aria-label': 'Submit application' },
      textContent: 'Submit application',
      offsetWidth: 130,
      offsetHeight: 36,
    });

    const activeModal = createMockElement('div', {
      className: 'artdeco-modal jobs-easy-apply-modal',
      attributes: { role: 'dialog' },
      children: [
        createMockElement('footer', { className: 'artdeco-modal__actionbar', children: [submitBtn] }),
      ],
      offsetWidth: 500,
      offsetHeight: 500,
    });

    const { doc, win } = createMockDocAndWindow([activeModal]);
    const fn = new Function('document', 'window', `return (${DETECT_FORWARD_BUTTON_SCRIPT});`);
    const result = fn(doc, win);

    assert.equal(result.exists, true);
    assert.equal(result.action, 'submit');
  });

  it('4. File upload telemetry emission does NOT trigger processTracker.recordSubmissionCheck', () => {
    const session = processTracker.startNewJob('Python Developer', 'Target Company', 'LinkedIn Easy Apply');
    assert.equal(session.status, 'in_progress');

    // Emitting file upload status should NOT set session.status to 'submitted'
    liveTelemetry.emit({
      type: 'status',
      title: '✓ Successfully attached "Resume.pdf" (120 KB)',
      target: 'File Upload / Dropzone',
      status: 'completed',
    });

    const activeSession = processTracker.getActiveSession();
    assert.notEqual(activeSession?.status, 'submitted', 'Session status must NOT be submitted on file upload');
    const submissionSteps = (activeSession?.steps || []).filter(s => s.stage === 'verifying_submission');
    assert.equal(submissionSteps.length, 0, 'No verifying_submission step should be created by file upload');
  });

  it('5. Genuine submission telemetry DOES set session.status to submitted', () => {
    processTracker.startNewJob('Backend Developer', 'Target Corp', 'LinkedIn Easy Apply');

    liveTelemetry.emit({
      type: 'submit',
      title: 'Application successfully submitted!',
      status: 'completed',
    });

    const activeSession = processTracker.getActiveSession();
    assert.equal(activeSession?.status, 'submitted', 'Session status must be submitted after genuine submit');
    const submissionSteps = (activeSession?.steps || []).filter(s => s.stage === 'verifying_submission');
    assert.equal(submissionSteps.length, 1, 'Exactly 1 verifying_submission step should exist');
    assert.equal(submissionSteps[0].status, 'completed');
  });

  it('6. Failed submission check updates session.status to failed and deduplicates', () => {
    processTracker.startNewJob('Software Engineer', 'Tech Inc', 'LinkedIn Easy Apply');

    // Simulate halted advance
    processTracker.recordSubmissionCheck(false, 'Form advance halted.');
    let activeSession = processTracker.getActiveSession();
    assert.equal(activeSession?.status, 'failed', 'Session status must be failed when advance is halted');

    // Immediate second call should deduplicate
    processTracker.recordSubmissionCheck(false, 'Form advance halted.');
    activeSession = processTracker.getActiveSession();
    const subSteps = (activeSession?.steps || []).filter(s => s.stage === 'verifying_submission');
    assert.equal(subSteps.length, 1, 'Submission verification step must be deduplicated within 3s');
  });

  it('7. advance() returns hasErrors: true when forward button is disabled to allow self-healing', async () => {
    const nav = new WizardStepNavigator();
    const mockWebview: any = {
      executeJavaScript: async (script: string) => {
        if (script === DETECT_FORWARD_BUTTON_SCRIPT) {
          return { exists: true, action: 'next', selector: '#btn-next', text: 'Next', disabled: true };
        }
        // Mock validation errors script
        return { hasErrors: true, errorCount: 1, errorMessages: ['Please enter a valid phone number'], invalidFieldSelectors: ['#phone'] };
      },
    };

    const res = await nav.advance(mockWebview);
    assert.equal(res.success, false, 'Disabled button advance should not succeed');
    assert.equal(res.hasErrors, true, 'hasErrors must be true so orchestrator self-healing can run');
    assert.equal(res.errorCount, 1);
    assert.match(res.errorMessages?.[0] || '', /phone/i);
  });

  it('8. advance() succeeds when forward button becomes enabled after short settling delay', async () => {
    const nav = new WizardStepNavigator();
    let pollCount = 0;
    const mockWebview: any = {
      executeJavaScript: async (script: string) => {
        if (script === DETECT_FORWARD_BUTTON_SCRIPT) {
          pollCount++;
          // First poll: disabled (uploading resume)
          // Second poll: enabled (upload finished)
          return { exists: true, action: 'next', selector: '#btn-next', text: 'Next', disabled: pollCount === 1 };
        }
        if (script.includes('clickElement') || script.includes('dispatchEvent')) {
          return true;
        }
        // Validation errors script: no errors
        return { hasErrors: false, errorCount: 0, errorMessages: [], invalidFieldSelectors: [] };
      },
    };

    const res = await nav.advance(mockWebview);
    assert.equal(res.success, true, 'Should succeed once button becomes enabled');
    assert.equal(res.stepChanged, true, 'stepChanged should be true');
    assert.equal(res.hasErrors, false, 'hasErrors should be false');
    assert.ok(pollCount >= 2, 'Should have polled until enabled');
  });

  it('9. FORM_AUDITOR_SCRIPT considers required file satisfied when resume card is selected', () => {
    const resumeCard = createMockElement('button', {
      className: 'jobs-resume-picker__resume-btn jobs-resume-picker__resume-btn--selected',
      attributes: { 'aria-checked': 'true' },
      textContent: 'Sai_Resume.pdf',
    });

    const fileInput = createMockElement('input', {
      attributes: { type: 'file', required: 'true' },
    });

    const modal = createMockElement('div', {
      className: 'jobs-easy-apply-modal',
      children: [fileInput, resumeCard],
    });

    const { doc } = createMockDocAndWindow([modal]);
    const fn = new Function('document', `return (${FORM_AUDITOR_SCRIPT});`);
    const auditRes = fn(doc);

    assert.equal(auditRes.ready, true, 'Audit should be ready because resume card is selected');
    assert.equal(auditRes.missingRequired.length, 0, 'No missing required fields');
  });
});
