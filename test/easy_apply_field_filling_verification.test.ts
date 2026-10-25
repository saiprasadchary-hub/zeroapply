import { describe, it, expect, vi } from 'vitest';
import { INJECTED_SCANNER_SCRIPT } from '../src/agent/domScanner/injectedScanner';
import { FORM_AUDITOR_SCRIPT, isFieldAlreadySatisfied } from '../src/agent/formFiller/formAuditor';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { AutoApplyOrchestrator } from '../src/agent/workflow/orchestrator';
import type { PersonaData } from '../src/types';

describe('Easy Apply Multi-Section Form Perception & Filling Verification', () => {
  const mockPersona: PersonaData = {
    fullName: 'Sai Prasad Chary',
    email: 'kspchary077@gmail.com',
    phone: '+91 9876543210',
    location: 'Hyderabad, Telangana, India',
    linkedinUrl: 'https://linkedin.com/in/saiprasad',
    experienceYears: 3,
    targetRoles: ['Full Stack Engineer'],
    skills: ['TypeScript', 'React', 'Node.js', 'Python'],
  };

  it('INJECTED_SCANNER_SCRIPT extracts all form fields across multiple jobs-easy-apply-form-section blocks in a modal', () => {
    // Simulate real LinkedIn Easy Apply modal DOM
    const mockModal = {
      nodeType: 1,
      tagName: 'DIV',
      id: 'mock-easy-apply-modal',
      className: 'artdeco-modal jobs-easy-apply-modal',
      getAttribute: (k: string) => {
        if (k === 'role') return 'dialog';
        if (k === 'aria-modal') return 'true';
        return null;
      },
      getBoundingClientRect: () => ({ width: 600, height: 700, top: 50, left: 100 }),
      querySelector: (sel: string) => {
        // Real LinkedIn does NOT have .modal-step.active or .step-container.active
        return null;
      },
    };

    // Section 1: Contact info header card (no inputs)
    const mockSection1 = {
      nodeType: 1,
      tagName: 'DIV',
      className: 'jobs-easy-apply-form-section',
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 550, height: 80, top: 60, left: 120 }),
      closest: () => mockModal,
      firstElementChild: null,
      nextElementSibling: null,
    };

    // Section 2: Email select dropdown
    const mockEmailSelect: any = {
      nodeType: 1,
      tagName: 'SELECT',
      id: 'input-email',
      name: 'email',
      value: '',
      required: true,
      getAttribute: (k: string) => k === 'name' ? 'email' : null,
      getBoundingClientRect: () => ({ width: 300, height: 38, top: 160, left: 120 }),
      querySelectorAll: (sel: string) => [
        { textContent: 'Select an email', value: '' },
        { textContent: 'kspchary077@gmail.com', value: 'kspchary077@gmail.com' },
      ],
      closest: () => mockSection2,
      offsetParent: {},
      setAttribute: () => {},
    };

    const mockSection2: any = {
      nodeType: 1,
      tagName: 'DIV',
      className: 'jobs-easy-apply-form-section',
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 550, height: 70, top: 150, left: 120 }),
      closest: () => mockModal,
      querySelector: (sel: string) => {
        if (sel.includes('label')) return { textContent: 'Email address *' };
        return null;
      },
      firstElementChild: mockEmailSelect,
      nextElementSibling: null,
    };

    // Section 3: Phone country code and mobile number
    const mockPhoneCountry: any = {
      nodeType: 1,
      tagName: 'SELECT',
      id: 'input-country-code',
      name: 'phoneCountry',
      value: 'India (+91)',
      required: true,
      getAttribute: (k: string) => k === 'name' ? 'phoneCountry' : null,
      getBoundingClientRect: () => ({ width: 140, height: 38, top: 240, left: 120 }),
      querySelectorAll: () => [
        { textContent: 'India (+91)', value: 'India (+91)' },
        { textContent: 'United States (+1)', value: 'United States (+1)' },
      ],
      closest: () => mockSection3,
      offsetParent: {},
      setAttribute: () => {},
    };

    const mockPhoneInput: any = {
      nodeType: 1,
      tagName: 'INPUT',
      type: 'tel',
      id: 'input-mobile-number',
      name: 'phoneNumber',
      value: '',
      required: true,
      getAttribute: (k: string) => {
        if (k === 'type') return 'tel';
        if (k === 'name') return 'phoneNumber';
        return null;
      },
      getBoundingClientRect: () => ({ width: 200, height: 38, top: 240, left: 270 }),
      closest: () => mockSection3,
      offsetParent: {},
      setAttribute: () => {},
    };

    const mockSection3: any = {
      nodeType: 1,
      tagName: 'DIV',
      className: 'jobs-easy-apply-form-section',
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 550, height: 80, top: 230, left: 120 }),
      closest: () => mockModal,
      querySelector: (sel: string) => {
        if (sel.includes('label')) return { textContent: 'Mobile phone number *' };
        return null;
      },
      firstElementChild: mockPhoneCountry,
      nextElementSibling: null,
    };
    mockPhoneCountry.nextElementSibling = mockPhoneInput;

    // Connect child traversal for getAllElementsInScope(scopeRoot, allElements)
    mockModal.firstElementChild = mockSection1;
    mockSection1.nextElementSibling = mockSection2;
    mockSection2.nextElementSibling = mockSection3;

    const mockDoc = {
      querySelector: (sel: string) => {
        if (sel.includes('jobs-easy-apply-modal') || sel.includes('role="dialog"')) return mockModal;
        return null;
      },
      querySelectorAll: () => [],
      body: mockModal,
    };

    const scannerFn = new Function('document', 'window', `return (${INJECTED_SCANNER_SCRIPT});`);
    const mockWindow = {
      getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
      innerWidth: 1200,
      innerHeight: 800,
    };

    const fields = scannerFn(mockDoc, mockWindow);

    expect(Array.isArray(fields)).toBe(true);
    // Crucial check: Must have found fields from Section 2 AND Section 3, not just Section 1!
    expect(fields.length).toBeGreaterThanOrEqual(3);

    const classified = classifyFields(fields, mockPersona);
    const standardKeys = classified.map((c) => c.standardKey);

    expect(standardKeys).toContain('email');
    expect(standardKeys).toContain('phone_country_code');
    expect(standardKeys).toContain('phone');
  });

  it('FORM_AUDITOR_SCRIPT recognizes required fields marked with LinkedIn markup and asterisk', () => {
    const mockPhoneInput: any = {
      tagName: 'INPUT',
      type: 'tel',
      id: 'input-phone',
      name: 'phoneNumber',
      value: '',
      required: false, // In HTML, LinkedIn often omits required attribute and relies on JS
      getAttribute: (k: string) => k === 'type' ? 'tel' : null,
      offsetParent: {},
      getBoundingClientRect: () => ({ width: 200, height: 38 }),
      closest: (sel: string) => {
        if (sel.includes('jobs-easy-apply-form-element') || sel.includes('fb-form-element')) {
          return {
            textContent: 'Mobile phone number Required',
            querySelector: () => null,
          };
        }
        return null;
      },
    };

    const mockModal = {
      querySelector: () => null,
      querySelectorAll: (sel: string) => {
        if (sel.includes('input') || sel.includes('select')) return [mockPhoneInput];
        if (sel.includes('error') || sel.includes('invalid')) return [];
        return [];
      },
    };

    const mockDoc = {
      querySelector: (sel: string) => {
        if (sel.includes('jobs-easy-apply-modal')) return mockModal;
        return null;
      },
      querySelectorAll: (sel: string) => {
        if (sel.includes('input') || sel.includes('select')) return [mockPhoneInput];
        return [];
      },
    };

    const auditFn = new Function('document', `return (${FORM_AUDITOR_SCRIPT});`);
    const res = auditFn(mockDoc);

    expect(res.ready).toBe(false);
    expect(res.missingRequired.length).toBeGreaterThanOrEqual(1);
    expect(res.unansweredQuestions.some((u: any) => u.isRequired)).toBe(true);
  });

  it('isFieldAlreadySatisfied correctly verifies prefilled fields without redundant typing', () => {
    expect(isFieldAlreadySatisfied({ currentValue: 'kspchary077@gmail.com', hasError: false }, 'kspchary077@gmail.com')).toBe(true);
    expect(isFieldAlreadySatisfied({ currentValue: '+91 9876543210', hasError: false }, '+91 9876543210')).toBe(true);
    expect(isFieldAlreadySatisfied({ currentValue: '', hasError: false }, 'kspchary077@gmail.com')).toBe(false);
    expect(isFieldAlreadySatisfied({ currentValue: 'Select an option', hasError: false }, 'Yes')).toBe(false);
    expect(isFieldAlreadySatisfied({ currentValue: 'Select country code', hasError: false }, 'India (+91)')).toBe(false);
  });

  it('AutoApplyOrchestrator fills fields and reports completed field count instead of skipping to next', async () => {
    const orchestrator = new AutoApplyOrchestrator();

    let fillCalled = false;
    let clickCalled = false;
    let forwardBtnClicked = false;

    const mockWebview = {
      executeJavaScript: vi.fn(async (script: string) => {
        // Return active modal check
        if (script.includes('easy-apply-modal-overlay') || script.includes('jobs-easy-apply-modal')) {
          if (script.includes('rect.width > 0')) return true; // Modal is open
          if (script.includes('activeStepTitle') || script.includes('step-section-title')) return 'Contact info';
        }

        // Return forward button detection
        if (script.includes('DETECT_FORWARD_BUTTON') || script.includes('candidateButtons')) {
          if (!forwardBtnClicked) {
            return {
              exists: true,
              action: 'submit',
              selector: 'button[data-easy-apply-submit-button]',
              text: 'Submit application',
              disabled: false,
            };
          }
          return { exists: false, action: 'none' };
        }

        // Return DOM scanner results (simulating our fixed scanner finding fields!)
        if (script.includes('processedElements') || script.includes('const fields = [];') || script.includes('INJECTED_SCANNER')) {
          return [
            {
              id: 'input-phone',
              selector: '#input-phone',
              tagName: 'input',
              inputType: 'tel',
              label: 'Mobile phone number',
              placeholder: '',
              name: 'phoneNumber',
              required: true,
              currentValue: '', // Empty, needs to be filled!
              hasError: false,
            },
          ];
        }

        // Form auditor: After filling, ready = true
        if (script.includes('FORM_AUDITOR') || script.includes('processedRadioGroups')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }

        // Cursor click / type
        if (script.includes('typeElement') || script.includes('buildSyntheticEventScript')) {
          fillCalled = true;
          return true;
        }

        if (script.includes('clickElement') || script.includes('stepNavigator.advance')) {
          clickCalled = true;
          forwardBtnClicked = true;
          return true;
        }

        if (script.includes('application-submitted') || script.includes('application received')) {
          return true;
        }

        return false;
      }),
    };

    const res = await orchestrator.runApplication(mockWebview as any, mockPersona, {
      maxSteps: 3,
      stepDelayMs: 50,
    });

    expect(fillCalled).toBe(true);
    expect(res.fieldsFilled).toBeGreaterThanOrEqual(1);
    expect(res.outcome).toBe('submitted');
  });

  it('AutoApplyOrchestrator fills fields even if already populated with an existing value', async () => {
    const orchestrator = new AutoApplyOrchestrator();

    let fillCalled = false;
    let forwardBtnClicked = false;

    const mockWebview = {
      executeJavaScript: vi.fn(async (script: string) => {
        if (script.includes('easy-apply-modal-overlay') || script.includes('jobs-easy-apply-modal')) {
          if (script.includes('rect.width > 0')) return true;
          if (script.includes('activeStepTitle') || script.includes('step-section-title')) return 'Contact info';
        }

        if (script.includes('DETECT_FORWARD_BUTTON') || script.includes('candidateButtons')) {
          if (!forwardBtnClicked) {
            return {
              exists: true,
              action: 'submit',
              selector: 'button[data-easy-apply-submit-button]',
              text: 'Submit application',
              disabled: false,
            };
          }
          return { exists: false, action: 'none' };
        }

        // Return DOM scanner results where the field already has an old/pre-filled value
        if (script.includes('processedElements') || script.includes('const fields = [];') || script.includes('INJECTED_SCANNER')) {
          return [
            {
              id: 'input-phone',
              selector: '#input-phone',
              tagName: 'input',
              inputType: 'tel',
              label: 'Mobile phone number',
              placeholder: '',
              name: 'phoneNumber',
              required: true,
              currentValue: '1234567890', // Pre-existing value!
              hasError: false,
            },
          ];
        }

        if (script.includes('FORM_AUDITOR') || script.includes('processedRadioGroups')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }

        if (script.includes('typeElement') || script.includes('buildSyntheticEventScript')) {
          fillCalled = true;
          return true;
        }

        if (script.includes('clickElement') || script.includes('stepNavigator.advance')) {
          forwardBtnClicked = true;
          return true;
        }

        if (script.includes('application-submitted') || script.includes('application received')) {
          return true;
        }

        return false;
      }),
    };

    const res = await orchestrator.runApplication(mockWebview as any, mockPersona, {
      maxSteps: 3,
      stepDelayMs: 50,
    });

    // Confirms that pre-existing fields are NOT skipped and are actively filled with resume data!
    expect(fillCalled).toBe(true);
    expect(res.fieldsFilled).toBeGreaterThanOrEqual(1);
    expect(res.outcome).toBe('submitted');
  });
});
