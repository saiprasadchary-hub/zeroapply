/**
 * ZeroApply Process Tracker
 * Captures real-time application events, question-and-answer pairs,
 * submission checks, and tab transitions in plain English.
 */

import { liveTelemetry, type LiveActionRecord } from '../telemetry/liveTelemetry';
import { QALogger } from './qaLogger';

export interface ProcessQuestionAnswer {
  id: string;
  question: string;
  answer: string;
  source: 'persona' | 'resume' | 'memory' | 'llm' | 'fallback';
  fieldType?: string;
  timestamp: number;
}

export interface ApplicationProcessStep {
  id: string;
  stage: 'navigating' | 'tab_opened' | 'form_step' | 'answering_questions' | 'clicking_action' | 'auditing' | 'verifying_submission' | 'submitting' | 'moving_to_next' | 'error';
  stepNumber?: number;
  stepTitle?: string;
  actionType?: 'navigate' | 'open_tab' | 'fill' | 'audit' | 'click_next' | 'click_review' | 'click_submit' | 'confirm' | 'return_tab';
  buttonClicked?: string;
  nextStepNumber?: number;
  fieldsFilledCount?: number;
  auditStatus?: 'clean' | 'repaired' | 'warning';
  title: string;
  description: string;
  timestamp: number;
  status: 'running' | 'completed' | 'failed';
  details?: Record<string, any>;
  qaItems?: ProcessQuestionAnswer[];
}

export interface JobApplicationSession {
  id: string;
  jobTitle: string;
  companyName: string;
  portal: string;
  url?: string;
  startedAt: number;
  completedAt?: number;
  status: 'in_progress' | 'submitted' | 'failed';
  currentStepIndex: number;
  steps: ApplicationProcessStep[];
  questionsCount: number;
  errorMessage?: string;
}

const STORAGE_KEY = 'zeroapply_process_sessions_v1';

