import React, { useMemo } from 'react';
import type { CursorTheme } from './types';
import { getCursorSvgMarkup } from './index';
import { Check } from 'lucide-react';

interface CursorPreviewCardProps {
  theme: CursorTheme;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const CursorPreviewCard: React.FC<CursorPreviewCardProps> = ({
  theme,
  isSelected,
  onSelect,
}) => {
  const svgHtml = useMemo(() => {
    return getCursorSvgMarkup(theme, `card-${theme.id}`);
  }, [theme]);

  return (
    <div
      onClick={() => onSelect(theme.id)}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border select-none ${
        isSelected
          ? 'bg-violet-50/70 text-violet-950 border-violet-400 shadow-sm ring-2 ring-violet-500/20'
          : 'bg-white text-zinc-900 border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs hover:-translate-y-0.5'
      }`}
    >
      {/* Top row: Active Badge */}
      <div className="flex items-center justify-end gap-2 mb-3">
        {isSelected ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
            <Check size={12} className="stroke-[2.5]" />
            <span>Active</span>
          </span>
        ) : (
          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
            Select
          </span>
        )}
      </div>

      {/* Center: Cursor Visual Canvas */}
      <div
        className={`h-24 rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 border ${
          isSelected
            ? 'bg-[#0c0918] border-violet-400 shadow-2xs'
            : 'bg-[#0a0714] border-zinc-800 shadow-2xs group-hover:border-zinc-700'
        }`}
      >
        {/* Subtle grid pattern background for the cursor preview */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${theme.accentColor} 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />

        {/* Ambient Glow */}
        <div
          className="absolute w-14 h-14 rounded-full blur-xl opacity-25 pointer-events-none transition-opacity group-hover:opacity-45"
          style={{ backgroundColor: theme.accentColor }}
        />

        {/* The Actual Dark Glass Cursor SVG */}
        <div
          className="relative transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-md"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* Bottom Info: Title & Description */}
      <div className="mt-3.5 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: theme.accentColor }}
          />
          <h4 className="text-xs font-bold truncate text-zinc-950">{theme.name}</h4>
        </div>
        <p
          className={`text-[11px] line-clamp-2 leading-relaxed ${
            isSelected ? 'text-violet-800 font-medium' : 'text-zinc-500'
          }`}
        >
          {theme.description}
        </p>
      </div>
    </div>
  );
};
