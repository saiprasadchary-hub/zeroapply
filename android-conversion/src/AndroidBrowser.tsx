import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { PersonaData } from '../../src/types';
import { ensureEmbeddedModelReady, stopEmbeddedModel } from '../../src/agent/llm/webLlmEngine';
import { phoneAgent, isPhoneRuntime } from './phoneBridge';
import { fillLinkedInApplication } from './linkedInWorkflow';

interface AndroidBrowserProps { persona: PersonaData; onSaveToast: (message: string) => void; pendingAction: unknown; }
export function AgentBrowser({persona,onSaveToast,pendingAction}: AndroidBrowserProps): ReactElement {
  const [message,setMessage] = useState('AI stays off until Review & start AutoApply. LinkedIn needs your internet connection; AI answers run on this phone.');
  const [busy,setBusy] = useState(false);
  const latestPersona = useRef(persona); latestPersona.current = persona;
  const active = useRef<AbortController | null>(null);

  async function openLinkedIn(starting: boolean): Promise<void> {
    if (!isPhoneRuntime()) { setMessage('Install the Android APK to use the native LinkedIn browser and phone AI.'); return; }
    setBusy(true);
    try {
      if (starting) { setMessage('Preparing phone AI. First use needs a one-time 1.1 GB download.'); await ensureEmbeddedModelReady(); }
      const query = new URLSearchParams({keywords:latestPersona.current.targetRoles[0]||'',location:latestPersona.current.location});
      await phoneAgent.openLinkedIn({url:starting?`https://www.linkedin.com/jobs/search/?${query}`:'https://www.linkedin.com/login'});
      setMessage('Sign in yourself and choose an Easy Apply job. Continue AutoApply fills its form with your profile and phone AI. Review and submit yourself.');
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Could not open phone AI or LinkedIn.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!isPhoneRuntime()) return;
    let disposed = false;
    const subscription = phoneAgent.addListener('browserControl',(event): void => {
      if (disposed) return;
      if (event.action !== 'continue') { active.current?.abort(); active.current = null; void stopEmbeddedModel().catch((): void => {}); return; }
      if (active.current) return;
      const controller = new AbortController(); active.current = controller;
      void fillLinkedInApplication(latestPersona.current,controller.signal).then(async (result: string): Promise<void> => {
        if (!controller.signal.aborted) { setMessage(result); await phoneAgent.showBrowserStatus({message:result}).catch((): void => {}); }
      }).catch(async (error: unknown): Promise<void> => {
        const result = error instanceof Error ? error.message : 'Could not fill this step. Review it manually.';
        if (!controller.signal.aborted) { setMessage(result); await phoneAgent.showBrowserStatus({message:result}).catch((): void => {}); }
      }).finally((): void => { if (active.current === controller) active.current = null; });
    });
    return (): void => { disposed = true; active.current?.abort(); void subscription.then((handle): Promise<void> => handle.remove()).catch((): void => {}); };
  },[]);
  useEffect((): void => {
    if (!pendingAction || typeof pendingAction !== 'object' || !('action' in pendingAction)) return;
    const action = (pendingAction as {action:unknown}).action;
    void openLinkedIn(action === 'autoApply');
  },[pendingAction]);

  return <section className="w-full overflow-y-auto p-6 bg-white">
    <h1 className="text-xl font-bold mb-3">LinkedIn with phone AI</h1>
    <p role="status" className="text-sm text-zinc-600 mb-4">{message}</p>
    <p className="text-sm text-zinc-600 mb-5">No computer or Ollama needed. The AI model is downloaded once and kept in the app’s private storage. Keep the app open while it works.</p>
    <div className="flex flex-col gap-3">
      <button disabled={busy} className="rounded-xl border p-4 font-semibold" onClick={():void=>{void openLinkedIn(false);}}>Open LinkedIn & sign in</button>
      <button className="rounded-xl border p-4 font-semibold" onClick={():void=>{active.current?.abort(); void stopEmbeddedModel().then(():void=>{setMessage('Stopped. Phone AI is off.');}).catch(():void=>{setMessage('Could not stop AI. Close the app to release it.');});}}>Stop & unload AI</button>
    </div>
    <p className="text-xs text-zinc-500 mt-5">Sign-in and security checks are handled by you. Review AI-filled answers before submitting. Phone compatibility and speed depend on available RAM and its 64-bit processor.</p>
  </section>;
}
