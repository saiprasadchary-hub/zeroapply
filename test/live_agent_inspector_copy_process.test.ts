import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProcessLogText } from '../src/agent/ui/AgentLiveHUD';
import type { JobApplicationSession } from '../src/agent/tracker/processTracker';
import type { LiveActionRecord, TelemetryStats } from '../src/agent/telemetry/liveTelemetry';

describe('Live Agent Inspector - Copy Process Log Feature', () => {
  it('formats a complete structured process log report with all steps and Q&A items', () => {
    const mockSession: JobApplicationSession = {
      id: 'job_test_123',
      jobTitle: 'Partner Acquisition Specialist',
      companyName: 'Replate',
      portal: 'LinkedIn Easy Apply',
      url: 'https://www.linkedin.com/jobs/view/12345678',
      startedAt: 1774350000000,
      completedAt: 1774350025000,
      status: 'submitted',
      currentStepIndex: 3,
      questionsCount: 2,
      steps: [
        {
          id: 'step_1',
          stage: 'navigating',
          title: '1. Navigated to LinkedIn and clicked Easy Apply',
          description: 'Located posting and glided visual cursor to Easy Apply button.',
          timestamp: 1774350002000,
          status: 'completed',
        },
        {
          id: 'step_2',
          stage: 'form_step',
          stepNumber: 1,
          stepTitle: 'Contact info',
          title: 'Step 1: Contact info',
          description: 'Verified candidate phone number and email address.',
          buttonClicked: 'Next',
          timestamp: 1774350008000,
          status: 'completed',
        },
        {
          id: 'step_3',
          stage: 'form_step',
          stepNumber: 2,
          stepTitle: 'Resume',
          title: 'Step 2: Resume',
          description: 'Preserved pre-selected candidate resume: KSPChary_Resume_1Page.pdf.',
          buttonClicked: 'Next',
          timestamp: 1774350014000,
          status: 'completed',
        },
        {
          id: 'step_4',
          stage: 'answering_questions',
          title: 'Step 3: Screening Questions',
          description: 'Answering screening questions with local Qwen 2.5:3b and candidate persona.',
          buttonClicked: 'Review',
          timestamp: 1774350019000,
          status: 'completed',
          qaItems: [
            {
              id: 'qa_1',
              question: 'How many years of work experience do you have with Python?',
              answer: '3',
              source: 'persona',
              timestamp: 1774350017000,
            },
            {
              id: 'qa_2',
              question: 'Are you comfortable working in a hybrid environment in Hyderabad?',
              answer: 'Yes',
              source: 'llm',
              timestamp: 1774350018000,
            },
          ],
        },
        {
          id: 'step_5',
          stage: 'verifying_submission',
          title: 'Final Step 4: Submission Confirmation',
          description: 'Verified ATS confirmation view. Application submitted cleanly.',
          buttonClicked: 'Submit application',
          timestamp: 1774350024000,
          status: 'completed',
        },
      ],
    };

    const mockStats: TelemetryStats = {
      jobsAttempted: 1,
      jobsApplied: 1,
      fieldsFilled: 6,
      questionsSolved: 2,
      errorsCount: 0,
      lastActiveTimestamp: 1774350025000,
    };

    const report = buildProcessLogText(mockSession, [], mockStats, 'Qwen 2.5:3b');

    // Header & metadata assertions
    assert.ok(report.includes('ZEROAPPLY - AUTONOMOUS AGENT APPLICATION PROCESS REPORT'));
    assert.ok(report.includes('Job Role:          Partner Acquisition Specialist'));
    assert.ok(report.includes('Company:           Replate'));
    assert.ok(report.includes('Platform:          LinkedIn Easy Apply'));
    assert.ok(report.includes('Job Posting URL:   https://www.linkedin.com/jobs/view/12345678'));
    assert.ok(report.includes('Final Outcome:     SUBMITTED (Confirmed by ATS)'));
    assert.ok(report.includes('Fields Filled:     6'));
    assert.ok(report.includes('Questions Solved:  2'));

    // Step timeline assertions
    assert.ok(report.includes('[01]'));
    assert.ok(report.includes('Navigated to LinkedIn and clicked Easy Apply'));
    assert.ok(report.includes('[02]'));
    assert.ok(report.includes('Action: Clicked "Next"'));
    assert.ok(report.includes('[03]'));
    assert.ok(report.includes('Preserved pre-selected candidate resume'));
    assert.ok(report.includes('[04]'));
    assert.ok(report.includes('Question: "How many years of work experience do you have with Python?"'));
    assert.ok(report.includes('Answer:   "3" (Source: PERSONA)'));
    assert.ok(report.includes('Question: "Are you comfortable working in a hybrid environment in Hyderabad?"'));
    assert.ok(report.includes('Answer:   "Yes" (Source: LLM)'));
    assert.ok(report.includes('[05]'));
    assert.ok(report.includes('Action: Clicked "Submit application"'));
    assert.ok(report.includes('ZeroApply · Local Persona & Autonomous Navigation System · 100% On-Device'));
  });

  it('handles fallback when session has no steps but telemetry records exist', () => {
    const mockActions: LiveActionRecord[] = [
      {
        type: 'navigate',
        title: 'Navigating to LinkedIn Job Search',
        timestamp: 1774350000000,
        status: 'completed',
      },
      {
        type: 'type',
        title: 'Filled Email Address',
        value: 'candidate@example.com',
        timestamp: 1774350005000,
        status: 'completed',
      },
    ];

    const mockStats: TelemetryStats = {
      jobsAttempted: 1,
      jobsApplied: 0,
      fieldsFilled: 1,
      questionsSolved: 0,
      errorsCount: 0,
      lastActiveTimestamp: 1774350005000,
    };

    const report = buildProcessLogText(null, mockActions, mockStats);

    assert.ok(report.includes('ZEROAPPLY - AUTONOMOUS AGENT APPLICATION PROCESS REPORT'));
    assert.ok(report.includes('Navigating to LinkedIn Job Search'));
    assert.ok(report.includes('Filled Email Address -> "candidate@example.com"'));
  });
});
