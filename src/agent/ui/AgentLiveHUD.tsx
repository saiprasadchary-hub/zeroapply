import React, { useEffect, useState, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  MousePointer2, 
  Edit3, 
  ScrollText, 
  SearchCheck, 
  BrainCircuit, 
  CheckCircle2, 
  Minimize2, 
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { liveTelemetry, type LiveActionRecord, type LiveTelemetryStats } from '../telemetry/liveTelemetry';

interface AgentLiveHUDProps {
  isAutoApplying?: boolean;
}

export const AgentLiveHUD: React.FC<AgentLiveHUDProps> = ({ 
  isAutoApplying = false 
}) => {
  const [currentAction, setCurrentAction] = useState<LiveActionRecord | null>(() => liveTelemetry.getCurrentAction());
  const [history, setHistory] = useState<LiveActionRecord[]>(() => liveTelemetry.getHistory());
  const [stats, setStats] = useState<LiveTelemetryStats>(() => liveTelemetry.getStats());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = liveTelemetry.subscribe((action, hist, st) => {
      setCurrentAction(action);
      setHistory(hist);
      setStats(st);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [history]);

  // Clean English action formatter
  const formatAction = (record: LiveActionRecord | null) => {
    if (!record) {
      return {
        verb: 'Agent Ready',
        description: isAutoApplying ? 'Running batch auto-apply...' : 'Standing by for next job',
        badge: 'READY',
        color: 'bg-zinc-100 text-zinc-800 border-zinc-300',
        icon: <CheckCircle2 size={15} className="text-zinc-600 shrink-0" />
      };
    }

    const type = record.type;
    const rawTitle = record.title || '';
    const rawDetail = record.detail || '';

    if (type === 'click') {
      const cleanTitle = rawTitle.replace(/^(clicking|opening)\s*:?\s*/i, '').trim();
      return {
        verb: 'Its clicking :',
        description: cleanTitle || rawDetail || 'interactive button',
        badge: 'CLICKING',
        color: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300',
        icon: <MousePointer2 size={15} className="text-fuchsia-600 shrink-0" />
      };
    }

    if (type === 'type' || type === 'attach') {
      const cleanTitle = rawTitle.replace(/^(filling|typing|injecting)\s*:?\s*/i, '').trim();
      return {
        verb: 'Its filling :',
        description: cleanTitle || rawDetail || 'form inputs & resume',
        badge: 'FILLING',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        icon: <Edit3 size={15} className="text-emerald-600 shrink-0" />
      };
    }

    if (type === 'scroll') {
      const cleanTitle = rawTitle.replace(/^(scrolling|navigating)\s*:?\s*/i, '').trim();
      return {
        verb: 'Its scrolling :',
        description: cleanTitle || rawDetail || 'job listing search results',
        badge: 'SCROLLING',
        color: 'bg-blue-50 text-blue-800 border-blue-300',
        icon: <ScrollText size={15} className="text-blue-600 shrink-0" />
      };
    }

    if (type === 'validate' || type === 'submit' || type === 'check' || type === 'scan') {
      const isSubmit = type === 'submit' || rawTitle.toLowerCase().includes('submit');
      return {
        verb: 'Its checking :',
        description: isSubmit ? 'Checking submitted or not' : (rawTitle.replace(/^(checking|validating|scanning)\s*:?\s*/i, '') || 'form requirements'),
        badge: 'CHECKING',
        color: 'bg-cyan-50 text-cyan-800 border-cyan-300',
        icon: <SearchCheck size={15} className="text-cyan-600 shrink-0" />
      };
    }

    if (type === 'think') {
      return {
        verb: 'Its thinking :',
        description: rawDetail || rawTitle || 'solving screening question',
        badge: 'THINKING',
        color: 'bg-amber-50 text-amber-800 border-amber-300',
        icon: <BrainCircuit size={15} className="text-amber-600 shrink-0" />
      };
    }

    return {
      verb: 'Its doing :',
      description: rawTitle || rawDetail,
      badge: 'ACTION',
      color: 'bg-zinc-100 text-zinc-800 border-zinc-300',
      icon: <CheckCircle2 size={15} className="text-zinc-600 shrink-0" />
    };
  };

  const copyHistory = () => {
    const text = history
      .map((h) => {
        const f = formatAction(h);
        return `[${new Date(h.timestamp).toLocaleTimeString()}] ${f.verb} ${f.description}`;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFormatted = formatAction(currentAction);

  if (isMinimized) {
    return (
      <div className="absolute bottom-3 right-4 z-40 animate-fadeIn">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-zinc-300 text-zinc-900 text-xs font-semibold shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-105 transition-all hover:border-cyan-500"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
          </span>
          <span>Live Agent Status</span>
          <Maximize2 size={12} className="text-zinc-500 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-40 pointer-events-auto select-none transition-all duration-300">
      <div className="rounded-2xl bg-white/95 backdrop-blur-2xl border border-zinc-300/90 shadow-[0_12px_40px_rgba(0,0,0,0.15)] text-zinc-900 overflow-hidden">
        
        {/* Main Clean English Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          
          {/* Left: Action Badge & Verb */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${activeFormatted.color}`}>
              {activeFormatted.icon}
              <span>{activeFormatted.verb}</span>
            </div>
          </div>

          {/* Center: Plain English Description */}
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-zinc-900 truncate text-[13px] tracking-tight">
              {activeFormatted.description}
            </span>
          </div>

          {/* Right: Metrics & Controls */}
          <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-zinc-600">
            <span className="hidden sm:inline bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-zinc-700">
              {stats.fieldsFilled} fields filled
            </span>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                isExpanded
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-400'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200'
              }`}
              title={isExpanded ? 'Collapse step list' : 'View full step history'}
            >
              <span>Steps</span>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-zinc-400 hover:text-zinc-800 rounded hover:bg-zinc-100 transition-colors"
              title="Minimize HUD"
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>

        {/* Expanded Simple Step History */}
        {isExpanded && (
          <div className="border-t border-zinc-200 bg-zinc-50/95 p-3 flex flex-col gap-2 max-h-64 animate-slideUp">
            <div className="flex items-center justify-between text-xs border-b border-zinc-200 pb-1.5 font-bold text-zinc-700">
              <span>Live Step Execution Trace</span>
              <button
                onClick={copyHistory}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-cyan-700 px-2 py-0.5 rounded bg-white border border-zinc-200 shadow-2xs"
              >
                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div
              ref={logContainerRef}
              className="flex flex-col gap-1.5 overflow-y-auto max-h-52 pr-1 text-xs"
            >
              {history.length === 0 ? (
                <div className="py-6 text-center text-zinc-400 font-medium">
                  Waiting for actions to begin...
                </div>
              ) : (
                history.map((record) => {
                  const fmt = formatAction(record);
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between gap-3 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {fmt.icon}
                        <span className="font-bold text-zinc-800 shrink-0">{fmt.verb}</span>
                        <span className="text-zinc-600 truncate">{fmt.description}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
