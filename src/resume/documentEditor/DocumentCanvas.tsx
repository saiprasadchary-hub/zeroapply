import React, { useState, useRef, useEffect } from 'react';
import type { ResumeDocument, ResumeSectionKey } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import { EditableField } from './EditableField';
import { FloatingFormatToolbar, type FloatingFormatType } from './FloatingFormatToolbar';
import { BulletLengthMeter } from './BulletLengthMeter';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface DocumentCanvasProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  isEditMode: boolean;
  onToggleEditMode?: () => void;
  zoom: number;
  onToast?: (msg: string) => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  isEditMode,
  zoom,
  onToast,
}) => {
  const [activeContext, setActiveContext] = useState<{
    section: string;
    id?: string;
    index?: number;
    text: string;
  } | null>(null);

  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Dynamic Canvas Height Sentinel & Page Calculation
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState<number>(1050);

  useEffect(() => {
    if (!canvasRef.current) return;
    const updateHeight = () => {
      if (canvasRef.current) {
        setCanvasHeight(canvasRef.current.offsetHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [doc, zoom]);

  const sectionOrder = doc.settings.sectionOrder || DEFAULT_SECTION_ORDER;

  // Reorder sections
  const handleMoveSection = (sectionKey: ResumeSectionKey, direction: 'up' | 'down') => {
    const currentList = [...sectionOrder];
    const index = currentList.indexOf(sectionKey);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = currentList[index - 1];
      currentList[index - 1] = currentList[index];
      currentList[index] = temp;
    } else if (direction === 'down' && index < currentList.length - 1) {
      const temp = currentList[index + 1];
      currentList[index + 1] = currentList[index];
      currentList[index] = temp;
    }

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        sectionOrder: currentList,
      },
    }));

    if (onToast) onToast(`Moved ${sectionKey} section ${direction}!`);
  };

  // Reorder Work Experience Item
  const handleMoveExp = (expId: string, direction: 'up' | 'down') => {
    setDoc((prev) => {
      const list = [...prev.experience];
      const idx = list.findIndex((e) => e.id === expId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, updatedAt: Date.now(), experience: list };
    });
  };

  // Reorder Experience Bullet Point
  const handleMoveExpBullet = (expId: string, bIdx: number, direction: 'up' | 'down') => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      experience: prev.experience.map((e) => {
        if (e.id !== expId) return e;
        const newBullets = [...e.bullets];
        const targetIdx = direction === 'up' ? bIdx - 1 : bIdx + 1;
        if (targetIdx < 0 || targetIdx >= newBullets.length) return e;
        const temp = newBullets[bIdx];
        newBullets[bIdx] = newBullets[targetIdx];
        newBullets[targetIdx] = temp;
        return { ...e, bullets: newBullets };
      }),
    }));
  };

  // Reorder Project Item
  const handleMoveProject = (projId: string, direction: 'up' | 'down') => {
    setDoc((prev) => {
      const list = [...prev.projects];
      const idx = list.findIndex((p) => p.id === projId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, updatedAt: Date.now(), projects: list };
    });
  };

  // Reorder Project Bullet Point
  const handleMoveProjBullet = (projId: string, bIdx: number, direction: 'up' | 'down') => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      projects: prev.projects.map((p) => {
        if (p.id !== projId) return p;
        const newBullets = [...p.bullets];
        const targetIdx = direction === 'up' ? bIdx - 1 : bIdx + 1;
        if (targetIdx < 0 || targetIdx >= newBullets.length) return p;
        const temp = newBullets[bIdx];
        newBullets[bIdx] = newBullets[targetIdx];
        newBullets[targetIdx] = temp;
        return { ...p, bullets: newBullets };
      }),
    }));
  };

  // Dismiss popup when clicking outside editable fields or unselecting text
  useEffect(() => {
    if (!isEditMode) {
      setActiveContext(null);
      return;
    }

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isToolbar = target.closest('#floating-format-toolbar');
      const isEditable = target.closest('[contenteditable="true"]');

      if (!isToolbar && !isEditable) {
        setActiveContext(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveContext(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditMode]);

  // Track focused field position
  const handleFieldFocus = (
    e: React.FocusEvent<HTMLElement>,
    section: string,
    id?: string,
    index?: number,
    text: string = ''
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setToolbarPos({
      top: rect.top,
      left: Math.max(20, rect.left),
    });
    setActiveContext({
      section,
      id,
      index,
      text: text || e.currentTarget.innerText || (e.currentTarget as any).value || '',
    });
  };

  // Format active text (Bold, Italic, Underline, Clean, STAR, Expand, Condense, Link, Case, Split)
  const handleApplyFormat = (formatType: FloatingFormatType, payload?: string) => {
    if (!activeContext) return;

    if (formatType === 'star') {
      // 1. STAR Method Rewriter (Situation/Task -> Action -> Result)
      let text = activeContext.text.trim().replace(/[.;]+$/, '');
      text = text.replace(/^(responsible for|tasked with|involved in|worked on|assisted with|helped with|helped)\s+/i, '');
      const words = text.split(/\s+/);
      const firstWord = words[0] || 'Engineered';
      const hasPastVerb = /^[A-Z][a-z]+ed\b/.test(firstWord);
      const verb = hasPastVerb ? firstWord : 'Architected';
      const coreAction = hasPastVerb ? words.slice(1).join(' ') : text;
      const starResult = `${verb} ${coreAction || 'core application infrastructure'}, overcoming critical scalability bottlenecks and driving a 35% performance gain with 99.9% uptime.`;

      if (
        activeContext.section === 'experience' &&
        activeContext.id &&
        typeof activeContext.index === 'number'
      ) {
        const expId = activeContext.id;
        const bIdx = activeContext.index;
        setDoc((prev) => ({
          ...prev,
          updatedAt: Date.now(),
          experience: prev.experience.map((e) =>
            e.id === expId
              ? {
                  ...e,
                  bullets: e.bullets.map((b, idx) => (idx === bIdx ? starResult : b)),
                }
              : e
          ),
        }));
      } else if (activeContext.section === 'summary') {
        setDoc((prev) => ({ ...prev, summary: starResult, updatedAt: Date.now() }));
      }
      setActiveContext((prev) => (prev ? { ...prev, text: starResult } : null));
      if (onToast) onToast('⭐ Rewritten into STAR Situation-Action-Result format!');
    } else if (formatType === 'expand') {
      // 2. Expand with Technical Depth & Architecture Context
      let text = activeContext.text.trim().replace(/[.;]+$/, '');
      const expandedResult = `${text}, leveraging distributed microservices, automated CI/CD pipelines, and high-throughput Redis caching to maintain <50ms p99 latency.`;

      if (
        activeContext.section === 'experience' &&
        activeContext.id &&
        typeof activeContext.index === 'number'
      ) {
        const expId = activeContext.id;
        const bIdx = activeContext.index;
        setDoc((prev) => ({
          ...prev,
          updatedAt: Date.now(),
          experience: prev.experience.map((e) =>
            e.id === expId
              ? {
                  ...e,
                  bullets: e.bullets.map((b, idx) => (idx === bIdx ? expandedResult : b)),
                }
              : e
          ),
        }));
      } else if (activeContext.section === 'summary') {
        setDoc((prev) => ({ ...prev, summary: expandedResult, updatedAt: Date.now() }));
      }
      setActiveContext((prev) => (prev ? { ...prev, text: expandedResult } : null));
      if (onToast) onToast('↔️ Expanded with technical architecture & scale depth!');
    } else if (formatType === 'condense') {
      // 3. Condense & Trim Filler Words to Fit 1 Line
      let text = activeContext.text
        .replace(/\bin order to\b/gi, 'to')
        .replace(/\bresponsible for (managing|leading|developing|building|architecting)\b/gi, '$1')
        .replace(/\bresponsible for\b/gi, 'led')
        .replace(/\bwas tasked with\b/gi, 'delivered')
        .replace(/\bassisted (in|with) (the )?\b/gi, 'co-developed ')
        .replace(/\bworked with team members to\b/gi, 'collaborated to')
        .replace(/\bduties included\b/gi, 'executed')
        .replace(/\bhandling the\b/gi, 'managing')
        .replace(/\butilizing\b/gi, 'using')
        .replace(/\bin an effort to\b/gi, 'to')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (
        activeContext.section === 'experience' &&
        activeContext.id &&
        typeof activeContext.index === 'number'
      ) {
        const expId = activeContext.id;
        const bIdx = activeContext.index;
        setDoc((prev) => ({
          ...prev,
          updatedAt: Date.now(),
          experience: prev.experience.map((e) =>
            e.id === expId
              ? {
                  ...e,
                  bullets: e.bullets.map((b, idx) => (idx === bIdx ? text : b)),
                }
              : e
          ),
        }));
      } else if (activeContext.section === 'summary') {
        setDoc((prev) => ({ ...prev, summary: text, updatedAt: Date.now() }));
      }
      setActiveContext((prev) => (prev ? { ...prev, text: text } : null));
      if (onToast) onToast('✂️ Condensed phrasing & trimmed filler words!');
    } else if (formatType === 'noSelection') {
      // Prompt user to highlight text first
      if (onToast) onToast('⚠️ Please highlight/select the text first to insert a link.');
    } else if (formatType === 'link') {
      // 4. Clickable Hyperlink Injector (Inserts link directly inside highlighted text)
      const cleanUrl = payload?.trim() || 'https://github.com';
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      if (selectedText) {
        document.execCommand('createLink', false, cleanUrl);
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl) {
          const anchors = activeEl.querySelectorAll('a');
          anchors.forEach((a) => {
            if (a.getAttribute('href') === cleanUrl || a.innerText.trim() === selectedText) {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
              a.className = 'text-blue-600 underline font-medium hover:text-blue-800 cursor-pointer';
            }
          });

          // Sync updated HTML to state
          const html = activeEl.innerHTML;
          if (
            activeContext.section === 'experience' &&
            activeContext.id &&
            typeof activeContext.index === 'number'
          ) {
            const expId = activeContext.id;
            const bIdx = activeContext.index;
            setDoc((prev) => ({
              ...prev,
              updatedAt: Date.now(),
              experience: prev.experience.map((e) =>
                e.id === expId
                  ? {
                      ...e,
                      bullets: e.bullets.map((b, idx) => (idx === bIdx ? html : b)),
                    }
                  : e
              ),
            }));
          } else if (activeContext.section === 'summary') {
            setDoc((prev) => ({ ...prev, summary: html, updatedAt: Date.now() }));
          } else if (
            activeContext.section === 'projects' &&
            activeContext.id &&
            typeof activeContext.index === 'number'
          ) {
            const projId = activeContext.id;
            const bIdx = activeContext.index;
            setDoc((prev) => ({
              ...prev,
              updatedAt: Date.now(),
              projects: prev.projects.map((p) =>
                p.id === projId
                  ? {
                      ...p,
                      bullets: p.bullets.map((b, idx) => (idx === bIdx ? html : b)),
                    }
                  : p
              ),
            }));
          }
          setActiveContext((prev) => (prev ? { ...prev, text: activeEl.innerText } : null));
        }
        if (onToast) onToast(`🔗 Attached link to "${selectedText}"!`);
      } else {
        if (onToast) onToast('⚠️ Please highlight/select the text first to insert a link.');
      }
    } else if (formatType === 'unlink') {
      // 5. Remove Hyperlink from selected text / anchor
      document.execCommand('unlink', false);
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl) {
        const html = activeEl.innerHTML;
        if (
          activeContext.section === 'experience' &&
          activeContext.id &&
          typeof activeContext.index === 'number'
        ) {
          const expId = activeContext.id;
          const bIdx = activeContext.index;
          setDoc((prev) => ({
            ...prev,
            updatedAt: Date.now(),
            experience: prev.experience.map((e) =>
              e.id === expId
                ? {
                    ...e,
                    bullets: e.bullets.map((b, idx) => (idx === bIdx ? html : b)),
                  }
                : e
            ),
          }));
        } else if (activeContext.section === 'summary') {
          setDoc((prev) => ({ ...prev, summary: html, updatedAt: Date.now() }));
        } else if (
          activeContext.section === 'projects' &&
          activeContext.id &&
          typeof activeContext.index === 'number'
        ) {
          const projId = activeContext.id;
          const bIdx = activeContext.index;
          setDoc((prev) => ({
            ...prev,
            updatedAt: Date.now(),
            projects: prev.projects.map((p) =>
              p.id === projId
                ? {
                    ...p,
                    bullets: p.bullets.map((b, idx) => (idx === bIdx ? html : b)),
                  }
                : p
            ),
          }));
        }
        setActiveContext((prev) => (prev ? { ...prev, text: activeEl.innerText } : null));
      }
      if (onToast) onToast('🔗 Link removed!');
    } else if (formatType === 'toggleCase') {
      // 5. Smart Case Converter (Title Case <-> Sentence Case)
      let text = activeContext.text.trim();
      const words = text.split(/\s+/);
      const isTitle = words.length > 1 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.7;

      let caseResult = '';
      if (isTitle) {
        // Switch to Sentence Case
        caseResult = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      } else {
        // Switch to Title Case
        const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'with']);
        caseResult = words
          .map((w, idx) => {
            const lower = w.toLowerCase();
            if (idx === 0 || !smallWords.has(lower)) {
              return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }
            return lower;
          })
          .join(' ');
      }

      if (
        activeContext.section === 'experience' &&
        activeContext.id &&
        typeof activeContext.index === 'number'
      ) {
        const expId = activeContext.id;
        const bIdx = activeContext.index;
        setDoc((prev) => ({
          ...prev,
          updatedAt: Date.now(),
          experience: prev.experience.map((e) =>
            e.id === expId
              ? {
                  ...e,
                  bullets: e.bullets.map((b, idx) => (idx === bIdx ? caseResult : b)),
                }
              : e
          ),
        }));
      } else if (activeContext.section === 'summary') {
        setDoc((prev) => ({ ...prev, summary: caseResult, updatedAt: Date.now() }));
      }
      setActiveContext((prev) => (prev ? { ...prev, text: caseResult } : null));
      if (onToast) onToast(`Aa Switched to ${isTitle ? 'Sentence' : 'Title'} Case!`);
    } else if (formatType === 'splitBullet') {
      // 6. Split Run-on Bullet Point
      if (
        activeContext.section === 'experience' &&
        activeContext.id &&
        typeof activeContext.index === 'number'
      ) {
        const expId = activeContext.id;
        const bIdx = activeContext.index;
        const text = activeContext.text.trim();
        const splitRegex = /;\s*|\s+which resulted in\s+|\s+while also\s+|\s+and additionally\s+|\s+and led to\s+/i;
        const parts = text.split(splitRegex);

        if (parts.length >= 2) {
          const p1 = parts[0].trim().replace(/[.;]+$/, '') + '.';
          const p2Raw = parts.slice(1).join(' ').trim();
          const p2 = p2Raw.charAt(0).toUpperCase() + p2Raw.slice(1).replace(/[.;]+$/, '') + '.';

          setDoc((prev) => ({
            ...prev,
            updatedAt: Date.now(),
            experience: prev.experience.map((e) => {
              if (e.id !== expId) return e;
              const newBullets = [...e.bullets];
              newBullets.splice(bIdx, 1, p1, p2);
              return { ...e, bullets: newBullets };
            }),
          }));
          setActiveContext((prev) => (prev ? { ...prev, text: p1 } : null));
          if (onToast) onToast('✂️ Split run-on sentence into 2 concise bullets!');
        } else {
          if (onToast) onToast('No compound conjunctions (and, while, which resulted in) found to split.');
        }
      }
    } else {
      // Bold / Italic / Underline / Clean applied to active DOM element
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && activeContext) {
        const html = activeEl.innerHTML;
        if (
          activeContext.section === 'experience' &&
          activeContext.id &&
          typeof activeContext.index === 'number'
        ) {
          const expId = activeContext.id;
          const bIdx = activeContext.index;
          setDoc((prev) => ({
            ...prev,
            updatedAt: Date.now(),
            experience: prev.experience.map((e) =>
              e.id === expId
                ? {
                    ...e,
                    bullets: e.bullets.map((b, idx) => (idx === bIdx ? html : b)),
                  }
                : e
            ),
          }));
        } else if (activeContext.section === 'summary') {
          setDoc((prev) => ({
            ...prev,
            summary: html,
            updatedAt: Date.now(),
          }));
        } else if (activeContext.section === 'contact.fullName') {
          setDoc((prev) => ({
            ...prev,
            contact: { ...prev.contact, fullName: activeEl.innerText },
            updatedAt: Date.now(),
          }));
        } else if (activeContext.section === 'contact.jobTitle') {
          setDoc((prev) => ({
            ...prev,
            contact: { ...prev.contact, jobTitle: activeEl.innerText },
            updatedAt: Date.now(),
          }));
        }
      }
    }
  };

  // Add bullet to current role
  const handleAddBulletToCurrent = (expId: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      experience: prev.experience.map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: [...e.bullets, ''],
            }
          : e
      ),
    }));
  };

  // Delete bullet
  const handleDeleteBullet = (expId: string, bIdx: number) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      experience: prev.experience.map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: e.bullets.filter((_, idx) => idx !== bIdx),
            }
          : e
      ),
    }));
  };

  // Delete role
  const handleDeleteRole = (expId: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      experience: prev.experience.filter((e) => e.id !== expId),
    }));
  };

  const fontClass =
    doc.settings.fontFamily === 'serif'
      ? 'font-serif'
      : doc.settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const spacingClass =
    doc.settings.fontSize === 'compact'
      ? 'text-[11px] leading-snug space-y-3'
      : doc.settings.fontSize === 'spacious'
      ? 'text-[13px] leading-relaxed space-y-5'
      : 'text-[12px] leading-normal space-y-4';

  // Section Reorder Control Header
  const renderSectionHeader = (title: string, sectionKey: ResumeSectionKey, rightAction?: React.ReactNode) => {
    const idx = sectionOrder.indexOf(sectionKey);
    return (
      <div className="flex items-center justify-between border-b border-zinc-900 pb-0.5 mb-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
          {title}
        </h2>

        <div className="flex items-center gap-1">
          {rightAction}

          {isEditMode && (
            <div className="flex items-center gap-0.5 bg-zinc-100 rounded px-1 py-0.5 border border-zinc-300 ml-1">
              <button
                type="button"
                onClick={() => handleMoveSection(sectionKey, 'up')}
                disabled={idx === 0}
                className="text-zinc-500 hover:text-cyan-700 disabled:opacity-30 p-0.5"
                title={`Move ${title} Up`}
              >
                <ArrowUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveSection(sectionKey, 'down')}
                disabled={idx === sectionOrder.length - 1}
                className="text-zinc-500 hover:text-cyan-700 disabled:opacity-30 p-0.5"
                title={`Move ${title} Down`}
              >
                <ArrowDown size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Section Renderers
  const renderSummarySection = () => {
    if (!isEditMode && (!doc.summary || !doc.summary.trim())) return null;
    return (
      <div key="summary" className="space-y-1">
        {renderSectionHeader('Professional Summary', 'summary')}
        <EditableField
          value={doc.summary}
          onChange={(val) =>
            setDoc((prev) => ({
              ...prev,
              summary: val,
              updatedAt: Date.now(),
            }))
          }
          isEditMode={isEditMode}
          multiline
          tag="p"
          placeholder="High-impact 2-3 sentence executive pitch highlighting years of experience, core stack, and major deliverables..."
          className="text-zinc-800 text-justify leading-relaxed block"
          onFocus={(e) => handleFieldFocus(e, 'summary', undefined, undefined, doc.summary)}
        />
      </div>
    );
  };

  const renderExperienceSection = () => (
    <div key="experience" className="space-y-2">
      {renderSectionHeader(
        'Work Experience',
        'experience',
        isEditMode && (
          <button
            type="button"
            onClick={() => {
              const newExp = {
                id: `exp_${Date.now()}`,
                company: '',
                role: '',
                location: '',
                startDate: '',
                endDate: '',
                current: true,
                bullets: [''],
              };
              setDoc((prev) => ({
                ...prev,
                updatedAt: Date.now(),
                experience: [newExp, ...prev.experience],
              }));
            }}
            className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
          >
            <Plus size={11} /> Add Role
          </button>
        )
      )}

      {doc.experience.length === 0 && isEditMode && (
        <div className="p-4 border-2 border-dashed border-cyan-300/80 rounded-xl text-center bg-cyan-50/30 space-y-1.5">
          <p className="text-xs text-zinc-600 font-medium">No work experience entries added yet.</p>
          <button
            type="button"
            onClick={() => {
              const newExp = {
                id: `exp_${Date.now()}`,
                company: '',
                role: '',
                location: '',
                startDate: '',
                endDate: '',
                current: true,
                bullets: [''],
              };
              setDoc((prev) => ({
                ...prev,
                updatedAt: Date.now(),
                experience: [newExp],
              }));
            }}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
          >
            <Plus size={12} /> Add Your First Work Role
          </button>
        </div>
      )}

      <div className="space-y-3">
        {doc.experience.map((exp, expIdx) => (
          <div key={exp.id} className="space-y-1 group relative">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="font-bold text-zinc-900 flex items-center gap-1 flex-wrap">
                {isEditMode && doc.experience.length > 1 && (
                  <div className="flex items-center gap-0.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleMoveExp(exp.id, 'up')}
                      disabled={expIdx === 0}
                      className="p-0.5 text-zinc-400 hover:text-cyan-600 disabled:opacity-20"
                      title="Move role up"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExp(exp.id, 'down')}
                      disabled={expIdx === doc.experience.length - 1}
                      className="p-0.5 text-zinc-400 hover:text-cyan-600 disabled:opacity-20"
                      title="Move role down"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                )}

                <EditableField
                  value={exp.role}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      experience: prev.experience.map((e) =>
                        e.id === exp.id ? { ...e, role: val } : e
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Job Title"
                  className="font-bold"
                  onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, undefined, exp.role)}
                />
                <span>, </span>
                <EditableField
                  value={exp.company}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      experience: prev.experience.map((e) =>
                        e.id === exp.id ? { ...e, company: val } : e
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Company Name"
                  className="font-semibold text-zinc-800"
                  onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, undefined, exp.company)}
                />
                <span>•</span>
                <EditableField
                  value={exp.location}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      experience: prev.experience.map((e) =>
                        e.id === exp.id ? { ...e, location: val } : e
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Location"
                  className="text-zinc-600 font-normal text-xs"
                  onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, undefined, exp.location)}
                />
              </div>

              <div className="text-[11px] text-zinc-600 font-mono flex items-center gap-1 shrink-0">
                <EditableField
                  value={exp.startDate}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      experience: prev.experience.map((e) =>
                        e.id === exp.id ? { ...e, startDate: val } : e
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Start Date"
                  onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, undefined, exp.startDate)}
                />
                <span>–</span>
                <EditableField
                  value={exp.endDate}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      experience: prev.experience.map((e) =>
                        e.id === exp.id ? { ...e, endDate: val } : e
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="End Date"
                  onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, undefined, exp.endDate)}
                />

                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(exp.id)}
                    className="ml-2 text-zinc-400 hover:text-red-600 p-0.5"
                    title="Delete this role"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Bullet Points */}
            <ul className="list-disc list-outside pl-4 space-y-1.5 text-zinc-800">
              {exp.bullets.map((bullet, bIdx) => (
                <li key={bIdx} className="leading-snug relative group/bullet">
                  <div className="flex items-start gap-1">
                    <div className="flex-1 space-y-0.5">
                      <EditableField
                        value={bullet}
                        onChange={(val) =>
                          setDoc((prev) => ({
                            ...prev,
                            updatedAt: Date.now(),
                            experience: prev.experience.map((e) =>
                              e.id === exp.id
                                ? {
                                    ...e,
                                    bullets: e.bullets.map((b, idx) => (idx === bIdx ? val : b)),
                                  }
                                : e
                            ),
                          }))
                        }
                        isEditMode={isEditMode}
                        multiline
                        placeholder="Action verb + deliverable + measurable KPI..."
                        onFocus={(e) => handleFieldFocus(e, 'experience', exp.id, bIdx, bullet)}
                      />
                      {isEditMode && bullet.trim() && (
                        <div className="opacity-0 group-hover/bullet:opacity-100 transition-opacity">
                          <BulletLengthMeter bullet={bullet} />
                        </div>
                      )}
                    </div>

                    {isEditMode && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/bullet:opacity-100 transition-opacity shrink-0">
                        {exp.bullets.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMoveExpBullet(exp.id, bIdx, 'up')}
                              disabled={bIdx === 0}
                              className="text-zinc-400 hover:text-cyan-600 disabled:opacity-20 p-0.5"
                              title="Move bullet up"
                            >
                              <ChevronUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExpBullet(exp.id, bIdx, 'down')}
                              disabled={bIdx === exp.bullets.length - 1}
                              className="text-zinc-400 hover:text-cyan-600 disabled:opacity-20 p-0.5"
                              title="Move bullet down"
                            >
                              <ChevronDown size={11} />
                            </button>
                          </>
                        )}
                        {exp.bullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBullet(exp.id, bIdx)}
                            className="text-zinc-400 hover:text-red-600 p-0.5"
                            title="Delete bullet"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {isEditMode && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => handleAddBulletToCurrent(exp.id)}
                  className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
                >
                  <Plus size={10} /> Add Bullet
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkillsSection = () => (
    <div key="skills" className="space-y-1.5">
      {renderSectionHeader('Technical Skills', 'skills')}
      <div className="space-y-1 text-zinc-800">
        {(isEditMode || doc.skills.languages?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Languages: </span>
            <EditableField
              value={doc.skills.languages?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, languages: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="TypeScript, JavaScript, Python, Go, SQL..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'languages', undefined, doc.skills.languages?.join(', '))}
            />
          </div>
        )}

        {(isEditMode || doc.skills.frontend?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Frontend: </span>
            <EditableField
              value={doc.skills.frontend?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, frontend: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="React, Next.js, TailwindCSS, Redux, Vite..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'frontend', undefined, doc.skills.frontend?.join(', '))}
            />
          </div>
        )}

        {(isEditMode || doc.skills.backend?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Backend &amp; APIs: </span>
            <EditableField
              value={doc.skills.backend?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, backend: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="Node.js, Express, FastAPI, GraphQL, Microservices..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'backend', undefined, doc.skills.backend?.join(', '))}
            />
          </div>
        )}

        {(isEditMode || doc.skills.databases?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Databases &amp; Storage: </span>
            <EditableField
              value={doc.skills.databases?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, databases: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="PostgreSQL, Redis, MongoDB, DynamoDB..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'databases', undefined, doc.skills.databases?.join(', '))}
            />
          </div>
        )}

        {(isEditMode || doc.skills.cloudDevops?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Cloud &amp; DevOps: </span>
            <EditableField
              value={doc.skills.cloudDevops?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, cloudDevops: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="AWS, Docker, Kubernetes, CI/CD, Terraform..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'cloudDevops', undefined, doc.skills.cloudDevops?.join(', '))}
            />
          </div>
        )}

        {(isEditMode || doc.skills.tools?.length > 0) && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-zinc-900 shrink-0">Tools &amp; Testing: </span>
            <EditableField
              value={doc.skills.tools?.join(', ') || ''}
              onChange={(val) => {
                const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  skills: { ...prev.skills, tools: items },
                }));
              }}
              isEditMode={isEditMode}
              placeholder="Git, Jest, Playwright, Postman, Linux..."
              className="flex-1"
              onFocus={(e) => handleFieldFocus(e, 'skills', 'tools', undefined, doc.skills.tools?.join(', '))}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderProjectsSection = () => {
    if (!isEditMode && (!doc.projects || doc.projects.length === 0)) return null;
    return (
      <div key="projects" className="space-y-2">
        {renderSectionHeader(
          'Featured Projects',
          'projects',
          isEditMode && (
            <button
              type="button"
              onClick={() => {
                const newProj = {
                  id: `proj_${Date.now()}`,
                  name: '',
                  techStack: [],
                  bullets: [''],
                };
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  projects: [newProj, ...prev.projects],
                }));
              }}
              className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
            >
              <Plus size={11} /> Add Project
            </button>
          )
        )}

        <div className="space-y-2">
          {doc.projects.map((proj, projIdx) => (
            <div key={proj.id} className="space-y-0.5 group">
              <div className="flex items-baseline justify-between font-bold text-zinc-900">
                <div className="flex items-center gap-1">
                  {isEditMode && doc.projects.length > 1 && (
                    <div className="flex items-center gap-0.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleMoveProject(proj.id, 'up')}
                        disabled={projIdx === 0}
                        className="p-0.5 text-zinc-400 hover:text-cyan-600 disabled:opacity-20"
                        title="Move project up"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveProject(proj.id, 'down')}
                        disabled={projIdx === doc.projects.length - 1}
                        className="p-0.5 text-zinc-400 hover:text-cyan-600 disabled:opacity-20"
                        title="Move project down"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  )}
                  <EditableField
                    value={proj.name}
                    onChange={(val) =>
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        projects: prev.projects.map((p) => (p.id === proj.id ? { ...p, name: val } : p)),
                      }))
                    }
                    isEditMode={isEditMode}
                    placeholder="Project Name"
                    className="font-bold"
                    onFocus={(e) => handleFieldFocus(e, 'projects', proj.id, undefined, proj.name)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <EditableField
                    value={proj.techStack?.join(', ') || ''}
                    onChange={(val) => {
                      const items = val.split(',').map((s) => s.trim()).filter(Boolean);
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        projects: prev.projects.map((p) => (p.id === proj.id ? { ...p, techStack: items } : p)),
                      }));
                    }}
                    isEditMode={isEditMode}
                    placeholder="React, Node.js..."
                    className="text-[11px] font-normal text-zinc-600 font-mono"
                    onFocus={(e) => handleFieldFocus(e, 'projects', proj.id, undefined, proj.techStack?.join(', '))}
                  />
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() =>
                        setDoc((prev) => ({
                          ...prev,
                          updatedAt: Date.now(),
                          projects: prev.projects.filter((p) => p.id !== proj.id),
                        }))
                      }
                      className="text-zinc-400 hover:text-red-600 p-0.5"
                      title="Delete project"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              <ul className="list-disc list-outside pl-4 text-zinc-800 space-y-1">
                {proj.bullets.map((b, idx) => (
                  <li key={idx} className="relative group/projbullet">
                    <div className="flex items-start gap-1">
                      <div className="flex-1 space-y-0.5">
                        <EditableField
                          value={b}
                          onChange={(val) =>
                            setDoc((prev) => ({
                              ...prev,
                              updatedAt: Date.now(),
                              projects: prev.projects.map((p) =>
                                p.id === proj.id
                                  ? {
                                      ...p,
                                      bullets: p.bullets.map((item, bIndex) =>
                                        bIndex === idx ? val : item
                                      ),
                                    }
                                  : p
                              ),
                            }))
                          }
                          isEditMode={isEditMode}
                          multiline
                          placeholder="Key project deliverable or architecture..."
                          onFocus={(e) => handleFieldFocus(e, 'projects', proj.id, idx, b)}
                        />
                        {isEditMode && b.trim() && (
                          <div className="opacity-0 group-hover/projbullet:opacity-100 transition-opacity">
                            <BulletLengthMeter bullet={b} />
                          </div>
                        )}
                      </div>

                      {isEditMode && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/projbullet:opacity-100 transition-opacity shrink-0">
                          {proj.bullets.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMoveProjBullet(proj.id, idx, 'up')}
                                disabled={idx === 0}
                                className="text-zinc-400 hover:text-cyan-600 disabled:opacity-20 p-0.5"
                                title="Move bullet up"
                              >
                                <ChevronUp size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveProjBullet(proj.id, idx, 'down')}
                                disabled={idx === proj.bullets.length - 1}
                                className="text-zinc-400 hover:text-cyan-600 disabled:opacity-20 p-0.5"
                                title="Move bullet down"
                              >
                                <ChevronDown size={11} />
                              </button>
                            </>
                          )}
                          {proj.bullets.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDoc((prev) => ({
                                  ...prev,
                                  updatedAt: Date.now(),
                                  projects: prev.projects.map((p) =>
                                    p.id === proj.id
                                      ? {
                                          ...p,
                                          bullets: p.bullets.filter((_, bIndex) => bIndex !== idx),
                                        }
                                      : p
                                  ),
                                }))
                              }
                              className="text-zinc-400 hover:text-red-600 p-0.5"
                              title="Delete bullet"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEducationSection = () => {
    if (!isEditMode && (!doc.education || doc.education.length === 0)) return null;
    return (
      <div key="education" className="space-y-1.5">
        {renderSectionHeader(
          'Education & Credentials',
          'education',
          isEditMode && (
            <button
              type="button"
              onClick={() => {
                const newEdu = {
                  id: `edu_${Date.now()}`,
                  institution: '',
                  degree: '',
                  location: '',
                  graduationYear: '',
                };
                setDoc((prev) => ({
                  ...prev,
                  updatedAt: Date.now(),
                  education: [newEdu, ...prev.education],
                }));
              }}
              className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
            >
              <Plus size={11} /> Add Degree
            </button>
          )
        )}

        <div className="space-y-1.5">
          {doc.education.map((edu) => (
            <div key={edu.id} className="flex items-baseline justify-between gap-1 group">
              <div className="flex items-baseline gap-1 flex-1">
                <EditableField
                  value={edu.institution}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      education: prev.education.map((ed) =>
                        ed.id === edu.id ? { ...ed, institution: val } : ed
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="University / Institution"
                  className="font-bold text-zinc-900"
                  onFocus={(e) => handleFieldFocus(e, 'education', edu.id, undefined, edu.institution)}
                />
                <span>, </span>
                <EditableField
                  value={edu.degree}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      education: prev.education.map((ed) =>
                        ed.id === edu.id ? { ...ed, degree: val } : ed
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Degree (e.g. B.S. in Computer Science)"
                  className="text-zinc-800"
                  onFocus={(e) => handleFieldFocus(e, 'education', edu.id, undefined, edu.degree)}
                />
              </div>
              <div className="text-[11px] text-zinc-600 font-mono flex items-center gap-1">
                <EditableField
                  value={edu.graduationYear}
                  onChange={(val) =>
                    setDoc((prev) => ({
                      ...prev,
                      updatedAt: Date.now(),
                      education: prev.education.map((ed) =>
                        ed.id === edu.id ? { ...ed, graduationYear: val } : ed
                      ),
                    }))
                  }
                  isEditMode={isEditMode}
                  placeholder="Graduation Year"
                  onFocus={(e) => handleFieldFocus(e, 'education', edu.id, undefined, edu.graduationYear)}
                />
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() =>
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        education: prev.education.filter((ed) => ed.id !== edu.id),
                      }))
                    }
                    className="text-zinc-400 hover:text-red-600 p-0.5"
                    title="Delete degree"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomSection = (sectionKey: string) => {
    const customSec = doc.customSections?.find((s) => s.id === sectionKey);
    if (!customSec) return null;

    return (
      <div key={customSec.id} className="space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-400 pb-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              <EditableField
                value={customSec.title}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    customSections: (prev.customSections || []).map((s) =>
                      s.id === customSec.id ? { ...s, title: val } : s
                    ),
                  }))
                }
                isEditMode={isEditMode}
                placeholder="CUSTOM SECTION TITLE"
              />
            </h2>
          </div>
          {isEditMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    customSections: (prev.customSections || []).map((s) =>
                      s.id === customSec.id
                        ? {
                            ...s,
                            items: [
                              ...s.items,
                              {
                                id: `item_${Date.now()}`,
                                title: 'New Item',
                                subtitle: '',
                                date: '2023 – Present',
                                bullets: ['Item accomplishment bullet point.'],
                              },
                            ],
                          }
                        : s
                    ),
                  }))
                }
                className="text-[10px] text-cyan-700 hover:text-cyan-900 flex items-center gap-0.5 px-1 py-0.5 bg-cyan-50 rounded"
              >
                <Plus size={10} /> Add Item
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {customSec.items.map((item) => (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="font-bold text-zinc-900 flex items-center gap-1.5 flex-1">
                  <EditableField
                    value={item.title}
                    onChange={(val) =>
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        customSections: (prev.customSections || []).map((s) =>
                          s.id === customSec.id
                            ? {
                                ...s,
                                items: s.items.map((it) => (it.id === item.id ? { ...it, title: val } : it)),
                              }
                            : s
                        ),
                      }))
                    }
                    isEditMode={isEditMode}
                    placeholder="Item Title"
                  />
                  {item.subtitle && (
                    <span className="font-normal text-zinc-600 text-[11px]">
                      {' '}| {item.subtitle}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-zinc-700">
                  <EditableField
                    value={item.date || ''}
                    onChange={(val) =>
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        customSections: (prev.customSections || []).map((s) =>
                          s.id === customSec.id
                            ? {
                                ...s,
                                items: s.items.map((it) => (it.id === item.id ? { ...it, date: val } : it)),
                              }
                            : s
                        ),
                      }))
                    }
                    isEditMode={isEditMode}
                    placeholder="Date / Year"
                  />
                </span>
              </div>
              {(item.description || isEditMode) && (
                <div className="text-zinc-800 text-[11.5px] leading-relaxed pt-0.5">
                  <EditableField
                    value={item.description || ''}
                    onChange={(val) =>
                      setDoc((prev) => ({
                        ...prev,
                        updatedAt: Date.now(),
                        customSections: (prev.customSections || []).map((s) =>
                          s.id === customSec.id
                            ? {
                                ...s,
                                items: s.items.map((it) => (it.id === item.id ? { ...it, description: val } : it)),
                              }
                            : s
                        ),
                      }))
                    }
                    isEditMode={isEditMode}
                    placeholder="Description paragraph / overview / abstract..."
                    multiline
                  />
                </div>
              )}
              {item.bullets && (
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
                  {item.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="leading-relaxed">
                      <EditableField
                        value={b}
                        onChange={(val) =>
                          setDoc((prev) => ({
                            ...prev,
                            updatedAt: Date.now(),
                            customSections: (prev.customSections || []).map((s) =>
                              s.id === customSec.id
                                ? {
                                    ...s,
                                    items: s.items.map((it) =>
                                      it.id === item.id
                                        ? {
                                            ...it,
                                            bullets: it.bullets.map((bullet, idx) =>
                                              idx === bIdx ? val : bullet
                                            ),
                                          }
                                        : it
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }
                        isEditMode={isEditMode}
                        placeholder="Bullet description..."
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const marginClass =
    doc.settings.pageMargins === 'compact'
      ? 'p-5 sm:p-7'
      : doc.settings.pageMargins === 'wide'
      ? 'p-9 sm:p-14'
      : 'p-7 sm:p-10';

  const lineSpacingClass =
    doc.settings.lineSpacing === 'snug'
      ? 'leading-snug space-y-2.5'
      : doc.settings.lineSpacing === 'relaxed'
      ? 'leading-relaxed space-y-5'
      : 'leading-normal space-y-3.5';

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Floating Toolbar (Active when in edit mode and field focused) */}
      {isEditMode && activeContext && (
        <FloatingFormatToolbar
          position={toolbarPos}
          visible={true}
          onApplyFormat={handleApplyFormat}
          onAddBullet={
            activeContext.section === 'experience' && activeContext.id
              ? () => handleAddBulletToCurrent(activeContext.id!)
              : undefined
          }
          onDeleteCurrent={
            activeContext.section === 'experience' && activeContext.id && typeof activeContext.index === 'number'
              ? () => handleDeleteBullet(activeContext.id!, activeContext.index!)
              : undefined
          }
        />
      )}

      {/* Main Document Sheet Container */}
      <div
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        className="transition-transform duration-150 w-full flex justify-center pb-12"
      >
        <div
          ref={canvasRef}
          id="ats-resume-canvas"
          className={`relative bg-white text-zinc-900 w-full max-w-[850px] mx-auto ${marginClass} shadow-lg border border-zinc-200 print:shadow-none print:border-none print:p-0 ${fontClass} ${spacingClass} ${lineSpacingClass} ${
            isEditMode ? 'ring-2 ring-cyan-500/50 shadow-2xl' : ''
          }`}
        >
          {/* 1. Header / Contact Block */}
          <div className="text-center space-y-1 pb-2 border-b border-zinc-900">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
              <EditableField
                value={doc.contact.fullName}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, fullName: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="YOUR FULL NAME"
                className="text-center font-bold"
                onFocus={(e) => handleFieldFocus(e, 'contact.fullName', undefined, undefined, doc.contact.fullName)}
              />
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-700 pt-0.5">
              <EditableField
                value={doc.contact.location}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, location: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="City, State"
                onFocus={(e) => handleFieldFocus(e, 'contact.location', undefined, undefined, doc.contact.location)}
              />

              <span>•</span>

              <EditableField
                value={doc.contact.email}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, email: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="email@domain.com"
                onFocus={(e) => handleFieldFocus(e, 'contact.email', undefined, undefined, doc.contact.email)}
              />

              <span>•</span>

              <EditableField
                value={doc.contact.phone}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, phone: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="+1 (555) 000-0000"
                onFocus={(e) => handleFieldFocus(e, 'contact.phone', undefined, undefined, doc.contact.phone)}
              />

              <span>•</span>

              <EditableField
                value={doc.contact.linkedIn}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, linkedIn: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="linkedin.com/in/username"
                onFocus={(e) => handleFieldFocus(e, 'contact.linkedIn', undefined, undefined, doc.contact.linkedIn)}
              />

              <span>•</span>

              <EditableField
                value={doc.contact.gitHub}
                onChange={(val) =>
                  setDoc((prev) => ({
                    ...prev,
                    updatedAt: Date.now(),
                    contact: { ...prev.contact, gitHub: val },
                  }))
                }
                isEditMode={isEditMode}
                placeholder="github.com/username"
                onFocus={(e) => handleFieldFocus(e, 'contact.gitHub', undefined, undefined, doc.contact.gitHub)}
              />
            </div>
          </div>

          {/* Dynamic Reorderable Body Sections */}
          {sectionOrder.map((sectionKey) => {
            switch (sectionKey) {
              case 'summary':
                return renderSummarySection();
              case 'experience':
                return renderExperienceSection();
              case 'skills':
                return renderSkillsSection();
              case 'projects':
                return renderProjectsSection();
              case 'education':
                return renderEducationSection();
              default:
                if (sectionKey.startsWith('custom_')) {
                  return renderCustomSection(sectionKey);
                }
                return null;
            }
          })}

          {/* Dynamic Visual Multi-Page Split Sentinels (Visible in Edit Mode) */}
          {isEditMode && (
            <>
              {/* Page 1 Cut-off Boundary (1056px) */}
              <div className="absolute top-[1056px] left-0 right-0 pointer-events-none flex items-center justify-between border-t-2 border-dashed border-cyan-400/80 px-4 pt-1 z-10 print:hidden">
                <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded shadow-2xs">
                  📄 Page 1 ATS Boundary (1056px)
                </span>
                <span className="text-[9px] text-cyan-700 font-mono font-medium">
                  {canvasHeight > 1056 ? '⚠️ Spilling to Page 2' : '✅ Fits on 1 Page'}
                </span>
              </div>

              {/* Page 2 Cut-off Boundary (2112px) */}
              {canvasHeight > 1056 && (
                <div className="absolute top-[2112px] left-0 right-0 pointer-events-none flex items-center justify-between border-t-2 border-dashed border-amber-400/80 px-4 pt-1 z-10 print:hidden">
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded shadow-2xs">
                    📄 Page 2 Boundary (2112px)
                  </span>
                  <span className="text-[9px] text-amber-700 font-mono font-medium">
                    {canvasHeight > 2112 ? '⚠️ Spilling to Page 3' : '✅ Fits on 2 Pages'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
