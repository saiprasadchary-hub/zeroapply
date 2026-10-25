import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { stealthEngine } from '../src/agent/stealth/stealthEngine';
import { orchestrator } from '../src/agent/workflow/orchestrator';
import type { PersonaData } from '../src/types';

describe('Application Batch Limit Enforcement', () => {
  beforeEach(() => {
    vi.spyOn(stealthEngine, 'getHumanInterApplicationDelay').mockReturnValue(1);
    vi.spyOn(orchestrator, 'runApplication').mockResolvedValue({
      outcome: 'submitted',
      stepsExecuted: 2,
      fieldsFilled: 4,
      recoveryCount: 0,
    });
  });

  const basePersona: PersonaData = {
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
    applicationLimit: 3, // Set batch limit to 3 jobs max
  };

  it('AutoApplyEngine stops exactly when appliedCount reaches persona.applicationLimit', async () => {
    const statusMessages: string[] = [];
    const logMessages: string[] = [];
    const appliedJobs: string[] = [];

    let currentSelectedCardIndex = 0;
    const mockWebview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        // Page settle check
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        // Multi-card query: return 10 cards
        if (script.includes('jobs-search-results__list-item') && script.includes('.map(')) {
          return Array.from({ length: 10 }, (_, i) => ({
            index: i,
            title: `Job Posting #${i + 1}`,
            company: `Acme Corp ${i + 1}`,
            isApplied: false,
          }));
        }
        // Card click
        if (script.includes('cards[') && script.includes('.click()')) {
          const match = script.match(/cards\[(\d+)\]/);
          if (match) currentSelectedCardIndex = parseInt(match[1]);
          return true;
        }
        // Easy Apply modal opened check
        if (script.includes('easy-apply-modal') || script.includes('easy-apply-modal-overlay')) {
          return true;
        }
        // Apply button check (placed BEFORE detail pane check to avoid false positive matches)
        if (script.includes('jobs-apply-button') && script.includes('easy_apply_triggered')) {
          appliedJobs.push(`Job Posting #${currentSelectedCardIndex + 1}`);
          return { status: 'easy_apply_triggered' };
        }
        // Job detail pane settle check
        if (script.includes('hasActiveLoaders') || script.includes('paneLoaders')) {
          return true;
        }
        return true;
      }),
    };

    const autoApply = new AutoApplyEngine();
    autoApply.setStatusCallback((s) => statusMessages.push(s));
    autoApply.setLogCallback((l) => logMessages.push(typeof l === 'string' ? l : l.message));

    // Run batch apply without overriding maxJobs, expecting persona.applicationLimit (3) to be enforced
    await autoApply.startBatchApply(
      mockWebview as any,
      basePersona,
      'LinkedIn',
      true, // allowSubmit
      undefined,
      undefined,
      { stepDelayMs: 0 }
    );

    // Verify exactly 3 jobs were applied to
    expect(appliedJobs.length).toBe(3);
    expect(appliedJobs).toEqual([
      'Job Posting #1',
      'Job Posting #2',
      'Job Posting #3',
    ]);

    // Verify completion messages indicate batch limit was enforced
    const limitStatus = statusMessages.find((s) => s.includes('Application batch limit reached (3/3 jobs)'));
    expect(limitStatus).toBeDefined();

    const limitLog = logMessages.find((m) => m.includes('Application Batch Limit: 3 reached') || m.includes('Application batch limit'));
    expect(limitLog).toBeDefined();
  }, 15000);

  it('AutoApplyEngine prioritizes options.maxJobs override when explicitly provided', async () => {
    const appliedJobs: string[] = [];
    let currentSelectedCardIndex = 0;

    const mockWebview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        if (script.includes('jobs-search-results__list-item') && script.includes('.map(')) {
          return Array.from({ length: 10 }, (_, i) => ({
            index: i,
            title: `Engineering Role #${i + 1}`,
            company: `Tech Labs ${i + 1}`,
            isApplied: false,
          }));
        }
        if (script.includes('cards[') && script.includes('.click()')) {
          const match = script.match(/cards\[(\d+)\]/);
          if (match) currentSelectedCardIndex = parseInt(match[1]);
          return true;
        }
        if (script.includes('easy-apply-modal') || script.includes('easy-apply-modal-overlay')) {
          return true;
        }
        if (script.includes('jobs-apply-button') && script.includes('easy_apply_triggered')) {
          appliedJobs.push(`Engineering Role #${currentSelectedCardIndex + 1}`);
          return { status: 'easy_apply_triggered' };
        }
        if (script.includes('hasActiveLoaders') || script.includes('paneLoaders')) {
          return true;
        }
        return true;
      }),
    };

    const autoApply = new AutoApplyEngine();

    // persona has applicationLimit: 3, but options passes maxJobs: 2
    await autoApply.startBatchApply(
      mockWebview as any,
      basePersona,
      'LinkedIn',
      true,
      undefined,
      undefined,
      { maxJobs: 2, stepDelayMs: 0 }
    );

    // Verify it stopped after 2 applications as requested by options.maxJobs
    expect(appliedJobs.length).toBe(2);
  }, 15000);

  it('AutoApplyEngine enforces batch limit across external ATS Normal Apply workflows', async () => {
    const appliedJobs: string[] = [];
    let currentSelectedCardIndex = 0;
    const closedTabs: string[] = [];

    const mainWebview = {
      executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
        if (script.includes('readyState === \'complete\'')) {
          return { isComplete: true, hasLoaders: false, hasRequired: true, elementCount: 150 };
        }
        if (script.includes('jobs-search-results__list-item') && script.includes('.map(')) {
          return Array.from({ length: 8 }, (_, i) => ({
            index: i,
            title: `External Job #${i + 1}`,
            company: `Enterprise Inc ${i + 1}`,
            isApplied: false,
          }));
        }
        if (script.includes('cards[') && script.includes('.click()')) {
          const match = script.match(/cards\[(\d+)\]/);
          if (match) currentSelectedCardIndex = parseInt(match[1]);
          return true;
        }
        if (script.includes('jobs-apply-button') && script.includes('external_apply')) {
          appliedJobs.push(`External Job #${currentSelectedCardIndex + 1}`);
          return { status: 'external_apply', url: `https://boards.greenhouse.io/corp/jobs/${currentSelectedCardIndex}` };
        }
        if (script.includes('hasActiveLoaders') || script.includes('paneLoaders')) {
          return true;
        }
        return true;
      }),
    };

    const externalWebview = {
      getURL: vi.fn().mockReturnValue('https://boards.greenhouse.io/corp/jobs/1'),
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
          return { ready: true, missingRequired: [], unansweredQuestions: [], errors: [] };
        }
        if (script.includes('DETECT_FORWARD_BUTTON_SCRIPT') || script.includes('type="submit"')) {
          return { exists: true, action: 'submit', text: 'Submit Application', selector: '#submit_btn' };
        }
        if (script.includes('thank-you') || script.includes('application (has been )?submitted')) {
          return {
            isConfirmed: true,
            reason: 'URL indicates successful submission (/thank-you)',
            details: 'https://boards.greenhouse.io/corp/thank-you',
          };
        }
        return true;
      }),
    };

    const autoApply = new AutoApplyEngine();

    // persona has applicationLimit: 3, but let's test limit of 2 for external apply
    const personaWithLimit2: PersonaData = { ...basePersona, applicationLimit: 2 };

    await autoApply.startBatchApply(
      mainWebview as any,
      personaWithLimit2,
      'LinkedIn',
      true,
      async () => externalWebview,
      async () => {
        closedTabs.push('closed');
      },
      { stepDelayMs: 0 }
    );

    // Should submit exactly 2 external applications and then pause batch
    expect(appliedJobs.length).toBe(2);
    expect(closedTabs.length).toBe(2);
  }, 15000);
});
