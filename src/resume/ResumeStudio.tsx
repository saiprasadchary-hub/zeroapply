import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { PersonaData } from '../types';
import type { ResumeDocument, ResumeTemplateId } from './types';
import {
  DEFAULT_RESUME_DOCUMENT,
  resumeToPlainText,
  resumeToPersona,
  personaToResume,
  exportResumeJson,
  importResumeJson,
} from './exportUtils';
import { calculateAtsScore } from '../ats/atsScorer';
import type { AtsScoreResult } from '../ats/types';
import { generateLlmAtsFeedback, type LlmAtsFeedback } from './aiEnhancer';
import { exportResumeToDocx } from './docxExporter';
import { autoFixAndNormalizeResume, scanResumeForBuzzwords } from './resumeAutoFixer';
import {
  getSavedResumeVersions,
  saveResumeVersion,
  deleteResumeVersion,
  replaceSavedResumeVersions,
  type SavedResumeVersion,
} from './versionManager';
import { HarvardClassic } from './templates/HarvardClassic';
import { ModernTech } from './templates/ModernTech';
import { ExecutiveMinimal } from './templates/ExecutiveMinimal';
import { DocumentCanvas } from './documentEditor/DocumentCanvas';
import { CustomSectionBuilder } from './tools/CustomSectionBuilder';
import { exportResumeToLatex } from './exporters/latexExporter';
import { exportResumeToPlainText } from './exporters/plainTextExporter';
import {
  Sparkles,
  Printer,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  GraduationCap,
  Code,
  ZoomIn,
  ZoomOut,
  Sliders,
  Edit3,
  Undo2,
  Redo2,
  FileDown,
  Wand2,
  Bookmark,
  PlusCircle,
  User,
  Maximize2,
  CheckCheck,
} from 'lucide-react';
import { FirebaseCloudSync } from '../services/firebase/cloudSyncService';
import { getSecureItem, setSecureItem } from '../services/secureStorage';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'zeroapply_ats_resume_studio_document';

interface ResumeStudioProps {
  persona: PersonaData;
  onSaveToast: (msg: string) => void;
  onUpdatePersona?: (p: PersonaData) => void;
}

const isDocumentMeaningfullyPopulated = (doc: ResumeDocument | null | undefined): boolean => {
  if (!doc || !doc.contact) return false;
  const hasName = Boolean(doc.contact.fullName && doc.contact.fullName.trim() && doc.contact.fullName.toLowerCase() !== 'candidate name');
  const hasExp = Boolean(doc.experience && doc.experience.length > 0);
  const hasSummary = Boolean(doc.summary && doc.summary.trim());
  const hasSkills = Boolean(
    doc.skills &&
    ((doc.skills.languages && doc.skills.languages.length > 0) ||
     (doc.skills.frontend && doc.skills.frontend.length > 0) ||
     (doc.skills.backend && doc.skills.backend.length > 0) ||
     (doc.skills.databases && doc.skills.databases.length > 0) ||
     (doc.skills.cloudDevops && doc.skills.cloudDevops.length > 0) ||
     (doc.skills.custom && doc.skills.custom.length > 0))
  );
  return hasName || hasExp || hasSummary || hasSkills;
};

