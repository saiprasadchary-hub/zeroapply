import { StrictMode, useEffect, useState, type ReactElement, type FormEvent, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { UserRound, FileText, ChartNoAxesColumn, CircleHelp } from 'lucide-react';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import { FirebaseCloudSync, type CloudApplication } from '../../src/services/firebase/cloudSyncService';
import type { PersonaData } from '../../src/types';
import logo from '../../src/assets/logo.png';
import { readPersona, validateResume } from './profile';
import './styles.css';

type Tab = 'profile' | 'resume' | 'applications' | 'about';
const tabs = [{ id: 'profile', name: 'Profile', icon: UserRound }, { id: 'resume', name: 'Resume', icon: FileText }, { id: 'applications', name: 'Applications', icon: ChartNoAxesColumn }, { id: 'about', name: 'About', icon: CircleHelp }] as const;

function MobileApp(): ReactElement {
  const { user, loading, isGuest, loginWithEmail, signupWithEmail, continueAsGuest, logout, authError } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const storageKey = `zeroapply_mobile_persona_${user?.uid || 'guest'}`;
  const [persona, setPersona] = useState<PersonaData>(() => readPersona(storageKey));
  const [jobs, setJobs] = useState<CloudApplication[]>([]);
  useEffect((): void => { setPersona(readPersona(storageKey)); setJobs([]); }, [storageKey]);
  useEffect(() => user ? FirebaseCloudSync.subscribeToApplications(user.uid, setJobs) : undefined, [user?.uid]);

  async function signIn(event: FormEvent): Promise<void> {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (creatingAccount) {
        await signupWithEmail(email.trim(), password);
        setMessage('Check your email to verify your account, then sign in.');
        setCreatingAccount(false);
      } else await loginWithEmail(email.trim(), password);
      setPassword('');
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Could not sign in. Try again.'); }
    finally { setBusy(false); }
  }

  async function saveProfile(): Promise<void> {
    setBusy(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(persona));
      if (user) {
        const saved = await FirebaseCloudSync.savePersona(persona, user.uid);
        setMessage(saved ? 'Saved on this device and your account.' : 'Saved on this device. Cloud sync is unavailable; try saving again when online.');
      } else setMessage('Saved on this device. Sign in to save to your account.');
    } catch { setMessage('Storage is full or unavailable. Your changes remain open; free space and save again.'); }
    finally { setBusy(false); }
  }

  async function importResume(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setMessage('Reading resume…');
    try {
      validateResume(file);
      const { extractRawTextFromFile } = await import('../../src/resume-autofill/textExtractor');
      const text = await extractRawTextFromFile(file);
      if (!text.trim()) throw new Error('No text found. Paste the text from your resume below.');
      setPersona((current): PersonaData => ({ ...current, resumeText: text.slice(0, 100000) }));
      setMessage('Resume imported. Review the text, then tap Save.');
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Could not read this resume.'); }
    finally { setBusy(false); }
  }

  async function loadCloud(): Promise<void> {
    if (!user) return;
    setBusy(true);
    try {
      const saved = await FirebaseCloudSync.getPersona(user.uid);
      if (saved) { setPersona(saved); setMessage('Account profile loaded. Tap Save to keep a copy on this device.'); }
      else setMessage('No account profile available. Check your connection or save your profile first.');
    } catch { setMessage('Could not load your account profile. Try again when online.'); }
    finally { setBusy(false); }
  }

  return <div className="app">
    <header><img src={logo} alt="" /><strong>ZeroApply</strong><span>Android</span></header>
    <main>
      {loading ? <section aria-live="polite"><h1>Opening ZeroApply…</h1><p>Checking your account.</p></section> : !user && !isGuest ? <section>
        <p className="eyebrow">Your next opportunity</p><h1>{creatingAccount ? 'Create your account' : 'Welcome to ZeroApply'}</h1><p>Keep your professional profile and resume ready wherever you go.</p>
        <form onSubmit={(event): void => { void signIn(event); }}>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event): void => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(event): void => setPassword(event.target.value)} /></label>
          <button disabled={busy} className="primary">{busy ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}</button>
        </form>
        <button disabled={busy} onClick={(): void => setCreatingAccount(!creatingAccount)}>{creatingAccount ? 'I already have an account' : 'Create an account'}</button>
        <button disabled={busy} onClick={continueAsGuest}>Continue on this device</button>
      </section> : <>
        {tab === 'profile' && <section><p className="eyebrow">Make it yours</p><h1>Your professional profile</h1><p>Start with your details. Everything is blank until you add it.</p>
          {(['fullName', 'email', 'phone', 'location', 'linkedIn', 'gitHub', 'portfolio'] as const).map((key) => <label key={key}>{({ fullName: 'Full name', email: 'Email', phone: 'Phone', location: 'Location', linkedIn: 'LinkedIn URL', gitHub: 'GitHub URL', portfolio: 'Portfolio URL' })[key]}<input value={persona[key]} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} onChange={(event): void => setPersona({ ...persona, [key]: event.target.value })} maxLength={2000} /></label>)}
          <label>Skills (comma separated)<input value={persona.techStack.join(',')} onChange={(event): void => setPersona({ ...persona, techStack: event.target.value.split(',') })} /></label>
          <label>Target roles (comma separated)<input value={persona.targetRoles.join(',')} onChange={(event): void => setPersona({ ...persona, targetRoles: event.target.value.split(',') })} /></label>
          <button className="primary" disabled={busy} onClick={(): void => { void saveProfile(); }}>Save profile</button>
          {user && <button disabled={busy} onClick={(): void => { void loadCloud(); }}>Load profile from my account</button>}
        </section>}
        {tab === 'resume' && <section><p className="eyebrow">Your experience, ready</p><h1>Your resume</h1><p>Import a PDF, DOCX or TXT file up to 10 MB, or paste your resume below. Importing stays on this device.</p>
          <label className="upload">Import resume<input type="file" accept=".pdf,.docx,.txt" disabled={busy} onChange={(event): void => { void importResume(event); }} /></label>
          <label>Resume text<textarea rows={16} maxLength={100000} value={persona.resumeText || ''} onChange={(event): void => setPersona({ ...persona, resumeText: event.target.value })} /></label>
          <button className="primary" disabled={busy} onClick={(): void => { void saveProfile(); }}>Save resume</button>
        </section>}
        {tab === 'applications' && <section><p className="eyebrow">Keep track</p><h1>Your applications</h1><p>{user ? 'Applications from your ZeroApply account. Connect to the internet to refresh.' : 'Sign in to see applications from your ZeroApply account.'}</p>
          {jobs.length === 0 && <div className="card">No applications loaded yet.</div>}
          {jobs.map((job, index) => <article className="card" key={job.id || String(index)}><h2>{job.title}</h2><p>{job.company} · {job.platform}</p><span className="badge">{job.status}</span></article>)}
        </section>}
        {tab === 'about' && <section><p className="eyebrow">ZeroApply for Android</p><h1>Stay ready on the go</h1><div className="card"><h2>AutoApply on desktop</h2><p>This Android version supports your profile, resume and application tracking. Automated browsing and the built-in desktop AI are not available on Android yet.</p><p>No AI model runs or downloads when you open this app.</p></div><p>Guest profiles stay on this device. When signed in, Save sends your profile and resume text to your account.</p><p>App version 1.0.0 · Updates are installed as new APKs.</p>
          <button disabled={busy} onClick={(): void => { void logout().catch((): void => setMessage('Could not sign out. Try again.')); }}>Sign out</button>
        </section>}
      </>}
      {(message || authError) && <p role="status" className="notice">{message || authError}</p>}
    </main>
    {(user || isGuest) && !loading && <nav aria-label="Main navigation">{tabs.map(({ id, name, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={(): void => { setTab(id); setMessage(''); }}><Icon size={21} /><span>{name}</span></button>)}</nav>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><MobileApp /></AuthProvider></StrictMode>);
