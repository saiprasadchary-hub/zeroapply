import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PersonaData } from './types';
import { Header } from './components/Header';
import { PersonaForm } from './components/PersonaForm';
import { AgentBrowser } from '../AgentBrowser';
import { ApplicationDashboard } from './components/ApplicationDashboard';
import { CheckCircle2, X, Bot } from 'lucide-react';
import { SubmissionCheck } from './components/SubmissionCheck';
import { ResumeStudio } from './resume';
import { ProfilePage } from './profile';
import { MobileBottomNav, type NavTab } from './components/MobileBottomNav';
import type { PlatformId } from './agent/ui/AgentControlBar';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { FirebaseCloudSync } from './services/firebase/cloudSyncService';
import { PersonaManager } from './persona/personaManager';

const DEFAULT_PERSONA: PersonaData = {
  fullName: 'Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  postalCode: '500081',
  email: 'saiprasad.chary@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/saiprasad-chary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: '',
  experienceYears: 4,
  minSalary: 18,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['TypeScript', 'React', 'Node.js', 'Python', 'TailwindCSS', 'PostgreSQL', 'Docker', 'AWS', 'Next.js', 'GraphQL'],
  targetRoles: ['Full Stack Engineer', 'Software Engineer', 'Frontend Developer', 'AI/ML Engineer'],
  applyMode: 'easy',
  browserMode: 'agent',
  applicationLimit: 10,
  verified: true,
  resumeChunks: {
    summary: 'High-impact Software Engineer with 4+ years of hands-on experience building scalable distributed web applications, modern React/TypeScript user interfaces, and automated AI agents.',
    skills: 'TypeScript, JavaScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS',
    education: 'Bachelor of Technology (B.Tech) in Computer Science & Engineering',
    experience: 'Full Stack Engineer: Architected high-performance web applications, implemented automated workflows, and reduced API response latencies by 35%.',
    languages: 'English (Professional), Hindi, Telugu',
  },
};

const MainDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(30); // percentage for PersonaForm on desktop
  const [pendingBrowserAction, setPendingBrowserAction] = useState<{ action: 'search' | 'fillApply' | 'autoApply'; platform: PlatformId; timestamp: number } | null>(null);
  const isResizingRef = useRef(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cloudProfilesLoadedRef = useRef(false);
  const cloudProfileMigrationRef = useRef<string | null>(null);

  // Initialize Persona Data with local Active Profile and Firebase Cloud Firestore
  const [persona, setPersona] = useState<PersonaData>(() => {
    try {
      const active = PersonaManager.getActiveProfile();
      if (active?.data && (active.data.fullName || active.data.email || active.data.techStack?.length || active.data.resumeText)) {
        return active.data;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_PERSONA;
  });

  // Subscribe to real-time Persona updates from Firebase Cloud Firestore
  useEffect(() => {
    cloudProfilesLoadedRef.current = false;
    if (!user?.uid) return;
    const unsubscribe = FirebaseCloudSync.subscribeToPersona(user?.uid, (cloudData) => {
      if (cloudData && !cloudProfilesLoadedRef.current) {
        setPersona(cloudData);
      }
    });

    // Also fetch initial data if exists
    FirebaseCloudSync.getPersona(user?.uid).then((initialData) => {
      if (initialData && !cloudProfilesLoadedRef.current) {
        setPersona(initialData);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return FirebaseCloudSync.subscribeToPersonaProfiles(user.uid, ({ profiles, activeProfileId }) => {
      if (profiles.length === 0) {
        if (cloudProfileMigrationRef.current !== user.uid) {
          cloudProfileMigrationRef.current = user.uid;
          const localProfiles = PersonaManager.getProfiles().map(({ savedResume: _savedResume, ...profile }) => profile);
          void FirebaseCloudSync.savePersonaProfiles(localProfiles, PersonaManager.getActiveProfileId(), user.uid);
        }
        return;
      }
      cloudProfilesLoadedRef.current = true;
      const restored = PersonaManager.restoreCloudProfiles(profiles, activeProfileId);
      const activeId = PersonaManager.getActiveProfileId();
      const activeProfile = restored.find((profile) => profile.id === activeId) ?? restored[0];
      if (activeProfile) setPersona(activeProfile.data);
    });
  }, [user?.uid]);

  // Save Persona changes automatically to Firebase Cloud Firestore
  useEffect(() => {
    if (!user?.uid || !(persona.fullName || persona.email || persona.techStack.length > 0)) return;
    const timer = setTimeout(() => void FirebaseCloudSync.savePersona(persona, user.uid), 800);
    return () => clearTimeout(timer);
  }, [persona, user?.uid]);

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

  const [mobileDashboardSubTab, setMobileDashboardSubTab] = useState<'persona' | 'insights'>('persona');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f7f9fd] font-sans text-on-surface">
      {/* Top Navigation Header with Tab Switcher */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area: Dashboard (Desktop Split vs Mobile Sub-Tabs) */}
      {/* Main Content Area: Dashboard (Desktop Split vs Mobile Sub-Tabs) */}
      <main className={`flex-1 flex flex-col md:flex-row overflow-hidden relative max-md:pb-mobile-nav md:!pb-0 ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
        {/* Mobile View Toggle Bar (Native Segmented Control) */}
        <div className="md:hidden flex items-center justify-center p-2 bg-zinc-100/90 border-b border-zinc-200/80 shrink-0 backdrop-blur-xs">
          <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl w-full max-w-sm gap-1 border border-zinc-300/60 shadow-inner">
            <button
              type="button"
              onClick={() => setMobileDashboardSubTab('persona')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileDashboardSubTab === 'persona'
                  ? 'bg-white text-zinc-950 shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>👤 Candidate Persona</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDashboardSubTab('insights')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileDashboardSubTab === 'insights'
                  ? 'bg-white text-zinc-950 shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>📊 Application Stats</span>
            </button>
          </div>
        </div>

        {/* Persona Section */}
        <section
          style={{ '--persona-width': `${leftWidth}%` } as React.CSSProperties}
          className={`w-full md:w-[var(--persona-width)] bg-surface flex flex-col overflow-y-auto border-r border-outline-variant shrink-0 transition-none ${
            mobileDashboardSubTab === 'persona' ? 'flex-1 md:flex-none' : 'hidden md:flex'
          }`}
        >
          <PersonaForm
            persona={persona}
            setPersona={setPersona}
            onSaveToast={triggerToast}
            onNavigateToResume={() => setActiveTab('resume')}
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
          <ApplicationDashboard />
        </section>
      </main>

      <main className={`flex-1 flex overflow-hidden relative max-md:pb-mobile-nav md:!pb-0 ${activeTab === 'browser' ? '' : 'hidden'}`}>
        <AgentBrowser
          persona={persona}
          onSaveToast={triggerToast}
          pendingAction={pendingBrowserAction}
        />
      </main>

      <main className={`flex-1 flex overflow-hidden relative max-md:pb-mobile-nav md:!pb-0 ${activeTab === 'qa' ? '' : 'hidden'}`}>
        <SubmissionCheck />
      </main>

      <main className={`flex-1 min-h-0 flex flex-col overflow-hidden relative max-md:pb-mobile-nav md:!pb-0 ${activeTab === 'resume' ? '' : 'hidden'}`}>
        <ResumeStudio
          persona={persona}
          onSaveToast={triggerToast}
        />
      </main>

      <main className={`flex-1 flex overflow-hidden relative max-md:pb-mobile-nav md:!pb-0 ${activeTab === 'profile' ? '' : 'hidden'}`}>
        <ProfilePage
          persona={persona}
          onUpdatePersona={setPersona}
          onNavigateToTab={setActiveTab}
          onToast={triggerToast}
        />
      </main>

      {/* Native App-Style Mobile Bottom Navigation Bar */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideUp text-xs font-semibold">
          <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToastMessage(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#fbfbfd] flex flex-col items-center justify-center text-zinc-900">
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/10 animate-pulse">
            <Bot size={24} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-xs font-medium text-zinc-500 animate-pulse">Initializing ZeroApply...</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginPage />;
  }

  return <MainDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
