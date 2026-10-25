import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalApplyEngine, NormalApplyEngine } from '../src/agent/normalApply';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { stealthEngine } from '../src/agent/stealth/stealthEngine';
import { isLiveAgentInspectorEnabled, saveStoredSettings, loadStoredSettings, DEFAULT_SETTINGS } from '../src/settings/settingsManager';
import type { PersonaData } from '../src/types';

describe('Normal Apply Multi-Tab Lifecycle & Easy Apply Isolation', () => {
  beforeEach(() => {
    vi.spyOn(stealthEngine, 'getHumanInterApplicationDelay').mockReturnValue(10);
  });

  const mockPersona: PersonaData = {
    fullName: 'Alex Vance',
    email: 'alex.vance@example.com',
    phone: '555-987-6543',
    location: 'Austin, TX',
    linkedinUrl: 'https://linkedin.com/in/alexvance',
    githubUrl: 'https://github.com/alexvance',
    portfolioUrl: 'https://alexvance.dev',
    workExperience: 'Principal Software Engineer with 8 years of distributed systems experience',
    education: 'MS Computer Science, UT Austin',
    skills: ['TypeScript', 'Node.js', 'React', 'Go', 'Kubernetes'],
    targetRoles: ['Principal Software Engineer', 'Staff Software Engineer'],
    answers: {
      sponsorship: 'No',
      authorized: 'Yes',
      noticePeriod: 'Immediate',
      salaryExpectation: '$185,000',
    },
  };

  it('Live Agent Inspector setting toggles properly and can be turned off', () => {
    // 1. Initial default is enabled
    saveStoredSettings({ ...DEFAULT_SETTINGS, liveAgentInspectorVisible: true });
    expect(isLiveAgentInspectorEnabled()).toBe(true);

    // 2. Turn off Live Agent Inspector
    saveStoredSettings({ ...DEFAULT_SETTINGS, liveAgentInspectorVisible: false });
    expect(isLiveAgentInspectorEnabled()).toBe(false);

    // Verify persisted setting in storage
    const stored = loadStoredSettings();
    expect(stored.liveAgentInspectorVisible).toBe(false);

    // 3. Restore to true
    saveStoredSettings({ ...DEFAULT_SETTINGS, liveAgentInspectorVisible: true });
    expect(isLiveAgentInspectorEnabled()).toBe(true);
  });

  it('NormalApplyEngine opens new tab, completes form filling and submission, closes tab, and returns to main tab', async () => {
    let activeTabId = 'main_search_tab';
    const tabEvents: string[] = [];

    // Mock external tab webview (e.g. Greenhouse ATS)
    let fillStep = 0;
    const externalWebview = {
      getURL: vi.fn().mockReturnValue('https://boards.greenhouse.io/acmecorp/jobs/1234567'),
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        // Page settle check
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        // Form field scanning (INJECTED_SCANNER_SCRIPT)
        if (script.includes('processedElements') || script.includes('const fields = [];') || script.includes('scanFormFields')) {
          fillStep++;
          return [
            {
              id: 'first_name',
              name: 'first_name',
              label: 'First Name',
              tagName: 'input',
              inputType: 'text',
              required: true,
              currentValue: '',
              selector: '#first_name',
              rect: { x: 10, y: 10, width: 200, height: 40 },
            },
            {
              id: 'last_name',
              name: 'last_name',
              label: 'Last Name',
              tagName: 'input',
              inputType: 'text',
              required: true,
              currentValue: '',
              selector: '#last_name',
              rect: { x: 10, y: 60, width: 200, height: 40 },
            },
            {
              id: 'email',
              name: 'email',
              label: 'Email',
              tagName: 'input',
              inputType: 'email',
              required: true,
              currentValue: '',
              selector: '#email',
              rect: { x: 10, y: 110, width: 200, height: 40 },
            },
            {
              id: 'phone',
              name: 'phone',
              label: 'Phone',
              tagName: 'input',
              inputType: 'tel',
              required: true,
              currentValue: '',
              selector: '#phone',
              rect: { x: 10, y: 160, width: 200, height: 40 },
            },
          ];
        }
        // ATS detection
        if (script.includes('greenhouse.io') || (script.includes('application_form') && script.includes('host.includes'))) {
          return {
            kind: 'greenhouse',
            displayName: 'Greenhouse ATS',
            formSelector: '#application_form',
            hasLandingApplyButton: false,
          };
        }
        // Landing button click
        if (script.includes('apply for this job') || script.includes('Reveal Application Form')) {
          return true;
        }
        // Form auditor check
        if (script.includes('auditFormFields') || script.includes('unansweredQuestions')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        // Step forward button detection
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('detectForwardButton') || script.includes('type="submit"')) {
          return { exists: true, action: 'submit', text: 'Submit application', selector: '#submit_app' };
        }
        // Form submission confirmation detection
        if (script.includes('thank-you') || script.includes('application (has been )?submitted')) {
          return {
            isConfirmed: true,
            reason: 'Found confirmation message in page content: thank you for applying',
            details: 'Thank you for applying to Acme Corp!',
          };
        }
        return true;
      }),
    };

    const openTabMock = vi.fn().mockImplementation(async (url?: string) => {
      tabEvents.push(`openTab:${url}`);
      activeTabId = 'new_external_tab';
      return externalWebview;
    });

    const closeTabAndReturnMock = vi.fn().mockImplementation(async () => {
      tabEvents.push(`closeTab:${activeTabId}`);
      activeTabId = 'main_search_tab';
    });

    const engine = new NormalApplyEngine();

    const result = await engine.executeNormalApply(
      {
        jobTitle: 'Principal Software Engineer',
        companyName: 'Acme Corp',
        platform: 'LinkedIn',
        externalUrl: 'https://boards.greenhouse.io/acmecorp/jobs/1234567',
        cardIndex: 0,
      },
      mockPersona,
      {
        openTab: openTabMock,
        closeTabAndReturn: closeTabAndReturnMock,
      },
      {
        allowSubmit: true,
        stepDelayMs: 0,
        pageSettledTimeoutMs: 500,
      }
    );

    // Verify submission outcome
    expect(result.outcome).toBe('submitted');
    expect(result.fieldsFilled).toBeGreaterThan(0);

    // Verify tab lifecycle: opened new tab -> closed new tab -> returned to main search tab
    expect(openTabMock).toHaveBeenCalled();
    expect(closeTabAndReturnMock).toHaveBeenCalled();
    expect(activeTabId).toBe('main_search_tab');
  }, 15000);

  it('AutoApplyEngine correctly delegates external apply to NormalApplyEngine while leaving Easy Apply in same tab', async () => {
    let currentActiveTab = 'main_search_tab';
    const closedTabs: string[] = [];
    const openedUrls: string[] = [];

    // Mock main search tab webview with 1 external apply card
    const mainWebview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        // Page settle check
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        // Job detail pane settle check
        if (script.includes('jobs-search__job-details') || script.includes('hasActiveLoaders')) {
          return true;
        }
        // Multi-card query: 1 card only
        if (script.includes('jobs-search-results__list-item')) {
          return [
            { index: 0, title: 'Staff Systems Architect', company: 'Nexus Technologies', isApplied: false },
          ];
        }
        // Select card 0
        if (script.includes('cards[') && script.includes('.click()')) {
          return true;
        }
        // Apply button detection: external apply
        if (script.includes('jobs-apply-button') && script.includes('external_apply')) {
          return {
            status: 'external_apply',
            url: 'https://jobs.lever.co/nexustech/architect-apply',
          };
        }
        return true;
      }),
    };

    // Mock external Lever tab webview
    const leverWebview = {
      getURL: vi.fn().mockReturnValue('https://jobs.lever.co/nexustech/architect-apply'),
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        if (script.includes('lever.co')) {
          return {
            kind: 'lever',
            displayName: 'Lever ATS',
            formSelector: '.application-form',
            hasLandingApplyButton: false,
          };
        }
        if (script.includes('processedElements') || script.includes('scanFormFields') || script.includes('INJECTED_SCANNER')) {
          return [
            {
              id: 'name',
              name: 'name',
              label: 'Full Name',
              inputType: 'text',
              required: true,
              currentValue: '',
              selector: '#name',
              rect: { left: 10, top: 10, width: 200, height: 40 },
            },
            {
              id: 'email',
              name: 'email',
              label: 'Email',
              inputType: 'email',
              required: true,
              currentValue: '',
              selector: '#email',
              rect: { left: 10, top: 60, width: 200, height: 40 },
            },
          ];
        }
        if (script.includes('auditFormFields') || script.includes('unansweredQuestions')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('detectForwardButton') || script.includes('type="submit"')) {
          return { exists: true, action: 'submit', text: 'Submit Application', selector: '#submit_btn' };
        }
        if (script.includes('thank-you') || script.includes('application (has been )?submitted')) {
          return {
            isConfirmed: true,
            reason: 'URL indicates successful submission (/thank-you)',
            details: 'https://jobs.lever.co/nexustech/thank-you',
          };
        }
        return true;
      }),
    };

    const autoApply = new AutoApplyEngine();

    await autoApply.startBatchApply(
      mainWebview as any,
      mockPersona,
      'LinkedIn',
      true,
      async (url?: string) => {
        openedUrls.push(url || '');
        currentActiveTab = 'external_lever_tab';
        return leverWebview;
      },
      async () => {
        closedTabs.push(currentActiveTab);
        currentActiveTab = 'main_search_tab';
      },
      { singleJobOnly: true, stepDelayMs: 0 }
    );

    // Verify external URL was opened
    expect(openedUrls).toContain('https://jobs.lever.co/nexustech/architect-apply');
    // Verify external tab was closed and focus returned to main search tab
    expect(closedTabs).toContain('external_lever_tab');
    expect(currentActiveTab).toBe('main_search_tab');
  }, 15000);

  it('External application tab STAYS OPEN and does NOT switch back to main tab if application is incomplete/unconfirmed', async () => {
    let activeTabId = 'main_search_tab';
    let closeTabCalled = false;

    // Mock external tab where submission is incomplete / verification fails
    const incompleteExternalWebview = {
      getURL: vi.fn().mockReturnValue('https://boards.greenhouse.io/acmecorp/jobs/9999'),
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        if (script.includes('greenhouse.io')) {
          return {
            kind: 'greenhouse',
            displayName: 'Greenhouse ATS',
            formSelector: '#application_form',
            hasLandingApplyButton: false,
          };
        }
        if (script.includes('scanFormFields') || script.includes('processedElements')) {
          return [
            {
              id: 'name',
              name: 'name',
              label: 'Full Name',
              tagName: 'input',
              inputType: 'text',
              required: true,
              currentValue: '',
              selector: '#name',
              rect: { x: 10, y: 10, width: 200, height: 40 },
            },
          ];
        }
        if (script.includes('auditFormFields')) {
          return {
            ready: false,
            missingRequired: ['extra_req'],
            unansweredQuestions: [{ id: 'extra_req', label: 'Additional Requirement', isRequired: true }],
            errors: ['Please complete all required fields'],
          };
        }
        // Button is not submit or disabled
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('type="submit"')) {
          return { exists: false, action: 'none', text: '', selector: '' };
        }
        // Verification fails
        if (script.includes('thank-you') || script.includes('application (has been )?submitted')) {
          return {
            isConfirmed: false,
            reason: 'Form has remaining required fields',
          };
        }
        return true;
      }),
    };

    const openTabMock = vi.fn().mockImplementation(async () => {
      activeTabId = 'new_opened_tab';
      return incompleteExternalWebview;
    });

    const closeTabAndReturnMock = vi.fn().mockImplementation(async () => {
      closeTabCalled = true;
      activeTabId = 'main_search_tab';
    });

    const engine = new NormalApplyEngine();
    const result = await engine.executeNormalApply(
      {
        jobTitle: 'Senior Systems Engineer',
        companyName: 'Acme Corp',
        platform: 'LinkedIn',
        externalUrl: 'https://boards.greenhouse.io/acmecorp/jobs/9999',
      },
      mockPersona,
      {
        openTab: openTabMock,
        closeTabAndReturn: closeTabAndReturnMock,
      },
      {
        allowSubmit: true,
        stepDelayMs: 0,
        pageSettledTimeoutMs: 200,
        maxSteps: 1,
        auditMaxPasses: 1,
      }
    );

    // Outcome is failed/unconfirmed
    expect(result.outcome).toBe('failed');
    // Tab was NOT closed because application was not completely filled and submitted!
    expect(closeTabCalled).toBe(false);
    expect(closeTabAndReturnMock).not.toHaveBeenCalled();
    // User remains on the opened tab
    expect(activeTabId).toBe('new_opened_tab');
  }, 15000);

  it('Google Forms custom dropdown perception, option extraction, and resume-grounded selection', async () => {
    let selectedOption = '';
    const googleFormWebview = {
      getURL: vi.fn().mockReturnValue('https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform'),
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 100 };
        }
        if (script.includes('scanFormFields') || script.includes('processedElements')) {
          return [
            {
              id: 'i1',
              selector: '[data-za-field-id="za-field-1"]',
              tagName: 'div',
              inputType: 'combobox',
              label: 'Job Position',
              options: ['Choose', 'Frontend Engineer', 'Python Automation Engineer', 'Product Manager'],
              required: true,
              currentValue: 'Choose',
              isCustomComponent: true,
              rect: { x: 50, y: 100, width: 250, height: 40 },
            },
          ];
        }
        if (script.includes('auditFormFields')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        // Custom combobox click execution script
        if (script.includes('exportSelectPopup') || script.includes('quantumWizMenuPaperselectOption')) {
          selectedOption = 'Python Automation Engineer';
          return true;
        }
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('detectExternalAtsButton') || script.includes('Submit')) {
          return { exists: true, action: 'submit', text: 'Submit', selector: '[role="button"][jsname="M22Akc"]' };
        }
        if (script.includes('formresponse') || script.includes('your response has been recorded')) {
          return {
            isConfirmed: true,
            reason: 'Found confirmation message in page content: your response has been recorded',
            details: 'Your response has been recorded.',
          };
        }
        return true;
      }),
    };

    let activeTab = 'main_tab';
    const openTabMock = vi.fn().mockImplementation(async () => {
      activeTab = 'google_forms_tab';
      return googleFormWebview;
    });
    const closeTabMock = vi.fn().mockImplementation(async () => {
      activeTab = 'main_tab';
    });

    const engine = new NormalApplyEngine();
    const res = await engine.executeNormalApply(
      {
        jobTitle: 'Python Automation Engineer',
        companyName: 'Tech Corp',
        platform: 'Google Forms',
        externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform',
      },
      mockPersona,
      { openTab: openTabMock, closeTabAndReturn: closeTabMock },
      { allowSubmit: true, stepDelayMs: 0, pageSettledTimeoutMs: 200, maxSteps: 2 }
    );

    expect(res.outcome).toBe('submitted');
    expect(res.fieldsFilled).toBeGreaterThan(0);
    expect(openTabMock).toHaveBeenCalled();
    expect(closeTabMock).toHaveBeenCalled();
    expect(activeTab).toBe('main_tab');
  });
});
