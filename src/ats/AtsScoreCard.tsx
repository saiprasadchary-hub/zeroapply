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
  Sparkles,
  Layers,
  ShieldAlert,
  CheckCircle,
  X,
  Target,
  FileText,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
  Briefcase
} from 'lucide-react';

interface AtsScoreCardProps {
  persona: PersonaData;
  resumeText?: string;
  resumeChunks?: PersonaData['resumeChunks'];
  fileName?: string;
  onNavigateToResume?: () => void;
}

type TabType = 'fixes' | 'match' | 'writing' | 'checklist';

export const AtsScoreCard: React.FC<AtsScoreCardProps> = ({
  persona,
  resumeText,
  resumeChunks,
  fileName,
  onNavigateToResume,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('fixes');

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

  // Friendly human verdict
  const getStatusVerdict = (score: number) => {
    if (score >= 80) return { label: 'Ready to Apply', desc: 'Strong results on the checks shown below.', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 60) return { label: 'Good Foundation', desc: 'Review the suggestions to improve clarity and completeness.', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' };
    return { label: 'Needs Improvements', desc: 'Automated filters might filter your resume before a recruiter sees it.', color: 'text-amber-800 bg-amber-50 border-amber-200' };
  };

  const statusVerdict = getStatusVerdict(overallScore);

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
                ATS Readiness Estimate: <span className="font-mono text-cyan-600 font-extrabold">{overallScore}/100</span>
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider uppercase text-white shadow-xs"
                style={{ backgroundColor: gradeColor }}
              >
                Grade {grade}
              </span>

              {dealBreakersCount === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle size={11} className="text-emerald-600" /> All Core Checks Passed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={11} className="text-rose-600" /> {dealBreakersCount} Issue{dealBreakersCount > 1 ? 's' : ''} to Fix
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {summaryTitle} {fileName ? `• ${fileName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {onNavigateToResume && (
            <button
              type="button"
              onClick={onNavigateToResume}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
              title="Switch to ATS Resume Studio"
            >
              <FileText size={13} />
              <span>Create Resume</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-cyan-500 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-xs hover:bg-cyan-50/50 hover:shadow-sm cursor-pointer"
          >
            <span>View Full Report</span>
            <ChevronDown size={14} className="text-cyan-600" />
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FULL REPORT MODAL (Clean, Human & Simple)*/}
      {/* ========================================== */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fadeIn"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Award size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                      Resume ATS Health Report
                    </h3>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider uppercase text-white shadow-2xs"
                      style={{ backgroundColor: gradeColor }}
                    >
                      Grade {grade} • {overallScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {fileName ? `Checking ${fileName}` : 'Automated screening check for job application filters'}
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
            <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 bg-slate-50/60">
              {/* Friendly Score Banner & 4 Core Vitals */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5 justify-between">
                  {/* Left: Overall Score & Friendly Takeaway */}
                  <div className="flex items-center gap-4 min-w-0">
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
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          / 100
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusVerdict.color}`}>
                          {statusVerdict.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">
                        {summaryTitle}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2">
                        {summaryDescription || statusVerdict.desc}
                      </p>
                    </div>
                  </div>

                  {/* Right: 4 Plain-English Vitals */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <div className="flex items-center justify-center gap-1 text-cyan-700 text-xs font-bold mb-0.5">
                        <Code2 size={13} />
                        <span>Skills</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {result.hardSkillsCount}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Found</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-bold mb-0.5">
                        <TrendingUp size={13} />
                        <span>Numbers</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {result.metricsCount}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Results</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-700 text-xs font-bold mb-0.5">
                        <Zap size={13} />
                        <span>Verbs</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {result.actionVerbsCount}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Action words</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <div className="flex items-center justify-center gap-1 text-rose-700 text-xs font-bold mb-0.5">
                        <AlertTriangle size={13} />
                        <span>Fixes</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {ruleViolations.length}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {dealBreakersCount > 0 ? `${dealBreakersCount} critical` : 'All clear'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Urgent Attention Alert (If deal breakers exist) */}
              {dealBreakersCount > 0 && (
                <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-start gap-3 shadow-2xs">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-sm block text-rose-900 mb-0.5">
                      {dealBreakersCount} Important Issue{dealBreakersCount > 1 ? 's' : ''} to Fix Before Submitting Applications
                    </span>
                    <p className="text-rose-800 leading-relaxed">
                      Automated job filters can drop resumes with missing contact details, bad formatting, or missing job sections before human recruiters review them. Check the <strong className="underline cursor-pointer" onClick={() => setActiveTab('fixes')}>Action Plan tab</strong> to fix them.
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Simple, Human Tabs */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fixes')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      activeTab === 'fixes'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>How to Improve</span>
                    {(ruleViolations.length > 0 || actionPlan.length > 0) && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'fixes' ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {actionPlan.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('match')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      activeTab === 'match'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Target size={14} />
                    <span>Job &amp; Skills Fit</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'match' ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {detectedSkills.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('writing')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      activeTab === 'writing'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Zap size={14} />
                    <span>Writing &amp; Results</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'writing' ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {detailedMetrics.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      activeTab === 'checklist'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Full Checklist</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'checklist' ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {strengths.length} passed
                    </span>
                  </button>
                </div>

                {/* ========================================================= */}
                {/* TAB 1: HOW TO IMPROVE (Clear Checklist & Action Plan)      */}
                {/* ========================================================= */}
                {activeTab === 'fixes' && (
                  <div className="space-y-4">
                    {/* Critical Issues & Warnings First */}
                    {ruleViolations.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <AlertTriangle size={14} className="text-amber-600" />
                            <span>Issues That Need Attention ({ruleViolations.length})</span>
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Fix these first to prevent automatic rejections
                          </span>
                        </div>

                        <div className="space-y-2">
                          {ruleViolations.map((v) => (
                            <div
                              key={v.id}
                              className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                                v.severity === 'dealbreaker'
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {v.severity === 'dealbreaker' ? (
                                  <ShieldAlert size={16} className="text-rose-600" />
                                ) : (
                                  <AlertTriangle size={16} className="text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 text-xs">{v.title}</span>
                                  <span
                                    className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                      v.severity === 'dealbreaker'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    -{v.penaltyPoints} pts
                                  </span>
                                </div>
                                <p className="mt-1 text-slate-600 leading-relaxed text-[11.5px]">
                                  {v.description}
                                </p>
                                <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-white/90 border border-slate-200 text-slate-800 text-[11px]">
                                  <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-slate-900">How to fix: </strong>
                                    <span>{v.recommendation}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Score Booster Roadmap */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Sparkles size={14} className="text-cyan-600" />
                          <span>Top Steps to Boost Your Score ({actionPlan.length})</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Follow these to achieve a 90%+ match
                        </span>
                      </div>

                      {actionPlan.length > 0 ? (
                        <div className="space-y-2">
                          {actionPlan.map((action) => (
                            <div
                              key={action.step}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-all flex items-start justify-between gap-3 text-xs shadow-2xs"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {action.step}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{action.title}</div>
                                  <p className="mt-1 text-slate-600 leading-relaxed text-[11.5px]">
                                    {action.instruction}
                                  </p>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {action.pointsBoost}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span className="font-bold">Awesome! Your resume has completed all key optimization steps.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: JOB & SKILLS FIT (Roles & Matched Keywords)        */}
                {/* ========================================================= */}
                {activeTab === 'match' && (
                  <div className="space-y-5">
                    {/* Target Roles Alignment */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Briefcase size={14} className="text-cyan-600" />
                          <span>Match for Target Roles</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          How well your experience matches roles you want
                        </span>
                      </div>

                      {roleMatches.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {roleMatches.map((rm, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{rm.role}</span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
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

                              {/* Progress bar */}
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
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
                                  <span className="text-slate-500 block mb-1 font-medium">Recommended keywords to add:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {rm.missingSkills.slice(0, 6).map((ms, msIdx) => (
                                      <span
                                        key={msIdx}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10.5px] border border-slate-200 font-medium"
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
                      ) : (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                          Add target roles in Section 06 of your profile to compare keyword compatibility.
                        </div>
                      )}
                    </div>

                    {/* Detected Skills Cloud */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Code2 size={14} className="text-cyan-600" />
                          <span>Keywords Found in Your Resume ({detectedSkills.length})</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Green dot = found in job bullet points
                        </span>
                      </div>

                      {detectedSkills.length > 0 ? (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <div className="flex flex-wrap gap-1.5">
                            {detectedSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                              >
                                {skill.inExperienceBullets && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Present in work experience bullets" />
                                )}
                                <span>{skill.name}</span>
                                <span className="text-[9.5px] text-slate-400 capitalize">({skill.category.replace('_', ' ')})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                          No standard technical keywords detected. Make sure your resume explicitly lists technologies and tools in your Experience and Skills sections.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: WRITING & RESULTS (Numbers, Verbs, Readability)    */}
                {/* ========================================================= */}
                {activeTab === 'writing' && (
                  <div className="space-y-5">
                    {/* Measurable Results */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <TrendingUp size={14} className="text-emerald-600" />
                            <span>Measurable Results ({detailedMetrics.length} found)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {readability.bulletsWithMetricsPercent}% of your bullet points contain measurable impact (%, $, or scale)
                          </p>
                        </div>
                      </div>

                      {detailedMetrics.length > 0 ? (
                        <div className="space-y-2">
                          {detailedMetrics.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                            >
                              <TrendingUp size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {m.value}
                                  </span>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                                    {m.category.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="mt-1 text-slate-600 text-xs leading-relaxed italic">
                                  "{m.contextSnippet}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                          <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">No numbers or measurable results found!</span>
                            <p className="mt-0.5 text-amber-900 leading-relaxed">
                              Recruiters look for numbers to understand your impact. Try adding percentages (e.g. "sped up load time by 35%"), dollar amounts (e.g. "$500k budget"), or team/user counts (e.g. "serving 50,000 daily users").
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Verbs */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <Zap size={14} className="text-purple-600" />
                            <span>Strong Action Verbs ({detailedVerbs.length} found)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Starting bullets with active words shows leadership and direct contribution
                          </p>
                        </div>
                      </div>

                      {detailedVerbs.length > 0 ? (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <div className="flex flex-wrap gap-1.5">
                            {detailedVerbs.map((v, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Zap size={11} className="text-purple-600" />
                                <span>{v.verb}</span>
                                <span className="text-[9.5px] text-purple-600 font-normal">({v.count}x)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                          Use strong verbs like <em>spearheaded, delivered, optimized, launched</em> instead of passive phrases like <em>responsible for</em>.
                        </div>
                      )}
                    </div>

                    {/* Reading Ease & Word Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="text-xs font-bold text-slate-500 uppercase">Total Words</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">{result.wordCount} words</div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          {result.wordCount < 300 ? 'A bit short' : result.wordCount > 1000 ? 'A bit long' : 'Ideal length (400-800)'}
                        </p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="text-xs font-bold text-slate-500 uppercase">Estimated Scan Time</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">~{result.readingTimeMinutes} min</div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">Recruiters spend ~6 seconds</p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="text-xs font-bold text-slate-500 uppercase">Bullet Points</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">{readability.bulletCount} bullets</div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">Avg {readability.avgWordsPerBullet} words per bullet</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: FULL CHECKLIST & STRENGTHS                         */}
                {/* ========================================================= */}
                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    {/* Strengths */}
                    {strengths.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <ThumbsUp size={14} className="text-emerald-600" />
                          <span>What You're Doing Right ({strengths.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {strengths.map((str, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2"
                            >
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span className="font-medium text-[11.5px]">{str}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6 Core Quality Checks */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <Layers size={14} className="text-cyan-600" />
                        <span>Core Resume Quality Checklist</span>
                      </h4>

                      <div className="space-y-3">
                        {Object.entries(pillars).map(([key, pillar]) => (
                          <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs text-slate-900">{pillar.name}</span>
                                <span className="text-[11px] text-slate-500 ml-2">({pillar.label})</span>
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
                                {pillar.score}%
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {pillar.items.map((item, iIdx) => (
                                <div
                                  key={iIdx}
                                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                    item.passed
                                      ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <CheckCircle2
                                    size={14}
                                    className={`shrink-0 mt-0.5 ${item.passed ? 'text-emerald-600' : 'text-slate-300'}`}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-[11.5px]">{item.title}</span>
                                      {item.scoreGain && !item.passed && (
                                        <span className="text-[9.5px] font-mono text-cyan-800 font-bold bg-cyan-50 px-1 rounded">
                                          +{item.scoreGain}p
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {item.detail}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                Score: <strong className="text-slate-900">{overallScore}/100</strong> (Grade {grade}) • {statusVerdict.label}
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
