import type { ReactElement } from 'react';
import type { PersonaData } from '../../src/types';

interface AndroidBrowserProps {
  persona: PersonaData;
  onSaveToast: (message: string) => void;
  pendingAction: unknown;
}

export function AgentBrowser(_props: AndroidBrowserProps): ReactElement {
  return <section className="w-full overflow-y-auto p-6 bg-white">
    <h1 className="text-xl font-bold mb-3">Your job browser</h1>
    <p className="text-sm text-zinc-600 mb-4">The desktop browser engine and built-in AI cannot run in this Android version. Your profile, resume and application dashboard use the same ZeroApply interface.</p>
    <p className="text-sm text-zinc-600 mb-5">Open a job site in your phone’s browser to apply manually. AutoApply remains available in the desktop app.</p>
    <div className="flex flex-col gap-3">
      <a className="rounded-xl border p-4 font-semibold" href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener noreferrer">Open LinkedIn jobs</a>
      <a className="rounded-xl border p-4 font-semibold" href="https://www.indeed.com/" target="_blank" rel="noopener noreferrer">Open Indeed jobs</a>
    </div>
  </section>;
}
