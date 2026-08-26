import type { AgentRunResult } from '../orchestrator/agentEngine';

export type StandardFormOutcome = 'submitted' | 'review_ready' | 'needs_human' | 'stopped' | 'max_steps';

export interface StandardJobCandidate {
  title: string;
  company: string;
  url: string;
  alreadyApplied: boolean;
}

export interface StandardFormValidationResult {
  isValid: boolean;
  emptyCount: number;
  errorCount: number;
  messages?: string[];
}

export interface StandardFormConfirmation {
  confirmed: boolean;
  evidence?: string;
}

export interface StandardFormStepResult {
  success: boolean;
  action: 'next' | 'review' | 'submit' | 'none';
  text?: string;
  requiresConfirmation?: boolean;
}

export interface StandardFormWorkflowOptions {
  maxSteps: number;
  allowSubmit: boolean;
  isActive: () => boolean;
  wait: (milliseconds: number) => Promise<boolean>;
  fillCurrentStep: () => Promise<AgentRunResult>;
  advanceStep: (allowSubmit: boolean) => Promise<StandardFormStepResult>;
  executeScript: <T>(script: string) => Promise<T>;
  onStatus: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export interface StandardFormWorkflowResult {
  outcome: StandardFormOutcome;
  fieldsFilled: number;
  stepsCompleted: number;
  evidence?: string;
  qaPairs?: { question: string; answer: string }[];
}
