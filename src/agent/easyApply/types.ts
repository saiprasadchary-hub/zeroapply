import type { AgentRunResult } from '../orchestrator/agentEngine';
import type { ApplicationStepResult } from '../stateMachine/stepNavigator';
import type { WorkflowCheckpoint } from '../recovery/workflowRecovery';

export type EasyApplyOutcome = 'submitted' | 'paused' | 'stopped' | 'max_steps';

export interface EasyApplyWorkflowOptions {
  maxSteps: number;
  allowSubmit: boolean;
  isActive: () => boolean;
  wait: (milliseconds: number) => Promise<boolean>;
  fillCurrentStep: () => Promise<AgentRunResult>;
  advanceStep: (allowSubmit: boolean) => Promise<ApplicationStepResult>;
  executeScript: <T>(script: string) => Promise<T>;
  onStatus: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  checkpointKey?: string;
  resumeCheckpoint?: WorkflowCheckpoint;
}

export interface EasyApplyWorkflowResult {
  outcome: EasyApplyOutcome;
  fieldsFilled: number;
  stepsCompleted: number;
  qaPairs?: { question: string; answer: string }[];
  checkpoint?: WorkflowCheckpoint;
  recoveryCount?: number;
  haltBatch?: boolean;
}
