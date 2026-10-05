/**
 * ZeroApply Workflow - State Machine
 * Finite State Machine enforcing deterministic lifecycle transitions:
 * idle -> analyzing -> scanning -> filling -> submitting -> confirming -> done.
 */

export type WorkflowState =
  | 'idle'
  | 'searching'
  | 'analyzing'
  | 'scanning'
  | 'resolving'
  | 'filling'
  | 'auditing'
  | 'submitting'
  | 'confirming'
  | 'done'
  | 'error';

export const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  idle: ['searching', 'analyzing', 'error'],
  searching: ['analyzing', 'idle', 'error'],
  analyzing: ['scanning', 'idle', 'error'],
  scanning: ['resolving', 'filling', 'auditing', 'done', 'idle', 'error'],
  resolving: ['filling', 'scanning', 'auditing', 'idle', 'error'],
  filling: ['auditing', 'scanning', 'submitting', 'done', 'idle', 'error'],
  auditing: ['scanning', 'filling', 'submitting', 'done', 'idle', 'error'],
  submitting: ['confirming', 'scanning', 'done', 'idle', 'error'],
  confirming: ['done', 'idle', 'error'],
  done: ['idle', 'searching'],
  error: ['idle', 'searching', 'analyzing'],
};

export class WorkflowStateMachine {
  private state: WorkflowState = 'idle';

  public getState(): WorkflowState {
    return this.state;
  }

  public can(nextState: WorkflowState): boolean {
    const allowed = VALID_TRANSITIONS[this.state] || [];
    return allowed.includes(nextState) || nextState === 'error' || nextState === 'idle';
  }

  public transition(nextState: WorkflowState): boolean {
    if (this.can(nextState)) {
      this.state = nextState;
      return true;
    }
    // Allow idempotent transition
    if (this.state === nextState) {
      return true;
    }
    console.warn(`[StateMachine] Invalid state transition: ${this.state} -> ${nextState}`);
    return false;
  }

  public reset(): void {
    this.state = 'idle';
  }
}
