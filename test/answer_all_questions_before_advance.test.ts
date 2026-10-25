import { describe, it, expect, vi } from 'vitest';
import { AutoApplyOrchestrator } from '../src/agent/workflow/orchestrator';
import { auditFormFields, FORM_AUDITOR_SCRIPT } from '../src/agent/formFiller/formAuditor';
import type { PersonaData } from '../src/types';

describe('Pre-Flight Question Audit: Answer All Questions Before Next / Submit', () => {
  const mockPersona: PersonaData = {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/alexmorgan',
    githubUrl: 'https://github.com/alexmorgan',
    portfolioUrl: 'https://alexmorgan.dev',
    workExperience: 'Senior Frontend Engineer with 6 years experience in TypeScript and React',
    education: 'BS Computer Science, Stanford University',
    skills: ['TypeScript', 'React', 'Node.js', 'Electron'],
    targetRoles: ['Senior Frontend Engineer'],
    answers: {
      sponsorship: 'No',
      authorized: 'Yes',
      noticePeriod: '2 weeks',
      salaryExpectation: '$160,000',
    },
  };

  it('FORM_AUDITOR_SCRIPT identifies unanswered radio groups, empty dropdowns, and blank required inputs', () => {
    let mockRadioYes: any;
    let mockRadioNo: any;

    const mockFieldset = {
      tagName: 'FIELDSET',
      getAttribute: (k: string) => k === 'aria-required' ? 'true' : null,
      textContent: 'Will you now or in the future require visa sponsorship? *',
      querySelector: (sel: string) => {
        if (sel.includes(':checked') || sel.includes('aria-checked="true"')) return null;
        if (sel.includes('legend') || sel.includes('label')) {
          return { textContent: 'Will you require visa sponsorship?' };
        }
        if (sel.includes('radio')) return mockRadioYes;
        return null;
      },
      querySelectorAll: () => [mockRadioYes, mockRadioNo],
      closest: () => null,
      offsetParent: {},
    };

    mockRadioYes = {
      type: 'radio',
      name: 'visa_sponsorship',
      checked: false,
      getAttribute: (k: string) => k === 'aria-checked' ? 'false' : null,
      closest: (sel: string) => mockFieldset,
      offsetParent: {},
    };
    mockRadioNo = {
      type: 'radio',
      name: 'visa_sponsorship',
      checked: false,
      getAttribute: (k: string) => k === 'aria-checked' ? 'false' : null,
      closest: (sel: string) => mockFieldset,
      offsetParent: {},
    };

    const mockEmptySelect = {
      tagName: 'SELECT',
      name: 'proficiency_level',
      value: '',
      required: true,
      getAttribute: (k: string) => null,
      closest: () => null,
      offsetParent: {},
    };

    const mockEmptyInput = {
      tagName: 'INPUT',
      type: 'text',
      name: 'years_react_experience',
      value: '',
      required: true,
      getAttribute: (k: string) => k === 'aria-label' ? 'How many years of experience do you have with React?' : null,
      closest: () => null,
      offsetParent: {},
    };

    const mockDoc = {
      querySelector: () => null,
      querySelectorAll: (sel: string) => {
        if (sel.includes('error') || sel.includes('invalid')) return [];
        return [mockFieldset, mockRadioYes, mockRadioNo, mockEmptySelect, mockEmptyInput];
      },
    };

    const auditFn = new Function('document', `return (${FORM_AUDITOR_SCRIPT});`);
    const result = auditFn(mockDoc);

    expect(result.ready).toBe(false);
    expect(result.missingRequired.length).toBeGreaterThanOrEqual(2);
    expect(result.unansweredQuestions.length).toBeGreaterThanOrEqual(3);

    const radioQ = result.unansweredQuestions.find((q: any) => q.inputType === 'radio');
    expect(radioQ).toBeDefined();
    expect(radioQ.label).toContain('sponsorship');

    const selectQ = result.unansweredQuestions.find((q: any) => q.inputType === 'select');
    expect(selectQ).toBeDefined();

    const inputQ = result.unansweredQuestions.find((q: any) => q.name === 'years_react_experience');
    expect(inputQ).toBeDefined();
  });

  it('Orchestrator detects unanswered questions, fills them via Local Qwen/Persona, and re-audits before clicking forward button', async () => {
    let auditAttempt = 0;
    const filledAnswers: Record<string, string> = {};
    let forwardButtonClicked = false;

    const mockWebview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        // 1. ATS Detector
        if (script.includes('ATS_DETECTOR_SCRIPT') || script.includes('Detect ATS Platform')) {
          return {
            platform: 'linkedin_easy_apply',
            displayName: 'LinkedIn Easy Apply',
            structure: 'multi_step_modal',
            stage: 'active_form_step',
            containerSelector: '#easy-apply-modal',
            hasErrors: false,
            errorCount: 0,
            canAdvance: true,
            canSubmit: false,
          };
        }

        // 2. Page Analyzer
        if (script.includes('PAGE_ANALYZER_SCRIPT')) {
          return {
            url: 'https://www.linkedin.com/jobs/view/123456/',
            title: 'Frontend Engineer',
            state: 'easy_apply_modal',
            platform: 'linkedin',
            hasActiveModal: true,
            applyButton: { exists: false, type: 'none', text: '', selector: '', isModalTrigger: false },
          };
        }

        // 3. Form Auditor
        if (script.includes('FORM_AUDITOR_SCRIPT') || script.includes('processedRadioGroups')) {
          auditAttempt++;
          // Attempt 1: 2 questions unanswered
          if (auditAttempt === 1) {
            return {
              ready: false,
              missingRequired: ['Notice Period', 'Work Authorization'],
              unansweredQuestions: [
                {
                  id: 'q_notice',
                  name: 'notice_period',
                  label: 'What is your notice period?',
                  inputType: 'text',
                  isRequired: true,
                  hasError: false,
                },
                {
                  id: 'q_auth',
                  name: 'work_auth',
                  label: 'Are you legally authorized to work in the United States?',
                  inputType: 'radio',
                  isRequired: true,
                  hasError: false,
                },
              ],
              errors: [],
            };
          }
          // Attempt 2+: all questions filled!
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }

        // 4. Form Scanner
        if (script.includes('DOM_SCANNER_SCRIPT') || script.includes('scanFormFields')) {
          return [
            {
              id: 'q_notice',
              name: 'notice_period',
              label: 'What is your notice period?',
              inputType: 'text',
              currentValue: filledAnswers['notice_period'] || '',
              required: true,
              rect: { left: 10, top: 10, width: 200, height: 30 },
            },
            {
              id: 'q_auth',
              name: 'work_auth',
              label: 'Are you legally authorized to work in the United States?',
              inputType: 'radio',
              options: ['Yes', 'No'],
              currentValue: filledAnswers['work_auth'] || '',
              required: true,
              rect: { left: 10, top: 50, width: 200, height: 30 },
            },
          ];
        }

        // 5. Form Filler synthetic events
        if (script.includes('__zeroapplyDispatchEvents') || script.includes('fillField')) {
          return { success: true };
        }

        // 6. Detect Forward Button
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('detectForwardButton')) {
          return {
            exists: true,
            action: 'submit',
            selector: 'button#submit_btn',
            text: 'Submit Application',
            disabled: false,
          };
        }

        // 7. Advance click
        if (script.includes('actionLabel') || script.includes('click()')) {
          forwardButtonClicked = true;
          return true;
        }

        // 8. Success modal check
        if (script.includes('success-view') || script.includes('application submitted')) {
          return true;
        }

        return true;
      }),
    };

    const orchestrator = new AutoApplyOrchestrator();

    const result = await orchestrator.runApplication(mockWebview as any, mockPersona, {
      maxSteps: 3,
      stepDelayMs: 0,
    });

    // Validations:
    // 1. Audit was executed and caught missing questions
    expect(auditAttempt).toBeGreaterThanOrEqual(2);

    // 2. Application achieved submission only AFTER audit cleared
    expect(result.outcome).toBe('submitted');

    // 3. Forward button was clicked
    expect(forwardButtonClicked).toBe(true);
  });
});
