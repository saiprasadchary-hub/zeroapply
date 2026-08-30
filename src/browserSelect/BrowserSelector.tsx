import React from 'react';
import { Bot, Monitor } from 'lucide-react';
import type { BrowserMode } from './types';

interface BrowserSelectorProps {
  value: BrowserMode;
  onChange: (mode: BrowserMode) => void;
}

const OPTIONS: Array<{
  value: BrowserMode;
  title: string;
  description: string;
  icon: typeof Monitor;
}> = [
  {
    value: 'own',
    title: 'Own browser',
    description: 'Uses the ZeroApply Agent Browser inside this app.',
    icon: Monitor,
  },
  {
    value: 'agent',
    title: 'Agent browser',
    description: 'Opens real Google Chrome and runs AutoApply there.',
    icon: Bot,
  },
];

export const BrowserSelector: React.FC<BrowserSelectorProps> = ({ value, onChange }) => (
  <fieldset className="space-y-2.5 pt-2 border-t border-zinc-100">
    <legend className="text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
      Browser selection
    </legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="AutoApply browser">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
              selected
                ? 'border-cyan-300 bg-cyan-50/70 shadow-xs ring-1 ring-cyan-200'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? 'bg-cyan-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-zinc-900">{option.title}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{option.description}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
    <p className="text-[10px] leading-4 text-zinc-400">
      Chrome mode uses a dedicated ZeroApply Chrome profile, so your normal Chrome profile remains separate.
    </p>
  </fieldset>
);

