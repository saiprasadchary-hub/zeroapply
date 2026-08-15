import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe, Lock, RotateCw, ExternalLink } from 'lucide-react';
import type { PersonaData } from '../types';
import { AgentEngine } from '../agent/orchestrator/agentEngine';
import { searchAndNavigate } from '../agent/searchAgent';
import type { StateMachineContext } from '../agent/stateMachine/appStateMachine';
import { AutoApplyEngine } from '../agent/autoApply/autoApplyEngine';
import { AgentLiveHUD } from '../agent/ui/AgentLiveHUD';
import { liveTelemetry } from '../agent/telemetry/liveTelemetry';

declare global {
  interface Window {
    zeroApply?: { isDesktop: boolean };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
}

import type { PlatformId } from '../agent/ui/AgentControlBar';

interface AgentBrowserProps {
  persona: PersonaData;
  onSaveToast: (message: string) => void;
  onGlobalLog?: (log: any) => void;
  pendingAction?: { action: 'search' | 'fillApply'; platform: PlatformId; timestamp: number } | null;
}

const LINKEDIN_SIGNUP_URL = 'https://www.linkedin.com/signup/cold-join';

const PLATFORMS: Array<{ id: PlatformId; label: string; loginUrl: string }> = [
  { id: 'linkedin', label: 'LinkedIn', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'unstop', label: 'Unstop', loginUrl: 'https://unstop.com/auth/login' },
  { id: 'indeed', label: 'Indeed', loginUrl: 'https://secure.indeed.com/account/login' },
  { id: 'glassdoor', label: 'Glassdoor', loginUrl: 'https://www.glassdoor.com/profile/login_input.htm' },
  { id: 'naukri', label: 'Naukri', loginUrl: 'https://www.naukri.com/nlogin/login' },
  { id: 'auto', label: 'Auto-Detect', loginUrl: 'https://www.google.com' },
];

export const AgentBrowser: React.FC<AgentBrowserProps> = ({ persona, onSaveToast, onGlobalLog, pendingAction }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('linkedin');
  const [url, setUrl] = useState<string>(PLATFORMS[0].loginUrl);
  const [activeUrl, setActiveUrl] = useState<string>(PLATFORMS[0].loginUrl);
  const [isElectron, setIsElectron] = useState(false);
  const webviewRef = useRef<any>(null);

  const agentEngineRef = useRef<AgentEngine>(new AgentEngine());
  const autoApplyEngineRef = useRef<AutoApplyEngine>(new AutoApplyEngine());
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  
  const [_agentContext, setAgentContext] = useState<StateMachineContext>(() =>
    agentEngineRef.current.getStateMachine().getContext()
  );

  const actionsRef = useRef({ handleSearchAndApply: () => {}, handleAutoFillAndApply: () => {} });

  useEffect(() => {
    if (!pendingAction) return;
    const { action, platform } = pendingAction;
    selectPlatform(platform);

    const timer = setTimeout(() => {
      if (action === 'search') {
        actionsRef.current.handleSearchAndApply();
      } else if (action === 'fillApply') {
        actionsRef.current.handleAutoFillAndApply();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pendingAction]);

  useEffect(() => {
    setIsElectron(window.zeroApply?.isDesktop === true);

    const unsubscribe = agentEngineRef.current.getStateMachine().subscribe((ctx) => {
      setAgentContext(ctx);
      if (onGlobalLog && ctx.lastMessage) {
        const now = new Date();
        const timestamp = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0') + ':' + 
                          now.getSeconds().toString().padStart(2, '0');
        
        let type: 'info' | 'success' | 'error' | 'warning' = 'info';
        if (ctx.currentState === 'ERROR') type = 'error';
        else if (ctx.currentState === 'SUBMITTED' || ctx.currentState === 'REVIEW_READY' || ctx.currentState === 'VERIFYING') type = 'success';
        else if (ctx.currentState === 'SCANNING') type = 'warning';
        
        onGlobalLog({
          id: Math.random().toString(36).substring(2, 9),
          timestamp,
          message: ctx.lastMessage,
          type
        });
      }
    });
    const autoApplyEngine = autoApplyEngineRef.current;

    autoApplyEngine.setStatusCallback((status) => {
      onSaveToast(status);
    });
    if (onGlobalLog) {
      autoApplyEngine.setLogCallback(onGlobalLog);
    }

    const view = webviewRef.current;
    if (view) {
      const handleNavigate = (e: any) => {
        if (e.url && /^https?:\/\//i.test(e.url)) {
          setUrl(e.url);
        }
      };
      
      const handleConsoleMessage = (e: any) => {
        if (e.message && e.message.startsWith('[ZA_ACTION]')) {
          try {
            const payloadStr = e.message.replace('[ZA_ACTION]', '').trim();
            const action = JSON.parse(payloadStr);
            liveTelemetry.emit(action);
          } catch (err) {
            console.error('Failed to parse ZA_ACTION telemetry', err);
          }
        } else if (e.message && e.message.startsWith('[ZA_TELEMETRY]')) {
          try {
            const payloadStr = e.message.replace('[ZA_TELEMETRY]', '').trim();
            const payload = JSON.parse(payloadStr);
            if (payload.question && payload.answer) {
              import('../agent/memory/questionMemory').then(({ QuestionMemoryBank }) => {
                QuestionMemoryBank.addOrUpdateEntry(payload.question, payload.answer, 'custom');
                onSaveToast(`Learned custom answer for "${payload.question}"!`);
              });
            }
          } catch (err) {
            console.error('Failed to parse telemetry', err);
          }
        }
      };
      
      view.addEventListener('did-navigate', handleNavigate);
      view.addEventListener('did-navigate-in-page', handleNavigate);
      view.addEventListener('console-message', handleConsoleMessage);
      return () => {
        unsubscribe();
        autoApplyEngine.stop();
        view.removeEventListener('did-navigate', handleNavigate);
        view.removeEventListener('did-navigate-in-page', handleNavigate);
        view.removeEventListener('console-message', handleConsoleMessage);
      };
    }

    return () => {
      unsubscribe();
      autoApplyEngine.stop();
    };
  }, [isElectron, onGlobalLog, onSaveToast]);

  const navigate = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = url.trim();
    if (!candidate) return;

    const nextUrl = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    try {
      const parsed = new URL(nextUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
      setActiveUrl(parsed.toString());
      setUrl(parsed.toString());
    } catch {
      onSaveToast('Enter a valid http:// or https:// address.');
    }
  };

  const go = (method: 'goBack' | 'goForward' | 'reload') => {
    const view = webviewRef.current;
    if (!view) return;
    if (method === 'goBack' && !view.canGoBack()) return;
    if (method === 'goForward' && !view.canGoForward()) return;
    view[method]();
  };

  const selectPlatform = (platformId: (typeof PLATFORMS)[number]['id']) => {
    const platform = PLATFORMS.find((item) => item.id === platformId);
    if (!platform) return;
    setSelectedPlatform(platformId);
    setUrl(platform.loginUrl);
    setActiveUrl(platform.loginUrl);
  };

  const openLinkedInSignup = () => {
    setSelectedPlatform('linkedin');
    setUrl(LINKEDIN_SIGNUP_URL);
    setActiveUrl(LINKEDIN_SIGNUP_URL);
  };

  const handleSearchAndApply = async () => {
    const roleKeyword = persona.targetRoles?.[0] || '';
    const location = persona.location || '';

    if (!roleKeyword.trim()) {
      onSaveToast('Please fill in at least one Target Role in your Persona before searching.');
      return;
    }

    const view = webviewRef.current;
    const platformLabel = PLATFORMS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform;
    const modeLabel = persona.applyMode === 'easy' ? 'Easy Apply' : 'Normal';

    onSaveToast(`Searching ${platformLabel} (${modeLabel}) for "${roleKeyword}" in "${location || 'Any'}"...`);
    await searchAndNavigate(view, selectedPlatform as any, roleKeyword, location, persona.applyMode);
  };

  const handleAutoFillAndApply = async () => {
    if (isAutoApplying) {
      autoApplyEngineRef.current.stop();
      setIsAutoApplying(false);
      onSaveToast('Stopping Auto-Apply...');
      return;
    }
    
    setIsAutoApplying(true);
    const view = webviewRef.current;
    const platformLabel = PLATFORMS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform;
    
    try {
      await autoApplyEngineRef.current.startBatchApply(view, persona, platformLabel);
    } catch (e) {
      console.error(e);
      onSaveToast('Auto-Apply encountered an error.');
    } finally {
      setIsAutoApplying(false);
    }
  };

  actionsRef.current = { handleSearchAndApply, handleAutoFillAndApply };



  return (
    <div className="flex-1 bg-white flex flex-col h-full relative overflow-hidden">
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* Browser Navigation Toolbar */}
        <div className="bg-[#EBF0F5] border-b border-zinc-300 px-3 py-2 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 text-zinc-600">
            <button type="button" onClick={() => go('goBack')} className="p-1 hover:bg-zinc-200 rounded" title="Back"><ArrowLeft size={15} /></button>
            <button type="button" onClick={() => go('goForward')} className="p-1 hover:bg-zinc-200 rounded" title="Forward"><ArrowRight size={15} /></button>
            <button type="button" onClick={() => go('reload')} className="p-1 hover:bg-zinc-200 rounded" title="Reload"><RotateCw size={15} /></button>
          </div>
          <form onSubmit={navigate} className="flex-1 flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-zinc-300 focus-within:border-cyan-500">
            <Lock size={12} className="text-emerald-600 shrink-0" />
            <input value={url} onChange={(event) => setUrl(event.target.value)} className="font-mono text-[11px] text-zinc-800 bg-transparent w-full outline-none" aria-label="Website address" />
          </form>
          <select
            value={selectedPlatform}
            onChange={(event) => selectPlatform(event.target.value as (typeof PLATFORMS)[number]['id'])}
            className="bg-white border border-zinc-300 rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-800 outline-none focus:border-cyan-500 cursor-pointer"
            aria-label="Job platform"
          >
            {PLATFORMS.map((platform) => <option key={platform.id} value={platform.id}>{platform.label}</option>)}
          </select>
        </div>

        {/* Webview Content */}
        <div className="flex-1 bg-white min-h-0 relative overflow-hidden">
          {/* Real-time God-Level Agent HUD Overlay */}
          <AgentLiveHUD isAutoApplying={isAutoApplying} />
          
          {isElectron ? (
            <webview
              ref={webviewRef}
              src={activeUrl}
              partition="persist:zeroapply_auth"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 bg-zinc-50/50">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100/60 text-cyan-600 flex items-center justify-center mb-4 ambient-shadow">
                <Globe size={32} />
              </div>
              <h2 className="font-bold text-lg text-zinc-900 tracking-tight">
                {PLATFORMS.find(p => p.id === selectedPlatform)?.label || 'Job Portal'} Live Access
              </h2>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                In Web Browser mode. Launch directly or open in Electron desktop container for embedded sign-in persistence.
              </p>
              
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-md hover:scale-105"
                >
                  <ExternalLink size={15} />
                  <span>Open {PLATFORMS.find(p => p.id === selectedPlatform)?.label} ↗</span>
                </a>
                {selectedPlatform === 'linkedin' && (
                  <a
                    href={LINKEDIN_SIGNUP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-800 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-zinc-100 transition-all"
                  >
                    <ExternalLink size={15} />
                    <span>Create LinkedIn account</span>
                  </a>
                )}
              </div>

              <div className="mt-8 border border-zinc-200 bg-white rounded-xl p-4 max-w-md w-full text-left space-y-2 text-xs ambient-shadow">
                <span className="font-mono font-bold text-zinc-700 block uppercase">Quick Launch Portals:</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PLATFORMS.map((p) => (
                    <a
                      key={p.id}
                      href={p.loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 border border-zinc-200 rounded-lg text-zinc-700 font-semibold transition-all flex items-center gap-1"
                    >
                      <span>{p.label}</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isElectron && selectedPlatform === 'linkedin' && activeUrl.includes('linkedin.com/login') && (
            <div className="absolute bottom-4 right-4 z-10">
              <button
                type="button"
                onClick={openLinkedInSignup}
                className="rounded-lg bg-white/95 border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-md hover:bg-zinc-50"
              >
                New to LinkedIn? Create an account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
