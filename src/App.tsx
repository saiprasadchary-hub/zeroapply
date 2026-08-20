import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PersonaData } from './types';
import { Header } from './components/Header';
import { PersonaForm } from './components/PersonaForm';
import { AgentBrowser } from './components/AgentBrowser';
import { ApplicationDashboard } from './components/ApplicationDashboard';
import { CheckCircle2, X } from 'lucide-react';
import { ProcessLog } from './components/ProcessLog';
import type { ProcessLogEntry } from './components/ProcessLog';
import { ProcessLogger } from './agent/tracker/processLogger';
import { ErrorLog } from './components/ErrorLog';
import type { ErrorLogEntry } from './components/ErrorLog';
import { ErrorLogger } from './agent/tracker/errorLogger';
import { SubmissionCheck } from './components/SubmissionCheck';
import { MobileBottomNav, type NavTab } from './components/MobileBottomNav';
import type { PlatformId } from './agent/ui/AgentControlBar';

const DEFAULT_PERSONA: PersonaData = {
  fullName: '',
  location: '',
  email: '',
  phone: '',
  linkedIn: '',
  gitHub: '',
  portfolio: '',
  experienceYears: 0,
  minSalary: 50,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: [],
  targetRoles: [],
  applyMode: 'easy',
  applicationLimit: 5,
  verified: false,
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(30); // percentage for PersonaForm on desktop
  const [pendingBrowserAction, setPendingBrowserAction] = useState<{ action: 'search' | 'fillApply' | 'autoApply'; platform: PlatformId; timestamp: number } | null>(null);
  const isResizingRef = useRef(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Persona Data with LocalStorage Persistence
  const [persona, setPersona] = useState<PersonaData>(() => {
    try {
      const saved = localStorage.getItem('persona_profile_default');
      return saved ? JSON.parse(saved) : DEFAULT_PERSONA;
    } catch {
      return DEFAULT_PERSONA;
    }
  });

  // Global Logs State (Bridged with ProcessLogger)
  const [globalLogs, setGlobalLogs] = useState<ProcessLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>(() => ErrorLogger.getErrors());

  useEffect(() => {
    const unsubscribe = ErrorLogger.subscribe((errs) => {
      setErrorLogs(errs);
    });
    return () => unsubscribe();
  }, []);

  // Save Persona changes automatically
  useEffect(() => {
    try {
      localStorage.setItem('persona_profile_default', JSON.stringify(persona));
    } catch (e) {
      console.error('Failed to auto-save persona to local storage:', e);
    }
  }, [persona]);

  // Global Error Catching
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const entry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        source: 'System Exception',
        message: event.message,
        stack: event.error?.stack || ''
      };
      setErrorLogs(prev => [...prev, entry]);
      ErrorLogger.log({
        source: 'System Exception',
        message: event.message,
        stack: event.error?.stack || '',
        severity: 'CRITICAL',
      });
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const msg = typeof event.reason === 'string' ? event.reason : event.reason?.message || 'Unknown Promise Rejection';
      const stk = event.reason?.stack || '';
      const entry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        source: 'Unhandled Promise',
        message: msg,
        stack: stk
      };
      setErrorLogs(prev => [...prev, entry]);
      ErrorLogger.log({
        source: 'Unhandled Promise',
        message: msg,
        stack: stk,
        severity: 'WARNING',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  // Resizer mouse drag handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const totalWidth = window.innerWidth;
      const newWidth = (e.clientX / totalWidth) * 100;
      if (newWidth >= 20 && newWidth <= 70) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  const appendProcessLog = useCallback((log: ProcessLogEntry) => {
    setGlobalLogs((previous) => [...previous, log]);

    ProcessLogger.log({
      id: log.id,
      level: log.type === 'error' ? 'ERROR' : log.type === 'success' ? 'SUCCESS' : log.type === 'warning' ? 'WARNING' : 'INFO',
      source: 'Agent Engine',
      message: log.message,
    });
    
    // Auto-forward agent errors to God-Level dashboard
    if (log.type === 'error') {
      ErrorLogger.log({
        source: 'Agent Engine',
        message: log.message,
        severity: 'CRITICAL',
      });
    }
  }, []);

  const [mobileDashboardSubTab, setMobileDashboardSubTab] = useState<'persona' | 'insights'>('persona');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f7f9fd] font-sans text-on-surface">
      {/* Top Navigation Header with Tab Switcher */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} errorCount={errorLogs.length} />

      {/* Main Content Area: Dashboard (Desktop Split vs Mobile Sub-Tabs) */}
      <main className={`flex-1 flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0 ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
        {/* Mobile View Toggle Bar */}
        <div className="md:hidden flex items-center justify-center p-2 bg-zinc-100 border-b border-zinc-200 gap-2 shrink-0">
          <button
            onClick={() => setMobileDashboardSubTab('persona')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              mobileDashboardSubTab === 'persona'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            👤 Candidate Persona
          </button>
          <button
            onClick={() => setMobileDashboardSubTab('insights')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              mobileDashboardSubTab === 'insights'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            📊 Application Stats
          </button>
        </div>

        {/* Persona Section */}
        <section
          style={{ width: window.innerWidth >= 768 ? `${leftWidth}%` : '100%' }}
          className={`bg-surface flex flex-col overflow-y-auto border-r border-outline-variant shrink-0 transition-none ${
            mobileDashboardSubTab === 'persona' ? 'flex-1 md:flex-none' : 'hidden md:flex'
          }`}
        >
          <PersonaForm
            persona={persona}
            setPersona={setPersona}
            onSaveToast={triggerToast}
            onLaunchBrowser={(action, platform) => {
              setPendingBrowserAction({ action, platform, timestamp: Date.now() });
              setActiveTab('browser');
              triggerToast(
                action === 'search'
                  ? `Searching ${platform} for listings...`
                  : action === 'autoApply'
                  ? `🚀 Full Auto-Apply launched for ${platform} (Searching & Applying)!`
                  : `Autonomous Fill & Apply started for ${platform}!`
              );
            }}
          />
        </section>

        {/* Desktop Draggable Resizer */}
        <div
          onMouseDown={() => {
            isResizingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="hidden md:block resizer w-1.5 surgical-line h-full z-30 shrink-0 select-none cursor-col-resize hover:bg-cyan-400 transition-colors"
          title="Drag to resize panes"
        />

        {/* Application Insights Section */}
        <section className={`flex-1 bg-white flex flex-col h-full overflow-hidden ${
          mobileDashboardSubTab === 'insights' ? 'flex' : 'hidden md:flex'
        }`}>
          <ApplicationDashboard globalLogs={globalLogs} />
        </section>
      </main>

      <main className={`flex-1 flex overflow-hidden relative pb-16 md:pb-0 ${activeTab === 'browser' ? '' : 'hidden'}`}>
        <AgentBrowser
          persona={persona}
          onSaveToast={triggerToast}
          onGlobalLog={appendProcessLog}
          pendingAction={pendingBrowserAction}
        />
      </main>

      <main className={`flex-1 flex overflow-hidden relative pb-16 md:pb-0 ${activeTab === 'process' ? '' : 'hidden'}`}>
        <ProcessLog logs={globalLogs} />
      </main>

      <main className={`flex-1 flex overflow-hidden relative pb-16 md:pb-0 ${activeTab === 'errors' ? '' : 'hidden'}`}>
        <ErrorLog errors={errorLogs} onClearErrors={() => setErrorLogs([])} />
      </main>

      <main className={`flex-1 flex overflow-hidden relative pb-16 md:pb-0 ${activeTab === 'qa' ? '' : 'hidden'}`}>
        <SubmissionCheck />
      </main>

      {/* Native App-Style Mobile Bottom Navigation Bar */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} errorCount={errorLogs.length} />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideUp text-xs font-semibold">
          <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
