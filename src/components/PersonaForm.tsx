import React, { useState, useRef } from 'react';
import type { PersonaData, PersonaTone, WorkLocation } from '../types';
import {
  Upload,
  Plus,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  AlertTriangle,
  Contact,
  Database,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { autoFillPersonaFromResume } from '../resume-autofill';
import { saveResumeFileToStorage, clearSavedResumeFileFromStorage, getSavedResumeFileFromStorage } from '../agent/autofill/resumeInjector';
import { PersonaManager } from '../persona';
import { MemoryBankManager } from '../agent/memory/MemoryBankManager';
import { HierarchicalMemory } from '../agent/memory/hierarchicalMemory';
import type { PlatformId } from '../agent/ui/AgentControlBar';
import { AtsScoreCard } from '../ats';
import { stealthEngine, type StealthSpeedMode } from '../agent/stealth';

const REQUIRED_AUTOAPPLY_CHUNKS = [
  { key: 'summary', title: 'Executive Summary', desc: 'Professional pitch & background overview' },
  { key: 'experience', title: 'Work History & Roles', desc: 'Companies, responsibilities & achievements' },
  { key: 'skills', title: 'Technical Stack & Tools', desc: 'Languages, frameworks & libraries' },
  { key: 'projects', title: 'Featured Projects & Systems', desc: 'Architectures, GitHub repositories & apps' },
  { key: 'education', title: 'Education & Academic History', desc: 'Degrees, universities & honors' },
  { key: 'certifications', title: 'Certifications & Licenses', desc: 'Cloud credentials & accredited training' },
  { key: 'languages', title: 'Spoken Languages', desc: 'Language proficiencies & fluencies' },
] as const;

interface PersonaFormProps {
  persona: PersonaData;
  setPersona: React.Dispatch<React.SetStateAction<PersonaData>>;
  onSaveToast: (msg: string) => void;
  onLaunchBrowser?: (action: 'search' | 'fillApply' | 'autoApply', platform: PlatformId) => void;
  onNavigateToResume?: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not store the uploaded resume.'));
    reader.onload = () => {
      const value = String(reader.result || '');
      const base64 = value.includes(',') ? value.split(',')[1] : '';
      if (!base64) reject(new Error('Could not read the uploaded resume.'));
      else resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export const PersonaForm: React.FC<PersonaFormProps> = ({
  persona,
  setPersona,
  onSaveToast,
  onLaunchBrowser,
  onNavigateToResume,
}) => {
  const [newSkill, setNewSkill] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    url?: string;
  } | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'chunks'>('basic');
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingSections, setMissingSections] = useState<Array<{ key: string; title: string; desc: string }>>([]);
  const [highlightedChunkKey, setHighlightedChunkKey] = useState<string | null>(null);
  const selectedPlatform: PlatformId = 'linkedin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stealthConfig, setStealthConfig] = useState(() => stealthEngine.getConfig());

  const handleStealthToggle = (enabled: boolean) => {
    const updated = stealthEngine.updateConfig({ enabled });
    setStealthConfig(updated);
  };

  const handleStealthModeChange = (mode: StealthSpeedMode) => {
    const updated = stealthEngine.setMode(mode);
    setStealthConfig(updated);
  };

  const isChunkReady = (key: string) => Boolean(
    persona.resumeChunks?.[key]?.trim()
    || (key === 'skills' && persona.techStack.length > 0)
    || (key === 'education' && persona.education?.trim())
    || (key === 'summary' && persona.experienceSummary?.trim())
  );

  const getMissingAutoApplySections = () => REQUIRED_AUTOAPPLY_CHUNKS.filter((section) => !isChunkReady(section.key));
  const missingAutoApplySections = getMissingAutoApplySections();
  const completedMemorySections = REQUIRED_AUTOAPPLY_CHUNKS.length - missingAutoApplySections.length;
  const basicChecks = [
    persona.fullName.trim(),
    persona.email.trim(),
    persona.location.trim(),
    persona.techStack.length > 0,
    persona.targetRoles.length > 0,
  ];
  const completedBasicChecks = basicChecks.filter(Boolean).length;
  const basicProgress = Math.round((completedBasicChecks / basicChecks.length) * 100);
  const memoryProgress = Math.round((completedMemorySections / REQUIRED_AUTOAPPLY_CHUNKS.length) * 100);

  const navigateToChunk = (key: string) => {
    setShowMissingModal(false);
    setActiveTab('chunks');
    setHighlightedChunkKey(key);

    // Wait for the memory chunks tab DOM to render, then scroll and focus
    setTimeout(() => {
      const el = document.getElementById(`chunk-${key}`);
      if (el) {
        if (el instanceof HTMLDetailsElement) el.open = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const textarea = el.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 150);

    // Auto-remove highlight effect after 3.5 seconds
    setTimeout(() => {
      setHighlightedChunkKey((prev) => (prev === key ? null : prev));
    }, 3500);
  };

  const handleAutoApplyClick = () => {
    const missing = getMissingAutoApplySections();
    if (missing.length > 0) {
      setMissingSections([...missing]);
      setShowMissingModal(true);
      return;
    }
    onLaunchBrowser?.('autoApply', selectedPlatform || 'linkedin');
  };

  React.useEffect(() => {
    if (uploadedFile) return;
    const saved = getSavedResumeFileFromStorage();
    if (saved && saved.name) {
      let objectUrl: string | undefined;
      if (saved.base64Data && saved.base64Data.startsWith('data:')) {
        try {
          const byteString = atob(saved.base64Data.split(',')[1]);
          const mimeString = saved.base64Data.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          objectUrl = URL.createObjectURL(blob);
        } catch {
          // ignore
        }
      }
      setUploadedFile({
        name: saved.name,
        size: saved.base64Data ? `${Math.round(saved.base64Data.length * 0.75 / 1024)} KB` : 'Active Resume',
        type: saved.type?.includes('pdf') || saved.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
        url: objectUrl,
      });
    } else if (persona.resumeText || persona.resumeChunks?.summary || persona.resumeChunks?.experience) {
      setUploadedFile({
        name: `${persona.fullName || 'Candidate'}_Resume.pdf`,
        size: `${Math.round((persona.resumeText?.length || 500) / 5)} words`,
        type: 'pdf',
      });
    }
  }, [persona.fullName, persona.resumeText, persona.resumeChunks, uploadedFile]);

  // Auto-clean misplaced programming languages in spoken languages chunk
  React.useEffect(() => {
    const rawLanguages = persona.resumeChunks?.languages;
    const techRegex = /\b(?:python|javascript|typescript|c\+\+|java\b|c#|sql|mongodb|firebase|html5?|css3?|react|node|flask|opencv|dsa|system design|pandas|numpy|matplotlib|scikit-learn|databases|frameworks|oop|beautifulsoup|scrapy)\b/i;
    if (rawLanguages && techRegex.test(rawLanguages)) {
      const updatedChunks = { ...(persona.resumeChunks || {}) };
      if (!updatedChunks.skills || !updatedChunks.skills.includes('Python')) {
        updatedChunks.skills = updatedChunks.skills ? `${updatedChunks.skills}\n\n${rawLanguages}` : rawLanguages;
      }
      updatedChunks.languages = 'English (Professional), Hindi, Telugu';
      setPersona((prev) => {
        const updated = { ...prev, resumeChunks: updatedChunks };
        PersonaManager.updateActiveProfileData(updated);
        return updated;
      });
    }
  }, [persona.resumeChunks, setPersona]);

  const handleInputChange = <Key extends keyof PersonaData>(field: Key, value: PersonaData[Key]) => {
    setPersona((prev) => {
      const updated = { ...prev, [field]: value };
      PersonaManager.updateActiveProfileData(updated);
      return updated;
    });
  };

  const handleAddSkill = (e?: React.FormEvent, customSkill?: string) => {
    if (e) e.preventDefault();
    const raw = customSkill !== undefined ? customSkill : newSkill;
    const skillsToAdd = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !persona.techStack.includes(s));

    if (skillsToAdd.length > 0) {
      setPersona((prev) => {
        const updatedSkills = Array.from(new Set([...prev.techStack, ...skillsToAdd]));
        const updated = { ...prev, techStack: updatedSkills };
        PersonaManager.updateActiveProfileData(updated);
        return updated;
      });
      if (customSkill === undefined) setNewSkill('');
      onSaveToast(`Added ${skillsToAdd.length > 1 ? `${skillsToAdd.length} skills` : skillsToAdd[0]}`);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setPersona((prev) => {
      const updated = {
        ...prev,
        techStack: prev.techStack.filter((s) => s !== skillToRemove),
      };
      PersonaManager.updateActiveProfileData(updated);
      return updated;
    });
  };

  const addTarget = (field: 'targetRoles', value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || persona[field].includes(trimmedValue)) return false;
    setPersona((previous) => {
      const updated = { ...previous, [field]: [...previous[field], trimmedValue] };
      PersonaManager.updateActiveProfileData(updated);
      return updated;
    });
    return true;
  };

  const removeTarget = (field: 'targetRoles', value: string) => {
    setPersona((previous) => {
      const updated = { ...previous, [field]: previous[field].filter((item) => item !== value) };
      PersonaManager.updateActiveProfileData(updated);
      return updated;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAutoFilling(true);
    let fileUrl: string | undefined;
    try {
      fileUrl = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        ? URL.createObjectURL(file)
        : undefined;

      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const { updatedPersona, fieldsCount } = await autoFillPersonaFromResume(file, persona);

      const savedResume = {
        name: file.name,
        type: file.type || 'application/pdf',
        base64Data: await readFileAsBase64(file),
      };
      saveResumeFileToStorage(savedResume);

      if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url);
      setUploadedFile({
        name: file.name,
        size: sizeFormatted,
        type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
        url: fileUrl,
      });
      setShowPdfPreview(false);
      setPersona(updatedPersona);
      HierarchicalMemory.onPersonaOrResumeUpdated(updatedPersona);
      PersonaManager.updateActiveProfileData(updatedPersona, savedResume);
      onSaveToast(fieldsCount > 0 ? `Auto-filled ${fieldsCount} attributes from "${file.name}".` : `Read "${file.name}", but no supported profile attributes were found.`);
    } catch (err: unknown) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      console.error('Failed to parse resume:', err);
      onSaveToast(err instanceof Error ? err.message : `Error reading "${file.name}". Try another PDF/DOCX file.`);
    } finally {
      setIsAutoFilling(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-5 sm:space-y-6 max-w-3xl mx-auto w-full text-on-surface">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <nav aria-label="Profile setup sections" className="grid grid-cols-2 gap-1 bg-zinc-50 p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          aria-pressed={activeTab === 'basic'}
          aria-controls="basic-persona-panel"
          className={`min-w-0 rounded-xl px-3 py-2.5 text-left transition-all ${
            activeTab === 'basic'
              ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200'
              : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activeTab === 'basic' ? 'bg-cyan-50 text-cyan-700' : 'bg-zinc-200/70 text-zinc-500'}`}>
              <Contact size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold">Basic info &amp; persona</span>
              <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{completedBasicChecks} of {basicChecks.length} essentials</span>
            </span>
            <span className="text-[11px] font-black tabular-nums text-zinc-500">{basicProgress}%</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chunks')}
          aria-pressed={activeTab === 'chunks'}
          aria-controls="memory-bank-panel"
          className={`min-w-0 rounded-xl px-3 py-2.5 text-left transition-all ${
            activeTab === 'chunks'
              ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200'
              : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activeTab === 'chunks' ? 'bg-violet-50 text-violet-700' : 'bg-zinc-200/70 text-zinc-500'}`}>
              <Database size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold">Memory bank</span>
              <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{completedMemorySections} of {REQUIRED_AUTOAPPLY_CHUNKS.length} essentials</span>
            </span>
            <span className="text-[11px] font-black tabular-nums text-zinc-500">{memoryProgress}%</span>
          </span>
        </button>
        </nav>
      </section>

      {activeTab === 'basic' ? (
        <div id="basic-persona-panel" role="region" aria-label="Basic information and persona" className="space-y-5 sm:space-y-6">
      {/* Upload Dropzone / Uploaded File Display */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black tracking-tight text-zinc-950 sm:text-lg">Start from your resume</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Upload once to fill your profile and memory automatically.</p>
          </div>
          {isAutoFilling ? (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full">Reading resume…</span>
          ) : uploadedFile && (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> Auto-filled
            </span>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.docx"
          className="hidden"
        />

        {uploadedFile ? (
          <div className="border border-cyan-200 bg-cyan-50/30 rounded-xl p-4 md:p-5 ambient-shadow transition-all space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex flex-col items-center justify-center font-black font-mono text-[10px] shrink-0 leading-tight">
                  <FileText size={16} />
                  <span>{uploadedFile.type === 'pdf' ? 'PDF' : 'DOC'}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-primary truncate max-w-[220px] sm:max-w-[320px]" title={uploadedFile.name}>
                    {uploadedFile.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-mono">
                    {uploadedFile.size} • Uploaded &amp; Parsed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {uploadedFile.url && (
                  <button
                    type="button"
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                    className="px-3 py-1.5 bg-white border border-outline-variant hover:border-cyan-500 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {showPdfPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPdfPreview ? 'Hide PDF' : 'View PDF'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-outline-variant hover:border-cyan-500 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Upload another file"
                >
                  <RefreshCw size={14} />
                  <span>Replace</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url);
                    setUploadedFile(null);
                    setShowPdfPreview(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    clearSavedResumeFileFromStorage();
                    HierarchicalMemory.clearEpisodicMemory();
                    const clearedPersona = { ...persona, resumeChunks: undefined, resumeText: undefined, verified: false };
                    setPersona(clearedPersona);
                    PersonaManager.updateActiveProfileData(clearedPersona, null);
                    onSaveToast('Resume removed. Memory chunks and active caches cleared.');
                  }}
                  className="p-1.5 bg-white border border-outline-variant hover:border-red-400 hover:text-red-600 rounded-lg text-xs font-bold text-on-surface-variant transition-colors shadow-sm"
                  title="Remove uploaded resume"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            {showPdfPreview && uploadedFile.url && (
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-inner bg-zinc-900 animate-fadeIn">
                <div className="bg-zinc-800 text-zinc-300 px-4 py-2 flex items-center justify-between text-xs font-mono border-b border-zinc-700">
                  <span className="truncate max-w-[260px]">📄 {uploadedFile.name}</span>
                  <a
                    href={uploadedFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Open in full tab ↗
                  </a>
                </div>
                <iframe
                  src={uploadedFile.url}
                  title="Uploaded Resume PDF Preview"
                  className="w-full h-[480px] bg-white border-0"
                />
              </div>
            )}

            {/* Real-Time Advanced ATS Score Card */}
            <AtsScoreCard
              persona={persona}
              resumeText={persona.resumeText}
              resumeChunks={persona.resumeChunks}
              fileName={uploadedFile.name}
              onNavigateToResume={onNavigateToResume}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={isAutoFilling}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed border-zinc-300 rounded-xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 transition-all bg-zinc-50/50 group relative overflow-hidden ${isAutoFilling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
              <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <p className="text-sm text-on-surface-variant text-center">
                Choose a <span className="font-bold text-primary">PDF or DOCX</span> to fill this page automatically
              </p>
              <span className="text-[11px] font-medium text-zinc-400">Your original file stays under your control.</span>
            </button>

            {/* Create Own Resume Option */}
            {onNavigateToResume && (
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-cyan-50/70 via-blue-50/50 to-indigo-50/40 border border-cyan-200/90 rounded-xl shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">Don't have a resume yet?</p>
                    <p className="text-[11px] text-zinc-500 truncate">Build an ATS-optimized Harvard resume from scratch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToResume}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md shrink-0 cursor-pointer ml-2"
                >
                  <FileText size={13} className="text-cyan-100" />
                  <span>Create Own Resume</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 1: Personal Information */}
      <div className="space-y-4 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-cyan-50 border border-cyan-200/90 text-cyan-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
              01
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              About you
            </h3>
          </div>
          {persona.verified && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
              <CheckCircle2 size={10} /> Verified
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label htmlFor="persona-full-name" className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Full Name
            </label>
            <input
              id="persona-full-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Johnson"
              value={persona.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="persona-location" className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Location
            </label>
            <input
              id="persona-location"
              type="text"
              autoComplete="address-level2"
              placeholder="e.g. San Francisco, CA"
              value={persona.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="persona-email" className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Email Address
            </label>
            <input
              id="persona-email"
              type="email"
              autoComplete="email"
              placeholder="e.g. alex@example.com"
              value={persona.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="persona-phone" className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Phone Number
            </label>
            <input
              id="persona-phone"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. +1 (555) 019-2834"
              value={persona.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Social Profiles & Links */}
      <div className="space-y-4 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/90 text-blue-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
            02
          </span>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Professional links
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
                LinkedIn Profile
              </label>
              {persona.linkedIn && (
                <a
                  href={persona.linkedIn.startsWith('http') ? persona.linkedIn : `https://${persona.linkedIn}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-600 hover:underline font-mono flex items-center gap-0.5 font-bold"
                  title="Open LinkedIn in new tab"
                >
                  Open ↗
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. linkedin.com/in/username"
              value={persona.linkedIn}
              onChange={(e) => handleInputChange('linkedIn', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
                GitHub Repository
              </label>
              {persona.gitHub && (
                <a
                  href={persona.gitHub.startsWith('http') ? persona.gitHub : `https://${persona.gitHub}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-600 hover:underline font-mono flex items-center gap-0.5 font-bold"
                  title="Open GitHub in new tab"
                >
                  Open ↗
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. github.com/username"
              value={persona.gitHub}
              onChange={(e) => handleInputChange('gitHub', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 rounded-xl text-xs font-semibold text-zinc-900 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Work Preferences & Compensation */}
      <div className="space-y-4 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
            03
          </span>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Work preferences
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Experience Slider */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-700">
                Experience Level
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono">
                {persona.experienceYears} Years
              </span>
            </div>
            <input
              type="range"
              aria-label="Years of professional experience"
              min="0"
              max="20"
              value={persona.experienceYears}
              onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          {/* Salary Slider */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <span className="text-xs font-black text-emerald-600">₹</span>
                Min Salary Expectation
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                ₹{persona.minSalary ?? 12} LPA
              </span>
            </div>
            <input
              type="range"
              aria-label="Minimum salary expectation in lakhs per annum"
              min="3"
              max="100"
              step="1"
              value={persona.minSalary ?? 12}
              onChange={(e) => handleInputChange('minSalary', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-400">
              <span>₹3 LPA</span>
              <span>₹12 LPA</span>
              <span>₹35 LPA</span>
              <span>₹100 LPA</span>
            </div>
          </div>
        </div>

        {/* Work Location Mode */}
        <div className="pt-1">
          <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block mb-2">
            Workplace Preference
          </label>
          <div className="grid grid-cols-3 gap-2 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80">
            {(['Remote', 'Hybrid', 'On-site'] as WorkLocation[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleInputChange('workPreference', mode)}
                aria-pressed={persona.workPreference === mode}
                className={`py-2 text-center rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  persona.workPreference === mode
                    ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Persona Tone */}
      <div className="space-y-3 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
            04
          </span>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Answer style
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80">
          {(['Confident', 'Minimalist', 'Detailed'] as PersonaTone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleInputChange('tone', t)}
              aria-pressed={persona.tone === t}
              className={`py-2 text-center rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                persona.tone === t
                  ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span>{t}</span>
              {persona.tone === t && (
                <CheckCircle2 size={12} className="text-cyan-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section 5: Tech Stack */}
      <div className="space-y-3.5 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200/90 text-purple-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
              05
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Skills
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md">
            {persona.techStack.length} {persona.techStack.length === 1 ? 'skill' : 'skills'}
          </span>
        </div>

        {/* Input Bar with Instant Add & Comma/Enter Support */}
        <form onSubmit={(e) => handleAddSkill(e)} className="flex gap-2">
          <div className="relative flex-1">
            <input
                type="text"
                aria-label="Add a skill"
              placeholder="Add skills (e.g. React, TypeScript, Docker)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === ',' || e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              className="w-full pl-3.5 pr-20 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/60 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium text-zinc-900"
            />
            {newSkill.trim() && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 pointer-events-none">
                Press Enter ↵
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!newSkill.trim()}
            className="px-4 py-2 bg-zinc-900 hover:bg-black disabled:opacity-40 disabled:hover:bg-zinc-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </form>

        {/* Current Active Tech Stack Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {persona.techStack.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50/90 to-indigo-50/70 hover:from-purple-100 hover:to-indigo-100 text-purple-950 border border-purple-200/90 rounded-xl text-xs font-semibold shadow-2xs transition-all group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="w-4 h-4 rounded-full flex items-center justify-center text-purple-400 hover:text-white hover:bg-red-500 transition-colors ml-0.5 cursor-pointer"
                title={`Remove ${skill}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {persona.techStack.length === 0 && (
            <div className="w-full text-center py-4 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/40">
              <p className="text-xs text-zinc-400">No skills added yet.</p>
              <p className="text-[11px] text-zinc-400">Type above or click a suggestion to add skills to your ATS profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Target Roles */}
      <div className="space-y-3.5 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200/90 text-orange-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
            06
          </span>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Target roles
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {persona.targetRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200/90 rounded-xl text-xs font-semibold text-orange-950 shadow-2xs transition-all group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <span>{role}</span>
              <button
                type="button"
                onClick={() => removeTarget('targetRoles', role)}
                aria-label={`Remove ${role}`}
                className="w-4 h-4 rounded-full flex items-center justify-center text-orange-400 hover:text-white hover:bg-red-500 transition-colors ml-0.5 cursor-pointer"
                title={`Remove ${role}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>

        <form
          className="flex gap-2 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (addTarget('targetRoles', newTargetRole)) setNewTargetRole('');
          }}
        >
          <input
            value={newTargetRole}
            aria-label="Add a target role"
            onChange={(event) => setNewTargetRole(event.target.value)}
            placeholder="e.g. Full Stack Engineer, Tech Lead"
            className="flex-1 px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50/50 outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all font-medium"
          />
          <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">
            Add Role
          </button>
        </form>
      </div>

      {/* Section 7: Autonomous Apply Setup & Launch Hub */}
      <div className="space-y-4 bg-gradient-to-b from-white to-zinc-50/80 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        {/* Hub Header */}
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-cyan-50 border border-cyan-200/90 text-cyan-800 font-mono text-[11px] font-black flex items-center justify-center shadow-2xs">
            07
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Application preferences
            </h3>
            <p className="text-[11px] text-zinc-500">
              Choose how ZeroApply should search and pace applications
            </p>
          </div>
        </div>

        {/* Apply Mode Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Apply Mode
            </label>
            <span className="text-[10px] font-mono text-zinc-400">
              {persona.applyMode === 'easy' ? 'Quick submission filter' : 'All standard job postings'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80">
            <button
              type="button"
              onClick={() => handleInputChange('applyMode', 'easy')}
              aria-pressed={persona.applyMode === 'easy'}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                persona.applyMode === 'easy'
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold border border-zinc-200/60'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Quick Apply forms</span>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('applyMode', 'normal')}
              aria-pressed={persona.applyMode === 'normal'}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                persona.applyMode === 'normal'
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold border border-zinc-200/60'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>All supported forms</span>
            </button>
          </div>
        </div>

        {/* Batch Limit Controller */}
        <div className="space-y-2 pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block">
              Application Batch Limit
            </label>
            <span className="text-[11px] font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
              {persona.applicationLimit ?? 5} jobs max
            </span>
          </div>

          <div className="flex items-center gap-3 bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3">
            <button
              type="button"
              onClick={() => handleInputChange('applicationLimit', Math.max(1, (persona.applicationLimit ?? 5) - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:scale-95 transition font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
              title="Decrease limit"
            >
              -
            </button>

            <div className="flex-1 flex flex-col justify-center px-1">
              <input
                type="range"
                aria-label="Maximum applications per run"
                min="1"
                max="50"
                value={persona.applicationLimit ?? 5}
                onChange={(e) => handleInputChange('applicationLimit', parseInt(e.target.value) || 5)}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <div className="flex justify-between text-[9px] font-mono text-zinc-400 mt-1">
                <span>1</span>
                <span>10</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleInputChange('applicationLimit', Math.min(50, (persona.applicationLimit ?? 5) + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:scale-95 transition font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
              title="Increase limit"
            >
              +
            </button>
          </div>
        </div>

        {/* Stealth Anti-Detection & Human Simulation Engine */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className={stealthConfig.enabled ? 'text-emerald-600' : 'text-zinc-400'} />
              <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                Human-paced browsing
              </label>
            </div>
            <button
              type="button"
              onClick={() => handleStealthToggle(!stealthConfig.enabled)}
              aria-pressed={stealthConfig.enabled}
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold transition-all cursor-pointer border ${
                stealthConfig.enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
              }`}
            >
              {stealthConfig.enabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          {stealthConfig.enabled && (
            <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Human Typing &amp; Mouse Cadence:</span>
                <span className="font-mono text-[11px] font-bold text-zinc-700">
                  {stealthConfig.typingSpeedWPM} WPM avg
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['natural', 'careful', 'fast'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleStealthModeChange(mode)}
                    aria-pressed={stealthConfig.mode === mode}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer border ${
                      stealthConfig.mode === mode
                        ? 'bg-white text-zinc-900 shadow-2xs border-zinc-300'
                        : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-zinc-400 font-medium">
                Uses natural typing, pointer movement, and reading pauses while respecting site checkpoints.
              </p>
            </div>
          )}
        </div>

        {/* Start AutoApply Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAutoApplyClick}
            className="w-full py-2.5 px-4 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 hover:border-zinc-400 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
          >
            <img
              src="/zeroapply-logo.png"
              alt="ZeroApply"
              className="w-4 h-4 object-contain shrink-0"
            />
            <span>Review &amp; start AutoApply</span>
          </button>
        </div>
      </div>

        </div>
      ) : (
        <div id="memory-bank-panel" role="region" aria-label="Memory bank" className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-2xs">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-violet-50 via-white to-cyan-50/70 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Your reusable knowledge</p>
                  <h2 className="text-base font-black tracking-tight text-zinc-950 sm:text-lg">Memory bank</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
                    Keep concise facts ZeroApply can reuse when forms ask about your background, preferences, and experience.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-center shadow-2xs">
                  <div className="text-base font-black tabular-nums text-violet-800">{completedMemorySections}/{REQUIRED_AUTOAPPLY_CHUNKS.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">essentials</div>
                </div>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-violet-100"
                role="progressbar"
                aria-label="Essential memory readiness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={memoryProgress}
              >
                <div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${memoryProgress}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-violet-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>You control what is stored. Leave optional or sensitive answers blank unless you want ZeroApply to reuse them.</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                <Upload size={13} />
                <span>Fill from resume</span>
              </button>
            </div>
          </section>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700">Profile knowledge</h3>
              <span className="text-[11px] text-zinc-500">Open a topic to review or edit</span>
            </div>

            {([
              { key: 'summary', title: 'Professional summary', desc: 'Your background and strongest value proposition' },
              { key: 'experience', title: 'Work experience', desc: 'Roles, responsibilities, and achievements' },
              { key: 'skills', title: 'Skills and tools', desc: 'Languages, frameworks, platforms, and methods' },
              { key: 'workAuthorization', title: 'Work authorization', desc: 'Authorization, visa, and sponsorship details' },
              { key: 'availability', title: 'Availability', desc: 'Start date and notice period' },
              { key: 'compensation', title: 'Compensation preferences', desc: 'Target salary and compensation expectations' },
              { key: 'relocation', title: 'Location preferences', desc: 'Remote, hybrid, onsite, and relocation choices' },
              { key: 'securityClearance', title: 'Security clearance', desc: 'Current clearance or public trust status' },
              { key: 'projects', title: 'Projects', desc: 'Important products, systems, and repositories' },
              { key: 'metrics', title: 'Results and metrics', desc: 'Measured impact, scale, growth, and performance' },
              { key: 'domainExpertise', title: 'Domain expertise', desc: 'Industries and specialist knowledge' },
              { key: 'education', title: 'Education', desc: 'Degrees, institutions, coursework, and honors' },
              { key: 'leadership', title: 'Leadership', desc: 'Management, mentoring, and cross-functional work' },
              { key: 'certifications', title: 'Certifications', desc: 'Professional credentials and licenses' },
              { key: 'languages', title: 'Spoken languages', desc: 'Languages and proficiency levels' },
              { key: 'publications', title: 'Publications and research', desc: 'Papers, patents, and research work' },
              { key: 'awards', title: 'Awards and achievements', desc: 'Recognition, competitions, and scholarships' },
              { key: 'eeoDemographics', title: 'Voluntary EEO responses', desc: 'Optional responses—leave blank unless you choose to save them' },
            ] as const).map(({ key, title, desc }) => {
              const isRequired = REQUIRED_AUTOAPPLY_CHUNKS.some((section) => section.key === key);
              const hasContent = Boolean(persona.resumeChunks?.[key]?.trim());
              const isReady = isRequired ? isChunkReady(key) : hasContent;
              const isHighlighted = highlightedChunkKey === key;
              return (
                <details
                  key={key}
                  id={`chunk-${key}`}
                  className={`group overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                    isHighlighted
                      ? 'border-cyan-500 ring-2 ring-cyan-200 shadow-md'
                      : isRequired && !isReady
                      ? 'border-amber-200'
                      : 'border-zinc-200 shadow-2xs'
                  }`}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 [&::-webkit-details-marker]:hidden sm:p-4">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                      isReady ? 'bg-emerald-50 text-emerald-700' : isRequired ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {isReady ? <CheckCircle2 size={16} /> : isRequired ? '!' : '·'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-zinc-900 sm:text-sm">{title}</span>
                        {isRequired && (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isReady ? 'Ready' : 'Essential'}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{desc}</span>
                    </span>
                    <span className="hidden text-[10px] font-medium tabular-nums text-zinc-400 sm:block">
                      {persona.resumeChunks?.[key]?.length || 0} chars
                    </span>
                    <ChevronDown size={16} className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-zinc-100 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                    <label htmlFor={`memory-${key}`} className="sr-only">{title}</label>
                    <textarea
                      id={`memory-${key}`}
                      value={persona.resumeChunks?.[key] || ''}
                      onChange={(event) => {
                        const updatedChunks = { ...(persona.resumeChunks || {}), [key]: event.target.value };
                        handleInputChange('resumeChunks', updatedChunks);
                      }}
                      className="min-h-28 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                      placeholder={`Add ${title.toLowerCase()} details here…`}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-zinc-400">
                      <span>Keep it factual and concise. Changes save automatically.</span>
                      <span className="shrink-0 tabular-nums">{persona.resumeChunks?.[key]?.length || 0} characters</span>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          <MemoryBankManager persona={persona} />
        </div>
      )}

      {/* ========================================================= */}
      {/* Missing Required Profile Information Modal for AutoApply  */}
      {/* ========================================================= */}
      {showMissingModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setShowMissingModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    Required Details Missing for AutoApply
                  </h3>
                  <p className="text-xs text-slate-500">
                    {missingSections.length} essential section{missingSections.length > 1 ? 's' : ''} must be filled before launching
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMissingModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed">
                To guarantee the AI agent applies accurately and answers employer screening questions without errors, please fill in the following required sections:
              </p>

              <div className="space-y-2">
                {missingSections.map((sec) => (
                  <div
                    key={sec.key}
                    onClick={() => navigateToChunk(sec.key)}
                    className="p-3 bg-white border border-amber-200 hover:border-cyan-500 hover:bg-cyan-50/30 rounded-xl flex items-center justify-between gap-3 shadow-2xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 group-hover:bg-cyan-100 text-amber-800 group-hover:text-cyan-800 font-bold font-mono flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors">
                        !
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-cyan-900 flex items-center gap-1.5">
                          <span>{sec.title}</span>
                          <span className="text-[10px] font-mono text-amber-600 font-normal">(Required)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{sec.desc}</div>
                      </div>
                    </div>

                    <div className="text-cyan-600 text-xs font-bold font-mono shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <span>Fill</span>
                      <span>➔</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMissingModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-cyan-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload size={14} />
                <span>Upload Resume to Auto-Fill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetKey = missingSections[0]?.key || 'languages';
                  navigateToChunk(targetKey);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>✍️ Fill in Memory Chunks</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