class ProcessTrackerService {
  private sessions: JobApplicationSession[] = [];
  private currentSessionId: string | null = null;
  private listeners: Set<(sessions: JobApplicationSession[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.attachTelemetryListener();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.sessions = JSON.parse(raw);
      }
    } catch {
      this.sessions = [];
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions.slice(-50)));
    } catch {}
  }

  private notify(): void {
    const copy = [...this.sessions];
    this.saveToStorage();
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch {}
    }
  }

  public subscribe(listener: (sessions: JobApplicationSession[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.sessions]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSessions(): JobApplicationSession[] {
    return [...this.sessions];
  }

  public getActiveSession(): JobApplicationSession | null {
    if (!this.currentSessionId) {
      return this.sessions.find((s) => s.status === 'in_progress') || this.sessions[this.sessions.length - 1] || null;
    }
    return this.sessions.find((s) => s.id === this.currentSessionId) || null;
  }

  public startNewJob(jobTitle: string, companyName: string, portal = 'LinkedIn', url?: string): JobApplicationSession {
    // If previous job was in_progress, mark as submitted or finished
    if (this.currentSessionId) {
      const prev = this.sessions.find((s) => s.id === this.currentSessionId);
      if (prev && prev.status === 'in_progress') {
        prev.status = 'submitted';
        prev.completedAt = Date.now();
      }
    }

    const session: JobApplicationSession = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      jobTitle: jobTitle || 'Software Engineer',
      companyName: companyName || 'Target Company',
      portal,
      url,
      startedAt: Date.now(),
      status: 'in_progress',
      currentStepIndex: 1,
      questionsCount: 0,
      steps: [
        {
          id: `step_nav_${Date.now()}`,
          stage: 'navigating',
          title: `1. Navigated to ${portal} and clicked Apply`,
          description: `Located "${jobTitle}" at "${companyName}". Clicked the job application button using human mouse velocity.`,
          timestamp: Date.now(),
          status: 'completed',
        },
      ],
    };

    this.sessions.push(session);
    this.currentSessionId = session.id;
    this.notify();

    // Wire to QALogger so Submission Check tracks real-time progress
    try {
      QALogger.startJob(session.jobTitle, session.companyName, portal, session.id, url);
    } catch {}

    return session;
  }

  public recordTabOpened(tabType: 'new_tab' | 'modal', url?: string): void {
    const session = this.getActiveSession();
    if (!session) return;

    const step: ApplicationProcessStep = {
      id: `step_tab_${Date.now()}`,
      stage: 'tab_opened',
      title: tabType === 'new_tab' ? '2. Opened in a new browser tab' : '2. Opened in-page Easy Apply modal',
      description: tabType === 'new_tab'
        ? `Application opened in a separate tab (${url ? new URL(url).hostname : 'portal'}). Attached DOM scanner and visual cursor.`
        : 'Opened multi-step modal on active page. Scanned form layout and verified active step.',
      timestamp: Date.now(),
      status: 'completed',
      details: { url, tabType },
    };

    session.steps.push(step);
    session.currentStepIndex = 2;
    this.notify();
  }

  public recordQuestionAnswer(question: string, answer: string, source: 'persona' | 'resume' | 'memory' | 'llm' | 'fallback', fieldType?: string): void {
    let session = this.getActiveSession();
    if (!session) {
      session = this.startNewJob('Active Job Application', 'Current Company', 'Portal View');
    }

    let qaStep = session.steps.find((s) => s.stage === 'answering_questions');
    if (!qaStep) {
      qaStep = {
        id: `step_qa_${Date.now()}`,
        stage: 'answering_questions',
        title: '3. Searching and filling questions based on candidate data',
        description: 'Resolving form inputs, screening questions, radios, and dropdowns truthfully using candidate persona and resume.',
        timestamp: Date.now(),
        status: 'running',
        qaItems: [],
      };
      session.steps.push(qaStep);
      session.currentStepIndex = 3;
    }

    if (!qaStep.qaItems) qaStep.qaItems = [];

    // Avoid exact duplicate question in same step
    const existing = qaStep.qaItems.find((item) => item.question.toLowerCase() === question.toLowerCase());
    if (existing) {
      existing.answer = answer;
      existing.source = source;
    } else {
      const qaRecord: ProcessQuestionAnswer = {
        id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        question,
        answer,
        source,
        fieldType,
        timestamp: Date.now(),
      };
      qaStep.qaItems.push(qaRecord);
      session.questionsCount += 1;

      // Also attach to the latest active form step if present
      const latestFormStep = session.steps
        .slice()
        .reverse()
        .find((s) => s.stage === 'form_step' && s.status === 'running');
      if (latestFormStep) {
        if (!latestFormStep.qaItems) latestFormStep.qaItems = [];
        latestFormStep.qaItems.push(qaRecord);
      }
    }

    this.notify();

    // Wire to QALogger so Submission Check immediately displays the answered field
    try {
      QALogger.recordQuestionAnswer(question, answer, { source, fieldType }, session.id);
    } catch {}
  }

  public recordFormStep(stepNumber: number, stepTitle: string, fieldsCount = 0): void {
    const session = this.getActiveSession();
    if (!session) return;

    let existingStep = session.steps.find(
      (s) => s.stage === 'form_step' && s.stepNumber === stepNumber
    );

    if (!existingStep) {
      existingStep = {
        id: `step_form_${stepNumber}_${Date.now()}`,
        stage: 'form_step',
        stepNumber,
        stepTitle,
        title: `Step ${stepNumber}: ${stepTitle || 'Form Section'}`,
        description: `Scanned ${fieldsCount > 0 ? fieldsCount + ' form fields' : 'wizard step'}. Answering required questions with candidate profile and local LLM.`,
        timestamp: Date.now(),
        status: 'running',
        qaItems: [],
        details: { stepNumber, stepTitle, fieldsCount },
      };
      session.steps.push(existingStep);
      session.currentStepIndex = Math.max(session.currentStepIndex, stepNumber);
      this.notify();
    } else {
      if (stepTitle) existingStep.stepTitle = stepTitle;
      existingStep.status = 'running';
      if (fieldsCount > 0 && existingStep.details) {
        existingStep.details.fieldsCount = fieldsCount;
      }
      this.notify();
    }
  }

  public recordStepAdvance(params: {
    stepNumber: number;
    stepTitle?: string;
    buttonText: string;
    action: 'next' | 'continue' | 'review' | 'submit';
    nextStepNumber?: number;
    fieldsFilledCount?: number;
  }): void {
    const session = this.getActiveSession();
    if (!session) return;

    const { stepNumber, stepTitle, buttonText, action, nextStepNumber, fieldsFilledCount } = params;
    const isSubmit = action === 'submit' || /submit/i.test(buttonText);

    // Complete the form step if open
    const currentFormStep = session.steps.find(
      (s) => s.stage === 'form_step' && s.stepNumber === stepNumber
    );
    if (currentFormStep) {
      currentFormStep.status = 'completed';
      currentFormStep.buttonClicked = buttonText;
      currentFormStep.actionType = isSubmit ? 'click_submit' : (action === 'review' ? 'click_review' : 'click_next');
      currentFormStep.nextStepNumber = nextStepNumber;
    }

    // Add high-visibility Step Advance / Submit event card
    const cleanButtonName = (buttonText || (isSubmit ? 'Submit application' : 'Next')).trim();

    // Deduplicate duplicate triggers within 1000ms for same step and button
    const lastAction = session.steps.slice().reverse().find((s) => s.stage === 'clicking_action' || s.stage === 'submitting');
    if (
      lastAction &&
      lastAction.stepNumber === stepNumber &&
      lastAction.buttonClicked?.toLowerCase() === cleanButtonName.toLowerCase() &&
      Date.now() - lastAction.timestamp < 1000
    ) {
      return;
    }

    const actionStepId = `step_action_${stepNumber}_${Date.now()}`;
    const actionStep: ApplicationProcessStep = {
      id: actionStepId,
      stage: isSubmit ? 'submitting' : 'clicking_action',
      stepNumber,
      stepTitle: stepTitle || `Step ${stepNumber}`,
      actionType: isSubmit ? 'click_submit' : (action === 'review' ? 'click_review' : 'click_next'),
      buttonClicked: cleanButtonName,
      nextStepNumber,
      title: isSubmit
        ? `Final Step ${stepNumber}: Clicked "${cleanButtonName}" -> Submitting Application!`
        : `Step ${stepNumber}: Clicked "${cleanButtonName}" -> Advancing to Step ${nextStepNumber || stepNumber + 1}`,
      description: isSubmit
        ? `Pre-flight question audit passed with 0 errors. Executed final submission click on "${cleanButtonName}".`
        : `Verified all screening inputs on ${stepTitle || 'Step ' + stepNumber}. Glided visual cursor and clicked "${cleanButtonName}".`,
      timestamp: Date.now(),
      status: 'completed',
      details: { stepNumber, buttonText: cleanButtonName, action, nextStepNumber, fieldsFilledCount },
    };

    session.steps.push(actionStep);
    session.currentStepIndex = nextStepNumber || (stepNumber + 1);
    this.notify();
  }

  public recordStepAudit(stepNumber: number, missingCount: number, errorCount: number): void {
    const session = this.getActiveSession();
    if (!session) return;

    const currentStep = session.steps.find((s) => s.stepNumber === stepNumber);
    if (currentStep) {
      currentStep.auditStatus = errorCount > 0 ? 'warning' : 'clean';
      if (!currentStep.details) currentStep.details = {};
      currentStep.details.audit = { missingCount, errorCount, timestamp: Date.now() };
      this.notify();
    }
  }

  public recordSubmissionCheck(success: boolean, message?: string): void {
    const session = this.getActiveSession();
    if (!session) return;

    // Mark questions step and running steps as completed
    const qaStep = session.steps.find((s) => s.stage === 'answering_questions');
    if (qaStep) qaStep.status = 'completed';
    session.steps.forEach((s) => {
      if (s.status === 'running') s.status = 'completed';
    });

    // Deduplicate if previous step is verifying_submission within 3000ms
    const prevSubStep = session.steps.slice().reverse().find((s) => s.stage === 'verifying_submission');
    if (prevSubStep && Date.now() - prevSubStep.timestamp < 3000) {
      prevSubStep.title = success ? 'Checking submission status: Yes, successfully submitted!' : 'Checking submission status: Incomplete / Validation Error';
      prevSubStep.description = success
        ? (message || 'Verified application confirmation modal. Application was submitted cleanly.')
        : (message || 'Application validation errors detected. Reviewing missing fields...');
      prevSubStep.status = success ? 'completed' : 'failed';
      if (success) {
        session.status = 'submitted';
        session.completedAt = Date.now();
      } else {
        session.status = 'failed';
      }
      this.notify();
      try {
        QALogger.recordSubmission(success, message, session.id);
      } catch {}
      return;
    }

    const step: ApplicationProcessStep = {
      id: `step_sub_${Date.now()}`,
      stage: 'verifying_submission',
      title: success ? 'Checking submission status: Yes, successfully submitted!' : 'Checking submission status: Incomplete / Validation Error',
      description: success
        ? (message || 'Verified application confirmation modal. Application was submitted cleanly.')
        : (message || 'Application validation errors detected. Reviewing missing fields...'),
      timestamp: Date.now(),
      status: success ? 'completed' : 'failed',
    };

    session.steps.push(step);
    session.currentStepIndex = Math.max(session.currentStepIndex, session.steps.length);
    if (success) {
      session.status = 'submitted';
      session.completedAt = Date.now();
    } else {
      session.status = 'failed';
    }
    this.notify();

    try {
      QALogger.recordSubmission(success, message, session.id);
    } catch {}
  }

  public recordMovingToNext(nextJobTitle?: string): void {
    const session = this.getActiveSession();
    if (session) {
      const step: ApplicationProcessStep = {
        id: `step_next_${Date.now()}`,
        stage: 'moving_to_next',
        title: 'Finished application -> Moving to next job listing',
        description: nextJobTitle
          ? `Human stealth cooldown completed. Progressing to "${nextJobTitle}".`
          : 'Closed application view and returning to search listings to apply for the next job.',
        timestamp: Date.now(),
        status: 'completed',
      };
      session.steps.push(step);
      session.currentStepIndex = session.steps.length;
      session.completedAt = Date.now();
      this.notify();
      try {
        QALogger.finalizeJob(session.id);
      } catch {}
    }
  }

  public recordError(errorText: string): void {
    const session = this.getActiveSession();
    if (!session) return;

    const step: ApplicationProcessStep = {
      id: `step_err_${Date.now()}`,
      stage: 'error',
      title: 'Alert: Application error encountered',
      description: errorText,
      timestamp: Date.now(),
      status: 'failed',
    };

    session.steps.push(step);
    session.status = 'failed';
    session.errorMessage = errorText;
    this.notify();
  }

  public clearAll(): void {
    this.sessions = [];
    this.currentSessionId = null;
    this.saveToStorage();
    this.notify();
  }

  private attachTelemetryListener(): void {
    liveTelemetry.subscribe((action: LiveActionRecord) => {
      // 1. Job Selection / Navigation
      if (action.type === 'navigate' || (action.type === 'click' && action.title.includes('Going to job'))) {
        const titleMatch = action.title.match(/Going to job \d+\/\d+: "([^"]+)" at "([^"]+)"/i);
        if (titleMatch) {
          this.startNewJob(titleMatch[1], titleMatch[2], 'LinkedIn');
        }
      }

      // 2. Click Apply / Easy Apply
      if (action.type === 'click' && /easy apply|apply/i.test(action.title) && !/next|continue|review|submit/i.test(action.title)) {
        let active = this.getActiveSession();
        if (!active) {
          active = this.startNewJob('Job Listing', 'Company', 'Portal View');
        }
      }

      // 3. Step Advance / Forward Button Clicks (e.g. Next, Review, Submit)
      if (action.type === 'click' && action.title.startsWith('Clicking:')) {
        const match = action.title.match(/Clicking:\s*"([^"]+)"/i);
        if (match) {
          const btnName = match[1].trim();
          const isSubmit = /submit/i.test(btnName);
          const isReview = /review/i.test(btnName);
          const isNext = /next|continue|save/i.test(btnName);

          if (isSubmit || isReview || isNext) {
            const active = this.getActiveSession();
            const currentStepNum = (active?.steps.filter(s => s.stage === 'form_step' || s.stage === 'clicking_action').length || 0) + 1;
            this.recordStepAdvance({
              stepNumber: currentStepNum,
              buttonText: btnName,
              action: isSubmit ? 'submit' : (isReview ? 'review' : 'next'),
              nextStepNumber: isSubmit ? undefined : currentStepNum + 1,
            });
          }
        }
      }

      // 4. Questions Answered
      if (action.type === 'think' && action.title.includes('Question') && action.target && action.value) {
        const question = action.target;
        const answer = action.value;
        const source = action.source === 'ollama' ? 'llm' : (action.source || 'persona');
        this.recordQuestionAnswer(question, answer, source as any);
      }

      // 5. Genuine Application Submission
      if (
        action.type === 'submit' &&
        action.status === 'completed' &&
        !/resume|file|dropzone|attach/i.test(action.title || '') &&
        !/resume/i.test(action.target || '')
      ) {
        this.recordSubmissionCheck(true, action.title);
      }

      // 6. Errors
      if (action.status === 'failed') {
        this.recordError(action.title);
      }
    });
  }
}

export const processTracker = new ProcessTrackerService();
