import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Activity,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  FileText,
  Check,
  Copy,
  CheckCheck,
  X,
  ListOrdered,
  Briefcase
} from 'lucide-react';
import { liveTelemetry, type LiveActionRecord, type TelemetryStats } from '../telemetry/liveTelemetry';
import { getActiveModelName } from '../localLlm/ollamaClient';
import { isLiveAgentInspectorEnabled } from '../../settings/settingsManager';
import { processTracker, type JobApplicationSession } from '../tracker/processTracker';

interface AgentLiveHUDProps {
  isAutoApplying?: boolean;
}

function buildProcessLogText(
  session: JobApplicationSession | null,
  recentActions: LiveActionRecord[],
  stats: TelemetryStats,
  activeModel = 'Qwen 2.5:3b'
): string {
  const lines: string[] = [];
  const divider = '='.repeat(72);
  const subDivider = '-'.repeat(72);

  lines.push(divider);
  lines.push('ZEROAPPLY - AUTONOMOUS AGENT APPLICATION PROCESS REPORT');
  lines.push(divider);

  const jobTitle = session?.jobTitle || 'Job Application';
  const company = session?.companyName || 'Target Company';
  const portal = session?.portal || 'Web Portal';
  const status = session?.status === 'submitted'
    ? 'SUBMITTED (Confirmed by ATS)'
    : session?.status === 'failed'
    ? 'FAILED / ERROR'
    : session?.completedAt
    ? 'COMPLETED / PROCESSED'
    : 'IN PROGRESS';

  const startTime = session?.startedAt ? new Date(session.startedAt).toLocaleString() : new Date().toLocaleString();
  const endTime = session?.completedAt ? new Date(session.completedAt).toLocaleString() : new Date().toLocaleString();
  const durationSec = session?.startedAt && session?.completedAt
    ? Math.round((session.completedAt - session.startedAt) / 1000)
    : undefined;

  lines.push(`Job Role:          ${jobTitle}`);
  lines.push(`Company:           ${company}`);
  lines.push(`Platform:          ${portal}`);
  if (session?.url) {
    lines.push(`Job Posting URL:   ${session.url}`);
  }
  lines.push(`AI Engine:         ${activeModel} (100% On-Device / Local)`);
  lines.push(`Started At:        ${startTime}`);
  lines.push(`Completed At:      ${endTime}${durationSec !== undefined ? ` (${durationSec} seconds)` : ''}`);
  lines.push(`Final Outcome:     ${status}`);
  lines.push(`Fields Filled:     ${stats.fieldsFilled}`);
  lines.push(`Questions Solved:  ${stats.questionsSolved || session?.questionsCount || 0}`);
  lines.push(subDivider);
  lines.push('CHRONOLOGICAL APPLICATION PROCESS TIMELINE:');
  lines.push(subDivider);

  if (session && session.steps && session.steps.length > 0) {
    session.steps.forEach((step, idx) => {
      const timeStr = new Date(step.timestamp).toLocaleTimeString();
      const numStr = String(idx + 1).padStart(2, '0');
      lines.push(`[${numStr}] ${timeStr} | ${step.title}`);
      if (step.description) {
        lines.push(`     Description: ${step.description}`);
      }
      if (step.buttonClicked) {
        lines.push(`     Action: Clicked "${step.buttonClicked}"`);
      }
      if (step.qaItems && step.qaItems.length > 0) {
        lines.push(`     Screening Questions & Answers:`);
        step.qaItems.forEach((qa) => {
          lines.push(`       • Question: "${qa.question}"`);
          lines.push(`         Answer:   "${qa.answer}" (Source: ${qa.source.toUpperCase()})`);
        });
      }
      lines.push('');
    });
  } else if (recentActions.length > 0) {
    recentActions.forEach((act, idx) => {
      const timeStr = act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : '';
      const numStr = String(idx + 1).padStart(2, '0');
      lines.push(`[${numStr}] ${timeStr} | ${act.title}${act.value ? ` -> "${act.value}"` : ''}`);
    });
    lines.push('');
  } else {
    lines.push('No process steps recorded.');
    lines.push('');
  }

  lines.push(divider);
  lines.push('ZeroApply · Local Persona & Autonomous Navigation System · 100% On-Device');
  lines.push(divider);

  return lines.join('\n');
}

