import React, { useState } from 'react';
import type { ResumeDocument, ResumeCustomSection, ResumeCustomSectionItem } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  BookOpen,
  Lightbulb,
  HeartHandshake,
  Award,
  Mic,
  Globe,
  FileCheck2,
  Copy,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Layers,
} from 'lucide-react';

interface CustomSectionBuilderProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast: (msg: string) => void;
}

interface QuickPreset {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  defaultItem: Omit<ResumeCustomSectionItem, 'id'>;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'publications',
    title: 'Publications & Research',
    icon: BookOpen,
    description: 'Academic papers, journal publications, conference proceedings & preprints.',
    defaultItem: {
      title: 'Scalable Real-Time Inference Pipelines for Distributed Systems',
      subtitle: 'IEEE Transactions on Software Engineering',
      date: '2024',
      location: 'Peer-Reviewed',
      bullets: [
        'Presented novel architectural patterns cutting latency by 42% across multi-region clusters.',
        'Cited across 15+ subsequent university and industry research papers.',
      ],
    },
  },
  {
    id: 'patents',
    title: 'Patents & Inventions',
    icon: Lightbulb,
    description: 'Granted patents, provisional applications & technological IP.',
    defaultItem: {
      title: 'Autonomous Data Routing System and Method',
      subtitle: 'US Patent Application #18/924,102',
      date: 'Granted Jan 2024',
      location: 'USPTO',
      bullets: [
        'Invented dynamic priority queuing algorithm optimized for edge computing nodes.',
        'Licensed by enterprise clients for high-throughput messaging.',
      ],
    },
  },
  {
    id: 'leadership',
    title: 'Leadership & Volunteering',
    icon: HeartHandshake,
    description: 'Community initiatives, mentorship, board memberships & non-profit roles.',
    defaultItem: {
      title: 'Technical Mentor & Chapter Lead',
      subtitle: 'Girls Who Code / Non-Profit Initiative',
      date: '2022 – Present',
      location: 'San Francisco, CA',
      bullets: [
        'Mentored 40+ aspiring engineers through hands-on full-stack development bootcamps.',
        'Organized bi-weekly workshops covering algorithmic problem solving and system design.',
      ],
    },
  },
  {
    id: 'awards',
    title: 'Honors & Awards',
    icon: Award,
    description: 'Hackathon wins, company excellence awards, scholarships & fellowships.',
    defaultItem: {
      title: '1st Place Winner – Global AI Hackathon',
      subtitle: 'Awarded by Tech Foundation (1,200+ Participants)',
      date: 'Nov 2023',
      location: 'Global',
      bullets: [
        'Engineered an automated accessibility assistant using multimodal computer vision within 36 hours.',
        'Awarded $15,000 grand prize and featured in TechCrunch developer spotlight.',
      ],
    },
  },
  {
    id: 'speaking',
    title: 'Keynote & Conference Speaking',
    icon: Mic,
    description: 'Tech talks, panel discussions, podcast appearances & workshop hosting.',
    defaultItem: {
      title: 'Speaker: Microservices at Hyperscale',
      subtitle: 'React Summit / TechCon 2023',
      date: 'Oct 2023',
      location: 'New York, NY',
      bullets: [
        'Delivered 45-minute technical keynote to an audience of 850+ senior software architects.',
        'Published companion open-source demo repository with 500+ GitHub stars.',
      ],
    },
  },
  {
    id: 'languages',
    title: 'Languages & Global Competencies',
    icon: Globe,
    description: 'Spoken languages, cultural proficiencies & international certifications.',
    defaultItem: {
      title: 'Multilingual Communication',
      subtitle: 'English (Native / Bilingual), Spanish (Professional Working), German (Conversational)',
      date: 'Active',
      location: 'Global',
      bullets: [
        'Conducted technical interviews and stakeholder syncs across English and Spanish speaking engineering teams.',
      ],
    },
  },
  {
    id: 'certifications',
    title: 'Custom Licenses & Special Training',
    icon: FileCheck2,
    description: 'State licenses, specialized defense clearances, or vendor accreditations.',
    defaultItem: {
      title: 'Certified Kubernetes Administrator (CKA)',
      subtitle: 'Linux Foundation / Cloud Native Computing Foundation',
      date: 'Valid: 2024 – 2027',
      location: 'License #CKA-99201',
      bullets: [
        'Demonstrated competence in cluster architecture, installation, configuration, and production troubleshooting.',
      ],
    },
  },
];

