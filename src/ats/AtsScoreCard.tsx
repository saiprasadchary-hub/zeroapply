import React, { useMemo, useState, useEffect } from 'react';
import type { PersonaData } from '../types';
import { calculateAtsScore } from './atsScorer';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Zap,
  TrendingUp,
  Code2,
  FileSearch,
  Sparkles,
  Layers,
  ShieldAlert,
  Sliders,
  CheckCircle,
  X,
  Target
} from 'lucide-react';

interface AtsScoreCardProps {
  persona: PersonaData;
  resumeText?: string;
  resumeChunks?: PersonaData['resumeChunks'];
  fileName?: string;
}

export const AtsScoreCard: React.FC<AtsScoreCardProps> = ({
  persona,
  resumeText,
  resumeChunks,
  fileName
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'actionPlan' | 'violations' | 'roles' | 'skills' | 'metrics' | 'verbs' | 'pillars' | 'strengths'>('actionPlan');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const result = useMemo(() => {
    return calculateAtsScore(persona, resumeText, resumeChunks);
  }, [persona, resumeText, resumeChunks]);

  const {
    overallScore,
    grade,
    gradeColor,
    summaryTitle,
    summaryDescription,
    dealBreakersCount,
    readability,
    pillars,
    detectedSkills,
    detailedMetrics,
    detailedVerbs,
    roleMatches,
    ruleViolations,
    strengths,
    actionPlan
  } = result;

  const strokeDashoffset = 283 - (283 * overallScore) / 100;

  return (
    <div className="border border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/20 to-white rounded-2xl p-4 sm:p-5 ambient-shadow transition-all duration-300 relative overflow-hidden">
      {/* Ambient Accent Orb */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: gradeColor }}
      />

      {/* ========================================== */}
      {/* 1. COMPACT VIEW (Always visible in form)    */}
      {/* ========================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Circular Gauge */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-zinc-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={gradeColor}
                strokeWidth="10"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute font-mono font-black text-xs text-primary leading-none">
              {overallScore}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-primary tracking-tight">
                ATS Score: <span className="font-mono text-cyan-600 font-extrabold">{overallScore}/100</span>
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider uppercase text-white shadow-xs"
                style={{ backgroundColor: gradeColor }}
              >
                Grade {grade}
              </span>

              {dealBreakersCount === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle size={10} /> 0 Deal-Breakers
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                  <ShieldAlert size={10} /> {dealBreakersCount} Deal-Breaker{dealBreakersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
              {summaryTitle} {fileName ? `• ${fileName}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="px-3.5 py-1.5 bg-white border border-outline-variant hover:border-cyan-500 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 transition-all shadow-xs hover:bg-cyan-50/50 hover:shadow-sm cursor-pointer"
        >
          <span>View Full Report</span>
          <ChevronDown size={14} className="text-cyan-600" />
        </button>
      </div>

      {/* ========================================== */}
      {/* 2. FULL REPORT MODAL (Crisp Pure Light UI) */}
      {/* ========================================== */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 md:p-8 animate-fadeIn"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200/60 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Award size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 tracking-tight truncate">
                      Institutional ATS Match &amp; Diagnostic Report
                    </h3>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider uppercase text-white shadow-xs"
                      style={{ backgroundColor: gradeColor }}
                    >
                      Grade {grade} • {overallScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {fileName ? `Evaluated on ${fileName}` : 'Standard Greenhouse, Workday & Lever compliance audit'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200"
                title="Close Report (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 bg-slate-50/50">
              {/* Primary Gauge & 6-Metric Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Radial Gauge */}
                <div className="md:col-span-4 flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        className="stroke-slate-100"
                        strokeWidth="9"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke={gradeColor}
                        strokeWidth="9"
                        strokeDasharray="283"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                        {overallScore}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                        / 100
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 leading-tight truncate" title={summaryTitle}>
                      {summaryTitle}
                    </h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                      {summaryDescription}
                    </p>
                  </div>
                </div>

                {/* 6 Mini Metrics */}
                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-cyan-700 text-xs font-bold mb-1">
                      <Code2 size={13} />
                      <span>Hard Skills</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {result.hardSkillsCount}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Matched keywords</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                      <TrendingUp size={13} />
                      <span>Quantified KPIs</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {result.metricsCount}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">%, $, scale numbers</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-purple-700 text-xs font-bold mb-1">
                      <Zap size={13} />
                      <span>Power Verbs</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {result.actionVerbsCount}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Active leadership</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                      <FileSearch size={13} />
                      <span>Word Count</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {result.wordCount}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">~{result.readingTimeMinutes} min scan</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-1">
                      <Sliders size={13} />
                      <span>Metric Density</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {readability.bulletsWithMetricsPercent}%
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Bullets with numbers</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold mb-1">
                      <ShieldAlert size={13} />
                      <span>Rule Warnings</span>
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {ruleViolations.length}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{dealBreakersCount} Deal-Breakers</span>
                  </div>
                </div>
              </div>

              {/* Deal-Breakers Alert Banner if any exist */}
              {dealBreakersCount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-start gap-3 shadow-xs">
                  <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm block text-rose-900 mb-0.5">
                      Critical ATS Deal-Breakers Detected ({dealBreakersCount})
                    </span>
                    <p className="text-rose-800 leading-relaxed">
                      Applicant Tracking Systems (Greenhouse/Workday) flag these issues for immediate rejection before a human recruiter sees your resume. Resolve them using the Fix Checklist below.
                    </p>
                  </div>
                </div>
              )}

              {/* 6 Structural Pillar Overview Bars */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs grid grid-cols-2 sm:grid-cols-6 gap-3">
                {Object.entries(pillars).map(([key, pillar]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-600 font-medium truncate" title={pillar.name}>
                        {pillar.name}
                      </span>
                      <span className="font-bold text-slate-900">{pillar.score}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pillar.score >= 80
                            ? 'bg-emerald-500'
                            : pillar.score >= 60
                            ? 'bg-cyan-500'
                            : pillar.score >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sub-Tabs Bar */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('actionPlan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'actionPlan'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Fix Action Plan ({actionPlan.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('violations')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'violations'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldAlert size={13} />
                    <span>Breaking Rules &amp; Traps ({ruleViolations.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('roles')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'roles'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Target size={13} />
                    <span>Target Role Match ({roleMatches.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('skills')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'skills'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Code2 size={13} />
                    <span>Keyword Cloud ({detectedSkills.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('metrics')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'metrics'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp size={13} />
                    <span>Quantified Metrics ({detailedMetrics.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('verbs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'verbs'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Zap size={13} />
                    <span>Power Verbs ({detailedVerbs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pillars')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'pillars'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Pillars Checklist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('strengths')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'strengths'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>Strengths ({strengths.length})</span>
                  </button>
                </div>

                {/* TAB 1: Step-by-Step Action Plan */}
                {activeTab === 'actionPlan' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold text-slate-900 uppercase">
                        Prioritized Roadmap to Reach 95%+ Match Score
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Projected point boosts calculated
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actionPlan.map((action) => (
                        <div
                          key={action.step}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                            action.impact === 'high'
                              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                              : action.impact === 'medium'
                              ? 'bg-cyan-50/90 border-cyan-300 text-cyan-950'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-white border border-current font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              {action.step}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{action.title}</div>
                              <p className="mt-0.5 text-slate-700 leading-relaxed">
                                {action.instruction}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] shrink-0 bg-white border border-current text-cyan-800 shadow-2xs">
                            {action.pointsBoost}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: Breaking Rules & Red Flags */}
                {activeTab === 'violations' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold text-slate-900 uppercase">
                        ATS Filter Traps &amp; Rule Violations ({ruleViolations.length})
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">
                        {dealBreakersCount} Deal-Breakers • {ruleViolations.length - dealBreakersCount} Warnings
                      </span>
                    </div>

                    {ruleViolations.length > 0 ? (
                      <div className="space-y-2">
                        {ruleViolations.map((v) => (
                          <div
                            key={v.id}
                            className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                              v.severity === 'dealbreaker'
                                ? 'bg-rose-50 border-rose-300 text-rose-950'
                                : v.severity === 'warning'
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <ShieldAlert
                              size={16}
                              className={`shrink-0 mt-0.5 ${
                                v.severity === 'dealbreaker' ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold">{v.title}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-current font-bold">
                                  -{v.penaltyPoints} pts
                                </span>
                              </div>
                              <p className="mt-1 text-slate-700 leading-relaxed">
                                {v.description}
                              </p>
                              <p className="mt-1.5 font-mono text-[11px] text-cyan-900 bg-white/90 p-1.5 rounded border border-cyan-200">
                                💡 Fix: {v.recommendation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="font-bold">Zero ATS Rule Violations! Your resume structure is 100% clean.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Target Role Match (All-Rounder) */}
                {activeTab === 'roles' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        Target Role Compatibility &amp; Benchmark Alignment
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Multi-Domain Keyword Alignment
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {roleMatches.map((rm, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{rm.role}</span>
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                                rm.matchScore >= 70
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : rm.matchScore >= 45
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {rm.matchScore}% Match
                            </span>
                          </div>

                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rm.matchScore >= 70
                                  ? 'bg-emerald-500'
                                  : rm.matchScore >= 45
                                  ? 'bg-cyan-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${rm.matchScore}%` }}
                            />
                          </div>

                          {rm.missingSkills.length > 0 && (
                            <div className="text-[11px] pt-1">
                              <span className="text-slate-500 font-mono block mb-1">Recommended Keywords to Add:</span>
                              <div className="flex flex-wrap gap-1">
                                {rm.missingSkills.slice(0, 5).map((ms, msIdx) => (
                                  <span
                                    key={msIdx}
                                    className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                                  >
                                    +{ms}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: Keyword Cloud */}
                {activeTab === 'skills' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        ATS Detected Technical Keywords ({detectedSkills.length})
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Extracted across 14 technical categories
                      </span>
                    </div>

                    {detectedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {detectedSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-white border border-cyan-200 text-cyan-900 rounded-lg text-xs font-mono font-semibold shadow-2xs flex items-center gap-1.5"
                          >
                            <Code2 size={11} className="text-cyan-600" />
                            <span>{skill.name}</span>
                            <span className="text-[9px] text-cyan-600 uppercase font-sans font-normal">({skill.category.replace('_', ' ')})</span>
                            {skill.inExperienceBullets && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Found in Experience bullets" />
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                        No standard keywords detected in resume text. Ensure your skills section lists explicit technologies.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Quantified Metrics Inspector */}
                {activeTab === 'metrics' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        Quantifiable KPI Impact Metrics ({detailedMetrics.length})
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {readability.bulletsWithMetricsPercent}% of bullets quantified
                      </span>
                    </div>

                    {detailedMetrics.length > 0 ? (
                      <div className="space-y-2">
                        {detailedMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5"
                          >
                            <TrendingUp size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                  {m.value}
                                </span>
                                <span className="text-[10px] font-mono uppercase text-emerald-800">
                                  {m.category.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-700 text-[11px] font-mono line-clamp-2">
                                {m.contextSnippet}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        No quantified metrics found. Add percentages (%), dollar values ($), or scale multipliers (10x).
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: Power Verbs Inspector */}
                {activeTab === 'verbs' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        High-Impact Active Action Verbs ({detailedVerbs.length})
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Telegraphic leadership &amp; ownership
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {detailedVerbs.map((v, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Zap size={11} className="text-purple-600" />
                          <span>{v.verb}</span>
                          <span className="text-[9px] text-purple-700 uppercase">({v.category})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 6: Structural Pillar Criteria */}
                {activeTab === 'pillars' && (
                  <div className="space-y-3">
                    {Object.entries(pillars).map(([key, pillar]) => (
                      <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{pillar.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({pillar.label})
                            </span>
                          </div>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                              pillar.score >= 80
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : pillar.score >= 60
                                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {pillar.score}/100
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {pillar.items.map((item, iIdx) => (
                            <div
                              key={iIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                item.passed
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <CheckCircle2
                                size={14}
                                className={`shrink-0 mt-0.5 ${item.passed ? 'text-emerald-600' : 'text-slate-300'}`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold">{item.title}</span>
                                  {item.scoreGain && (
                                    <span className="text-[9px] font-mono text-cyan-800 font-semibold">
                                      +{item.scoreGain}p
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-slate-600 truncate">
                                  {item.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 7: Strengths */}
                {activeTab === 'strengths' && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Verified ATS Compliance Strengths</span>
                    </h4>
                    <div className="space-y-1.5">
                      {strengths.map((str, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2"
                        >
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span className="font-medium">{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-700 font-mono">
                Overall ATS Score: <span className="font-bold text-slate-900">{overallScore}/100</span> (Grade {grade})
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