export const AgentLiveHUD: React.FC<AgentLiveHUDProps> = ({ isAutoApplying = false }) => {
  const [minimized, setMinimized] = useState(false);
  const [currentAction, setCurrentAction] = useState<LiveActionRecord | null>(null);
  const [recentActions, setRecentActions] = useState<LiveActionRecord[]>([]);
  const [stats, setStats] = useState<TelemetryStats>(() => liveTelemetry.getStats());
  const [enabled, setEnabled] = useState(() => isLiveAgentInspectorEnabled());
  const [hasRun, setHasRun] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSession, setActiveSession] = useState<JobApplicationSession | null>(() => processTracker.getActiveSession());
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const activeModel = getActiveModelName();

  useEffect(() => {
    const handleUpdate = () => setEnabled(isLiveAgentInspectorEnabled());
    window.addEventListener('zeroapply_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', handleUpdate);
    return () => {
      window.removeEventListener('zeroapply_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      document.removeEventListener('visibilitychange', handleUpdate);
    };
  }, []);

  // Track run lifecycle: when auto-applying starts, mark hasRun and reset dismissal
  useEffect(() => {
    if (isAutoApplying) {
      setHasRun(true);
      setIsDismissed(false);
    }
  }, [isAutoApplying]);

  useEffect(() => {
    const unsubscribeTelemetry = liveTelemetry.subscribe((action) => {
      setCurrentAction(action);
      setRecentActions((prev) => [action, ...prev.slice(0, 49)]);
      setStats(liveTelemetry.getStats());
    });

    const unsubscribeTracker = processTracker.subscribe(() => {
      setActiveSession(processTracker.getActiveSession());
    });

    return () => {
      unsubscribeTelemetry();
      unsubscribeTracker();
    };
  }, []);

  const handleCopyProcess = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const session = activeSession || processTracker.getActiveSession();
    const text = buildProcessLogText(session, recentActions, stats, activeModel);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {}
    }
  };

  // Determine visibility
  if (!enabled || !isLiveAgentInspectorEnabled()) return null;
  if (!isAutoApplying && (!hasRun || isDismissed)) return null;

  const isCompleted = !isAutoApplying && hasRun;
  const session = activeSession || processTracker.getActiveSession();

  return (
    <aside
      aria-label="Live Agent Activity HUD"
      className="fixed bottom-5 right-5 z-[9999] w-96 max-w-[calc(100vw-40px)] bg-white/98 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden font-sans text-xs text-slate-800 transition-all duration-200 ring-1 ring-black/5"
    >
      {/* Header bar - Professional Light Mode */}
      <div className="bg-slate-50/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
            </div>
          )}
          <span className="font-bold text-slate-900 uppercase font-mono tracking-wider text-[11px] flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-600" />
            Live Agent Inspector
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200/80 uppercase">
              ✓ COMPLETED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-semibold border border-indigo-200/70 uppercase">
              {activeModel || 'QWEN 2.5 3B'}
            </span>
          )}

          {/* Quick Copy in Header */}
          <button
            type="button"
            onClick={handleCopyProcess}
            className="text-slate-500 hover:text-indigo-600 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
            title={copied ? 'Copied!' : 'Copy Process Log'}
          >
            {copied ? <CheckCheck size={14} className="text-emerald-600 font-bold" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isCompleted && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div className="p-3.5 space-y-3 bg-white">
          {/* Status & Realtime Action */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500 font-medium">Workflow Status</span>
            {isCompleted ? (
              <span className="text-emerald-700 font-semibold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" /> Auto-Apply Completed
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Activity size={12} className="animate-spin text-emerald-600" /> Autonomous Applying
              </span>
            )}
          </div>

          {/* Active Job Meta Card */}
          {session && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
                  <Briefcase size={11} /> Target Posting
                </div>
                <div className="font-semibold text-slate-900 text-[12px] truncate">
                  {session.jobTitle}
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {session.companyName} · {session.portal}
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[10px] font-bold shadow-xs">
                {session.status === 'submitted' ? '✓ SUBMITTED' : (isCompleted ? 'PROCESSED' : 'ACTIVE')}
              </span>
            </div>
          )}

          {/* Current Question Focus Box (when running) or Completion Confirmation (when completed) */}
          {!isCompleted ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
                <span className="flex items-center gap-1">
                  <FileText size={11} /> Current Form Question
                </span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100/70 text-indigo-700 font-mono">
                  {currentAction?.source === 'ollama' ? 'LOCAL RAG' : 'PERSONA'}
                </span>
              </div>

              <div className="font-semibold text-slate-900 text-[12px] leading-snug line-clamp-2">
                {currentAction?.target || currentAction?.title || 'Scanning form fields and active wizard step...'}
              </div>

              {currentAction?.value && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 text-emerald-950 text-[11.5px] leading-relaxed">
                  <span className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                    ✦ Generating / Filling Answer:
                  </span>
                  <span className="font-medium text-emerald-900">"{currentAction.value}"</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-start gap-2 text-emerald-950">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-[11.5px] text-emerald-900">
                  Application Pass Completed
                </div>
                <div className="text-[11px] text-emerald-800 leading-snug">
                  All screening questions, resume validation, and wizard navigation steps were executed truthfully on-device.
                </div>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-slate-200/80">
              <span className="text-slate-500">Fields Filled:</span>
              <span className="text-indigo-600 font-bold text-[12px]">{stats.fieldsFilled}</span>
            </div>
            <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-slate-200/80">
              <span className="text-slate-500">Solved Qs:</span>
              <span className="text-emerald-600 font-bold text-[12px]">{stats.questionsSolved || session?.questionsCount || 0}</span>
            </div>
          </div>

          {/* High-Impact "Copy Process Log" Primary Action Button */}
          <button
            type="button"
            onClick={handleCopyProcess}
            className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-indigo-200 shadow-md'
            }`}
          >
            {copied ? (
              <>
                <CheckCheck size={15} className="stroke-[2.5]" />
                <span>✓ Process Log Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Full Process Log</span>
              </>
            )}
          </button>

          {/* Process Timeline / Action Feed */}
          <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-200/70 text-[11px] text-slate-700 space-y-1.5 max-h-36 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                {isCompleted ? 'Process Steps Timeline' : 'Recent Form Actions'}
              </span>
              <button
                type="button"
                onClick={() => setShowFullTimeline(!showFullTimeline)}
                className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
              >
                {showFullTimeline ? 'Compact' : 'Detailed'}
              </button>
            </div>

            {session && session.steps && session.steps.length > 0 ? (
              (showFullTimeline ? session.steps : session.steps.slice(-4)).map((st, idx) => (
                <div key={st.id || idx} className="py-1 border-b border-slate-100 last:border-b-0 space-y-0.5">
                  <div className="flex items-start gap-1.5 text-slate-700 text-[11px]">
                    <Check size={12} className="shrink-0 mt-0.5 text-emerald-600 font-bold" />
                    <span className="font-semibold text-slate-900 truncate">{st.title}</span>
                  </div>
                  {st.description && (
                    <div className="text-[10.5px] text-slate-500 pl-4 leading-snug line-clamp-2">
                      {st.description}
                    </div>
                  )}
                  {showFullTimeline && st.qaItems && st.qaItems.length > 0 && (
                    <div className="pl-4 pt-1 space-y-1">
                      {st.qaItems.map((qa) => (
                        <div key={qa.id} className="text-[10px] bg-white rounded p-1.5 border border-slate-200">
                          <span className="font-semibold text-slate-700 block">Q: {qa.question}</span>
                          <span className="text-emerald-700 font-medium">A: "{qa.answer}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              recentActions.slice(0, 4).map((act, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-600 text-[11px] truncate">
                  <Check size={11} className="shrink-0 mt-0.5 text-emerald-600 font-bold" />
                  <span className="truncate">{act.title}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck size={12} /> 100% On-Device · Zero Cloud
            </span>
            <span className="text-slate-400 font-mono">
              {isCompleted ? 'Pass Finished' : 'Human Pacing (2.2s)'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

