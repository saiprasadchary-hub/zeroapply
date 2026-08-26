import React, { useState, useEffect } from 'react';
import { QALogger, type QALogRecord } from '../agent/tracker/qaLogger';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  FileCode, 
  Copy, 
  Check, 
  Clock,
  Send,
  ListChecks,
  Workflow,
  User,
  CheckCircle2,
  Inbox
} from 'lucide-react';

const getPortalInfo = (portal: string, company: string) => {
  const p = (portal || '').toLowerCase();
  if (p.includes('linkedin')) {
    return {
      bg: 'bg-white text-blue-600 border border-blue-300',
      tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'LinkedIn',
      short: 'in',
    };
  }
  if (p.includes('greenhouse')) {
    return {
      bg: 'bg-emerald-600 text-white border-emerald-600',
      tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Greenhouse',
      short: 'GH',
    };
  }
  if (p.includes('lever')) {
    return {
      bg: 'bg-zinc-900 text-white border-zinc-900',
      tagBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      label: 'Lever',
      short: 'LV',
    };
  }
  if (p.includes('workday')) {
    return {
      bg: 'bg-amber-600 text-white border-amber-600',
      tagBg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Workday',
      short: 'WD',
    };
  }
  if (p.includes('indeed')) {
    return {
      bg: 'bg-indigo-600 text-white border-indigo-600',
      tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Indeed',
      short: 'ID',
    };
  }
  return {
    bg: 'bg-zinc-800 text-white border-zinc-700',
    tagBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    label: portal || 'Direct Apply',
    short: (company || 'AP').slice(0, 2).toUpperCase(),
  };
};

