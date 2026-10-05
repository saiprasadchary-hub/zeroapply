export type AgentState =
  | 'IDLE'
  | 'SEARCHING'
  | 'MATCHING'
  | 'JOB_DETECTED'
  | 'SCANNING'
  | 'RESOLVING'
  | 'FILLING'
  | 'AUDITING'
  | 'ADVANCING'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'REVIEW_READY'
  | 'VERIFYING'
  | 'PAUSED'
  | 'ERROR'
  | 'SUCCESS';

export interface StateMachineContext {
  state: AgentState;
  currentState: AgentState;
  step: number;
  totalSteps: number;
  confidence: number;
  currentField: string;
  thought: string;
  lastMessage: string;
  detectedCount: number;
  detectedFieldsCount: number;
  filledCount: number;
  filledFieldsCount: number;
  history: string[];
  lastError?: string;
  jobTitle?: string;
  companyName?: string;
}

export type StateSubscriber = (context: StateMachineContext) => void;

export class AppStateMachine {
  private context: StateMachineContext = {
    state: 'IDLE',
    currentState: 'IDLE',
    step: 1,
    totalSteps: 5,
    confidence: 1.0,
    currentField: '',
    thought: 'Agent initialized in idle state.',
    lastMessage: 'Agent ready',
    detectedCount: 0,
    detectedFieldsCount: 0,
    filledCount: 0,
    filledFieldsCount: 0,
    history: ['Initialized'],
  };

  private subscribers: Set<StateSubscriber> = new Set();

  public getContext(): StateMachineContext {
    return { ...this.context };
  }

  public getState(): AgentState {
    return this.context.currentState;
  }

  public transition(nextState: AgentState, updates: Partial<StateMachineContext> = {}): void {
    const timestamp = new Date().toLocaleTimeString();
    const thought = updates.thought || updates.lastMessage || this.context.thought;
    const historyEntry = `[${timestamp}] ${this.context.currentState} -> ${nextState}: ${thought}`;
    
    const detected = updates.detectedFieldsCount ?? updates.detectedCount ?? this.context.detectedCount;
    const filled = updates.filledFieldsCount ?? updates.filledCount ?? this.context.filledCount;

    this.context = {
      ...this.context,
      ...updates,
      state: nextState,
      currentState: nextState,
      thought,
      lastMessage: thought,
      detectedCount: detected,
      detectedFieldsCount: detected,
      filledCount: filled,
      filledFieldsCount: filled,
      history: [...this.context.history.slice(-49), historyEntry],
    };

    this.notify();
  }

  public updateContext(updates: Partial<StateMachineContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      currentState: updates.currentState ?? updates.state ?? this.context.currentState,
      lastMessage: updates.lastMessage ?? updates.thought ?? this.context.lastMessage,
    };
    this.notify();
  }

  public subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.getContext());
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify(): void {
    const snapshot = this.getContext();
    this.subscribers.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('[AppStateMachine] Subscriber error:', err);
      }
    });
  }

  public reset(): void {
    this.transition('IDLE', {
      step: 1,
      totalSteps: 5,
      confidence: 1.0,
      currentField: '',
      thought: 'Ready for new application run.',
      lastMessage: 'Ready for new application run.',
      detectedCount: 0,
      detectedFieldsCount: 0,
      filledCount: 0,
      filledFieldsCount: 0,
      lastError: undefined,
    });
  }
}