export const ResumeStudio: React.FC<ResumeStudioProps> = ({
  persona,
  onSaveToast,
  onUpdatePersona: _onUpdatePersona,
}) => {
  const { user } = useAuth();
  const [cloudReady, setCloudReady] = useState(!user?.uid);
  const [document, setDocument] = useState<ResumeDocument>(() => {
    try {
      const saved = getSecureItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && isDocumentMeaningfullyPopulated(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Could not restore the saved resume document:', error);
    }
    const hasPersonaData = Boolean(
      persona.fullName?.trim() ||
      persona.experienceSummary?.trim() ||
      (persona.techStack && persona.techStack.length > 0)
    );
    if (hasPersonaData) {
      return personaToResume(persona);
    }
    return DEFAULT_RESUME_DOCUMENT;
  });

  const [activeSection, setActiveSection] = useState<
    | 'contact'
    | 'skills'
    | 'experience'
    | 'summary'
    | 'projects'
    | 'education'
    | 'settings'
    | 'custom_sections'
  >('contact');

  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const availableWidth = window.innerWidth - 24;
      const fitZoom = Math.floor((availableWidth / 850) * 100);
      return Math.max(38, Math.min(fitZoom, 50));
    }
    return 100;
  });
  const [mobileResumeSubTab, setMobileResumeSubTab] = useState<'editor' | 'preview'>('editor');
  const [showAtsDetails, setShowAtsDetails] = useState(false);
  const [llmFeedback, setLlmFeedback] = useState<LlmAtsFeedback | null>(null);
  const [isAnalyzingLlm, setIsAnalyzingLlm] = useState(false);
  const [isDocumentEditMode, setIsDocumentEditMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // 1-Click "Fit to 1 Page" Layout Optimizer
  const handleFitToOnePage = () => {
    setDocument((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        fontSize: 'compact',
        showSectionDividers: true,
      },
    }));
    onSaveToast('📐 Optimized typography & spacing to guarantee 1-page fit!');
  };

  // Multi-Version Resume Switcher State
  const [savedVersions, setSavedVersions] = useState<SavedResumeVersion[]>(() =>
    getSavedResumeVersions()
  );
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<ResumeDocument[]>([document]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const historyIdxRef = useRef(historyIdx);
  historyIdxRef.current = historyIdx;
  const isUndoRedoRef = useRef(false);
  const migratedVersionsForUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setCloudReady(true);
      return;
    }

    setCloudReady(false);
    const unsubscribeDocument = FirebaseCloudSync.subscribeToResumeDocument(user.uid, (cloudDocument) => {
      if (cloudDocument) {
        setDocument((current) => JSON.stringify(current) === JSON.stringify(cloudDocument) ? current : cloudDocument);
        setHistory([cloudDocument]);
        setHistoryIdx(0);
      }
      setCloudReady(true);
    });
    const unsubscribeVersions = FirebaseCloudSync.subscribeToResumeVersions(user.uid, (cloudVersions) => {
      if (cloudVersions.length > 0) {
        setSavedVersions(replaceSavedResumeVersions(cloudVersions));
      } else if (migratedVersionsForUidRef.current !== user.uid) {
        migratedVersionsForUidRef.current = user.uid;
        for (const localVersion of getSavedResumeVersions()) {
          void FirebaseCloudSync.saveResumeVersion(localVersion, user.uid);
        }
      }
    });
    return () => {
      unsubscribeDocument();
      unsubscribeVersions();
    };
  }, [user?.uid]);

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      const prevDoc = history[prevIdx];
      if (prevDoc) {
        isUndoRedoRef.current = true;
        setHistoryIdx(prevIdx);
        setDocument(prevDoc);
        onSaveToast('↩️ Reverted last edit');
      }
    }
  }, [historyIdx, history, onSaveToast]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      const nextDoc = history[nextIdx];
      if (nextDoc) {
        isUndoRedoRef.current = true;
        setHistoryIdx(nextIdx);
        setDocument(nextDoc);
        onSaveToast('↪️ Restored next edit');
      }
    }
  }, [historyIdx, history, onSaveToast]);

  // 1-Click Dealbreaker Auto-Fixer & Punctuation Normalizer
  const handleAutoFix = () => {
    const { document: fixedDoc, fixedCount } = autoFixAndNormalizeResume(document);
    setDocument(fixedDoc);
    onSaveToast(`✨ Auto-fixed & standardized ${fixedCount} bullet points, punctuation, & date formats!`);
  };

  // Save new resume version
  const handleSaveCurrentVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;
    const updated = saveResumeVersion(newVersionName, document);
    setSavedVersions(updated);
    setNewVersionName('');
    setShowVersionModal(false);
    onSaveToast(`💾 Saved version: "${newVersionName}"`);
  };

  // Load saved version
  const handleLoadVersion = (ver: SavedResumeVersion) => {
    isUndoRedoRef.current = true;
    setDocument(ver.document);
    setHistory([ver.document]);
    setHistoryIdx(0);
    setShowVersionModal(false);
    onSaveToast(`📂 Switched to version: "${ver.name}"`);
  };

  // Delete saved version
  const handleDeleteVersion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteResumeVersion(id);
    setSavedVersions(updated);
    onSaveToast('🗑️ Deleted resume version.');
  };

  // Buzzword issues
  const buzzwordIssues = useMemo(() => scanResumeForBuzzwords(document), [document]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack if user is inside an input/textarea with its own undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Real-time automatic persistence & history update
  useEffect(() => {
    try {
      setSecureItem(STORAGE_KEY, JSON.stringify(document));
      const cloudSaveTimer = setTimeout(() => {
        if (cloudReady && user?.uid) void FirebaseCloudSync.saveResumeDocument(document, user.uid);
      }, 1000);

      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return () => clearTimeout(cloudSaveTimer);
      }

      const curIdx = historyIdxRef.current;
      setHistory((prevHist) => {
        const currentItem = prevHist[curIdx];
        if (currentItem && JSON.stringify(currentItem) === JSON.stringify(document)) {
          return prevHist;
        }
        const sliced = prevHist.slice(0, curIdx + 1);
        const updated = [...sliced, document];
        if (updated.length > 50) {
          updated.shift();
        }
        return updated;
      });
      setHistoryIdx((prev) => Math.min(prev + 1, 49));
      return () => clearTimeout(cloudSaveTimer);
    } catch (e) {
      console.warn('Could not save resume studio document', e);
    }
  }, [cloudReady, document, user?.uid]);

  // Real-time LLM ATS Audit (debounced 1.2s on edit)
  const triggerLlmAudit = async () => {
    setIsAnalyzingLlm(true);
    try {
      const text = resumeToPlainText(document);
      const feedback = await generateLlmAtsFeedback(text, document.contact.jobTitle);
      setLlmFeedback(feedback);
    } finally {
      setIsAnalyzingLlm(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsAnalyzingLlm(true);
      const text = resumeToPlainText(document);
      const feedback = await generateLlmAtsFeedback(text, document.contact.jobTitle);
      if (isMounted) {
        setLlmFeedback(feedback);
        setIsAnalyzingLlm(false);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [document]);

  // Compute live ATS score on every change
  const liveAtsScore: AtsScoreResult = useMemo(() => {
    const virtualPersona = resumeToPersona(document);
    const plainText = resumeToPlainText(document);
    return calculateAtsScore(virtualPersona as PersonaData, plainText, virtualPersona.resumeChunks);
  }, [document]);

  // Import from active candidate profile
  const handleImportFromPersona = () => {
    if (confirm('Import data from your active candidate persona? This will populate the resume fields.')) {
      const imported = personaToResume(persona, document);
      setDocument(imported);
      onSaveToast('Imported attributes from active Candidate Persona.');
    }
  };

  // Load full ATS demo resume
  const handleLoadDemoResume = () => {
    if (confirm('Load the full ATS-optimized demo resume? This will populate all sections with a complete engineering demo profile.')) {
      setDocument({ ...DEFAULT_RESUME_DOCUMENT, updatedAt: Date.now() });
      onSaveToast('✨ Loaded full ATS-optimized demo resume!');
    }
  };

  // Copy plain text
  const handleCopyPlainText = () => {
    const text = resumeToPlainText(document);
    navigator.clipboard.writeText(text);
    onSaveToast('📋 Copied ATS plain text to clipboard!');
  };

  // Native Print / PDF Download
  const handlePrint = () => {
    window.print();
  };

  // JSON Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const str = String(event.target?.result || '');
      const parsed = importResumeJson(str);
      if (parsed) {
        setDocument(parsed);
        onSaveToast('Resume loaded from JSON backup.');
      } else {
        onSaveToast('Invalid resume JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Update deep contact fields
  const updateContact = (field: keyof typeof document.contact, val: string) => {
    setDocument((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      contact: {
        ...prev.contact,
        [field]: val,
      },
    }));
  };

  // Add Experience
  const addExperience = () => {
    const newExp = {
      id: `exp_${Date.now()}`,
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      current: true,
      bullets: [],
    };
    setDocument((prev) => ({
      ...prev,
      experience: [newExp, ...prev.experience],
      updatedAt: Date.now(),
    }));
  };

  // Delete Experience
  const deleteExperience = (id: string) => {
    setDocument((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
      updatedAt: Date.now(),
    }));
  };

  // Remove Skill
  const removeSkillFromCategory = (category: keyof typeof document.skills, skill: string) => {
    setDocument((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((s) => s !== skill),
      },
    }));
  };

  // Render Template
  const renderTemplate = () => {
    switch (document.settings.templateId) {
      case 'modern':
        return <ModernTech document={document} />;
      case 'executive':
        return <ExecutiveMinimal document={document} />;
      case 'harvard':
      default:
        return <HarvardClassic document={document} />;
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-[#F8FAFC] flex flex-col overflow-hidden font-sans select-none">
      
      {/* Top Action Toolbar */}
      <div className="bg-white border-b border-zinc-200/90 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-2xs z-20 overflow-x-auto no-scrollbar flex-nowrap">
        
        {/* Left: Brand & Template Selector */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-zinc-900 text-white rounded-lg shadow-2xs">
              <FileText size={14} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-tight text-zinc-900 whitespace-nowrap">
                Resume Studio
              </span>
              <span className="hidden lg:inline px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200/80 rounded-md">
                Standard Editor
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

          {/* Template Switcher */}
          <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70 text-xs font-semibold shrink-0">
            {(
              [
                { id: 'harvard', label: 'Harvard Classic' },
                { id: 'modern', label: 'Modern Tech' },
                { id: 'executive', label: 'Executive Minimal' },
              ] as Array<{ id: ResumeTemplateId; label: string }>
            ).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  setDocument((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, templateId: tpl.id },
                  }))
                }
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-xs shrink-0 ${
                  document.settings.templateId === tpl.id
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                    : 'text-zinc-500 hover:text-zinc-900 font-medium'
                }`}
              >
                <span className="hidden sm:inline">{tpl.label}</span>
                <span className="sm:hidden">
                  {tpl.id === 'harvard' ? 'Harvard' : tpl.id === 'modern' ? 'Modern' : 'Executive'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions (Versions, Standardize, 1-Page Fit, Export Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {/* Multi-Version Switcher */}
          <button
            type="button"
            onClick={() => setShowVersionModal(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs shrink-0"
            title="Manage and switch between saved resume versions"
          >
            <Bookmark size={13} className="text-zinc-500 shrink-0" />
            <span><span className="hidden sm:inline">Versions </span>({savedVersions.length})</span>
          </button>

          {/* Standardize Formatting */}
          <button
            type="button"
            onClick={handleAutoFix}
            className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs shrink-0"
            title="Standardize punctuation, date formats, and bullet typography"
          >
            <CheckCheck size={13} className="text-zinc-700 shrink-0" />
            <span><span className="hidden sm:inline">Standardize</span><span className="sm:hidden">Format</span></span>
          </button>

          {/* 1-Click Fit to 1-Page */}
          <button
            type="button"
            onClick={handleFitToOnePage}
            className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs shrink-0"
            title="Auto-adjust spacing, density & line-height to fit exactly 1 page"
          >
            <Maximize2 size={13} className="text-zinc-700 shrink-0" />
            <span><span className="hidden sm:inline">Fit 1-Page</span><span className="sm:hidden">1-Page</span></span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 sm:px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition shrink-0"
              title="Export Resume in multiple formats"
            >
              <FileDown size={13} className="text-zinc-300 shrink-0" />
              <span>Export</span>
              <ChevronDown size={12} className={`text-zinc-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                {/* Mobile Bottom Sheet Modal */}
                <div
                  className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center p-0"
                  onClick={() => setShowExportMenu(false)}
                >
                  <div
                    className="w-full bg-white rounded-t-2xl p-4 space-y-2 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-mobile-safe"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <span className="font-extrabold text-sm text-zinc-900">Export Resume</span>
                      <button
                        type="button"
                        onClick={() => setShowExportMenu(false)}
                        className="text-zinc-400 hover:text-zinc-700 text-sm font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        exportResumeToDocx(document);
                        setShowExportMenu(false);
                        onSaveToast('📄 Exported ATS Word (.doc) document!');
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <FileDown size={15} className="text-blue-600" />
                      <span>Word Document (.doc)</span>
                    </button>

                    <button
                      onClick={() => {
                        exportResumeToLatex(document);
                        setShowExportMenu(false);
                        onSaveToast('📐 Exported LaTeX (.tex) resume!');
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <Code size={15} className="text-purple-600" />
                      <span>LaTeX Source (.tex)</span>
                    </button>

                    <button
                      onClick={() => {
                        handleCopyPlainText();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <Copy size={15} className="text-zinc-600" />
                      <span>Copy Plain Text</span>
                    </button>

                    <button
                      onClick={() => {
                        exportResumeToPlainText(document);
                        setShowExportMenu(false);
                        onSaveToast('📝 Exported Plain Text (.txt) file!');
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <FileText size={15} className="text-zinc-600" />
                      <span>Download .txt File</span>
                    </button>

                    <button
                      onClick={() => {
                        handlePrint();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <Printer size={15} className="text-cyan-600" />
                      <span>PDF / Print</span>
                    </button>

                    <div className="border-t border-zinc-100 my-1" />

                    <button
                      onClick={() => {
                        exportResumeJson(document);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <Download size={15} className="text-emerald-600" />
                      <span>JSON Backup</span>
                    </button>
                  </div>
                </div>

                {/* Desktop Dropdown */}
                <div className="hidden md:block absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      exportResumeToDocx(document);
                      setShowExportMenu(false);
                      onSaveToast('📄 Exported ATS Word (.doc) document!');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <FileDown size={14} className="text-blue-600" />
                    <span>Word Document (.doc)</span>
                  </button>

                  <button
                    onClick={() => {
                      exportResumeToLatex(document);
                      setShowExportMenu(false);
                      onSaveToast('📐 Exported LaTeX (.tex) resume!');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <Code size={14} className="text-purple-600" />
                    <span>LaTeX Source (.tex)</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCopyPlainText();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <Copy size={14} className="text-zinc-600" />
                    <span>Copy Plain Text</span>
                  </button>

                  <button
                    onClick={() => {
                      exportResumeToPlainText(document);
                      setShowExportMenu(false);
                      onSaveToast('📝 Exported Plain Text (.txt) file!');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <FileText size={14} className="text-zinc-600" />
                    <span>Download .txt File</span>
                  </button>

                  <button
                    onClick={() => {
                      handlePrint();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <Printer size={14} className="text-cyan-600" />
                    <span>PDF / Print</span>
                  </button>

                  <div className="border-t border-zinc-100 my-1" />

                  <button
                    onClick={() => {
                      exportResumeJson(document);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl flex items-center gap-2 transition"
                  >
                    <Download size={14} className="text-emerald-600" />
                    <span>JSON Backup</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <label
            className="p-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-600 rounded-xl text-xs transition-all shadow-2xs cursor-pointer shrink-0"
            title="Import JSON backup"
          >
            <Upload size={14} />
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Mobile View Toggle Bar: Form Editor vs Document Preview */}
      <div className="md:hidden flex items-center justify-center p-2 bg-zinc-100/90 border-b border-zinc-200/80 shrink-0 backdrop-blur-xs">
        <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl w-full max-w-sm gap-1 border border-zinc-300/60 shadow-inner">
          <button
            type="button"
            onClick={() => setMobileResumeSubTab('editor')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileResumeSubTab === 'editor'
                ? 'bg-white text-zinc-950 shadow-xs font-black'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>✏️ Form Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileResumeSubTab('preview')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileResumeSubTab === 'preview'
                ? 'bg-white text-zinc-950 shadow-xs font-black'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>📄 ATS Preview ({liveAtsScore.overallScore}%)</span>
          </button>
        </div>
      </div>

      {/* Main Studio 2-Pane Split */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ========================================================= */}
        {/* LEFT PANE: Interactive Structured Resume Editor (45% Width) */}
        {/* ========================================================= */}
        <div className={`w-full md:w-[48%] lg:w-[44%] xl:w-[42%] bg-white border-r border-zinc-200 flex flex-col min-h-0 overflow-hidden ${
          mobileResumeSubTab === 'editor' ? 'flex-1 md:flex-none' : 'hidden md:flex'
        }`}>
          
          {/* Section Navigation Tabs (Segmented Glassmorphism Pill Bar) */}
          <div className="p-2 bg-zinc-100/80 border-b border-zinc-200/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'contact', label: 'Contact', icon: User },
                { id: 'skills', label: 'Skills', icon: Code },
                { id: 'experience', label: 'Experience', icon: Briefcase },
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'projects', label: 'Projects', icon: Sparkles },
                { id: 'education', label: 'Education', icon: GraduationCap },
                { id: 'settings', label: 'Style', icon: Sliders },
                { id: 'custom_sections', label: '✨ Create Own', icon: PlusCircle, isHighlight: true },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-bold shrink-0 select-none ${
                      isActive
                        ? tab.isHighlight
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-zinc-900 border border-zinc-200/80 shadow-2xs'
                        : tab.isHighlight
                        ? 'bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/50'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/70'
                    }`}
                  >
                    <Icon
                      size={13}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? tab.isHighlight
                            ? 'text-white'
                            : 'text-cyan-600'
                          : tab.isHighlight
                          ? 'text-indigo-600'
                          : 'text-zinc-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                    {tab.isHighlight && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor Form Body (Scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
            
            {/* 1. WORK EXPERIENCE EDITOR */}
            {activeSection === 'experience' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                      Work Experience
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Add bullet points starting with power verbs and concrete metrics.
                    </p>
                  </div>
                  <button
                    onClick={addExperience}
                    className="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-300 hover:bg-cyan-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Role</span>
                  </button>
                </div>

                {document.experience.map((exp) => (
                  <div
                    key={exp.id}
                    className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-3 shadow-2xs hover:border-zinc-300 transition-all"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                          Job Title / Role
                        </label>
                        <input
                          value={exp.role}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocument((prev) => ({
                              ...prev,
                              experience: prev.experience.map((item) =>
                                item.id === exp.id ? { ...item, role: val } : item
                              ),
                            }));
                          }}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                          Company Name
                        </label>
                        <input
                          value={exp.company}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocument((prev) => ({
                              ...prev,
                              experience: prev.experience.map((item) =>
                                item.id === exp.id ? { ...item, company: val } : item
                              ),
                            }));
                          }}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                          Location
                        </label>
                        <input
                          value={exp.location}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocument((prev) => ({
                              ...prev,
                              experience: prev.experience.map((item) =>
                                item.id === exp.id ? { ...item, location: val } : item
                              ),
                            }));
                          }}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                            Start Year
                          </label>
                          <input
                            value={exp.startDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDocument((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id ? { ...item, startDate: val } : item
                                ),
                              }));
                            }}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                            End Year
                          </label>
                          <input
                            value={exp.current ? 'Present' : exp.endDate}
                            disabled={exp.current}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDocument((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id ? { ...item, endDate: val } : item
                                ),
                              }));
                            }}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500 disabled:bg-zinc-100 disabled:text-zinc-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bullet Points / Achievements */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase block">
                        Responsibilities &amp; Achievements (One bullet per line)
                      </label>
                      <textarea
                        value={exp.bullets.join('\n')}
                        rows={4}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n');
                          setDocument((prev) => ({
                            ...prev,
                            updatedAt: Date.now(),
                            experience: prev.experience.map((item) =>
                              item.id === exp.id ? { ...item, bullets: lines } : item
                            ),
                          }));
                        }}
                        placeholder="Architected distributed Kafka pipeline, reducing latency by 35%...&#10;Optimized PostgreSQL queries, elevating throughput by 3.5x...&#10;Mentored an agile team of 8 engineers..."
                        className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-800 outline-none focus:border-cyan-500 leading-relaxed font-medium"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => deleteExperience(exp.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Delete Role</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. TECHNICAL SKILLS EDITOR */}
            {activeSection === 'skills' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Technical Skills &amp; Stack Matrix
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Categorize technologies to maximize ATS boolean search density.
                  </p>
                </div>

                {(
                  [
                    { key: 'languages', label: 'Programming Languages', placeholder: 'TypeScript, JavaScript, Python, Go, Java, SQL, C++...' },
                    { key: 'frontend', label: 'Frontend Technologies', placeholder: 'React, Next.js, TailwindCSS, Redux, Vite, Vue, HTML5, CSS3...' },
                    { key: 'backend', label: 'Backend & APIs', placeholder: 'Node.js, Express, FastAPI, REST APIs, GraphQL, Microservices...' },
                    { key: 'databases', label: 'Databases & Storage', placeholder: 'PostgreSQL, Redis, MongoDB, MySQL, DynamoDB, ElasticSearch...' },
                    { key: 'cloudDevops', label: 'Cloud & DevOps', placeholder: 'AWS, Docker, Kubernetes, CI/CD, GitHub Actions, Linux, Terraform...' },
                    { key: 'tools', label: 'Tools, Testing & Architecture', placeholder: 'Git, Jest, Playwright, Postman, Docker Compose, System Design...' },
                  ] as Array<{ key: keyof typeof document.skills; label: string; placeholder: string }>
                ).map((cat) => (
                  <div key={cat.key} className="border border-zinc-200 rounded-2xl p-3.5 bg-zinc-50/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 block">{cat.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {(document.skills[cat.key] || []).length} skills
                      </span>
                    </div>

                    {/* Direct Comma-Separated Input */}
                    <textarea
                      value={(document.skills[cat.key] || []).join(', ')}
                      rows={2}
                      onChange={(e) => {
                        const items = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                        setDocument((prev) => ({
                          ...prev,
                          updatedAt: Date.now(),
                          skills: {
                            ...prev.skills,
                            [cat.key]: items,
                          },
                        }));
                      }}
                      placeholder={cat.placeholder}
                      className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-800 outline-none focus:border-cyan-500 font-medium leading-relaxed resize-none"
                    />

                    {/* Visual Pill Chips */}
                    {(document.skills[cat.key] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(document.skills[cat.key] || []).map((skill) => (
                          <span
                            key={skill}
                            className="bg-white border border-zinc-200 text-zinc-800 text-xs px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => removeSkillFromCategory(cat.key, skill)}
                              className="text-zinc-400 hover:text-red-600 font-bold"
                              title={`Remove ${skill}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 3. EXECUTIVE SUMMARY EDITOR */}
            {activeSection === 'summary' && (
              <div className="space-y-3 animate-fadeIn">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Executive Summary
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    A crisp 2-3 line candidate pitch describing years of experience & core value.
                  </p>
                </div>

                <div className="relative">
                  <textarea
                    value={document.summary}
                    rows={5}
                    onChange={(e) =>
                      setDocument((prev) => ({ ...prev, summary: e.target.value, updatedAt: Date.now() }))
                    }
                    placeholder="e.g. Senior Full Stack Engineer with 6+ years experience architecting scalable distributed systems..."
                    className="w-full bg-zinc-50/70 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-800 outline-none focus:border-cyan-500 leading-relaxed font-medium"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-400">
                    {document.summary.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
              </div>
            )}

            {/* 4. CONTACT & ONLINE PROFILES */}
            {activeSection === 'contact' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Contact &amp; Online Footprint
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Verified recruiter contact channels for automated parser routing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      Full Legal Name
                    </label>
                    <input
                      value={document.contact.fullName}
                      onChange={(e) => updateContact('fullName', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={document.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      Direct Phone
                    </label>
                    <input
                      value={document.contact.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      Location / City
                    </label>
                    <input
                      value={document.contact.location}
                      onChange={(e) => updateContact('location', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      value={document.contact.linkedIn}
                      onChange={(e) => updateContact('linkedIn', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      GitHub URL
                    </label>
                    <input
                      value={document.contact.gitHub}
                      onChange={(e) => updateContact('gitHub', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                      Portfolio URL
                    </label>
                    <input
                      value={document.contact.portfolio}
                      onChange={(e) => updateContact('portfolio', e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. FEATURED PROJECTS EDITOR */}
            {activeSection === 'projects' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                      Featured Projects
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Showcase hands-on software architectures and live systems.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newProj = {
                        id: `proj_${Date.now()}`,
                        name: '',
                        techStack: [],
                        bullets: [],
                      };
                      setDocument((prev) => ({
                        ...prev,
                        projects: [newProj, ...prev.projects],
                      }));
                    }}
                    className="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Project</span>
                  </button>
                </div>

                {document.projects.map((proj) => (
                  <div key={proj.id} className="border border-zinc-200 rounded-2xl p-3.5 bg-zinc-50/50 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={proj.name}
                        placeholder="Project Name"
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocument((prev) => ({
                            ...prev,
                            projects: prev.projects.map((p) =>
                              p.id === proj.id ? { ...p, name: val } : p
                            ),
                          }));
                        }}
                        className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none"
                      />
                      <input
                        value={proj.url || ''}
                        placeholder="Live URL / Demo Link"
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocument((prev) => ({
                            ...prev,
                            projects: prev.projects.map((p) =>
                              p.id === proj.id ? { ...p, url: val } : p
                            ),
                          }));
                        }}
                        className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <textarea
                        value={proj.bullets.join('\n')}
                        rows={2}
                        placeholder="Project description and architecture deliverables (one per line)..."
                        onChange={(e) => {
                          const lines = e.target.value.split('\n');
                          setDocument((prev) => ({
                            ...prev,
                            projects: prev.projects.map((p) =>
                              p.id === proj.id ? { ...p, bullets: lines } : p
                            ),
                          }));
                        }}
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs text-zinc-800 outline-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          setDocument((prev) => ({
                            ...prev,
                            projects: prev.projects.filter((p) => p.id !== proj.id),
                          }))
                        }
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        Delete Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. EDUCATION & CERTS EDITOR */}
            {activeSection === 'education' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                      Education &amp; Academic Credentials
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">Degrees, honors, and accredited certifications.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newEdu = {
                        id: `edu_${Date.now()}`,
                        institution: '',
                        degree: '',
                        location: '',
                        graduationYear: '',
                      };
                      setDocument((prev) => ({
                        ...prev,
                        education: [newEdu, ...prev.education],
                      }));
                    }}
                    className="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Degree</span>
                  </button>
                </div>

                {document.education.map((edu) => (
                  <div key={edu.id} className="border border-zinc-200 rounded-2xl p-3.5 bg-zinc-50/50 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={edu.institution}
                        placeholder="University / Institution"
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocument((prev) => ({
                            ...prev,
                            education: prev.education.map((ed) =>
                              ed.id === edu.id ? { ...ed, institution: val } : ed
                            ),
                          }));
                        }}
                        className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none"
                      />
                      <input
                        value={edu.degree}
                        placeholder="Degree (e.g. B.S. in Computer Science)"
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocument((prev) => ({
                            ...prev,
                            education: prev.education.map((ed) =>
                              ed.id === edu.id ? { ...ed, degree: val } : ed
                            ),
                          }));
                        }}
                        className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-none"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() =>
                          setDocument((prev) => ({
                            ...prev,
                            education: prev.education.filter((ed) => ed.id !== edu.id),
                          }))
                        }
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        Delete Degree
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 7. STYLE & TYPOGRAPHY SETTINGS */}
            {activeSection === 'settings' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                    Document Typography &amp; Layout
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Configure clean font families and density.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                      Font Family
                    </label>
                    <div className="flex gap-2">
                      {(['serif', 'sans', 'mono'] as const).map((font) => (
                        <button
                          key={font}
                          onClick={() =>
                            setDocument((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, fontFamily: font },
                            }))
                          }
                          className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                            document.settings.fontFamily === font
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                              : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {font === 'serif' ? 'Times / Serif (ATS Standard)' : font === 'sans' ? 'Inter / Sans' : 'Modern Mono'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                      Text Density &amp; Spacing
                    </label>
                    <div className="flex gap-2">
                      {(['compact', 'standard', 'spacious'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() =>
                            setDocument((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, fontSize: sz },
                            }))
                          }
                          className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                            document.settings.fontSize === sz
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                              : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. CREATE OWN - ADVANCED CUSTOM SECTION BUILDER */}
            {activeSection === 'custom_sections' && (
              <CustomSectionBuilder
                document={document}
                onUpdateDocument={setDocument}
                onToast={onSaveToast}
              />
            )}

          </div>

          {/* Bottom Bar: Import from Persona Trigger & Demo Loader */}
          <div className="p-2.5 sm:p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0 text-xs">
            <span className="text-[11px] text-zinc-500 font-medium truncate hidden xs:inline">
              Auto-saved in real-time
            </span>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleLoadDemoResume}
                className="px-2.5 py-1 text-amber-700 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 rounded-lg font-bold flex items-center gap-1 transition-colors text-[11px] sm:text-xs"
                title="Load full ATS-optimized engineering demo resume"
              >
                <Sparkles size={11} className="text-amber-600" />
                <span>Load Demo</span>
              </button>
              <button
                type="button"
                onClick={handleImportFromPersona}
                className="px-2.5 py-1 text-cyan-700 hover:text-cyan-900 bg-cyan-50/80 hover:bg-cyan-100/80 border border-cyan-200/80 rounded-lg font-bold flex items-center gap-1 transition-colors text-[11px] sm:text-xs"
              >
                <RefreshCw size={11} />
                <span>Reload from Persona</span>
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT PANE: Live Document Canvas & Real-time ATS Cockpit  */}
        {/* ========================================================= */}
        <div className={`flex-1 min-h-0 bg-[#E2E8F0] flex flex-col overflow-hidden relative ${
          mobileResumeSubTab === 'preview' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Top Live ATS Metrics HUD */}
          <div className="bg-white/95 backdrop-blur-md border-b border-zinc-300/80 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 shadow-xs shrink-0 z-20 overflow-x-auto no-scrollbar flex-nowrap">
            
            {/* Left: Document View Label */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-extrabold text-zinc-800 tracking-tight whitespace-nowrap">
                <span className="hidden sm:inline">Live Document </span>Preview
              </span>
            </div>

            {/* Right: Zoom & Suggestions Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
              <button
                onClick={() => setShowAtsDetails(!showAtsDetails)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                  showAtsDetails
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-400'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                }`}
              >
                <span>ATS<span className="hidden sm:inline"> Feedback</span></span>
                {showAtsDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              <button
                onClick={() => setIsDocumentEditMode(!isDocumentEditMode)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                  isDocumentEditMode
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                }`}
                title="Toggle Direct WYSIWYG Document Editor (Click anywhere on page to edit directly)"
              >
                <Edit3 size={12} className={isDocumentEditMode ? 'text-white' : 'text-cyan-600'} />
                <span className="hidden sm:inline">{isDocumentEditMode ? 'Direct Edit: ON' : 'Edit Document'}</span>
                <span className="sm:hidden">{isDocumentEditMode ? 'Editing' : 'Edit'}</span>
              </button>

              {/* Undo / Redo Controls */}
              <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-300 shrink-0">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIdx <= 0}
                  className="p-1 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:hover:text-zinc-600 transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIdx >= history.length - 1}
                  className="p-1 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:hover:text-zinc-600 transition-colors"
                  title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                >
                  <Redo2 size={13} />
                </button>
              </div>

              <div className="h-4 w-px bg-zinc-300 mx-0.5 sm:mx-1 shrink-0" />

              <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-300 shrink-0">
                <button
                  onClick={() => setZoom((z) => Math.max(35, z - 5))}
                  className="p-1 text-zinc-600 hover:text-zinc-900"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-zinc-700 min-w-[32px] sm:min-w-[34px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(130, z + 5))}
                  className="p-1 text-zinc-600 hover:text-zinc-900"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Real-Time LLM ATS Audit Drawer */}
          {showAtsDetails && (
            <div className="bg-white border-b border-zinc-300 p-4 shadow-lg animate-slideDown max-h-80 overflow-y-auto shrink-0 z-10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-white">
                    <Sparkles size={14} className={isAnalyzingLlm ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-900 flex items-center gap-2">
                      <span>Real-Time AI ATS Recruiter Critique</span>
                      <span className="text-[10px] font-mono font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-full">
                        {llmFeedback?.source === 'ollama' ? 'Qwen 2.5 LLM' : 'On-Device AI'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Audited against Workday, Greenhouse, Ashby, and Lever ranking weights.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {llmFeedback && (
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {llmFeedback.predictedPassRate}% Est. Pass Rate
                    </span>
                  )}
                  <button
                    onClick={triggerLlmAudit}
                    disabled={isAnalyzingLlm}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                    title="Re-run Local AI ATS Audit"
                  >
                    <RefreshCw size={11} className={isAnalyzingLlm ? 'animate-spin' : ''} />
                    <span>{isAnalyzingLlm ? 'Analyzing...' : 'Re-audit'}</span>
                  </button>
                </div>
              </div>

              {/* AI Summary Banner */}
              {llmFeedback?.summary && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-800 leading-relaxed font-medium">
                  <span className="font-bold text-zinc-900 block mb-0.5">Executive Feedback:</span>
                  <p>{llmFeedback.summary}</p>
                </div>
              )}

              {/* Strengths & Missing Keywords Columns */}
              {llmFeedback && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {llmFeedback.strengths?.length > 0 && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5 space-y-1">
                      <span className="font-bold text-emerald-900 block text-[11px]">
                        ✓ Standout Technical Strengths:
                      </span>
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-emerald-800 text-[11px]">
                        {llmFeedback.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {llmFeedback.missingKeywords?.length > 0 && (
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 space-y-1">
                      <span className="font-bold text-amber-900 block text-[11px]">
                        ⚠ Suggested High-Value Keywords:
                      </span>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {llmFeedback.missingKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-amber-300 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          >
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Buzzwords & Passive Voice Inspector */}
              {buzzwordIssues.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Wand2 size={13} className="text-amber-700" />
                      <span>{buzzwordIssues.length} Passive Cliché / Buzzwords Detected</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFix}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                    >
                      1-Click Auto-Fix All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {buzzwordIssues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-amber-200 text-amber-900 text-[10px] font-medium px-2 py-0.5 rounded shadow-2xs"
                        title={`Replace "${issue.original}" with "${issue.suggested}" in ${issue.location}`}
                      >
                        <span className="line-through text-red-600 mr-1">{issue.original}</span>
                        <span className="text-emerald-700 font-bold">➔ {issue.suggested}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                {(llmFeedback?.recommendations || liveAtsScore.actionPlan.map(a => a.instruction)).slice(0, 4).map((rec: string, idx: number) => (
                  <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-2.5 text-xs space-y-0.5 shadow-2xs">
                    <span className="font-bold text-zinc-900 block text-[11px]">
                      Recommendation #{idx + 1}
                    </span>
                    <p className="text-zinc-600 text-[11px] leading-snug">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Canvas Container with Scaling */}
          <div className="flex-1 min-h-0 w-full overflow-auto p-2 sm:p-8 flex justify-center items-start touch-pan-x touch-pan-y">
            {isDocumentEditMode ? (
              <div className="w-full flex justify-center min-w-fit">
                <DocumentCanvas
                  document={document}
                  onUpdateDocument={setDocument}
                  isEditMode={true}
                  onToggleEditMode={() => setIsDocumentEditMode(!isDocumentEditMode)}
                  zoom={zoom}
                  onToast={onSaveToast}
                />
              </div>
            ) : (
              <div className="w-full flex justify-center min-w-fit">
                <div
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                  className="transition-transform duration-150"
                >
                  {renderTemplate()}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Multi-Version Resume Management Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="text-cyan-600" size={18} />
                <h3 className="font-extrabold text-sm text-zinc-900">Saved Resume Versions</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Save Current Resume Form */}
            <form onSubmit={handleSaveCurrentVersion} className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-600 block">
                Save Current Resume as New Version:
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer (Go/AWS)..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-cyan-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  Save
                </button>
              </div>
            </form>

            {/* List of Saved Versions */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 max-h-60 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Your Saved Profiles ({savedVersions.length}):
              </span>

              {savedVersions.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2 text-center">
                  No saved versions yet. Save your current draft above!
                </p>
              ) : (
                savedVersions.map((ver) => (
                  <div
                    key={ver.id}
                    onClick={() => handleLoadVersion(ver)}
                    className="p-3 bg-zinc-50 hover:bg-cyan-50/60 border border-zinc-200 hover:border-cyan-300 rounded-xl cursor-pointer flex items-center justify-between group transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 group-hover:text-cyan-900">
                        {ver.name}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Saved {new Date(ver.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Load ➔
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteVersion(ver.id, e)}
                        className="text-zinc-400 hover:text-red-600 p-1 transition-colors"
                        title="Delete version"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