export const SubmissionCheck: React.FC = () => {
  const [logs, setLogs] = useState<QALogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS'>('ALL');
  const [portalFilter, setPortalFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = QALogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all QA submission history?')) {
      QALogger.clearLogs();
      setExpandedId(null);
    }
  };

  const handleDeleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    QALogger.deleteLog(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleExportCsv = () => {
    const csvContent = QALogger.exportAsCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_qa_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonContent = QALogger.exportAsJson();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_qa_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyLogAnswers = (e: React.MouseEvent, log: QALogRecord) => {
    e.stopPropagation();
    const text = log.qaPairs
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}\n[Source: ${qa.source || 'persona'}]`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract unique portals for filtering
  const portals = Array.from(new Set(logs.map((l) => l.portal).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      log.jobTitle.toLowerCase().includes(query) ||
      log.companyName.toLowerCase().includes(query) ||
      log.portal.toLowerCase().includes(query) ||
      log.qaPairs.some(
        (qa) => qa.question.toLowerCase().includes(query) || qa.answer.toLowerCase().includes(query)
      );

    const matchesStatus = statusFilter === 'ALL' || (log.status || 'SUBMITTED') === statusFilter;
    const matchesPortal = portalFilter === 'ALL' || log.portal === portalFilter;

    return matchesSearch && matchesStatus && matchesPortal;
  });

  // Calculate stats
  const totalQuestions = logs.reduce((sum, l) => sum + (l.qaPairs?.length || 0), 0);
  const contextualSolved = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => qa.source === 'ollama').length || 0),
    0
  );
  const personaInjected = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => qa.source !== 'ollama').length || 0),
    0
  );

  return (
    <div className="flex-1 bg-[#FAFAFA] flex flex-col h-full overflow-y-auto p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-5 sm:space-y-6">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              QA &amp; Submission Audit
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Verified record of screening questions, field responses, and candidate data mapped during applications.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40"
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet size={13} className="text-zinc-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40"
              title="Export as JSON dataset"
            >
              <FileCode size={13} className="text-zinc-600" />
              <span>JSON Backup</span>
            </button>

            <button
              onClick={handleClearHistory}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40"
              title="Clear QA history"
            >
              <Trash2 size={13} />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Clean Stat Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Applications</span>
              <Send size={13} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{logs.length}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Tracked submissions</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Fields Handled</span>
              <ListChecks size={14} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{totalQuestions}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Form inputs verified</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Dynamic Forms</span>
              <Workflow size={13} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{contextualSolved}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Screening answers</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Direct Profile</span>
              <User size={13} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{personaInjected}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Credentials injected</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by question, company, or portal..."
              className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
            {/* Status Segmented Control */}
            <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70">
              {(['ALL', 'SUBMITTED', 'IN_PROGRESS'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg transition-all text-xs font-semibold ${
                    statusFilter === st
                      ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'SUBMITTED' ? 'Submitted' : 'In Progress'}
                </button>
              ))}
            </div>

            {/* Portal Dropdown */}
            {portals.length > 0 && (
              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-zinc-50 transition"
              >
                <option value="ALL">All Portals</option>
                {portals.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Submissions Ledger List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-2xs">
              <Inbox size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-bold text-sm text-zinc-800">No QA records found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Application questions and verified answers will automatically populate here as submissions are completed.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const isInProgress = log.status === 'IN_PROGRESS';
              const portalMeta = getPortalInfo(log.portal, log.companyName);
              
              return (
                <div 
                  key={log.id} 
                  className={`bg-white border rounded-2xl overflow-hidden shadow-2xs transition-all ${
                    isInProgress ? 'border-zinc-400' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div 
                    className="p-4 cursor-pointer flex items-center justify-between bg-white hover:bg-zinc-50/60 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Distinctive Portal / Brand Badge */}
                      <div className={`w-10 h-10 rounded-xl ${portalMeta.bg} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs font-mono tracking-tight`}>
                        {portalMeta.short}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-zinc-900 truncate text-sm">{log.jobTitle}</h3>
                          {isInProgress ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              <span>SUBMITTED</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mt-0.5 flex-wrap">
                          <span className="font-semibold text-zinc-800">
                            {log.companyName}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${portalMeta.tagBg}`}>
                            {portalMeta.label}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span className="font-mono text-[10.5px] text-zinc-400 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 font-mono">
                        {log.qaPairs.length} {log.qaPairs.length === 1 ? 'field' : 'fields'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => copyLogAnswers(e, log)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
                        title="Copy all Q&A for this application"
                      >
                        {copiedId === log.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteEntry(e, log.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="text-zinc-400 pl-0.5">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/70 p-4 sm:p-5 space-y-3 animate-fadeIn">
                      {log.qaPairs.length === 0 ? (
                        <p className="text-xs font-medium text-zinc-500 italic px-2">
                          No fields logged for this application.
                        </p>
                      ) : (
                        log.qaPairs.map((qa, index) => {
                          const isCopied = copiedId === `${log.id}-${index}`;
                          const isNumeric = /^\d+(\.\d+)?$/.test(qa.answer.trim());
                          const isYesNo = /^(yes|no)$/i.test(qa.answer.trim());

                          return (
                            <div 
                              key={index} 
                              className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-2xs transition-all space-y-2.5 group"
                            >
                              {/* Question Line */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
                                      Field #{index + 1}
                                    </span>
                                    {qa.category && (
                                      <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                                        [{qa.category}]
                                      </span>
                                    )}
                                  </div>

                                  {/* Clean Source Badge */}
                                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                                    {qa.source === 'ollama' ? (
                                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                                        Dynamic Screen Response
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                                        Candidate Profile
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug">
                                  {qa.question}
                                </div>
                              </div>

                              {/* Answer Box */}
                              <div className="space-y-1 pt-1 border-t border-zinc-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                                    Verified Value
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(qa.answer);
                                      setCopiedId(`${log.id}-${index}`);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-mono text-zinc-400 hover:text-zinc-800 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-100"
                                    title="Copy value"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check size={11} className="text-emerald-600" />
                                        <span className="text-emerald-600 font-bold">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className={`text-xs sm:text-sm font-medium rounded-lg p-2.5 border transition-all ${
                                  isYesNo
                                    ? qa.answer.toLowerCase() === 'yes'
                                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold'
                                      : 'bg-zinc-100 border-zinc-200 text-zinc-800 font-bold'
                                    : isNumeric
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 font-mono font-bold'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-800 leading-relaxed font-sans'
                                }`}>
                                  {qa.answer}
                                </div>
                              </div>
                            </div>
                          );
                        })
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
