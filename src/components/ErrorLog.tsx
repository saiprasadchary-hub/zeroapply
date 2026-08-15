import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  FileCode, 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  BrainCircuit,
  FileText,
  HelpCircle,
  Wrench,
  Copy,
  Terminal
} from 'lucide-react';
import { ErrorLogger, type ErrorLogRecord, type ErrorSeverity } from '../agent/tracker/errorLogger';
import { diagnoseErrorInPlainEnglish } from '../agent/tracker/errorTranslator';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  stack?: string;
  severity?: ErrorSeverity;
}

interface ErrorLogProps {
  errors?: ErrorLogEntry[];
  onClearErrors?: () => void;
}

export const ErrorLog: React.FC<ErrorLogProps> = ({ onClearErrors }) => {
  const [logs, setLogs] = useState<ErrorLogRecord[]>(() => ErrorLogger.getErrors());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'AI_MODEL' | 'FORM_FILLING' | 'SECURITY' | 'JOB_SEARCH' | 'SYSTEM'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = ErrorLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all error diagnostic traces?')) {
      ErrorLogger.clearErrors();
      if (onClearErrors) onClearErrors();
      setExpandedId(null);
    }
  };

  const handleExportCsv = () => {
    const csv = ErrorLogger.exportAsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_errors_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const json = ErrorLogger.exportAsJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_errors_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyPlainEnglish = (e: React.MouseEvent, err: ErrorLogRecord) => {
    e.stopPropagation();
    const diag = diagnoseErrorInPlainEnglish(err.message, err.source, err.stack);
    const text = `⚠️ What happened: ${diag.simpleWhatHappened}\n🤖 What is the mistake with AI: ${diag.whatIsTheMistakeWithAi}\n💡 How to fix it: ${diag.howToFixIt}\n\n[Technical Log: ${err.message}]`;
    navigator.clipboard.writeText(text);
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const diag = diagnoseErrorInPlainEnglish(log.message, log.source, log.stack);
    
    const matchesSearch =
      !query ||
      log.message.toLowerCase().includes(query) ||
      log.source.toLowerCase().includes(query) ||
      diag.simpleWhatHappened.toLowerCase().includes(query) ||
      diag.whatIsTheMistakeWithAi.toLowerCase().includes(query) ||
      diag.howToFixIt.toLowerCase().includes(query);

    const matchesCategory = activeCategory === 'ALL' || diag.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate live stats
  const totalErrors = logs.length;
  const aiModelIssues = logs.filter((l) => diagnoseErrorInPlainEnglish(l.message, l.source, l.stack).category === 'AI_MODEL').length;
  const formFillingIssues = logs.filter((l) => diagnoseErrorInPlainEnglish(l.message, l.source, l.stack).category === 'FORM_FILLING').length;
  const securityBlocks = logs.filter((l) => diagnoseErrorInPlainEnglish(l.message, l.source, l.stack).category === 'SECURITY').length;

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-y-auto p-3 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs font-mono tracking-wide uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>100% Plain English AI Diagnosis</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1">Error Diagnostics & AI Review</h1>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">
              Clear, simple explanations of what happened, what the AI did, and how to easily resolve it.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as JSON dataset"
            >
              <FileCode size={13} className="text-cyan-600" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleClear}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Clear all error traces"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Total Issues</span>
              <ShieldAlert size={14} className="text-rose-500" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900">{totalErrors}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Recorded diagnostic events</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold uppercase">AI Model / Qwen</span>
              <BrainCircuit size={14} className="text-blue-500" />
            </div>
            <span className="text-xl font-extrabold text-blue-700">{aiModelIssues}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Ollama & RAG timeouts</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Form Auto-Fill</span>
              <FileText size={14} className="text-emerald-500" />
            </div>
            <span className="text-xl font-extrabold text-emerald-700">{formFillingIssues}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Resume & field mappings</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Security Traps</span>
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <span className="text-xl font-extrabold text-amber-700">{securityBlocks}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">CAPTCHA / Bot protections</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plain English explanations..."
              className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto text-xs w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'AI_MODEL', label: '🤖 AI Model' },
              { id: 'FORM_FILLING', label: '📝 Form Filling' },
              { id: 'SECURITY', label: '🛡️ Security' },
              { id: 'JOB_SEARCH', label: '🌐 Job Search' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-bold shrink-0 ${
                  activeCategory === tab.id
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Errors Feed */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-2xs">
              <ShieldCheck size={44} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-base text-zinc-800">Everything is Running Smoothly</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No active mistakes or critical exceptions recorded. The agent is healthy and ready to apply.
              </p>
            </div>
          ) : (
            filteredLogs.map((err) => {
              const isExpanded = expandedId === err.id;
              const diag = diagnoseErrorInPlainEnglish(err.message, err.source, err.stack);

              return (
                <div
                  key={err.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-zinc-300"
                >
                  {/* Card Header & Summary */}
                  <div className="p-4 sm:p-5 flex flex-col gap-3">
                    
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                          <AlertTriangle size={13} className="text-rose-600" />
                          <span>{diag.categoryLabel}</span>
                        </span>

                        <span className="text-xs font-bold text-zinc-500">
                          Portal: <span className="text-zinc-800">{err.portal || 'LinkedIn / General'}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>

                        <button
                          onClick={(e) => copyPlainEnglish(e, err)}
                          className="px-2 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                          title="Copy simple explanation"
                        >
                          {copiedId === err.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>{copiedId === err.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Plain English 3-Box Diagnostic Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-1">
                      
                      {/* Box 1: What Happened */}
                      <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                          <HelpCircle size={14} className="text-rose-500" />
                          <span>1. What happened :</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                          {diag.simpleWhatHappened}
                        </p>
                      </div>

                      {/* Box 2: What is the mistake with AI */}
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <BrainCircuit size={14} className="text-amber-600" />
                          <span>2. Mistake with AI :</span>
                        </div>
                        <p className="text-xs font-medium text-amber-900/90 leading-relaxed">
                          {diag.whatIsTheMistakeWithAi}
                        </p>
                      </div>

                      {/* Box 3: How to fix it */}
                      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <Wrench size={14} className="text-emerald-600" />
                          <span>3. How to fix it :</span>
                        </div>
                        <p className="text-xs font-medium text-emerald-900/90 leading-relaxed">
                          {diag.howToFixIt}
                        </p>
                      </div>

                    </div>

                    {/* Expandable Technical Trace Toggle */}
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-zinc-400 truncate max-w-md">
                        Raw log: {err.message}
                      </span>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : err.id)}
                        className="text-xs font-semibold text-zinc-500 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                      >
                        <Terminal size={12} />
                        <span>{isExpanded ? 'Hide Technical Stack' : 'View Technical Stack'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                  </div>

                  {/* Expanded Technical Trace Drawer */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 bg-zinc-900 text-zinc-200 p-4 font-mono text-xs space-y-2 animate-slideUp">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-1.5">
                        <span>SOURCE: {err.source} | SEVERITY: {err.severity}</span>
                        <span>{err.timestamp}</span>
                      </div>
                      
                      <div className="text-red-400 font-semibold break-words">
                        {err.message}
                      </div>

                      {err.stack && (
                        <pre className="text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 pt-1">
                          {err.stack}
                        </pre>
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
