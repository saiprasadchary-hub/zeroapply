export type AgentState =
  | 'IDLE'
  | 'SCANNING'
  | 'MATCHING'
  | 'FILLING'
  | 'VERIFYING'
  | 'SELF_HEALING'
  | 'REVIEW_READY'
  | 'SUBMITTED'
  | 'PAUSED'
  | 'ERROR';

export interface StateMachineContext {
  currentState: AgentState;
  detectedFieldsCount: number;
  filledFieldsCount: number;
  errorFieldsCount: number;
  lastMessage: string;
  stepIndex: number;
}

export class ApplicationStateMachine {
  private context: StateMachineContext;
  private listeners: Array<(ctx: StateMachineContext) => void> = [];

  constructor() {
    this.context = {
      currentState: 'IDLE',
      detectedFieldsCount: 0,
      filledFieldsCount: 0,
      errorFieldsCount: 0,
      lastMessage: 'Ready to auto-fill application',
      stepIndex: 1,
    };
  }

  public getContext(): StateMachineContext {
    return { ...this.context };
  }

  public transition(newState: AgentState, message?: string, updates?: Partial<StateMachineContext>) {
    this.context = {
      ...this.context,
      ...updates,
      currentState: newState,
      lastMessage: message || `State changed to ${newState}`,
    };
    this.notify();
  }

  public subscribe(listener: (ctx: StateMachineContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getContext()));
  }
}
