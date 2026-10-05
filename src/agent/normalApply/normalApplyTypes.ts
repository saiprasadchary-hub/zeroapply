import type { PersonaData } from '../../types';

export type ExternalAtsKind =
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'ashby'
  | 'smartrecruiters'
  | 'taleo'
  | 'icims'
  | 'bamboohr'
  | 'generic';

export interface NormalApplyTarget {
  jobTitle: string;
  companyName: string;
  platform: string;
  externalUrl?: string;
  cardIndex?: number;
}

export interface TabBridgeCallbacks {
  openTab?: (url?: string) => Promise<any | null>;
  closeTabAndReturn?: (tabView?: any) => Promise<void>;
  notifyStatus?: (status: string) => void;
  notifyLog?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export interface NormalApplyConfig {
  maxSteps?: number;
  stepDelayMs?: number;
  allowSubmit?: boolean;
  pageSettledTimeoutMs?: number;
  auditMaxPasses?: number;
}

export interface SubmissionVerificationResult {
  isConfirmed: boolean;
  reason: string;
  details?: string;
}

export interface NormalApplyExecutionResult {
  outcome: 'submitted' | 'failed' | 'skipped' | 'manual_intervention_required';
  fieldsFilled: number;
  stepsExecuted: number;
  atsDetected?: string;
  finalUrl?: string;
  error?: string;
}
