import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  FileCode, 
  BrainCircuit, 
  Activity, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Cpu
} from 'lucide-react';
import { ProcessLogger, type ProcessLogRecord, type ProcessLogLevel } from '../agent/tracker/processLogger';

export interface ProcessLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ProcessLogProps {
  logs?: ProcessLogEntry[];
}

export const ProcessLog: React.FC<ProcessLogProps> = () => {
  const [processLogs, setProcessLogs] = useState<ProcessLogRecord[]>(() => ProcessLogger.getLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | ProcessLogLevel>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = ProcessLogger.subscribe((updatedLogs) => {
      setProcessLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [processLogs, autoScroll]);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all process logs?')) {
      ProcessLogger.clearLogs();
      setExpandedId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    ProcessLogger.deleteLog(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleExportCsv = () => {
    const csv = ProcessLogger.exportAsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_process_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const json = ProcessLogger.exportAsJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_process_logs_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copySingleLog = (e: React.MouseEvent, log: ProcessLogRecord) => {
    e.stopPropagation();
    const text = `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] [${log.source}] ${log.message}${log.detail ? ` (${log.detail})` : ''}${log.target ? ` Target: ${log.target}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllLogs = () => {
    const text = processLogs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] [${l.source}] ${l.message}${l.detail ? ` (${l.detail})` : ''}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const uniqueSources = Array.from(new Set(processLogs.map((l) => l.source).filter(Boolean)));

  const filteredLogs = processLogs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.message.toLowerCase().includes(query) ||
      log.source.toLowerCase().includes(query) ||
      (log.detail && log.detail.toLowerCase().includes(query)) ||
      (log.target && log.target.toLowerCase().includes(query));

    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;

    return matchesSearch && matchesLevel && matchesSource;
  });

  // Calculate live stats
  const totalEvents = processLogs.length;
  const actionEvents = processLogs.filter((l) => l.level === 'ACTION').length;
  const llmInferences = processLogs.filter((l) => l.level === 'LLM').length;
  const successEvents = processLogs.filter((l) => l.level === 'SUCCESS').length;

  const getLevelBadge = (level: ProcessLogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'LLM':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'ACTION':
        return 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300';
      case 'SECURITY':
        return 'bg-amber-100 text-amber-950 border-amber-300';
      case 'WARNING':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'ERROR':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-300';
    }
  };

  const getLevelIcon = (level: ProcessLogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />;
      case 'LLM':
        return <BrainCircuit size={13} className="text-cyan-600 shrink-0" />;
      case 'ACTION':
        return <Activity size={13} className="text-fuchsia-600 shrink-0" />;
      case 'SECURITY':
        return <ShieldCheck size={13} className="text-amber-600 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle size={13} className="text-orange-600 shrink-0" />;
      case 'ERROR':
        return <XCircle size={13} className="text-red-600 shrink-0" />;
      default:
        return <Terminal size={13} className="text-zinc-600 shrink-0" />;
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-y-auto p-3 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs font-mono tracking-wide uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>100% Real-Time Process Telemetry</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1">Agent Process Stream</h1>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              Live chronological trace of DOM mutations, button clicks, LLM thoughts, and state machine navigation.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                autoScroll
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
              title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
            >
              <Radio size={12} className={autoScroll ? 'text-cyan-600 animate-pulse' : 'text-zinc-400'} />
              <span>{autoScroll ? 'Live Stick' : 'Paused Stick'}</span>
            </button>

            <button
              onClick={copyAllLogs}
              disabled={processLogs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Copy entire event stream"
            >
              {copiedAll ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedAll ? 'Copied Trace' : 'Copy All'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={processLogs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={processLogs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as JSON dataset"
            >
              <FileCode size={13} className="text-cyan-600" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleClear}
              disabled={processLogs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Clear all process logs"
            >
              <Trash2 size={13} />
              <span>Clear Stream</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Total Events</span>
              <Terminal size={14} className="text-zinc-600" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900">{totalEvents}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Streamed records</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">DOM Actions</span>
              <Activity size={14} className="text-fuchsia-600" />
            </div>
            <span className="text-xl font-extrabold text-fuchsia-700">{actionEvents}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Types, clicks, injects</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Qwen 2.5 Inferences</span>
              <BrainCircuit size={14} className="text-cyan-600" />
            </div>
            <span className="text-xl font-extrabold text-cyan-700">{llmInferences}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Local reasoning steps</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Confirmations</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <span className="text-xl font-extrabold text-emerald-700">{successEvents}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Submissions & advances</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action, message, target..."
              className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-mono">
            {/* Level Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
              {(['ALL', 'ACTION', 'LLM', 'SUCCESS', 'SECURITY', 'WARNING'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold ${
                    levelFilter === lvl
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {lvl === 'ALL' ? 'All' : lvl}
                </button>
              ))}
            </div>

            {/* Source Selector */}
            {uniqueSources.length > 0 && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                {uniqueSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Process Stream Feed */}
        <div ref={containerRef} className="space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-2xs">
              <Cpu size={40} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-semibold text-sm text-zinc-800">No Process Logs Found</p>
              <p className="text-xs text-zinc-400">
                Agent actions, DOM clicks, typing simulations, and LLM thoughts will stream here live.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-zinc-300"
                >
                  <div
                    className="p-3.5 cursor-pointer flex items-start justify-between gap-3 bg-white hover:bg-zinc-50/70 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-center shrink-0 mt-0.5">
                        {getLevelIcon(log.level)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${getLevelBadge(log.level)}`}>
                            {log.level}
                          </span>
                          <span className="font-mono text-xs font-bold text-zinc-800 uppercase">
                            [{log.source}]
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          {log.latencyMs !== undefined && log.latencyMs > 0 && (
                            <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                              {log.latencyMs}ms
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-zinc-900 text-xs mt-1 break-words font-mono">
                          {log.message}
                        </div>

                        {log.detail && (
                          <div className="text-[11px] font-sans text-zinc-500 mt-0.5 break-words">
                            {log.detail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => copySingleLog(e, log)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                        title="Copy log entry"
                      >
                        {copiedId === log.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={(e) => handleDelete(e, log.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="text-zinc-400 pl-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (log.metadata || log.target) && (
                    <div className="border-t border-zinc-100 bg-zinc-50/90 p-3.5 animate-fadeIn font-mono text-[11px] space-y-2">
                      {log.target && (
                        <div>
                          <span className="text-zinc-400 text-[10px] uppercase font-bold block">Target Element / Context:</span>
                          <span className="text-zinc-800 font-semibold bg-white px-2 py-1 rounded border border-zinc-200 block mt-0.5">
                            {log.target}
                          </span>
                        </div>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-0.5">Payload & Metadata:</span>
                          <pre className="p-2.5 bg-white rounded-xl border border-zinc-200 text-zinc-800 text-[10px] overflow-x-auto leading-tight whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
