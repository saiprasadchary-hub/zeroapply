import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorLogger } from '../agent/tracker/errorLogger';

interface AppErrorBoundaryState {
  error: Error | null;
  recoveryKey: number;
  incidentId: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    error: null,
    recoveryKey: 0,
    incidentId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      error,
      incidentId: globalThis.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36),
    };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ReactErrorBoundary]', error, info.componentStack);
    ErrorLogger.log({
      source: 'ReactErrorBoundary',
      message: error.message.slice(0, 1_000) || 'The interface stopped unexpectedly.',
      stack: `${error.stack || ''}\n${info.componentStack || ''}`.slice(0, 8_000),
      severity: 'CRITICAL',
      resolved: false,
    });
  }

  private retryInterface = () => {
    this.setState((current) => ({
      error: null,
      incidentId: '',
      recoveryKey: current.recoveryKey + 1,
    }));
  };

  public render(): React.ReactNode {
    if (!this.state.error) {
      return <React.Fragment key={this.state.recoveryKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <main className="min-h-screen w-full bg-slate-50 p-6 flex items-center justify-center text-zinc-900">
        <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle size={28} />
          </div>
          <h1 className="mt-5 text-xl font-bold">ZeroApply recovered from an interface error</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Your saved profile and browser login session are safe. Retry the interface first, or reload the app if the problem returns.
          </p>
          <p className="mt-3 font-mono text-[11px] text-zinc-400">Incident {this.state.incidentId}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.retryInterface}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-700"
            >
              Retry interface
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold hover:bg-zinc-100"
            >
              <RefreshCw size={14} /> Reload ZeroApply
            </button>
          </div>
        </section>
      </main>
    );
  }
}