export const CustomSectionBuilder: React.FC<CustomSectionBuilderProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const customSections = doc.customSections || [];
  const currentOrder = doc.settings.sectionOrder || DEFAULT_SECTION_ORDER;

  // Toggle collapse
  const toggleCollapse = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add custom section (blank or from preset)
  const addCustomSection = (title: string, defaultItem?: Omit<ResumeCustomSectionItem, 'id'>) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSection: ResumeCustomSection = {
      id: customId,
      title: trimmedTitle,
      items: [
        {
          id: `item_${Date.now()}`,
          title: defaultItem?.title || 'Main Heading / Role / Project Title',
          subtitle: defaultItem?.subtitle || 'Organization / Subtitle / Detail',
          date: defaultItem?.date || '2024 – Present',
          location: defaultItem?.location || '',
          bullets: defaultItem?.bullets || [
            'Highlighted achievement, measurable impact, or core contribution.',
          ],
        },
      ],
    };

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: [...(prev.customSections || []), newSection],
      settings: {
        ...prev.settings,
        sectionOrder: [...(prev.settings.sectionOrder || DEFAULT_SECTION_ORDER), customId],
      },
    }));

    setCustomTitleInput('');
    onToast(`✨ Added custom section: "${newSection.title}"!`);
  };

  // Delete custom section
  const deleteCustomSection = (id: string, title: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).filter((s) => s.id !== id),
      settings: {
        ...prev.settings,
        sectionOrder: (prev.settings.sectionOrder || DEFAULT_SECTION_ORDER).filter((k) => k !== id),
      },
    }));
    onToast(`🗑️ Removed section: "${title}"`);
  };

  // Duplicate custom section
  const duplicateCustomSection = (section: ResumeCustomSection) => {
    const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const duplicated: ResumeCustomSection = {
      id: newId,
      title: `${section.title} (Copy)`,
      items: section.items.map((it) => ({
        ...it,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        bullets: [...it.bullets],
      })),
    };

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: [...(prev.customSections || []), duplicated],
      settings: {
        ...prev.settings,
        sectionOrder: [...(prev.settings.sectionOrder || DEFAULT_SECTION_ORDER), newId],
      },
    }));
    onToast(`📋 Duplicated section: "${duplicated.title}"`);
  };

  // Rename custom section title
  const handleSaveRename = (sectionId: string) => {
    if (!renamingTitle.trim()) {
      setEditingSectionId(null);
      return;
    }
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId ? { ...s, title: renamingTitle.trim() } : s
      ),
    }));
    setEditingSectionId(null);
    onToast('✏️ Updated section heading title!');
  };

  // Move section position in resume order
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const idx = currentOrder.indexOf(sectionId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    const temp = nextOrder[idx];
    nextOrder[idx] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        sectionOrder: nextOrder,
      },
    }));
    onToast('↕️ Reordered section in resume!');
  };

  // --- Sub-Item Manipulations ---
  const addSubItem = (sectionId: string) => {
    const newItem: ResumeCustomSectionItem = {
      id: `item_${Date.now()}`,
      title: '',
      subtitle: '',
      date: '',
      location: '',
      bullets: [''],
    };

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s
      ),
    }));
    onToast('➕ Added new entry sub-item!');
  };

  const updateSubItem = (
    sectionId: string,
    itemId: string,
    field: keyof ResumeCustomSectionItem,
    value: any
  ) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
            }
          : s
      ),
    }));
  };

  const deleteSubItem = (sectionId: string, itemId: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.filter((it) => it.id !== itemId),
            }
          : s
      ),
    }));
    onToast('🗑️ Deleted entry!');
  };

  const moveSubItem = (sectionId: string, itemIdx: number, direction: 'up' | 'down') => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) => {
        if (s.id !== sectionId) return s;
        const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
        if (targetIdx < 0 || targetIdx >= s.items.length) return s;
        const newItems = [...s.items];
        const temp = newItems[itemIdx];
        newItems[itemIdx] = newItems[targetIdx];
        newItems[targetIdx] = temp;
        return { ...s, items: newItems };
      }),
    }));
  };

  // --- Bullet Manipulations ---
  const addBullet = (sectionId: string, itemId: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId ? { ...it, bullets: [...it.bullets, ''] } : it
              ),
            }
          : s
      ),
    }));
  };

  const updateBullet = (
    sectionId: string,
    itemId: string,
    bulletIdx: number,
    text: string
  ) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId
                  ? {
                      ...it,
                      bullets: it.bullets.map((b, idx) => (idx === bulletIdx ? text : b)),
                    }
                  : it
              ),
            }
          : s
      ),
    }));
  };

  const deleteBullet = (sectionId: string, itemId: string, bulletIdx: number) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId
                  ? {
                      ...it,
                      bullets: it.bullets.filter((_, idx) => idx !== bulletIdx),
                    }
                  : it
              ),
            }
          : s
      ),
    }));
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Clean Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Custom Sections Builder</span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Live Sync
            </span>
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium">
            Create custom headings with sub-headings, paragraphs, dates &amp; bullet points.
          </p>
        </div>
      </div>

      {/* Quick 1-Click Preset Templates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 font-mono flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            <span>1-Click Popular Templates</span>
          </span>
          <span className="text-[11px] text-zinc-400">Click to instantly add</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_PRESETS.map((preset) => {
            const PresetIcon = preset.icon;
            const isAlreadyAdded = customSections.some(
              (s) => s.title.toLowerCase() === preset.title.toLowerCase()
            );

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => addCustomSection(preset.title, preset.defaultItem)}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5 group ${
                  isAlreadyAdded
                    ? 'bg-zinc-50 border-zinc-200 hover:border-indigo-300'
                    : 'bg-white border-zinc-200 hover:border-indigo-500 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 group-hover:text-indigo-600 transition-colors">
                    <PresetIcon size={14} className="text-indigo-600 shrink-0" />
                    <span>{preset.title}</span>
                  </div>
                  <Plus size={13} className="text-zinc-400 group-hover:text-indigo-600 transition-transform group-hover:scale-125" />
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Title Input / Create from Scratch */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 font-mono block">
          ➕ Create Blank Custom Section
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCustomSection(customTitleInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customTitleInput}
            onChange={(e) => setCustomTitleInput(e.target.value)}
            placeholder="Type any section name (e.g. Open Source, Military Service, Extracurriculars)"
            className="flex-1 px-3.5 py-2 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-900 placeholder:text-zinc-400 font-medium"
          />
          <button
            type="submit"
            disabled={!customTitleInput.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-2xs"
          >
            <Plus size={14} />
            <span>Create Section</span>
          </button>
        </form>
      </div>

      {/* Existing Custom Sections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Your Custom Sections</span>
            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-mono font-bold rounded-md">
              {customSections.length}
            </span>
          </h3>
          <span className="text-[11px] text-zinc-500">
            Rendered automatically across all templates &amp; exports
          </span>
        </div>

        {customSections.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 space-y-2">
            <Layers size={28} className="mx-auto text-zinc-400" />
            <p className="text-xs font-bold text-zinc-700">No custom sections created yet.</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Choose one of the 1-Click popular templates above or type your own custom heading to get started.
            </p>
          </div>
        ) : (
          customSections.map((section) => {
            const isCollapsed = collapsedSections[section.id];
            const orderIdx = currentOrder.indexOf(section.id);
            const canMoveUp = orderIdx > 0;
            const canMoveDown = orderIdx < currentOrder.length - 1 && orderIdx !== -1;

            return (
              <div
                key={section.id}
                className="border border-zinc-300/80 rounded-2xl bg-white shadow-xs overflow-hidden transition-all"
              >
                {/* Section Header Card Bar */}
                <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Section Order Buttons */}
                    <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={!canMoveUp}
                        onClick={() => moveSection(section.id, 'up')}
                        className="p-1 hover:bg-zinc-100 disabled:opacity-30 rounded text-zinc-600 transition"
                        title="Move Section Up in Resume"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={!canMoveDown}
                        onClick={() => moveSection(section.id, 'down')}
                        className="p-1 hover:bg-zinc-100 disabled:opacity-30 rounded text-zinc-600 transition"
                        title="Move Section Down in Resume"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    {/* Section Title (Inline Editable or Display) */}
                    {editingSectionId === section.id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <input
                          type="text"
                          value={renamingTitle}
                          onChange={(e) => setRenamingTitle(e.target.value)}
                          className="px-2 py-1 bg-white border border-indigo-500 rounded-lg text-xs font-bold text-zinc-900 w-full outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(section.id);
                            if (e.key === 'Escape') setEditingSectionId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(section.id)}
                          className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSectionId(null)}
                          className="p-1 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-xs text-zinc-900 truncate">
                          {section.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setRenamingTitle(section.title);
                          }}
                          className="text-zinc-400 hover:text-indigo-600 p-0.5 transition"
                          title="Rename section heading"
                        >
                          <Edit2 size={11} />
                        </button>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({section.items.length} {section.items.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions (Add Item, Duplicate, Delete, Collapse) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => addSubItem(section.id)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                      title="Add a new entry / sub-heading"
                    >
                      <Plus size={11} />
                      <span>Add Entry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => duplicateCustomSection(section)}
                      className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded-lg transition"
                      title="Duplicate section"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCustomSection(section.id, section.title)}
                      className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg transition"
                      title="Delete entire section"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCollapse(section.id)}
                      className="p-1.5 hover:bg-zinc-200 text-zinc-500 rounded-lg transition"
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {/* Sub-Items Form Body */}
                {!isCollapsed && (
                  <div className="p-4 space-y-4 bg-zinc-50/40">
                    {section.items.length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-zinc-200 rounded-xl bg-white space-y-1.5">
                        <p className="text-xs text-zinc-500">No entries inside this section.</p>
                        <button
                          type="button"
                          onClick={() => addSubItem(section.id)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> Add First Entry
                        </button>
                      </div>
                    ) : (
                      section.items.map((item, itemIdx) => (
                        <div
                          key={item.id}
                          className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-zinc-300 transition"
                        >
                          {/* Item Header / Controls */}
                          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                              Entry #{itemIdx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={itemIdx === 0}
                                onClick={() => moveSubItem(section.id, itemIdx, 'up')}
                                className="p-1 hover:bg-zinc-100 disabled:opacity-30 text-zinc-500 rounded"
                                title="Move entry up"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                disabled={itemIdx === section.items.length - 1}
                                onClick={() => moveSubItem(section.id, itemIdx, 'down')}
                                className="p-1 hover:bg-zinc-100 disabled:opacity-30 text-zinc-500 rounded"
                                title="Move entry down"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSubItem(section.id, item.id)}
                                className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded"
                                title="Delete this entry"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Item Fields: Title, Subtitle, Date, Location */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                                Main Title / Heading / Name
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateSubItem(section.id, item.id, 'title', e.target.value)
                                }
                                placeholder="e.g. Lead Researcher, Project Name, Award"
                                className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:border-indigo-600"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                                Subtitle / Organization / Publication
                              </label>
                              <input
                                type="text"
                                value={item.subtitle || ''}
                                onChange={(e) =>
                                  updateSubItem(section.id, item.id, 'subtitle', e.target.value)
                                }
                                placeholder="e.g. IEEE Journal, Non-Profit Org, Host"
                                className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-indigo-600"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                                Date / Timeframe
                              </label>
                              <input
                                type="text"
                                value={item.date || ''}
                                onChange={(e) =>
                                  updateSubItem(section.id, item.id, 'date', e.target.value)
                                }
                                placeholder="e.g. 2023 – Present, Nov 2024"
                                className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 focus:outline-none focus:border-indigo-600"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                                Location / Extra Tag (Optional)
                              </label>
                              <input
                                type="text"
                                value={item.location || ''}
                                onChange={(e) =>
                                  updateSubItem(section.id, item.id, 'location', e.target.value)
                                }
                                placeholder="e.g. San Francisco, CA / Peer-Reviewed"
                                className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-indigo-600"
                              />
                            </div>
                          </div>

                          {/* Description / Paragraph Text (Optional) */}
                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                              <span>Description / Paragraph (Optional)</span>
                              <span className="text-zinc-400 font-normal text-[10px] lowercase font-sans">
                                (narrative text, abstract, overview)
                              </span>
                            </label>
                            <textarea
                              value={item.description || ''}
                              onChange={(e) =>
                                updateSubItem(section.id, item.id, 'description', e.target.value)
                              }
                              placeholder="Write a descriptive paragraph, overview, abstract, or summary..."
                              rows={2}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-indigo-600 resize-y leading-relaxed font-sans placeholder:text-zinc-400"
                            />
                          </div>

                          {/* Bullet Points List */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase block">
                                Bullet Points / Key Achievements (Optional)
                              </label>
                              <button
                                type="button"
                                onClick={() => addBullet(section.id, item.id)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                              >
                                <Plus size={10} /> Add Bullet
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {item.bullets.map((bullet, bulletIdx) => (
                                <div key={bulletIdx} className="flex items-center gap-1.5">
                                  <span className="text-zinc-400 text-xs select-none">•</span>
                                  <input
                                    type="text"
                                    value={bullet}
                                    onChange={(e) =>
                                      updateBullet(section.id, item.id, bulletIdx, e.target.value)
                                    }
                                    placeholder="Describe specific impact, metrics, or responsibilities..."
                                    className="flex-1 px-2.5 py-1 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-indigo-600"
                                  />
                                  {item.bullets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => deleteBullet(section.id, item.id, bulletIdx)}
                                      className="text-zinc-400 hover:text-red-600 p-1 transition"
                                      title="Remove bullet"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    <button
                      type="button"
                      onClick={() => addSubItem(section.id)}
                      className="w-full py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={13} />
                      <span>Add Another Entry to "{section.title}"</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
