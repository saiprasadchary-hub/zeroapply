import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoApplyOrchestrator } from '../src/agent/workflow/orchestrator';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { stealthEngine } from '../src/agent/stealth/stealthEngine';
import type { PersonaData } from '../src/types';

describe('External Apply New Tab Workflow & Return to 1st Tab', () => {
  beforeEach(() => {
    vi.spyOn(stealthEngine, 'getHumanInterApplicationDelay').mockReturnValue(10);
  });
  const mockPersona: PersonaData = {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '555-0199',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/alexmorgan',
    githubUrl: 'https://github.com/alexmorgan',
    portfolioUrl: 'https://alexmorgan.dev',
    workExperience: 'Senior Frontend Engineer with 6 years experience in TypeScript and React',
    education: 'BS Computer Science, Stanford University',
    skills: ['TypeScript', 'React', 'Node.js', 'Electron'],
    targetRoles: ['Senior Frontend Engineer', 'Full Stack Engineer'],
    answers: {
      sponsorship: 'No',
      authorized: 'Yes',
      noticePeriod: '2 weeks',
      salaryExpectation: '$160,000',
    },
  };

  it('Orchestrator detects external apply, switches to new tab, finishes application, and closes tab to return to 1st tab', async () => {
    let closedTab = false;
    let openedUrl = '';
    let currentActiveTab = 'tab_1_search_list';

    // Mock Tab 1 (Main Job Search List) Webview
    const tab1Webview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('PAGE_ANALYZER_SCRIPT') || script.includes('applyCandidate')) {
          return {
            url: 'https://www.linkedin.com/jobs/search/?keywords=frontend',
            title: 'LinkedIn Jobs Search',
            state: 'job_detail',
            platform: 'linkedin',
            hasActiveModal: false,
            applyButton: {
              exists: true,
              type: 'external',
              text: 'Apply on company website',
              selector: 'button.jobs-apply-button',
              url: 'https://careers.company.com/jobs/frontend-engineer/apply',
              isModalTrigger: false,
            },
          };
        }
        if (script.includes('ATS_DETECTOR_SCRIPT') || script.includes('Detect ATS Platform')) {
          return {
            platform: 'linkedin_easy_apply',
            displayName: 'LinkedIn',
            structure: 'single_page_form',
            stage: 'job_detail_view',
            containerSelector: 'body',
            hasErrors: false,
            errorCount: 0,
            canAdvance: true,
            canSubmit: false,
          };
        }
        if (script.includes('FORM_AUDITOR_SCRIPT') || script.includes('auditFormFields')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        return true;
      }),
    };

    // Mock Tab 2 (New External ATS Tab) Webview
    let tab2Step = 0;
    const tab2Webview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('FORM_AUDITOR_SCRIPT') || script.includes('auditFormFields')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        if (script.includes('PAGE_ANALYZER_SCRIPT') || script.includes('applyCandidate')) {
          return {
            url: 'https://careers.company.com/jobs/frontend-engineer/apply',
            title: 'Workday / Greenhouse Application Form',
            state: 'job_detail',
            platform: 'other',
            hasActiveModal: false,
            applyButton: { exists: false, type: 'none', text: '', selector: '', isModalTrigger: false },
          };
        }
        if (script.includes('ATS_DETECTOR_SCRIPT') || script.includes('Detect ATS Platform')) {
          return {
            platform: 'greenhouse',
            displayName: 'Greenhouse ATS',
            structure: 'single_page_form',
            stage: 'active_form_step',
            containerSelector: '#application_form',
            hasErrors: false,
            errorCount: 0,
            canAdvance: true,
            canSubmit: true,
          };
        }
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('detectForwardButton')) {
          tab2Step++;
          if (tab2Step === 1) {
            return {
              exists: true,
              action: 'submit',
              selector: 'button#submit_app',
              text: 'Submit Application',
              disabled: false,
            };
          }
          return { exists: false, action: 'none', disabled: true };
        }
        if (script.includes('DOM_SCANNER_SCRIPT') || script.includes('scanFormFields')) {
          return [
            {
              id: 'first_name',
              name: 'first_name',
              label: 'First Name',
              fieldType: 'text',
              currentValue: '',
              required: true,
              rect: { left: 10, top: 10, width: 200, height: 40 },
            },
            {
              id: 'email',
              name: 'email',
              label: 'Email',
              fieldType: 'email',
              currentValue: '',
              required: true,
              rect: { left: 10, top: 60, width: 200, height: 40 },
            },
          ];
        }
        if (script.includes('application submitted') || script.includes('success-view')) {
          return true;
        }
        return true;
      }),
    };

    const orchestratorInstance = new AutoApplyOrchestrator();

    const openTabMock = vi.fn().mockImplementation(async (url?: string) => {
      openedUrl = url || '';
      currentActiveTab = 'tab_2_external_portal';
      return tab2Webview;
    });

    const closeTabAndReturnMock = vi.fn().mockImplementation(async (_view?: any) => {
      closedTab = true;
      currentActiveTab = 'tab_1_search_list';
    });

    const result = await orchestratorInstance.runApplication(tab1Webview as any, mockPersona, {
      maxSteps: 5,
      stepDelayMs: 0,
      openTab: openTabMock,
      closeTabAndReturn: closeTabAndReturnMock,
    });

    // Validations:
    // 1. openTab was invoked with the external application URL
    expect(openTabMock).toHaveBeenCalledTimes(1);
    expect(openedUrl).toBe('https://careers.company.com/jobs/frontend-engineer/apply');

    // 2. Application executed in the new tab and achieved submission
    expect(result.outcome).toBe('submitted');
    expect(result.platform).toBe('Greenhouse ATS');

    // 3. Close tab and return was invoked, returning focus to tab 1
    expect(closeTabAndReturnMock).toHaveBeenCalledTimes(1);
    expect(closedTab).toBe(true);
    expect(currentActiveTab).toBe('tab_1_search_list');
  });

  it('AutoApplyEngine handles external apply in batch queue, finishes in new tab, and returns to 1st tab for next job card', async () => {
    let activeTab = 'tab_1';
    const closedTabs: string[] = [];
    const openedTabs: string[] = [];

    let currentCardIndex = 0;

    // Tab 1 Webview (Search List with 2 cards: card 0 external apply, card 1 easy apply)
    const tab1Webview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        // Multi-card discovery
        if (script.includes('jobs-search-results__list-item')) {
          return [
            { index: 0, title: 'Staff Software Engineer', company: 'Acme Corp' },
            { index: 1, title: 'Frontend Developer', company: 'Beta LLC' },
          ];
        }
        // Card click
        if (script.includes('cards[') && script.includes('.click()')) {
          if (script.includes('cards[0]')) currentCardIndex = 0;
          if (script.includes('cards[1]')) currentCardIndex = 1;
          return true;
        }
        // Apply button detection on card
        if (script.includes('jobs-apply-button') && (script.includes('external_apply') || script.includes('easy_apply_triggered'))) {
          if (currentCardIndex === 0) {
            return {
              status: 'external_apply',
              url: 'https://acme.workday.com/jobs/apply',
            };
          }
          return {
            status: 'easy_apply_triggered',
          };
        }
        if (script.includes('jobs-easy-apply-modal')) {
          return true;
        }
        if (script.includes('FORM_AUDITOR_SCRIPT') || script.includes('auditFormFields')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        return true;
      }),
    };

    // Tab 2 Webview (External Workday portal)
    const tab2Webview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('FORM_AUDITOR_SCRIPT') || script.includes('auditFormFields')) {
          return {
            ready: true,
            missingRequired: [],
            unansweredQuestions: [],
            errors: [],
          };
        }
        if (script.includes('ATS_DETECTOR_SCRIPT')) {
          return {
            platform: 'workday',
            displayName: 'Workday Career Portal',
            structure: 'multi_page_wizard',
            stage: 'active_form_step',
            containerSelector: 'body',
            hasErrors: false,
            errorCount: 0,
            canAdvance: true,
            canSubmit: true,
          };
        }
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT')) {
          return {
            exists: true,
            action: 'submit',
            selector: 'button#submit-workday',
            text: 'Submit Application',
            disabled: false,
          };
        }
        if (script.includes('DOM_SCANNER_SCRIPT')) {
          return [
            {
              id: 'full_name',
              label: 'Full Name',
              fieldType: 'text',
              currentValue: '',
              required: true,
              rect: { left: 0, top: 0, width: 100, height: 30 },
            },
          ];
        }
        if (script.includes('success-view') || script.includes('application submitted')) {
          return true;
        }
        return true;
      }),
    };

    const engine = new AutoApplyEngine();

    const openTabMock = vi.fn().mockImplementation(async (url?: string) => {
      openedTabs.push(url || '');
      activeTab = 'tab_2_external';
      return tab2Webview;
    });

    const closeTabAndReturnMock = vi.fn().mockImplementation(async (_view?: any) => {
      closedTabs.push(activeTab);
      activeTab = 'tab_1';
    });

    // Run batch with 1 card max
    await engine.startBatchApply(
      tab1Webview as any,
      mockPersona,
      'LinkedIn',
      true,
      openTabMock,
      closeTabAndReturnMock
    );

    // Verify external tab was opened for job 1
    expect(openedTabs).toContain('https://acme.workday.com/jobs/apply');
    // Verify external tab was closed and focus returned to 1st tab
    expect(closedTabs).toContain('tab_2_external');
    expect(activeTab).toBe('tab_1');
  }, 15000);
});
