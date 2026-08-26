import React, { useState, useMemo } from 'react';
import type { ResumeDocument } from '../types';
import { 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Edit3, 
  Zap
} from 'lucide-react';
import { enhanceBulletStatement } from '../aiEnhancer';

interface XyzFormulaCoachProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast: (msg: string) => void;
}

interface BulletAnalysis {
  sectionId: 'experience' | 'projects';
  itemId: string;
  itemTitle: string;
  bulletIndex: number;
  text: string;
  hasMetric: boolean;
  hasActionVerb: boolean;
  score: 'excellent' | 'needs_metric' | 'needs_action';
  metricMatches: string[];
}

const METRIC_REGEX = /\b(\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?[kKmMbB]?|\d+\s*(?:ms|sec|seconds|min|hours|users|requests|req\/s|qps|million|billion|k|gb|tb|tbps|x|fold)|\b(?:increased|reduced|decreased|accelerated|improved|saved|scaled)\s+by\s+\d+)/i;
const NUMBER_REGEX = /\d+/;
const ACTION_VERB_REGEX = /^[a-z]+(?:ed|d)\b/i;

export const XyzFormulaCoach: React.FC<XyzFormulaCoachProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [activeBuilder, setActiveBuilder] = useState<{
    sectionId: 'experience' | 'projects';
    itemId: string;
    bulletIndex: number;
    accomplishedX: string;
    measuredY: string;
    doneZ: string;
  } | null>(null);

  const [aiGeneratingIndex, setAiGeneratingIndex] = useState<string | null>(null);

  // Analyze all bullets across Experience and Projects
  const analyzedBullets = useMemo<BulletAnalysis[]>(() => {
    const list: BulletAnalysis[] = [];

    // 1. Experience
    doc.experience.forEach((exp) => {
      exp.bullets.forEach((bullet, idx) => {
        if (!bullet.trim()) return;
        const hasMetric = METRIC_REGEX.test(bullet) || NUMBER_REGEX.test(bullet);
        const hasActionVerb = ACTION_VERB_REGEX.test(bullet.trim());
        const metricMatches = bullet.match(METRIC_REGEX) || [];

        let score: 'excellent' | 'needs_metric' | 'needs_action' = 'excellent';
        if (!hasMetric) score = 'needs_metric';
        else if (!hasActionVerb) score = 'needs_action';

        list.push({
          sectionId: 'experience',
          itemId: exp.id,
          itemTitle: `${exp.role} @ ${exp.company || 'Company'}`,
          bulletIndex: idx,
          text: bullet,
          hasMetric,
          hasActionVerb,
          score,
          metricMatches: metricMatches.slice(0, 3),
        });
      });
    });

    // 2. Projects
    doc.projects.forEach((proj) => {
      proj.bullets.forEach((bullet, idx) => {
        if (!bullet.trim()) return;
        const hasMetric = METRIC_REGEX.test(bullet) || NUMBER_REGEX.test(bullet);
        const hasActionVerb = ACTION_VERB_REGEX.test(bullet.trim());
        const metricMatches = bullet.match(METRIC_REGEX) || [];

        let score: 'excellent' | 'needs_metric' | 'needs_action' = 'excellent';
        if (!hasMetric) score = 'needs_metric';
        else if (!hasActionVerb) score = 'needs_action';

        list.push({
          sectionId: 'projects',
          itemId: proj.id,
          itemTitle: `Project: ${proj.name || 'Project'}`,
          bulletIndex: idx,
          text: bullet,
          hasMetric,
          hasActionVerb,
          score,
          metricMatches: metricMatches.slice(0, 3),
        });
      });
    });

    return list;
  }, [doc]);

  const totalBullets = analyzedBullets.length;
  const quantifiedBullets = analyzedBullets.filter(b => b.hasMetric).length;
  const formulaComplianceScore = totalBullets > 0 ? Math.round((quantifiedBullets / totalBullets) * 100) : 100;

  // Apply updated bullet text back into document
  const handleUpdateBullet = (
    sectionId: 'experience' | 'projects',
    itemId: string,
    bulletIndex: number,
    newText: string
  ) => {
    setDoc((prev) => {
      if (sectionId === 'experience') {
        const updatedExp = prev.experience.map((exp) => {
          if (exp.id !== itemId) return exp;
          const updatedBullets = [...exp.bullets];
          updatedBullets[bulletIndex] = newText;
          return { ...exp, bullets: updatedBullets };
        });
        return { ...prev, experience: updatedExp, updatedAt: Date.now() };
      } else {
        const updatedProj = prev.projects.map((p) => {
          if (p.id !== itemId) return p;
          const updatedBullets = [...p.bullets];
          updatedBullets[bulletIndex] = newText;
          return { ...p, bullets: updatedBullets };
        });
        return { ...prev, projects: updatedProj, updatedAt: Date.now() };
      }
    });
  };

  // 1-Click AI enhancement to inject metrics & XYZ phrasing
  const handleAiEnhanceBullet = async (b: BulletAnalysis) => {
    const key = `${b.sectionId}_${b.itemId}_${b.bulletIndex}`;
    setAiGeneratingIndex(key);
    try {
      const result = await enhanceBulletStatement(b.text);
      handleUpdateBullet(b.sectionId, b.itemId, b.bulletIndex, result.enhanced);
      onToast('Quantified bullet using Google XYZ formula!');
    } catch {
      onToast('Failed to enhance bullet.');
    } finally {
      setAiGeneratingIndex(null);
    }
  };

  // Save Interactive Builder
  const handleSaveInteractiveBuilder = () => {
    if (!activeBuilder) return;
    const { accomplishedX, measuredY, doneZ, sectionId, itemId, bulletIndex } = activeBuilder;
    if (!accomplishedX.trim()) return;

    let combined = accomplishedX.trim();
    if (measuredY.trim()) {
      combined += `, achieving ${measuredY.trim()}`;
    }
    if (doneZ.trim()) {
      combined += ` by ${doneZ.trim()}`;
    }
    if (!combined.endsWith('.')) combined += '.';

    handleUpdateBullet(sectionId, itemId, bulletIndex, combined);
    setActiveBuilder(null);
    onToast('Constructed Google XYZ bullet point!');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Google XYZ Bullet Formula Coach
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Recruiter Impact
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Transform weak passive tasks into high-impact accomplishments using Google's formula: <span className="font-semibold text-zinc-200 font-mono">"Accomplished [X], as measured by [Y], by doing [Z]"</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
          <div className="text-right">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Quantified Impact</div>
            <div className="text-lg font-extrabold text-white flex items-center gap-1 justify-end">
              <span className={formulaComplianceScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                {formulaComplianceScore}%
              </span>
              <span className="text-xs text-zinc-500 font-normal">({quantifiedBullets}/{totalBullets} bullets)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-zinc-800 bg-zinc-900">
            <TrendingUp className={`w-5 h-5 ${formulaComplianceScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
        </div>
      </div>

      {/* Interactive XYZ Builder Modal / Drawer */}
      {activeBuilder && (
        <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-4 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Interactive Google XYZ Formula Builder
            </span>
            <button
              onClick={() => setActiveBuilder(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                [X] What did you accomplish? (Action & Outcome)
              </label>
              <input
                type="text"
                value={activeBuilder.accomplishedX}
                onChange={(e) => setActiveBuilder({ ...activeBuilder, accomplishedX: e.target.value })}
                placeholder="e.g. Accelerated API query response times"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                [Y] As measured by? (Quantifiable Metric / % / $ / scale)
              </label>
              <input
                type="text"
                value={activeBuilder.measuredY}
                onChange={(e) => setActiveBuilder({ ...activeBuilder, measuredY: e.target.value })}
                placeholder="e.g. 45% latency reduction across 1.2M daily active requests"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                [Z] By doing what? (Technical implementation / tools used)
              </label>
              <input
                type="text"
                value={activeBuilder.doneZ}
                onChange={(e) => setActiveBuilder({ ...activeBuilder, doneZ: e.target.value })}
                placeholder="e.g. architecting distributed Redis caching and indexing PostgreSQL tables"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Live Output Preview */}
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-xs">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block mb-1">Constructed Bullet Preview:</span>
            <p className="font-medium text-emerald-300">
              • {activeBuilder.accomplishedX ? activeBuilder.accomplishedX : '[X]'}
              {activeBuilder.measuredY ? `, achieving ${activeBuilder.measuredY}` : ''}
              {activeBuilder.doneZ ? ` by ${activeBuilder.doneZ}` : ''}.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setActiveBuilder(null)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInteractiveBuilder}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg transition"
            >
              Insert into Resume
            </button>
          </div>
        </div>
      )}

      {/* Bullets List & Audit */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {analyzedBullets.map((b) => {
          const key = `${b.sectionId}_${b.itemId}_${b.bulletIndex}`;
          const isAiLoading = aiGeneratingIndex === key;

          return (
            <div
              key={key}
              className={`p-3.5 rounded-xl border transition space-y-2 ${
                b.hasMetric
                  ? 'bg-zinc-950/60 border-zinc-800'
                  : 'bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400 font-semibold">{b.itemTitle}</span>
                <div className="flex items-center gap-2">
                  {b.hasMetric ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Quantified Metric
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      Lacks Metric
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-200 font-normal leading-relaxed">
                • {b.text}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
                <div className="text-[11px] text-zinc-500">
                  {b.hasMetric ? (
                    <span className="text-zinc-400">Contains measurable impact metrics.</span>
                  ) : (
                    <span className="text-amber-400/90 font-medium">Tip: Add numbers, % scale, or time saved.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveBuilder({
                      sectionId: b.sectionId,
                      itemId: b.itemId,
                      bulletIndex: b.bulletIndex,
                      accomplishedX: b.text.replace(/\.$/, ''),
                      measuredY: '',
                      doneZ: '',
                    })}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-medium"
                  >
                    <Edit3 className="w-3 h-3" />
                    XYZ Builder
                  </button>

                  <button
                    onClick={() => handleAiEnhanceBullet(b)}
                    disabled={isAiLoading}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition font-medium disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                    {isAiLoading ? 'Quantifying...' : '1-Click Quantify'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
