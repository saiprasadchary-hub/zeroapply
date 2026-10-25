import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, X, Lock, Globe } from 'lucide-react';
import type { PersonaData } from '../../src/types';
import { ensureEmbeddedModelReady, stopEmbeddedModel } from '../../src/agent/llm/webLlmEngine';
import { phoneAgent, isPhoneRuntime, type BrowserPage } from './phoneBridge';
import { fillLinkedInApplication } from './linkedInWorkflow';

interface AndroidBrowserProps { persona: PersonaData; onSaveToast: (message: string) => void; pendingAction: unknown; isActive?: boolean; }
const INITIAL_URL = 'https://www.linkedin.com/';
export function websiteAddress(input: string): string {
  const value = input.trim();
  if (!value) throw new Error('Enter a website address or search.');
  if (/^https?:\/\//i.test(value)) return new URL(value).href;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^[\w.-]+:\d+(?:\/|$)/.test(value)) throw new Error('Use an HTTP or HTTPS website address.');
  if (!/\s/.test(value) && (value.includes('.') || /^localhost(?::\d+)?(?:\/|$)/.test(value))) return new URL(`https://${value}`).href;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}
export function AgentBrowser({ persona, onSaveToast, pendingAction, isActive = true }: AndroidBrowserProps): ReactElement {
  const [page, setPage] = useState<BrowserPage>({ url: INITIAL_URL, title: '', progress: 100, canGoBack: false, canGoForward: false, popup: false });
  const [address, setAddress] = useState(INITIAL_URL);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const editing = useRef(false);
  const started = useRef(false);
  const currentUrl = useRef(INITIAL_URL);
  const latestPersona = useRef(persona); latestPersona.current = persona;
  const active = useRef<AbortController | null>(null);
  const report = (error: unknown): void => setMessage(error instanceof Error ? error.message : 'Could not complete this browser action.');

  async function navigate(url: string): Promise<void> {
    if (!isPhoneRuntime()) { setMessage('Install the Android APK to use the browser.'); return; }
    setMessage(''); editing.current = false; setAddress(url); currentUrl.current = url;
    await phoneAgent.openBrowser({ url });
  }
  async function fillApplication(): Promise<void> {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller; setBusy(true);
    try {
      setMessage('Preparing phone AI…'); await ensureEmbeddedModelReady();
      if (controller.signal.aborted) return;
      const result = await fillLinkedInApplication(latestPersona.current, controller.signal);
      if (!controller.signal.aborted) { setMessage(result); onSaveToast(result); }
    } catch (error: unknown) { if (!controller.signal.aborted) report(error); }
    finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  function stopAI(): void {
    active.current?.abort(); active.current = null; setBusy(false);
    void stopEmbeddedModel().then((): void => setMessage('AI stopped.')).catch(report);
  }
  useEffect(() => {
    if (!isPhoneRuntime()) return;
    let disposed = false;
    const pageListener = phoneAgent.addListener('browserPage', (next): void => {
      if (disposed) return;
      setPage(next);
      if (next.url && next.url !== 'about:blank') { currentUrl.current = next.url; if (!editing.current) setAddress(next.url); }
    });
    const statusListener = phoneAgent.addListener('browserStatus', (event): void => { if (!disposed) setMessage(event.message); });
    return (): void => {
      disposed = true; active.current?.abort();
      for (const listener of [pageListener, statusListener]) void listener.then((handle): Promise<void> => handle.remove()).catch((): void => {});
      void phoneAgent.closeLinkedIn().catch((): void => {});
    };
  }, []);
  useEffect(() => {
    if (!isPhoneRuntime()) return;
    let disposed = false;
    let frame = 0;
    const synchronize = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame((): void => {
        if (disposed) return;
        const rect = viewport.current?.getBoundingClientRect();
        const navigation = document.querySelector('[aria-label="Mobile Navigation"]')?.getBoundingClientRect();
        const bottom = navigation && navigation.height > 0 ? Math.min(rect?.bottom ?? 0, navigation.top) : rect?.bottom ?? 0;
        const height = Math.max(0, bottom - (rect?.top ?? 0));
        const visible = isActive && Boolean(rect && rect.width > 0 && height > 0);
        void phoneAgent.setBrowserBounds({ left: rect?.left ?? 0, top: rect?.top ?? 0, width: rect?.width ?? 0, height, viewport: window.innerWidth, visible }).then(async (): Promise<void> => {
          if (visible && !started.current && !disposed) { started.current = true; try { await navigate(currentUrl.current); } catch (error: unknown) { started.current = false; report(error); } }
        }).catch(report);
      });
    };
    const observer = new ResizeObserver(synchronize);
    if (viewport.current) observer.observe(viewport.current);
    window.addEventListener('resize', synchronize); window.visualViewport?.addEventListener('resize', synchronize);
    synchronize();
    return (): void => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', synchronize); window.visualViewport?.removeEventListener('resize', synchronize);
      void phoneAgent.setBrowserBounds({ left: 0, top: 0, width: 0, height: 0, viewport: window.innerWidth, visible: false }).catch((): void => {});
    };
  }, [isActive]);
  useEffect((): void => {
    if (!pendingAction || typeof pendingAction !== 'object' || !('action' in pendingAction)) return;
    const starting = pendingAction.action === 'autoApply';
    const query = new URLSearchParams({ keywords: latestPersona.current.targetRoles[0] || '', location: latestPersona.current.location });
    const url = starting ? `https://www.linkedin.com/jobs/search/?${query}` : INITIAL_URL;
    void navigate(url).catch(report);
  }, [pendingAction]);
  function control(action: 'back' | 'forward' | 'reload' | 'stop' | 'closePopup'): void { setMessage(''); void phoneAgent.browserNavigate({ action }).catch(report); }
  const button = 'h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-zinc-700 disabled:opacity-30 hover:bg-zinc-100';
  const linkedIn = (() : boolean => { try { const url = new URL(page.url); return url.protocol === 'https:' && (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')); } catch { return false; } })();
  return <section className="w-full min-h-0 flex flex-col bg-white" aria-label="Web browser">
    <form className="flex items-center gap-2 px-3 pt-2" onSubmit={(event): void => { event.preventDefault(); try { void navigate(websiteAddress(address)).catch(report); (document.activeElement as HTMLElement | null)?.blur(); } catch (error: unknown) { report(error); } }}>
      <div className="flex flex-1 min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3">
        {page.url.startsWith('https:') ? <Lock size={16} aria-label="Secure connection"/> : <Globe size={16} aria-label="Website"/>}
        <input aria-label="Website address or search" className="w-full min-w-0 h-11 bg-transparent text-sm outline-none" value={address} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" onFocus={(): void => { editing.current = true; }} onChange={(event): void => setAddress(event.target.value)} onBlur={(): void => { editing.current = false; }}/>
      </div>
      <button type="submit" className="h-11 px-3 rounded-xl bg-cyan-50 text-cyan-800 font-semibold text-sm">Go</button>
    </form>
    <div className="flex items-center px-2 gap-1 border-b border-zinc-100">
      <button aria-label="Back" className={button} disabled={!page.canGoBack && !page.popup} onClick={(): void => control('back')}><ArrowLeft size={20}/></button>
      <button aria-label="Forward" className={button} disabled={!page.canGoForward} onClick={(): void => control('forward')}><ArrowRight size={20}/></button>
      <button aria-label={page.progress < 100 ? 'Stop loading' : 'Reload'} className={button} onClick={(): void => control(page.progress < 100 ? 'stop' : 'reload')}>{page.progress < 100 ? <X size={20}/> : <RotateCw size={19}/>}</button>
      {page.popup && <button aria-label="Close popup" className={button} onClick={(): void => control('closePopup')}><X size={20}/></button>}
      <div className="flex-1"/>
      {linkedIn && <button className="h-11 px-2 text-xs font-semibold text-cyan-800" onClick={(): void => { if (busy) stopAI(); else void fillApplication(); }}>{busy ? 'Stop AI' : 'AutoApply'}</button>}
      <button aria-label="Open in Chrome" title="Open in Chrome" className={button} onClick={(): void => { void phoneAgent.openChrome({ url: currentUrl.current }).catch(report); }}><ExternalLink size={19}/></button>
    </div>
    {page.progress < 100 && <div role="progressbar" aria-label="Loading website" aria-valuenow={page.progress} aria-valuemin={0} aria-valuemax={100} className="h-0.5 bg-cyan-100"><div className="h-full bg-cyan-600" style={{ width: `${page.progress}%` }}/></div>}
    {message && <div role="status" className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 border-b"><span className="flex-1">{message}</span><button aria-label="Dismiss message" className={button} onClick={(): void => setMessage('')}><X size={16}/></button></div>}
    <div ref={viewport} className="flex-1 min-h-0" aria-label={page.title || 'Website content'}/>
  </section>;
}
