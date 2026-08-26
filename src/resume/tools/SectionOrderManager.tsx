import React, { useState } from 'react';
import type { ResumeDocument, ResumeCustomSection } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import { 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  GripVertical
} from 'lucide-react';

interface SectionOrderManagerProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast: (msg: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  skills: 'Technical Skills',
  projects: 'Featured Projects',
  education: 'Education & Credentials',
  certifications: 'Certifications',
};

export const SectionOrderManager: React.FC<SectionOrderManagerProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  const currentOrder = doc.settings.sectionOrder || DEFAULT_SECTION_ORDER;

  // Move section up/down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const nextOrder = [...currentOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextOrder.length) return;

    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;

    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        sectionOrder: nextOrder,
      },
    }));

    onToast('Updated resume section ordering!');
  };

  // Add a new custom section
  const handleAddCustomSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const customId = `custom_${Date.now()}`;
    const newSection: ResumeCustomSection = {
      id: customId,
      title: customTitle.trim(),
      items: [
        {
          id: `item_${Date.now()}`,
          title: 'Title / Role / Project Name',
          subtitle: 'Organization / Link / Detail',
          date: '2023 – Present',
          bullets: ['Key contribution or accomplishment statement.'],
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

    setCustomTitle('');
    setShowAddCustom(false);
    onToast(`Added custom section "${newSection.title}"!`);
  };

  // Delete custom section
  const handleDeleteCustomSection = (id: string) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      customSections: (prev.customSections || []).filter((s) => s.id !== id),
      settings: {
        ...prev.settings,
        sectionOrder: (prev.settings.sectionOrder || DEFAULT_SECTION_ORDER).filter((key) => key !== id),
      },
    }));
    onToast('Deleted custom section.');
  };

  // Reset to default order
  const handleResetOrder = () => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        sectionOrder: DEFAULT_SECTION_ORDER,
      },
    }));
    onToast('Reset sections to standard ATS order.');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Section Hierarchy & Custom Sections
            </h2>
            <p className="text-xs text-zinc-400">
              Re-order sections to match career level (e.g. fresh grads placing Education or Projects first).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetOrder}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
          >
            Reset Default Order
          </button>
          <button
            onClick={() => setShowAddCustom(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Section
          </button>
        </div>
      </div>

      {/* Add Custom Section Form Modal */}
      {showAddCustom && (
        <form onSubmit={handleAddCustomSection} className="bg-zinc-950 border border-indigo-500/40 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-indigo-300">Create Custom Section</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Open Source Contributions, Publications, Leadership..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Re-orderable Sections List */}
      <div className="space-y-2">
        {currentOrder.map((sectionKey, idx) => {
          const isCustom = sectionKey.startsWith('custom_');
          const customSec = isCustom ? doc.customSections?.find((s) => s.id === sectionKey) : null;
          const label = isCustom ? (customSec?.title || 'Custom Section') : (SECTION_LABELS[sectionKey] || sectionKey);

          return (
            <div
              key={sectionKey}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-mono text-zinc-500 w-5">#{idx + 1}</span>
                <span className="text-xs font-bold text-zinc-200">{label}</span>
                {isCustom && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Custom
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 transition"
                  title="Move Section Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={idx === currentOrder.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 transition"
                  title="Move Section Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                {isCustom && (
                  <button
                    onClick={() => handleDeleteCustomSection(sectionKey)}
                    className="p-1.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 ml-1 transition"
                    title="Delete Custom Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
