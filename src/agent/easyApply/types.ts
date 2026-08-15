import type { AgentRunResult } from '../orchestrator/agentEngine';
import type { ApplicationStepResult } from '../stateMachine/stepNavigator';

export type EasyApplyOutcome = 'submitted' | 'paused' | 'stopped' | 'max_steps';

export interface EasyApplyWorkflowOptions {
  maxSteps: number;
  isActive: () => boolean;
  wait: (milliseconds: number) => Promise<boolean>;
  fillCurrentStep: () => Promise<AgentRunResult>;
  advanceStep: () => Promise<ApplicationStepResult>;
  executeScript: <T>(script: string) => Promise<T>;
  onStatus: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export interface EasyApplyWorkflowResult {
  outcome: EasyApplyOutcome;
  fieldsFilled: number;
  stepsCompleted: number;
  qaPairs?: { question: string; answer: string }[];
}
