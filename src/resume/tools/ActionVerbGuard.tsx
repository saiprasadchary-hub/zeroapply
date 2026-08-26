import React, { useMemo, useState } from 'react';
import type { ResumeDocument } from '../types';
import { 
  Repeat, 
  CheckCircle2, 
  Zap
} from 'lucide-react';

interface ActionVerbGuardProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast: (msg: string) => void;
}

interface VerbUsage {
  verb: string;
  count: number;
  locations: Array<{
    section: 'experience' | 'projects';
    itemId: string;
    itemTitle: string;
    bulletIndex: number;
    text: string;
  }>;
}

const POWER_VERBS_BY_CATEGORY: Record<string, string[]> = {
  'Leadership & Strategy': [
    'Spearheaded', 'Orchestrated', 'Championed', 'Pioneered', 'Directed', 'Steered', 
    'Mobilized', 'Governed', 'Instituted', 'Empowered', 'Mentored', 'Commanded'
  ],
  'Technical Architecture & Code': [
    'Architected', 'Engineered', 'Constructed', 'Refactored', 'Formulated', 'Deployed',
    'Re-platformed', 'Configured', 'Provisioned', 'Programmed', 'Integrated', 'Synthesized'
  ],
  'Optimization & Performance': [
    'Accelerated', 'Overhauled', 'Streamlined', 'Maximized', 'Automated', 'Consolidated',
    'Amplified', 'Elevated', 'Standardized', 'Optimized', 'Trimmed', 'Fortified'
  ],
  'Delivery & Impact': [
    'Delivered', 'Executed', 'Launched', 'Supervised', 'Negotiated', 'Facilitated',
    'Secured', 'Cultivated', 'Resolved', 'Propelled', 'Transformed', 'Yielded'
  ],
};

export const ActionVerbGuard: React.FC<ActionVerbGuardProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [selectedVerb, setSelectedVerb] = useState<string | null>(null);

  // Scan all bullets for opening action verbs
  const verbAnalysis = useMemo(() => {
    const verbMap: Record<string, VerbUsage> = {};

    const scanBullets = (
      bullets: string[],
      section: 'experience' | 'projects',
      itemId: string,
      itemTitle: string
    ) => {
      bullets.forEach((b, idx) => {
        const trimmed = b.trim();
        if (!trimmed) return;
        const firstWordMatch = trimmed.match(/^([a-zA-Z]+)(?:ed|d|ing)?\b/);
        if (firstWordMatch) {
          const rawVerb = firstWordMatch[0];
          const normalized = rawVerb.charAt(0).toUpperCase() + rawVerb.slice(1).toLowerCase();

          if (!verbMap[normalized]) {
            verbMap[normalized] = {
              verb: normalized,
              count: 0,
              locations: [],
            };
          }
          verbMap[normalized].count += 1;
          verbMap[normalized].locations.push({
            section,
            itemId,
            itemTitle,
            bulletIndex: idx,
            text: trimmed,
          });
        }
      });
    };

    doc.experience.forEach((exp) => {
      scanBullets(exp.bullets, 'experience', exp.id, `${exp.role} @ ${exp.company || 'Company'}`);
    });

    doc.projects.forEach((proj) => {
      scanBullets(proj.bullets, 'projects', proj.id, `Project: ${proj.name}`);
    });

    const allVerbs = Object.values(verbMap).sort((a, b) => b.count - a.count);
    const repeated = allVerbs.filter(v => v.count > 1);

    return {
      allVerbs,
      repeated,
      repetitionRate: allVerbs.length > 0 ? Math.round((repeated.length / allVerbs.length) * 100) : 0,
    };
  }, [doc]);

  // Replace a specific occurrence of a verb with a power verb
  const handleReplaceVerb = (
    location: VerbUsage['locations'][0],
    oldVerb: string,
    newVerb: string
  ) => {
    const regex = new RegExp(`^${oldVerb}\\b`, 'i');
    const updatedText = location.text.replace(regex, newVerb);

    setDoc((prev) => {
      if (location.section === 'experience') {
        const updatedExp = prev.experience.map((exp) => {
          if (exp.id !== location.itemId) return exp;
          const updatedBullets = [...exp.bullets];
          updatedBullets[location.bulletIndex] = updatedText;
          return { ...exp, bullets: updatedBullets };
        });
        return { ...prev, experience: updatedExp, updatedAt: Date.now() };
      } else {
        const updatedProj = prev.projects.map((proj) => {
          if (proj.id !== location.itemId) return proj;
          const updatedBullets = [...proj.bullets];
          updatedBullets[location.bulletIndex] = updatedText;
          return { ...proj, bullets: updatedBullets };
        });
        return { ...prev, projects: updatedProj, updatedAt: Date.now() };
      }
    });

    onToast(`Replaced "${oldVerb}" with "${newVerb}"!`);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Action Verb Repetition Guard
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Vocabulary Diversity
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Flags repetitive verbs (e.g. using "Developed" or "Led" multiple times) and suggests high-impact alternatives.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
          <div className="text-right">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Repetition Status</div>
            <div className="text-lg font-extrabold text-white flex items-center gap-1 justify-end">
              <span className={verbAnalysis.repeated.length === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {verbAnalysis.repeated.length === 0 ? 'Zero Overuse' : `${verbAnalysis.repeated.length} Repeated`}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-zinc-800 bg-zinc-900">
            <CheckCircle2 className={`w-5 h-5 ${verbAnalysis.repeated.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
        </div>
      </div>

      {/* Repeated Verbs Pills */}
      <div>
        <div className="text-xs font-semibold text-zinc-300 mb-2">Detected Action Verbs in Resume:</div>
        <div className="flex flex-wrap gap-2">
          {verbAnalysis.allVerbs.map((v) => {
            const isOverused = v.count > 1;
            const isSelected = selectedVerb === v.verb;

            return (
              <button
                key={v.verb}
                onClick={() => setSelectedVerb(isSelected ? null : v.verb)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  isSelected
                    ? 'bg-pink-600 text-white border-pink-400 shadow-lg'
                    : isOverused
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200 hover:border-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{v.verb}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isOverused ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  x{v.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Verb Replacements & Occurrences */}
      {selectedVerb && (
        <div className="bg-zinc-950 border border-pink-500/30 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-pink-400" />
              Power Verb Replacements for "{selectedVerb}"
            </span>
            <button
              onClick={() => setSelectedVerb(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>

          {/* Categorized Power Verbs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.entries(POWER_VERBS_BY_CATEGORY).map(([category, verbs]) => (
              <div key={category} className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400">{category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {verbs.map((verb) => (
                    <span
                      key={verb}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-pink-600 hover:text-white text-zinc-300 text-[11px] font-medium transition cursor-pointer"
                      onClick={() => {
                        const usage = verbAnalysis.allVerbs.find(v => v.verb === selectedVerb);
                        if (usage && usage.locations[0]) {
                          handleReplaceVerb(usage.locations[0], selectedVerb, verb);
                        }
                      }}
                      title={`Replace first occurrence of ${selectedVerb} with ${verb}`}
                    >
                      {verb}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Occurrences list */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="text-[11px] font-semibold text-zinc-400">Occurrences in your resume:</div>
            {verbAnalysis.allVerbs.find(v => v.verb === selectedVerb)?.locations.map((loc, idx) => (
              <div key={idx} className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-zinc-500 font-semibold">{loc.itemTitle}</div>
                  <div className="text-zinc-200 line-clamp-1">{loc.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
