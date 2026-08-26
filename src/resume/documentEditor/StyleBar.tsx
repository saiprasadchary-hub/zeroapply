import React from 'react';
import type { ResumeDocument, ResumeSettings } from '../types';
import { Type, Sliders, Palette, MoveHorizontal, AlignJustify } from 'lucide-react';

interface StyleBarProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
}

const ACCENT_PALETTE = [
  { label: 'Cyan', color: '#0891b2' },
  { label: 'Indigo', color: '#4f46e5' },
  { label: 'Slate', color: '#334155' },
  { label: 'Emerald', color: '#059669' },
  { label: 'Crimson', color: '#be123c' },
  { label: 'Black', color: '#09090b' },
];

export const StyleBar: React.FC<StyleBarProps> = ({ document: doc, onUpdateDocument: setDoc }) => {
  const updateSettings = <Key extends keyof ResumeSettings>(key: Key, value: ResumeSettings[Key]) => {
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const pageMargins = doc.settings.pageMargins || 'normal';
  const lineSpacing = doc.settings.lineSpacing || 'normal';

  return (
    <div className="bg-white/95 backdrop-blur-md border border-zinc-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs flex-wrap">
      {/* 1. Font Family */}
      <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
        <Type size={13} className="text-zinc-500" />
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
          {(
            [
              { id: 'serif', label: 'Harvard Serif' },
              { id: 'sans', label: 'Modern Sans' },
              { id: 'mono', label: 'Tech Mono' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => updateSettings('fontFamily', f.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                doc.settings.fontFamily === f.id
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Spacing / 1-Page Fitting */}
      <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
        <Sliders size={13} className="text-zinc-500" />
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
          {(
            [
              { id: 'compact', label: 'Compact' },
              { id: 'standard', label: 'Standard' },
              { id: 'spacious', label: 'Spacious' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => updateSettings('fontSize', s.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                doc.settings.fontSize === s.id
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Margins Control */}
      <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
        <MoveHorizontal size={13} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-400 font-bold uppercase">Margin:</span>
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
          {(
            [
              { id: 'compact', label: '0.4"' },
              { id: 'normal', label: '0.6"' },
              { id: 'wide', label: '0.8"' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => updateSettings('pageMargins', m.id)}
              className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-all ${
                pageMargins === m.id
                  ? 'bg-white text-cyan-800 shadow-2xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title={`Page margin: ${m.label}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Line Spacing Control */}
      <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
        <AlignJustify size={13} className="text-zinc-500" />
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
          {(
            [
              { id: 'snug', label: 'Snug' },
              { id: 'normal', label: 'Normal' },
              { id: 'relaxed', label: 'Relaxed' },
            ] as const
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => updateSettings('lineSpacing', l.id)}
              className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-all ${
                lineSpacing === l.id
                  ? 'bg-white text-cyan-800 shadow-2xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title={`Line height: ${l.label}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Accent Palette */}
      <div className="flex items-center gap-1.5">
        <Palette size={13} className="text-zinc-500" />
        <div className="flex items-center gap-1">
          {ACCENT_PALETTE.map((p) => (
            <button
              key={p.color}
              type="button"
              onClick={() => updateSettings('accentColor', p.color)}
              className={`w-4 h-4 rounded-full border transition-transform ${
                doc.settings.accentColor === p.color
                  ? 'scale-125 ring-2 ring-cyan-500 ring-offset-1 border-white'
                  : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: p.color }}
              title={p.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
