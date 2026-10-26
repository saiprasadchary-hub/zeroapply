import React, { useSyncExternalStore } from 'react';
import { hasSecureStorageFailure, subscribeSecureStorageFailure } from '../services/secureStorage';

function StorageFailureNotice(): React.JSX.Element {
  return <main role="alert" className="min-h-screen flex items-center justify-center bg-white p-8 text-zinc-900">
    <div className="max-w-lg space-y-3"><h1 className="text-xl font-semibold">Saved data needs attention</h1>
      <p>ZeroApply could not read or save its protected data. Profile changes, cloud writes and automation are disabled to protect your information.</p>
      <p>Close the app and reopen it using the original launch method and macOS account. Your saved data has not been reset.</p>
    </div>
  </main>;
}

class StorageErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(error: unknown): { failed: boolean } {
    if (!hasSecureStorageFailure()) throw error;
    return { failed: true };
  }
  render(): React.ReactNode { return this.state.failed ? <StorageFailureNotice /> : this.props.children; }
}

export function StorageHealthGuard({ children }: React.PropsWithChildren): React.JSX.Element {
  const failed = useSyncExternalStore(subscribeSecureStorageFailure, hasSecureStorageFailure, hasSecureStorageFailure);
  return failed ? <StorageFailureNotice /> : <StorageErrorBoundary>{children}</StorageErrorBoundary>;
}
