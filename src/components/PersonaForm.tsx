import React, { useState, useRef } from 'react';
import type { PersonaData, PersonaTone, WorkLocation } from '../types';
import {
  Upload,
  Link as LinkIcon,
  Code,
  Plus,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { autoFillPersonaFromResume } from '../resume-autofill';
import { saveResumeFileToStorage, clearSavedResumeFileFromStorage, getSavedResumeFileFromStorage } from '../agent/autofill/resumeInjector';
import { PersonaManager } from '../persona';
import { MemoryBankManager } from '../agent/memory/MemoryBankManager';
import { HierarchicalMemory } from '../agent/memory/hierarchicalMemory';
import type { PlatformId } from '../agent/ui/AgentControlBar';
import { AtsScoreCard } from '../ats';

export const REQUIRED_AUTOAPPLY_CHUNKS = [
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
}) => {
  const [newSkill, setNewSkill] = useState('');
  const [showAddSkillInput, setShowAddSkillInput] = useState(false);
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
  const selectedPlatform: PlatformId = 'linkedin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getMissingAutoApplySections = () => {
    return REQUIRED_AUTOAPPLY_CHUNKS.filter((sec) => {
      const chunkVal = persona.resumeChunks?.[sec.key]?.trim();
      if (chunkVal && chunkVal.length > 0) return false;
      if (sec.key === 'skills' && persona.techStack && persona.techStack.length > 0) return false;
      if (sec.key === 'education' && persona.education && persona.education.trim().length > 0) return false;
      if (sec.key === 'summary' && persona.experienceSummary && persona.experienceSummary.trim().length > 0) return false;
      return true;
    });
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
  }, [persona.resumeChunks]);

  const handleInputChange = (field: keyof PersonaData, value: any) => {
    setPersona((prev) => {
      const updated = { ...prev, [field]: value };
      PersonaManager.updateActiveProfileData(updated);
      return updated;
    });
  };

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newSkill.trim() && !persona.techStack.includes(newSkill.trim())) {
      setPersona((prev) => ({
        ...prev,
        techStack: [...prev.techStack, newSkill.trim()],
      }));
      setNewSkill('');
      setShowAddSkillInput(false);
      onSaveToast(`Added skill: ${newSkill.trim()}`);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setPersona((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((s) => s !== skillToRemove),
    }));
  };

  const addTarget = (field: 'targetRoles', value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || persona[field].includes(trimmedValue)) return false;
    setPersona((previous) => ({ ...previous, [field]: [...previous[field], trimmedValue] }));
    return true;
  };

  const removeTarget = (field: 'targetRoles', value: string) => {
    setPersona((previous) => ({ ...previous, [field]: previous[field].filter((item) => item !== value) }));
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
    } catch (err: any) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      console.error('Failed to parse resume:', err);
      onSaveToast(err?.message || `Error reading "${file.name}". Try another PDF/DOCX file.`);
    } finally {
      setIsAutoFilling(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-2xl mx-auto w-full text-on-surface">

      {/* Tab Switcher */}
      <div className="flex border-b border-outline-variant mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chunks')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chunks' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          Memory Chunks
        </button>
      </div>

      {activeTab === 'basic' ? (
        <>
      {/* Upload Dropzone / Uploaded File Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl md:text-2xl text-primary tracking-tight">
            Upload resume
          </h2>
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
            />
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-outline-variant rounded-xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 hover:border-cyan-500 transition-all bg-white ambient-shadow group relative overflow-hidden ${isAutoFilling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm text-on-surface-variant text-center">
              Choose a <span className="font-bold text-primary">PDF/DOCX</span> to auto-fill persona &amp; preview resume
            </p>
          </div>
        )}
      </div>

      {/* Section 1: Personal Information */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase">
            Personal Information
          </h3>
          {persona.verified && <span className="verified-badge">VERIFIED</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              FULL NAME
            </label>
            <input
              type="text"
              value={persona.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full bg-transparent font-bold text-lg text-primary outline-none pb-1"
            />
          </div>

          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              LOCATION
            </label>
            <input
              type="text"
              value={persona.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full bg-transparent font-bold text-lg text-primary outline-none pb-1"
            />
          </div>

          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              EMAIL
            </label>
            <input
              type="email"
              value={persona.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full bg-transparent font-bold text-lg text-primary outline-none pb-1"
            />
          </div>

          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              PHONE
            </label>
            <input
              type="text"
              value={persona.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full bg-transparent font-bold text-lg text-primary outline-none pb-1"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Social Profiles & Links */}
      <div className="space-y-4 pt-2 border-b border-outline-variant pb-6">
        <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase">
          Social Profiles &amp; Web Links
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                <LinkIcon size={13} className="text-cyan-600" />
                LINKEDIN PROFILE
              </label>
              {persona.linkedIn && (
                <a
                  href={persona.linkedIn.startsWith('http') ? persona.linkedIn : `https://${persona.linkedIn}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-600 hover:underline font-mono flex items-center gap-1"
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
              className="w-full bg-transparent font-medium text-sm text-primary outline-none pb-1"
            />
          </div>

          <div className="relative border-b-2 border-outline-variant focus-within:border-cyan-500 transition-colors pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                <Code size={13} className="text-cyan-600" />
                GITHUB REPOSITORY
              </label>
              {persona.gitHub && (
                <a
                  href={persona.gitHub.startsWith('http') ? persona.gitHub : `https://${persona.gitHub}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-600 hover:underline font-mono flex items-center gap-1"
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
              className="w-full bg-transparent font-medium text-sm text-primary outline-none pb-1"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Work Preferences & Compensation */}
      <div className="space-y-6">
        <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase">
          Work Preferences &amp; Compensation
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="font-mono text-sm">Experience Level</span>
            <span className="font-black text-2xl font-['Inter']">
              {persona.experienceYears} Yrs
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={persona.experienceYears}
            onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="font-mono text-sm">Min Salary Range</span>
            <span className="font-black text-2xl font-['Inter']">
              ${persona.minSalary}k
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="300"
            step="5"
            value={persona.minSalary}
            onChange={(e) => handleInputChange('minSalary', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-lg border border-outline-variant">
          {(['Remote', 'Hybrid', 'On-site'] as WorkLocation[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleInputChange('workPreference', mode)}
              className={`flex-1 py-2 text-center rounded-md font-bold text-sm transition-all ${
                persona.workPreference === mode
                  ? 'bg-black text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-zinc-200/60'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Section 4: Persona Tone */}
      <div className="space-y-4 pt-2">
        <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase">
          Answer Persona Tone
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {[
            {
              tone: 'Confident' as PersonaTone,
              desc: 'Bold, high-impact statements highlighting architecture leadership.',
            },
            {
              tone: 'Minimalist' as PersonaTone,
              desc: 'Brief, surgical, data-driven metrics & clear facts.',
            },
            {
              tone: 'Detailed' as PersonaTone,
              desc: 'Explanatory, narrative background with comprehensive rationale.',
            },
          ].map((item) => {
            const isSelected = persona.tone === item.tone;
            return (
              <div
                key={item.tone}
                onClick={() => handleInputChange('tone', item.tone)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ambient-shadow ${
                  isSelected
                    ? 'border-black bg-white'
                    : 'border-outline-variant bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-base text-primary">
                    {item.tone}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={18} className="text-cyan-600" />
                  )}
                </div>
                <p className="text-on-surface-variant text-xs mt-1">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Tech Stack */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase">
            Core Tech Stack Matrix
          </h3>
          <button
            type="button"
            onClick={() => setShowAddSkillInput(!showAddSkillInput)}
            className="text-cyan-600 font-bold text-xs flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Add Skill
          </button>
        </div>

        {showAddSkillInput && (
          <form onSubmit={handleAddSkill} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="e.g. PyTorch, Docker, GraphQL"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded border border-zinc-300 bg-white outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded"
            >
              Add
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {persona.techStack.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1.5 bg-black text-white rounded-full font-mono text-xs flex items-center gap-2 group transition-transform hover:scale-105"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="opacity-70 hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Section 6: Target Roles & Locations */}
      <div className="space-y-6 pt-2 pb-16">
        <div>
          <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-3">
            Target Roles
          </h3>
          <div className="flex flex-wrap gap-2">
            {persona.targetRoles.map((role) => (
              <span
                key={role}
                className="px-3 py-1.5 border border-outline-variant rounded-lg font-bold text-xs bg-white flex items-center gap-2"
              >
                {role}
                <button type="button" onClick={() => removeTarget('targetRoles', role)} aria-label={`Remove ${role}`}><X size={12} /></button>
              </span>
            ))}
          </div>
          <form
            className="flex gap-2 mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (addTarget('targetRoles', newTargetRole)) setNewTargetRole('');
            }}
          >
            <input
              value={newTargetRole}
              onChange={(event) => setNewTargetRole(event.target.value)}
              placeholder="e.g. Software Engineer"
              className="flex-1 px-3 py-2 text-xs border rounded bg-white outline-none focus:border-cyan-500"
            />
            <button type="submit" className="px-3 py-2 bg-black text-white font-bold text-xs rounded">Add role</button>
          </form>
        </div>

        <div>
          <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-3">
            Apply Mode
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPersona((prev) => ({ ...prev, applyMode: 'easy' }))}
              className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-xs border-2 transition-all ${
                persona.applyMode === 'easy'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
              }`}
            >
              ⚡ Easy Apply
            </button>
            <button
              type="button"
              onClick={() => setPersona((prev) => ({ ...prev, applyMode: 'normal' }))}
              className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-xs border-2 transition-all ${
                persona.applyMode === 'normal'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
              }`}
            >
              🔍 Normal Apply
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            {persona.applyMode === 'easy'
              ? 'Search will filter for Easy Apply / Quick Apply listings only.'
              : 'Search will show all job listings without apply-type filter.'}
          </p>
        </div>

        <div>
          <h3 className="font-mono text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-3">
            Application Limit
          </h3>
          <div className="flex flex-col gap-2">
            <input
              type="number"
              min="1"
              max="500"
              value={persona.applicationLimit ?? 5}
              onChange={(e) => handleInputChange('applicationLimit', parseInt(e.target.value) || 5)}
              className="px-4 py-2 border border-outline rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-bold"
              placeholder="e.g. 5"
            />
            <p className="text-[10px] text-zinc-400">
              The autonomous agent will pause after applying to this many jobs.
            </p>
          </div>
        </div>

        {/* AutoApply Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAutoApplyClick}
            className="w-full p-3.5 sm:p-4 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:via-blue-500/20 hover:to-indigo-500/20 border-2 border-cyan-500/40 hover:border-cyan-500 rounded-xl flex items-center justify-center gap-3 transition-all ambient-shadow group cursor-pointer text-primary"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm shadow-cyan-500/25">
              <Zap size={18} className="text-white fill-current" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight">
              AutoApply
            </span>
            <span className="text-cyan-600 font-mono text-sm group-hover:translate-x-1 transition-transform">
              ➔
            </span>
          </button>
        </div>
      </div>

      {/* Screening Question Memory Bank */}
      <MemoryBankManager persona={persona} />
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-xl md:text-2xl text-primary tracking-tight">Memory Chunks (RAG)</h2>
              <p className="text-sm text-on-surface-variant">These semantic chunks were extracted from your resume. The AI will read these specific chunks to answer related job questions faster and more accurately. Feel free to edit them for brevity.</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:border-cyan-500 rounded-lg text-xs font-bold text-slate-700 hover:text-cyan-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Upload size={13} />
              <span>Upload Resume to Extract</span>
            </button>
          </div>
          
          {([
            { key: 'summary', title: 'Executive Summary', desc: 'Professional pitch & background overview' },
            { key: 'experience', title: 'Work History & Roles', desc: 'Companies, responsibilities & achievements' },
            { key: 'skills', title: 'Technical Stack & Tools', desc: 'Languages, frameworks & libraries' },
            { key: 'workAuthorization', title: 'Work Authorization & Visa', desc: 'US Citizen, Green Card, STEM OPT, H1B, Sponsorship' },
            { key: 'availability', title: 'Availability & Notice Period', desc: 'Earliest start date, notice period (e.g. 2 weeks, immediate)' },
            { key: 'compensation', title: 'Salary & Compensation', desc: 'Target base salary, total compensation & bonus expectations' },
            { key: 'relocation', title: 'Relocation & Remote Preference', desc: 'Willingness to relocate, remote/hybrid constraints' },
            { key: 'securityClearance', title: 'Security Clearance', desc: 'Top Secret/SCI, Secret, Public Trust or None' },
            { key: 'projects', title: 'Featured Projects & Systems', desc: 'Architectures, GitHub repositories & apps' },
            { key: 'metrics', title: 'Quantifiable Metrics & KPIs', desc: 'Latency reductions, revenue growth & scale' },
            { key: 'domainExpertise', title: 'Industry & Domain Expertise', desc: 'FinTech, HealthTech, Enterprise SaaS, AI/ML' },
            { key: 'education', title: 'Education & Academic History', desc: 'Degrees, universities & honors' },
            { key: 'leadership', title: 'Leadership & Mentorship', desc: 'Team management & cross-functional work' },
            { key: 'certifications', title: 'Certifications & Licenses', desc: 'Cloud credentials & accredited training' },
            { key: 'languages', title: 'Spoken Languages', desc: 'Language proficiencies & fluencies' },
            { key: 'publications', title: 'Publications & Research', desc: 'Papers, journals & patents' },
            { key: 'awards', title: 'Honors & Achievements', desc: 'Competitions, scholarships & awards' },
            { key: 'eeoDemographics', title: 'EEO & Diversity Compliance', desc: 'Veteran status, disability & demographic declarations' },
          ] as const).map(({ key, title, desc }) => {
            const isRequired = REQUIRED_AUTOAPPLY_CHUNKS.some((r) => r.key === key);
            const isFilled = (persona.resumeChunks?.[key]?.trim().length || 0) > 0;
            return (
              <div
                key={key}
                id={`chunk-${key}`}
                className={`space-y-1.5 p-3.5 bg-white rounded-xl shadow-xs border transition-all ${
                  isRequired && !isFilled
                    ? 'border-amber-300 ring-2 ring-amber-100/60'
                    : 'border-zinc-200'
                }`}
              >
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-primary">{title}</span>
                    {isRequired && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isFilled
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                      }`}>
                        {isFilled ? 'Required ✓' : 'Required for AutoApply'}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 block font-mono">{desc}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isFilled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {persona.resumeChunks?.[key]?.length || 0} chars
                  </span>
                </div>
                <textarea
                  value={persona.resumeChunks?.[key] || ''}
                  onChange={(e) => {
                    const updatedChunks = { ...(persona.resumeChunks || {}), [key]: e.target.value };
                    handleInputChange('resumeChunks', updatedChunks);
                  }}
                  className="w-full h-28 p-3 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs text-primary focus:border-cyan-500 focus:bg-white outline-none resize-y transition-colors"
                  placeholder={`No ${key} extracted yet...${isRequired ? ' (Required for AutoApply)' : ''}`}
                />
              </div>
            );
          })}
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
                    className="p-3 bg-white border border-amber-200 rounded-xl flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900">{sec.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{sec.desc}</div>
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
                  setShowMissingModal(false);
                  setActiveTab('chunks');
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
